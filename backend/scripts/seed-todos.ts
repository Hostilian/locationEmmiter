#!/usr/bin/env tsx

/**
 * Seed Script: Load Location Emitter Grand Readiness TODO items into PostgreSQL
 * Usage: npx tsx scripts/seed-todos.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pino from 'pino';
import { closeDatabaseConnection, getDatabase, initializeDatabase, runMigrations } from '../src/db/database.js';

const logger = pino();

const seedDataPath = resolve(process.cwd(), 'seeds', 'todos-grand-readiness.json');

async function main() {
  try {
    logger.info('Initializing database...');
    initializeDatabase();

    logger.info('Running migrations...');
    await runMigrations();

    logger.info('Reading seed data...');
    const seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'));

    const db = getDatabase();

    // Check if todos already exist
    const countResult = await db.query('SELECT COUNT(*) as count FROM todos');
    const existingCount = Number(countResult.rows[0]?.count || 0);

    if (existingCount > 0) {
      logger.info(`Database already contains ${existingCount} todos. Skipping seed.`);
      await closeDatabaseConnection();
      return;
    }

    logger.info(`Inserting ${seedData.length} todos...`);

    for (const todo of seedData) {
      await db.query(
        `
        INSERT INTO todos (id, title, description, category, priority, status, owner, internal_notes, created_at, updated_at, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (title) DO NOTHING
        `,
        [
          todo.id,
          todo.title,
          todo.description,
          todo.category,
          todo.priority,
          todo.status,
          todo.owner,
          todo.internal_notes,
          todo.created_at,
          todo.updated_at,
          todo.version,
        ]
      );
    }

    logger.info(`Successfully seeded ${seedData.length} todos`);

    // Verify
    const verifyResult = await db.query('SELECT COUNT(*) as count FROM todos');
    const finalCount = Number(verifyResult.rows[0]?.count || 0);
    logger.info(`Total todos in database: ${finalCount}`);

    // Log category distribution
    const categoryResult = await db.query(
      'SELECT category, COUNT(*) as count FROM todos GROUP BY category ORDER BY count DESC'
    );
    logger.info('Category distribution:');
    categoryResult.rows.forEach((row: { category: string; count: string }) => {
      logger.info(`  ${row.category}: ${row.count}`);
    });

    await closeDatabaseConnection();
  } catch (error) {
    logger.error({ error }, 'Seeding failed');
    process.exit(1);
  }
}

main();
