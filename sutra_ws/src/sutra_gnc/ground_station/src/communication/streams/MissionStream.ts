import { WebSocketManager } from '../core/WebSocketManager';

export class MissionStream {
  private static instance: MissionStream;
  private wsManager = WebSocketManager.getChannel('MISSION');

  public static getInstance(): MissionStream {
    if (!MissionStream.instance) {
      MissionStream.instance = new MissionStream();
    }
    return MissionStream.instance;
  }

  public subscribe(cb: (event: any) => void): () => void {
    return this.wsManager.subscribe('mission_event', cb);
  }
}

export const missionStream = MissionStream.getInstance();
