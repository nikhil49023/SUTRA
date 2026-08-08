import { WebSocketManager } from '../core/WebSocketManager';

export class AIStream {
  private static instance: AIStream;
  private wsManager = WebSocketManager.getChannel('AI');

  public static getInstance(): AIStream {
    if (!AIStream.instance) {
      AIStream.instance = new AIStream();
    }
    return AIStream.instance;
  }

  public subscribe(cb: (detections: any) => void): () => void {
    return this.wsManager.subscribe('ai_detection', cb);
  }
}

export const aiStream = AIStream.getInstance();
