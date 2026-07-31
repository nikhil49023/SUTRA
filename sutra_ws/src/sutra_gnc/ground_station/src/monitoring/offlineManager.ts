import { SyncManager } from './syncManager';

export class OfflineManager {
  private isOnlineStatus: boolean = navigator.onLine;
  private syncManager: SyncManager = new SyncManager();
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
  }

  private handleNetworkChange(online: boolean) {
    this.isOnlineStatus = online;
    if (online) {
      this.syncManager.flushQueue();
    }
    this.listeners.forEach((fn) => fn(online));
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public getSyncManager(): SyncManager {
    return this.syncManager;
  }

  public subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
