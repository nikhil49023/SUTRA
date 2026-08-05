export class CrashRecovery {
  public static saveStateSnapshot(state: any): void {
    try {
      localStorage.setItem('sutra_gcs_state_backup', JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to persist crash recovery state');
    }
  }

  public static restoreStateSnapshot(): any | null {
    try {
      const data = localStorage.getItem('sutra_gcs_state_backup');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }
}
