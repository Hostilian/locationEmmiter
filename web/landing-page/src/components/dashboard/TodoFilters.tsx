/**
 * TodoFilters Component
 * Advanced filtering UI: category, priority, status, search
 */

'use client';

import { useState } from 'react';
import { CATEGORIES, PRIORITIES, STATUSES } from '@/lib/constants';

interface TodoFiltersProps {
  filters: {
    category?: string;
    priority: string[];
    status: string[];
    search: string;
  };
  onChange: (filters: {
    category?: string;
    priority: string[];
    status: string[];
    search: string;
  }) => void;
}

export function TodoFilters({
  filters,
  onChange,
}: Readonly<TodoFiltersProps>) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCategoryChange = (category: string | undefined) => {
    onChange({ ...filters, category });
  };

  const handlePriorityChange = (priority: string) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter((p) => p !== priority)
      : [...filters.priority, priority];
    onChange({ ...filters, priority: newPriorities });
  };

  const handleStatusChange = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onChange({ ...filters, status: newStatuses });
  };

  const handleSearchChange = (search: string) => {
    onChange({ ...filters, search });
  };

  const hasActiveFilters =
    filters.category ||
    filters.priority.length > 0 ||
    filters.status.length > 0 ||
    filters.search;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search tasks…"
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition"
        >
          {showAdvanced ? '✕ Close' : '⚙ Filters'}
        </button>
        {hasActiveFilters && (
          <button
            onClick={() =>
              onChange({
                category: undefined,
                priority: [],
                status: [],
                search: '',
              })
            }
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 space-y-4">
          <div>
            <div
              id="category-filter"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Category
            </div>
            <div
              className="flex flex-wrap gap-2"
              aria-labelledby="category-filter"
              role="group"
            >
              <button
                onClick={() => handleCategoryChange(undefined)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  filters.category === undefined
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    handleCategoryChange(filters.category === cat ? undefined : cat)
                  }
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    filters.category === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <div
              id="priority-filter"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Priority
            </div>
            <div
              className="flex gap-2"
              aria-labelledby="priority-filter"
              role="group"
            >
              {PRIORITIES.map((priority) => (
                <button
                  key={priority}
                  onClick={() => handlePriorityChange(priority)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    filters.priority.includes(priority)
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <div
              id="status-filter"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Status
            </div>
            <div
              className="flex gap-2"
              aria-labelledby="status-filter"
              role="group"
            >
              {STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    filters.status.includes(status)
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500'
                  }`}
                >
                  {status === 'in-progress'
                    ? 'In Progress'
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
