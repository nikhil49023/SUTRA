import type { ParsedCommand, StructuredActionType } from '../types';

export class CommandParser {
  /**
   * Parse natural language command prompt into structured mission action.
   */
  public static parse(utterance: string): ParsedCommand {
    const text = utterance.trim().toLowerCase();

    if (text.includes('grid') || text.includes('pattern') || text.includes('search grid')) {
      return {
        rawUtterance: utterance,
        actionType: 'CREATE_GRID_MISSION',
        intentConfidence: 96,
        parameters: { patternType: 'GRID' },
        explanation: 'Converted intent to generate an autonomous grid search flight pattern.'
      };
    }

    if (text.includes('return') || text.includes('rtl') || text.includes('return all')) {
      return {
        rawUtterance: utterance,
        actionType: 'RETURN_ALL_DRONES',
        intentConfidence: 98,
        parameters: { command: 'RTL_ALL' },
        explanation: 'Converted intent to issue Return-To-Launch (RTL) to active fleet.'
      };
    }

    if (text.includes('no-fly') || text.includes('geofence') || text.includes('highlight')) {
      return {
        rawUtterance: utterance,
        actionType: 'HIGHLIGHT_NO_FLY_ZONES',
        intentConfidence: 95,
        parameters: { toggle: 'NO_FLY_ZONES' },
        explanation: 'Converted intent to highlight restricted No-Fly airspace perimeters.'
      };
    }

    if (text.includes('battery') || text.includes('remaining') || text.includes('power')) {
      return {
        rawUtterance: utterance,
        actionType: 'ESTIMATE_BATTERY',
        intentConfidence: 94,
        parameters: { target: 'BATTERY_ESTIMATE' },
        explanation: 'Converted intent to run mission battery estimation report.'
      };
    }

    if (text.includes('pause') || text.includes('hold')) {
      return {
        rawUtterance: utterance,
        actionType: 'PAUSE_MISSION',
        intentConfidence: 97,
        parameters: { command: 'PAUSE' },
        explanation: 'Converted intent to pause flight execution and hold position.'
      };
    }

    if (text.includes('resume') || text.includes('continue')) {
      return {
        rawUtterance: utterance,
        actionType: 'RESUME_MISSION',
        intentConfidence: 97,
        parameters: { command: 'RESUME' },
        explanation: 'Converted intent to resume active waypoint trajectory.'
      };
    }

    if (text.includes('land') || text.includes('touchdown')) {
      return {
        rawUtterance: utterance,
        actionType: 'LAND_DRONE',
        intentConfidence: 96,
        parameters: { command: 'LAND' },
        explanation: 'Converted intent to initiate autonomous precision landing.'
      };
    }

    return {
      rawUtterance: utterance,
      actionType: 'UNKNOWN',
      intentConfidence: 35,
      parameters: {},
      explanation: 'Could not classify command intent. Supported commands: Grid, RTL, Pause, Resume, Land, Battery, Geofence.'
    };
  }
}
