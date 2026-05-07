/**
 * TypeORM Entity Definitions for Todo Tracker
 * Defines schema for todos, users, roles, and audit history
 */

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'todo' | 'in-progress' | 'done';
  owner: string | null; // user ID
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  internal_notes: string | null; // RBAC: only visible to internal/admin
  version: number; // for optimistic locking
}

export interface TodoHistory {
  id: string;
  todo_id: string;
  changed_by: string; // user ID
  change_type: 'created' | 'updated' | 'deleted';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown>;
  changed_at: string; // ISO 8601
  reason?: string; // optional: why the change was made
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'internal' | 'stakeholder';
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  user_id: string;
  role: 'admin' | 'internal' | 'stakeholder';
}

/**
 * RBAC Permissions Matrix:
 * 
 * admin: full CRUD on all todos + internal notes + user management
 * internal: read/write all todos + internal notes + edit own todos
 * stakeholder: read-only filtered view (P0s, category summaries, progress only) + no internal notes
 */

export const CATEGORIES = [
  'Regulatory & RF',
  'Customer UX',
  'Security & Privacy',
  'Hardware & Certs',
  'Firmware & Protocol',
  'App Stores',
  'Backend & Infra',
  'Testing & QA',
  'Business',
  'People & Team',
  'Safety & Emergency',
  'i18n & Localization',
  'Legal',
  'Marketing',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['P0', 'P1', 'P2'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ['todo', 'in-progress', 'done'] as const;
export type Status = (typeof STATUSES)[number];

export const ROLES = ['admin', 'internal', 'stakeholder'] as const;
export type Role = (typeof ROLES)[number];
