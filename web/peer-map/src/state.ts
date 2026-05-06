import { loadHistorySorted, type HistoryRow } from './historyStore.js';
import { LS_THEME } from './storageKeys.js';

export type ThemePref = 'system' | 'light' | 'dark';

export interface AppState {
  historyRows: HistoryRow[];
  theme: ThemePref;
  isOnline: boolean;
  ingestStatus: string;
  serialRxCount: number;
}

class StateStore {
  private state: AppState = {
    historyRows: [],
    theme: 'system',
    isOnline: navigator.onLine,
    ingestStatus: '',
    serialRxCount: 0,
  };

  private listeners: Set<(state: AppState) => void> = new Set();

  constructor() {
    this.state.theme = this.getStoredTheme();
    window.addEventListener('online', () => this.update({ isOnline: true }));
    window.addEventListener('offline', () => this.update({ isOnline: false }));
  }

  getState() {
    return { ...this.state };
  }

  update(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  subscribe(listener: (state: AppState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  private getStoredTheme(): ThemePref {
    try {
      const v = localStorage.getItem(LS_THEME);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch { /* ignore */ }
    return 'system';
  }

  async refreshHistory() {
    try {
      const rows = await loadHistorySorted();
      this.update({ historyRows: rows });
    } catch {
      this.update({ historyRows: [] });
    }
  }

  setTheme(pref: ThemePref) {
    try {
      localStorage.setItem(LS_THEME, pref);
    } catch { /* ignore */ }
    this.update({ theme: pref });
  }
}

export const store = new StateStore();
