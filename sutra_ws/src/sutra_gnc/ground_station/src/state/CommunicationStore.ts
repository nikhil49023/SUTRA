import { useState, useEffect } from 'react';
import { WebSocketManager } from '../communication/core/WebSocketManager';
import type { ConnectionState } from '../communication/core/ConnectionState';

type CommListener = () => void;

class CommunicationStore {
  private wsManager = WebSocketManager.getChannel('TELEMETRY');
  private listeners: Set<CommListener> = new Set();

  public getState(): ConnectionState {
    return this.wsManager.getState();
  }

  public getMetrics() {
    return this.wsManager.getMetrics();
  }

  public subscribe(listener: CommListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const communicationStore = new CommunicationStore();

export function useCommunicationStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return communicationStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    state: communicationStore.getState(),
    metrics: communicationStore.getMetrics()
  };
}
