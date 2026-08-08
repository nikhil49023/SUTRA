export interface WidgetDefinition {
  id: string;
  name: string;
  category: 'TELEMETRY' | 'MISSION' | 'AI' | 'FLEET';
  defaultVisible: boolean;
}

export class WidgetRegistry {
  private static widgets: WidgetDefinition[] = [
    { id: 'widget-telemetry', name: 'Live Telemetry', category: 'TELEMETRY', defaultVisible: true },
    { id: 'widget-battery', name: 'Battery Health', category: 'TELEMETRY', defaultVisible: true },
    { id: 'widget-mission', name: 'Mission Progress', category: 'MISSION', defaultVisible: true },
    { id: 'widget-ai', name: 'AI Threat Radar', category: 'AI', defaultVisible: true },
    { id: 'widget-fleet', name: 'Swarm Fleet Grid', category: 'FLEET', defaultVisible: true },
    { id: 'widget-weather', name: 'Weather Radar', category: 'TELEMETRY', defaultVisible: true }
  ];

  public static getWidgets(): WidgetDefinition[] {
    return [...this.widgets];
  }
}
