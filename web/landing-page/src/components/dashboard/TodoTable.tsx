/**
 * TodoTable Component
 * Sortable table displaying todos with inline status management
 */

'use client';

import { STATUSES } from '@/lib/constants';
import type { TodoItem } from '@/lib/todoClient';

interface TodoTableProps {
  todos: TodoItem[];
  onStatusChange: (todoId: string, newStatus: string) => void;
  onDelete: (todoId: string) => void;
}

const priorityColors = {
  P0: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  P1: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  P2: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
};

const statusIcons = {
  todo: '○',
  'in-progress': '◐',
  done: '●',
};

const statusColors = {
  todo: 'text-slate-400 dark:text-slate-600',
  'in-progress': 'text-yellow-500 dark:text-yellow-400',
  done: 'text-green-500 dark:text-green-400',
};

export function TodoTable({
  todos,
  onStatusChange,
  onDelete,
}: Readonly<TodoTableProps>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
          <tr>
            <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">Status</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">Title</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">Category</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">Priority</th>
            <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">Owner</th>
            <th className="px-6 py-3 text-center font-semibold text-slate-900 dark:text-white">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {todos.map((todo) => (
            <tr
              key={todo.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
            >
              {/* Status */}
              <td className="px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${statusColors[todo.status as keyof typeof statusColors]}`}>
                    {statusIcons[todo.status as keyof typeof statusIcons]}
                  </span>
                  <select
                    value={todo.status}
                    onChange={(e) => onStatusChange(todo.id, e.target.value)}
                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-600 text-slate-900 dark:text-white rounded border border-slate-300 dark:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status === 'in-progress' ? 'In Progress' : status}
                      </option>
                    ))}
                  </select>
                </div>
              </td>

              {/* Title */}
              <td className="px-6 py-3">
                <div className="max-w-xs">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {todo.title}
                  </p>
                  {todo.description && (
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 line-clamp-1">
                      {todo.description}
                    </p>
                  )}
                </div>
              </td>

              {/* Category */}
              <td className="px-6 py-3">
                <span className="text-xs text-slate-600 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">
                  {todo.category}
                </span>
              </td>

              {/* Priority */}
              <td className="px-6 py-3">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    priorityColors[todo.priority as keyof typeof priorityColors]
                  }`}
                >
                  {todo.priority}
                </span>
              </td>

              {/* Owner */}
              <td className="px-6 py-3">
                {todo.owner ? (
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {todo.owner.substring(0, 8)}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-600">Unassigned</span>
                )}
              </td>

              {/* Actions */}
              <td className="px-6 py-3">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => onDelete(todo.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-xs transition"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
