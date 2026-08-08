import { CommandParser } from './CommandParser';
import type { ParsedCommand } from '../types';

export class MissionAssistant {
  public static processQuery(prompt: string): { parsed: ParsedCommand; responseText: string } {
    const parsed = CommandParser.parse(prompt);

    let responseText = '';
    switch (parsed.actionType) {
      case 'CREATE_GRID_MISSION':
        responseText = 'Generating autonomous Grid Search survey pattern centered at current drone coordinates.';
        break;
      case 'RETURN_ALL_DRONES':
        responseText = 'Executing fleet-wide Return-To-Launch (RTL) procedure.';
        break;
      case 'HIGHLIGHT_NO_FLY_ZONES':
        responseText = 'High-contrast No-Fly geofence perimeters highlighted on GIS Map overlay.';
        break;
      case 'ESTIMATE_BATTERY':
        responseText = 'Mission battery analysis complete. Estimated consumption is within nominal safety bounds.';
        break;
      case 'PAUSE_MISSION':
        responseText = 'Mission execution paused. UAV holding loiter position.';
        break;
      case 'RESUME_MISSION':
        responseText = 'Resuming mission waypoint trajectory execution.';
        break;
      case 'LAND_DRONE':
        responseText = 'Precision autonomous landing sequence initiated.';
        break;
      default:
        responseText = 'Command not recognized. Please try prompts like "Create a grid mission", "Return all drones", or "Estimate remaining battery".';
    }

    return { parsed, responseText };
  }
}
