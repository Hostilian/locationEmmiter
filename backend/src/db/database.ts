/**
 * PostgreSQL Database Connection and Initialization
 * Sets up connection pool and runs migrations
 */

import { Pool } from 'pg';
import pino from 'pino';

const logger = pino();

let pool: Pool | null = null;

export function initializeDatabase(): Pool {
  if (pool) {
    return pool;
  }

  const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'location_emitter',
  };

  pool = new Pool(dbConfig);

  pool.on('error', (err: Error) => {
    logger.error({ err }, 'Unexpected error on idle client');
  });

  return pool;
}

export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  const db = getDatabase();

  try {
    // Check if migrations table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of completed migrations
    const migrationsResult = await db.query<{ name: string }>(
      'SELECT name FROM migrations'
    );
    const completedMigrations = new Set(migrationsResult.rows.map((r: { name: string }) => r.name));

    // Define migrations
    const migrations = [
      {
        name: '001_create_todos_table',
        sql: `
          CREATE TABLE IF NOT EXISTS todos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(512) NOT NULL,
            description TEXT,
            category VARCHAR(64) NOT NULL,
            priority VARCHAR(16) NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),
            status VARCHAR(32) NOT NULL CHECK (status IN ('todo', 'in-progress', 'done')) DEFAULT 'todo',
            owner UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            internal_notes TEXT,
            version INTEGER NOT NULL DEFAULT 1,
            UNIQUE(title) -- seed data constraint
          );
          CREATE INDEX idx_todos_category ON todos(category);
          CREATE INDEX idx_todos_priority ON todos(priority);
          CREATE INDEX idx_todos_status ON todos(status);
          CREATE INDEX idx_todos_owner ON todos(owner);
        `,
      },
      {
        name: '002_create_users_table',
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'internal', 'stakeholder')) DEFAULT 'stakeholder',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_users_email ON users(email);
        `,
      },
      {
        name: '003_create_todo_history_table',
        sql: `
          CREATE TABLE IF NOT EXISTS todo_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
            changed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
            change_type VARCHAR(32) NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
            old_values JSONB,
            new_values JSONB NOT NULL,
            changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reason TEXT
          );
          CREATE INDEX idx_todo_history_todo_id ON todo_history(todo_id);
          CREATE INDEX idx_todo_history_changed_at ON todo_history(changed_at);
        `,
      },
    ];

    // Run pending migrations
    for (const migration of migrations) {
      if (!completedMigrations.has(migration.name)) {
        logger.info(`Running migration: ${migration.name}`);
        await db.query(migration.sql);
        await db.query('INSERT INTO migrations (name) VALUES ($1)', [
          migration.name,
        ]);
      }
    }

    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    throw error;
  }
}
