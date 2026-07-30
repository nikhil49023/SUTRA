import type { SyncQueueItem } from './types';

export class SyncManager {
  private queue: SyncQueueItem[] = [];

  public enqueue(type: SyncQueueItem['type'], payload: any): void {
    const item: SyncQueueItem = {
      id: `SYNC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      payload,
      queuedAt: new Date().toISOString(),
      retryCount: 0
    };
    this.queue.push(item);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public async flushQueue(): Promise<number> {
    if (this.queue.length === 0) return 0;

    const count = this.queue.length;
    // Process and clear queued items
    this.queue = [];
    return count;
  }
}
