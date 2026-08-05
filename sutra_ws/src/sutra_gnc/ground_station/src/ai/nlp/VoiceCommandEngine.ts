import { MissionAssistant } from './MissionAssistant';

export class VoiceCommandEngine {
  public static executeVoicePrompt(transcript: string) {
    return MissionAssistant.processQuery(transcript);
  }
}
