export class SettingsStorage {
  public static getSetting<T>(key: string, defaultValue: T): T {
    const val = localStorage.getItem(`sutra_setting_${key}`);
    return val ? JSON.parse(val) : defaultValue;
  }

  public static setSetting<T>(key: string, value: T): void {
    localStorage.setItem(`sutra_setting_${key}`, JSON.stringify(value));
  }
}
