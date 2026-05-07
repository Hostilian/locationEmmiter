/**
 * REST API Routes for Location Emitter.
 * Handles CRUD operations with filtering, pagination, and role-based access control.
 */

import { Request, Response, Router } from 'express';
import pino from 'pino';
import { getDatabase } from '../db/database.js';
import { TodoHistory, TodoItem } from '../db/schema.js';
import { buildRoleBasedWhereClause, requirePermission } from '../middleware/rbac.js';

const logger = pino();
const router = Router();

/**
 * Helper function to detect changes between old and new item objects.
 * Compares each field and returns only the changed fields.
 */
function detectChanges(
  oldTodo: TodoItem,
  updates: {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    status?: string;
    owner?: string | null;
    internal_notes?: string | null;
  }
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  const fieldMap = [
    { key: 'title', field: 'title' },
    { key: 'description', field: 'description' },
    { key: 'category', field: 'category' },
    { key: 'priority', field: 'priority' },
    { key: 'status', field: 'status' },
    { key: 'owner', field: 'owner' },
    { key: 'internal_notes', field: 'internal_notes' },
  ] as const;

  for (const { key, field } of fieldMap) {
    const value = updates[key];
    const oldValue = oldTodo[field as keyof typeof oldTodo];
    if (value !== undefined && value !== oldValue) {
      changes[key] = value;
    }
  }

  return changes;
}

/**
 * GET /api/todos
 * Fetch todos with filtering: category, priority, status, search, role-based
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      priority,
      status,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    const db = getDatabase();
    const role = req.user?.role || 'stakeholder';

    // Build dynamic WHERE clause
    const whereParts: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Role-based filtering
    const { clause: roleClause, params: roleParams } =
      buildRoleBasedWhereClause(role);
    whereParts.push(roleClause);
    params.push(...roleParams);
    paramIndex += roleParams.length;

    // Category filter
    if (category && typeof category === 'string') {
      whereParts.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    // Priority filter (multi-select)
    if (priority) {
      const priorities = Array.isArray(priority)
        ? priority
        : typeof priority === 'string'
          ? priority.split(',')
          : [];
      if (priorities.length > 0) {
        const placeholders = priorities
          .map(() => `$${paramIndex++}`)
          .join(',');
        whereParts.push(`priority IN (${placeholders})`);
        params.push(...priorities);
      }
    }

    // Status filter (multi-select)
    if (status) {
      const statuses = Array.isArray(status)
        ? status
        : typeof status === 'string'
          ? status.split(',')
          : [];
      if (statuses.length > 0) {
        const placeholders = statuses.map(() => `$${paramIndex++}`).join(',');
        whereParts.push(`status IN (${placeholders})`);
        params.push(...statuses);
      }
    }

    // Search filter (title + description)
    if (search && typeof search === 'string') {
      whereParts.push(
        `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    // Fetch todos
    const todosResult = await db.query<TodoItem>(
      `
      SELECT id, title, description, category, priority, status, owner, created_at, updated_at, internal_notes, version
      FROM todos
      ${whereClause}
      ORDER BY priority, updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, Number(limit), Number(offset)]
    );

    // Fetch count for pagination
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM todos ${whereClause}`,
      params
    );

    const total = Number(countResult.rows[0]?.count || 0);

    // Remove internal_notes for stakeholders
    const todos = todosResult.rows.map((todo: TodoItem) => {
      if (role === 'stakeholder') {
        const { internal_notes, ...rest } = todo;
        return rest;
      }
      return todo;
    });

    res.json({
      data: todos,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch todos');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/todos/:id - Fetch a single todo by ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const role = req.user?.role || 'stakeholder';

    // Check role-based access
    const { clause: roleClause, params: roleParams } =
      buildRoleBasedWhereClause(role);

    const result = await db.query<TodoItem>(
      `
      SELECT id, title, description, category, priority, status, owner, created_at, updated_at, internal_notes, version
      FROM todos
      WHERE id = $1 AND ${roleClause}
      `,
      [id, ...roleParams]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    let todo = result.rows[0];

    // Remove internal_notes for stakeholders
    if (role === 'stakeholder') {
      const { internal_notes, ...rest } = todo;
      todo = rest as TodoItem;
    }

    res.json({ data: todo });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch todo');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/todos - Create a new todo item.
 */
router.post(
  '/',
  requirePermission('todo:create'),
  async (req: Request, res: Response) => {
    try {
      const { title, description, category, priority, status, owner, internal_notes } =
        req.body;

      // Validate required fields
      if (!title || !category || !priority) {
        return res.status(400).json({
          error: 'Missing required fields: title, category, priority',
        });
      }

      const db = getDatabase();
      const userId = req.user?.id;

      const result = await db.query<TodoItem>(
        `
        INSERT INTO todos (title, description, category, priority, status, owner, internal_notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, title, description, category, priority, status, owner, created_at, updated_at, internal_notes, version
        `,
        [title, description, category, priority, status || 'todo', owner, internal_notes]
      );

      const todo = result.rows[0];

      // Log to history
      await db.query(
        `
        INSERT INTO todo_history (todo_id, changed_by, change_type, new_values)
        VALUES ($1, $2, $3, $4)
        `,
        [todo.id, userId, 'created', JSON.stringify(todo)]
      );

      res.status(201).json({ data: todo });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('unique constraint')
      ) {
        return res.status(400).json({ error: 'Todo with this title already exists' });
      }
      logger.error({ error }, 'Failed to create todo');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /api/todos/:id - Update a todo with optimistic locking for concurrency control.
 */
router.patch(
  '/:id',
  requirePermission('todo:update'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, category, priority, status, owner, internal_notes, version } =
        req.body;

      if (version === undefined) {
        return res.status(400).json({
          error: 'Missing version for optimistic locking',
        });
      }

      const db = getDatabase();
      const userId = req.user?.id;

      // Retrieve current item for history tracking
      const currentResult = await db.query<TodoItem>(
        'SELECT * FROM todos WHERE id = $1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Todo not found' });
      }

      const oldTodo = currentResult.rows[0];

      // Update with optimistic locking
      const updateResult = await db.query<TodoItem>(
        `
        UPDATE todos
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            category = COALESCE($3, category),
            priority = COALESCE($4, priority),
            status = COALESCE($5, status),
            owner = COALESCE($6, owner),
            internal_notes = COALESCE($7, internal_notes),
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8 AND version = $9
        RETURNING id, title, description, category, priority, status, owner, created_at, updated_at, internal_notes, version
        `,
        [title, description, category, priority, status, owner, internal_notes, id, version]
      );

      if (updateResult.rows.length === 0) {
        return res.status(409).json({
          error: 'Optimistic locking conflict: todo was modified',
        });
      }

      const newTodo = updateResult.rows[0];

      // Detect and log changes
      const changes = detectChanges(oldTodo, {
        title,
        description,
        category,
        priority,
        status,
        owner,
        internal_notes,
      });

      await db.query(
        `
        INSERT INTO todo_history (todo_id, changed_by, change_type, old_values, new_values)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [id, userId, 'updated', JSON.stringify(oldTodo), JSON.stringify(changes)]
      );

      res.json({ data: newTodo });
    } catch (error) {
      logger.error({ error }, 'Failed to update todo');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/todos/:id - Soft delete a todo by ID.
 */
router.delete(
  '/:id',
  requirePermission('todo:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = getDatabase();
      const userId = req.user?.id;

      // Retrieve item before deletion for audit trail
      const result = await db.query<TodoItem>(
        'SELECT * FROM todos WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Todo not found' });
      }

      const todo = result.rows[0];

      // Soft delete by marking with special status or actual delete
      await db.query('DELETE FROM todos WHERE id = $1', [id]);

      // Log to history
      await db.query(
        `
        INSERT INTO todo_history (todo_id, changed_by, change_type, old_values)
        VALUES ($1, $2, $3, $4)
        `,
        [id, userId, 'deleted', JSON.stringify(todo)]
      );

      res.status(204).send();
    } catch (error) {
      logger.error({ error }, 'Failed to delete todo');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/todos/:id/history - Fetch the complete audit trail for a specific todo.
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await db.query<TodoHistory>(
      `
      SELECT id, todo_id, changed_by, change_type, old_values, new_values, changed_at, reason
      FROM todo_history
      WHERE todo_id = $1
      ORDER BY changed_at DESC
      `,
      [id]
    );

    res.json({ data: result.rows });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch todo history');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/todos/stats/progress
 * Fetch progress metrics: % complete per category, overall progress
 */
router.get('/stats/progress', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const role = req.user?.role || 'stakeholder';

    // Role-based filtering
    const { clause: roleClause, params: roleParams } =
      buildRoleBasedWhereClause(role);

    const result = await db.query<{
      category: string;
      total: number;
      done: number;
      percentage: number;
    }>(
      `
      SELECT 
        category,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        ROUND(100 * SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) / COUNT(*)) as percentage
      FROM todos
      WHERE ${roleClause}
      GROUP BY category
      ORDER BY percentage DESC
      `,
      roleParams
    );

    // Calculate overall progress
    const overallResult = await db.query<{ total: number; done: number }>(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
      FROM todos
      WHERE ${roleClause}
      `,
      roleParams
    );

    const overall = overallResult.rows[0] || { total: 0, done: 0 };
    const overallPercentage =
      overall.total > 0 ? Math.round((100 * overall.done) / overall.total) : 0;

    res.json({
      data: {
        categories: result.rows,
        overall: {
          total: overall.total,
          done: overall.done,
          percentage: overallPercentage,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch progress stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as todosRouter };
