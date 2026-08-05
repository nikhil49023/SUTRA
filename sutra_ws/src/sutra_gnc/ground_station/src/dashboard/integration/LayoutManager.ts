export class LayoutManager {
  private static leftSidebarCollapsed: boolean = false;
  private static rightInspectorCollapsed: boolean = false;
  private static bottomConsoleCollapsed: boolean = false;

  public static isLeftCollapsed(): boolean { return this.leftSidebarCollapsed; }
  public static toggleLeft(): boolean {
    this.leftSidebarCollapsed = !this.leftSidebarCollapsed;
    return this.leftSidebarCollapsed;
  }

  public static isRightCollapsed(): boolean { return this.rightInspectorCollapsed; }
  public static toggleRight(): boolean {
    this.rightInspectorCollapsed = !this.rightInspectorCollapsed;
    return this.rightInspectorCollapsed;
  }

  public static isBottomCollapsed(): boolean { return this.bottomConsoleCollapsed; }
  public static toggleBottom(): boolean {
    this.bottomConsoleCollapsed = !this.bottomConsoleCollapsed;
    return this.bottomConsoleCollapsed;
  }
}
