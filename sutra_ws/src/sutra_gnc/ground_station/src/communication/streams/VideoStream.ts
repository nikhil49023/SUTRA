import { WebSocketManager } from '../core/WebSocketManager';

export class VideoStream {
  private static instance: VideoStream;
  private wsManager = WebSocketManager.getChannel('VIDEO');

  public static getInstance(): VideoStream {
    if (!VideoStream.instance) {
      VideoStream.instance = new VideoStream();
    }
    return VideoStream.instance;
  }

  public subscribe(cb: (frame: any) => void): () => void {
    return this.wsManager.subscribe('video_frame', cb);
  }
}

export const videoStream = VideoStream.getInstance();
