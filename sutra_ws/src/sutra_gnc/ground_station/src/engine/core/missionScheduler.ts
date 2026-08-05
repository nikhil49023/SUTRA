import { missionStateMachine } from './missionStateMachine';
import { missionTimeline } from '../reports/missionTimeline';

export class MissionScheduler {
  private timerId: any = null;

  public scheduleMissionStart(delaySeconds: number, onStart: () => void): void {
    this.cancelSchedule();

    missionTimeline.addEvent(
      missionStateMachine.getState(),
      'COMMAND',
      `Mission scheduled to launch in ${delaySeconds} seconds.`
    );

    this.timerId = setTimeout(() => {
      onStart();
    }, delaySeconds * 1000);
  }

  public cancelSchedule(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

export const missionScheduler = new MissionScheduler();
