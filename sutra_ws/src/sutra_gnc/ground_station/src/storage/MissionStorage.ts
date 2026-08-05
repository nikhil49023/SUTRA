export class MissionStorage {
  public static saveMission(id: string, missionData: any): void {
    localStorage.setItem(`sutra_mission_${id}`, JSON.stringify(missionData));
  }

  public static loadMission(id: string): any | null {
    const data = localStorage.getItem(`sutra_mission_${id}`);
    return data ? JSON.parse(data) : null;
  }
}
