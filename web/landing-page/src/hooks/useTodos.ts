/**
 * useTodos Hook
 * Real-time synced todos with WebSocket listener
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FetchTodosParams, todoClient, type TodoItem } from '@/lib/todoClient';

interface UseTodosOptions {
  autoSubscribe?: boolean;
  refetchInterval?: number; // ms
}

export function useTodos(params: FetchTodosParams = {}, options: UseTodosOptions = {}) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const refetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { autoSubscribe = true, refetchInterval = 30000 } = options;

  // Fetch todos from API
  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await todoClient.fetchTodos(params);
      setTodos(response.data);
      setTotal(response.pagination.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch todos');
    } finally {
      setLoading(false);
    }
  }, [params]);

  // Helper to determine WebSocket protocol
  const getWsProtocol = useCallback((): string => {
    if (typeof globalThis !== 'undefined' && globalThis.window) {
      return globalThis.window.location.protocol === 'https:' ? 'wss' : 'ws';
    }
    return 'ws';
  }, []);

  // Helper to get WebSocket host
  const getWsHost = useCallback((): string => {
    if (typeof globalThis !== 'undefined' && globalThis.window) {
      return globalThis.window.location.host;
    }
    return 'localhost:8080';
  }, []);

  // Helper to handle WebSocket messages with reduced nesting
  const handleWsMessage = useCallback(
    (message: {
      type: 'todo:created' | 'todo:updated' | 'todo:deleted';
      data: TodoItem;
    }) => {
      switch (message.type) {
        case 'todo:created':
          setTodos((prev) => [message.data, ...prev]);
          setTotal((prev) => prev + 1);
          break;
        case 'todo:updated':
          setTodos((prev) =>
            prev.map((todo) =>
              todo.id === message.data.id ? message.data : todo
            )
          );
          break;
        case 'todo:deleted':
          setTodos((prev) => prev.filter((todo) => todo.id !== message.data.id));
          setTotal((prev) => Math.max(0, prev - 1));
          break;
        default:
          console.warn('[WS] Unknown message type:', message.type);
      }
    },
    []
  );

  // Setup WebSocket listener
  const setupWebSocket = useCallback(() => {
    if (wsRef.current) {
      return; // Already connected
    }

    const protocol = getWsProtocol();
    const host = getWsHost();
    const wsUrl = `${protocol}://${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] Connected');
        ws.send(JSON.stringify({ type: 'subscribe', room: 'todos' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type: string;
            data: TodoItem;
          };
          if (message.type.startsWith('todo:')) {
            handleWsMessage(message as Parameters<typeof handleWsMessage>[0]);
          }
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] Error:', event);
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        wsRef.current = null;
        // Attempt reconnection after delay
        refetchTimerRef.current = setTimeout(() => {
          if (!wsRef.current) {
            setupWebSocket();
          }
        }, 5000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WS] Failed to connect:', error);
    }
  }, [getWsProtocol, getWsHost, handleWsMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (refetchTimerRef.current) {
        clearInterval(refetchTimerRef.current);
      }
    };
  }, []);

  // Initial fetch and setup
  useEffect(() => {
    fetchTodos();

    if (autoSubscribe) {
      setupWebSocket();
    }

    // Refetch periodically
    refetchTimerRef.current = setInterval(fetchTodos, refetchInterval);

    return () => {
      if (refetchTimerRef.current) {
        clearInterval(refetchTimerRef.current);
      }
    };
  }, [fetchTodos, autoSubscribe, setupWebSocket, refetchInterval]);

  // Methods to update todos
  const updateTodo = useCallback(
    async (id: string, updates: Partial<TodoItem>) => {
      try {
        const response = await todoClient.updateTodo(id, updates);
        setTodos((prev) =>
          prev.map((todo) =>
            todo.id === id ? response.data : todo
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update todo');
        throw err;
      }
    },
    []
  );

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await todoClient.deleteTodo(id);
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
      throw err;
    }
  }, []);

  return {
    todos,
    loading,
    error,
    total,
    refetch: fetchTodos,
    updateTodo,
    deleteTodo,
  };
}
