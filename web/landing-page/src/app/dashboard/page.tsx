/**
 * Dashboard Page - Main TODO Tracker Interface
 * Shows master readiness items with filtering and progress tracking
 */

'use client';

import { ProgressStats } from '@/components/dashboard/ProgressStats';
import { TodoFilters } from '@/components/dashboard/TodoFilters';
import { TodoTable } from '@/components/dashboard/TodoTable';
import { useTodos } from '@/hooks/useTodos';
import { useState } from 'react';

export default function DashboardPage() {
  const [filters, setFilters] = useState({
    category: undefined as string | undefined,
    priority: [] as string[],
    status: [] as string[],
    search: '',
  });

  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
  });

  const { todos, loading, error, total, refetch, updateTodo, deleteTodo } = useTodos(
    {
      category: filters.category,
      priority: filters.priority.length > 0 ? filters.priority : undefined,
      status: filters.status.length > 0 ? filters.status : undefined,
      search: filters.search,
      limit: pagination.limit,
      offset: pagination.offset,
    },
    { autoSubscribe: true, refetchInterval: 30000 }
  );

  const handleFilterChange = (newFilters: {
    category?: string;
    priority: string[];
    status: string[];
    search: string;
  }) => {
    setFilters(newFilters as typeof filters);
    setPagination({ limit: 50, offset: 0 }); // Reset pagination
  };

  const handlePageChange = (offset: number) => {
    setPagination((prev) => ({ ...prev, offset }));
  };

  const handleTodoStatusChange = async (todoId: string, newStatus: string) => {
    try {
      await updateTodo(todoId, { status: newStatus as any });
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  const handleTodoDelete = async (todoId: string) => {
    if (confirm('Are you sure you want to delete this todo?')) {
      try {
        await deleteTodo(todoId);
      } catch (err) {
        console.error('Failed to delete todo:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Location Emitter
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Master Readiness TODO List
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total Items: <span className="font-semibold">{total}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <ProgressStats />

        {/* Filters and Controls */}
        <div className="mb-8">
          <TodoFilters filters={filters} onChange={handleFilterChange} />
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">Error: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading TODOs...</p>
            </div>
          </div>
        )}

        {/* Todos Table */}
        {!loading && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <TodoTable
              todos={todos}
              onStatusChange={handleTodoStatusChange}
              onDelete={handleTodoDelete}
            />

            {/* Pagination */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, total)} of {total} items
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                  disabled={pagination.offset === 0}
                  className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                  disabled={pagination.offset + pagination.limit >= total}
                  className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && todos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400">No TODOs found matching your filters.</p>
          </div>
        )}
      </main>
    </div>
  );
}
