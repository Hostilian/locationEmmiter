/**
 * Shared Constants for Todo Tracker
 * Category, priority, and status enumerations
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
