/**
 * API client for Location Emitter backend.
 * Handles all REST API calls to the backend server.
 */

// Type definitions matching backend schema
export interface TodoItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'todo' | 'in-progress' | 'done';
  owner?: string | null;
  internal_notes?: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface FetchTodosParams {
  category?: string;
  priority?: string[];
  status?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FetchTodosResponse {
  data: TodoItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface ProgressStats {
  categories: Array<{
    category: string;
    total: number;
    done: number;
    percentage: number;
  }>;
  overall: {
    total: number;
    done: number;
    percentage: number;
  };
}

class TodoClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  async fetchTodos(params: FetchTodosParams): Promise<FetchTodosResponse> {
    const url = new URL(`${API_BASE_URL}/todos`);
    
    if (params.category) url.searchParams.append('category', params.category);
    if (params.priority?.length) url.searchParams.append('priority', params.priority.join(','));
    if (params.status?.length) url.searchParams.append('status', params.status.join(','));
    if (params.search) url.searchParams.append('search', params.search);
    if (params.limit) url.searchParams.append('limit', String(params.limit));
    if (params.offset) url.searchParams.append('offset', String(params.offset));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch todos: ${response.statusText}`);
    }

    return response.json();
  }

  async getTodo(id: string): Promise<{ data: TodoItem }> {
    const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch todo: ${response.statusText}`);
    }

    return response.json();
  }

  async createTodo(todo: Omit<TodoItem, 'id' | 'created_at' | 'updated_at' | 'version'>): Promise<{ data: TodoItem }> {
    const response = await fetch(`${API_BASE_URL}/todos`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(todo),
    });

    if (!response.ok) {
      throw new Error(`Failed to create todo: ${response.statusText}`);
    }

    return response.json();
  }

  async updateTodo(id: string, updates: Partial<TodoItem>): Promise<{ data: TodoItem }> {
    const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update todo: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteTodo(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete todo: ${response.statusText}`);
    }
  }

  async getTodoHistory(id: string): Promise<{ data: Array<any> }> {
    const response = await fetch(`${API_BASE_URL}/todos/${id}/history`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch todo history: ${response.statusText}`);
    }

    return response.json();
  }

  async getProgressStats(): Promise<{ data: ProgressStats }> {
    const response = await fetch(`${API_BASE_URL}/todos/stats/progress`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch progress stats: ${response.statusText}`);
    }

    return response.json();
  }
}

export const todoClient = new TodoClient();
