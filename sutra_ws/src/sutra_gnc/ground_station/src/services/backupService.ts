export interface SystemBackupData {
  version: string;
  timestamp: string;
  localStorageData: Record<string, string>;
}

export class BackupService {
  /**
   * Generates a full system backup export JSON object
   */
  static exportSystemBackup(): SystemBackupData {
    const localStorageData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageData[key] = localStorage.getItem(key) || '';
      }
    }

    return {
      version: '1.4.0-PROD',
      timestamp: new Date().toISOString(),
      localStorageData
    };
  }

  /**
   * Restores system state from backup JSON data
   */
  static restoreSystemBackup(backup: SystemBackupData): boolean {
    try {
      if (!backup || !backup.localStorageData) return false;
      Object.entries(backup.localStorageData).forEach(([key, val]) => {
        localStorage.setItem(key, val);
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}
