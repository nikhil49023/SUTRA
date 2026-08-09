import { RecordingService } from './recordingService';
import { PlaybackController } from './playbackController';
import { LocalStorageReplayAdapter } from './storageAdapter';

export class ReplayEngine {
  private static instance: ReplayEngine;
  private recorder: RecordingService = new RecordingService();
  private controller: PlaybackController = new PlaybackController();
  private storage: LocalStorageReplayAdapter = new LocalStorageReplayAdapter();

  private constructor() {}

  public static getInstance(): ReplayEngine {
    if (!ReplayEngine.instance) {
      ReplayEngine.instance = new ReplayEngine();
    }
    return ReplayEngine.instance;
  }

  public getRecorder(): RecordingService {
    return this.recorder;
  }

  public getController(): PlaybackController {
    return this.controller;
  }

  public getStorage(): LocalStorageReplayAdapter {
    return this.storage;
  }
}

export const replayEngine = ReplayEngine.getInstance();
