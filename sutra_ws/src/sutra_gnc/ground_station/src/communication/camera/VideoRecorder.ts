export class VideoRecorder {
  private static isRecording = false;

  public static toggleRecording(): boolean {
    this.isRecording = !this.isRecording;
    return this.isRecording;
  }

  public static takeSnapshot(): string {
    return `snapshot-${Date.now()}.png`;
  }
}
