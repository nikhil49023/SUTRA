export type TopicHandler<T = any> = (payload: T) => void;

export class SubscriptionManager {
  private subscriptions: Map<string, Set<TopicHandler>> = new Map();

  public subscribe<T = any>(topic: string, handler: TopicHandler<T>): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);

    return () => this.unsubscribe(topic, handler);
  }

  public unsubscribe<T = any>(topic: string, handler: TopicHandler<T>): void {
    if (this.subscriptions.has(topic)) {
      this.subscriptions.get(topic)!.delete(handler);
    }
  }

  public publish<T = any>(topic: string, payload: T): void {
    if (this.subscriptions.has(topic)) {
      this.subscriptions.get(topic)!.forEach((handler) => handler(payload));
    }
  }

  public clear(): void {
    this.subscriptions.clear();
  }
}
