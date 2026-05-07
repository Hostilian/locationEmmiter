/**
 * ProgressStats Component
 * Shows overall progress and per-category breakdown
 */

'use client';

import { todoClient, type ProgressStats } from '@/lib/todoClient';
import { useEffect, useState } from 'react';

export function ProgressStats() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await todoClient.getProgressStats();
        setStats(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refetch every 30s

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse h-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />;
  }

  if (error || !stats) {
    return null;
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Overall Progress */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Overall Progress
          </h2>
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.overall.percentage}%
          </span>
        </div>
        <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 dark:bg-blue-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${stats.overall.percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm text-slate-600 dark:text-slate-400">
          <span>{stats.overall.done} completed</span>
          <span>{stats.overall.total} total items</span>
        </div>
      </div>

      {/* Per-Category Progress */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Progress by Category
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.categories.map((cat) => (
            <div
              key={cat.category}
              className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">
                  {cat.category}
                </h4>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {cat.percentage}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-600 dark:text-slate-400">
                <span>{cat.done}/{cat.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
