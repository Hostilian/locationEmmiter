/**
 * RBAC Middleware for Location Emitter.
 * Handles role-based access control and filtering based on user permissions.
 */

import { NextFunction, Request, Response } from 'express';
import { Role } from '../db/schema.js';

/**
 * RBAC Permissions:
 * admin: full CRUD + internal notes + user management
 * internal: read/write all todos + internal notes
 * stakeholder: read-only (P0s + category summaries only) + no internal notes
 */

export type PermissionKey =
  | 'todo:create'
  | 'todo:read'
  | 'todo:read:all'
  | 'todo:update'
  | 'todo:delete'
  | 'todo:read:internal_notes'
  | 'todo:write:internal_notes'
  | 'user:manage';

const permissionMatrix: Record<Role, PermissionKey[]> = {
  admin: [
    'todo:create',
    'todo:read',
    'todo:read:all',
    'todo:update',
    'todo:delete',
    'todo:read:internal_notes',
    'todo:write:internal_notes',
    'user:manage',
  ],
  internal: [
    'todo:create',
    'todo:read',
    'todo:read:all',
    'todo:update',
    'todo:delete',
    'todo:read:internal_notes',
    'todo:write:internal_notes',
  ],
  stakeholder: [
    'todo:read', // only P0 items and summaries
  ],
};

export function hasPermission(role: Role, permission: PermissionKey): boolean {
  return permissionMatrix[role]?.includes(permission) ?? false;
}

export function requirePermission(permission: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

/**
 * Filter todos based on user role
 * Stakeholders see only P0 items
 * Internal/Admin see all items
 */
export function filterTodosForRole(
  todos: Array<{ priority: string; internal_notes?: string | null }>,
  role: Role
): Array<{ priority: string; internal_notes?: string | null }> {
  let filtered = todos;

  // Stakeholders see only P0 items
  if (role === 'stakeholder') {
    filtered = filtered.filter((todo) => todo.priority === 'P0');
  }

  // Remove internal notes for stakeholders
  if (role === 'stakeholder') {
    filtered = filtered.map((todo) => ({
      ...todo,
      internal_notes: null,
    }));
  }

  return filtered;
}

/**
 * Build WHERE clause for database queries based on role
 */
export function buildRoleBasedWhereClause(
  role: Role
): { clause: string; params: unknown[] } {
  if (role === 'stakeholder') {
    // Stakeholders see only P0 items
    return {
      clause: 'priority = $1',
      params: ['P0'],
    };
  }

  // Admin and internal see all items
  return {
    clause: '1=1',
    params: [],
  };
}
