export class CommandValidator {
  private static readonly APPROVED_COMMANDS = new Set([
    'ARM',
    'DISARM',
    'TAKEOFF',
    'RTH',
    'LAND',
    'SET_MODE',
    'EMERGENCY_KILL',
    'REBOOT'
  ]);

  /**
   * Validates command name against approved whitelist (Anti-Command Injection)
   */
  static validateCommand(commandName: string): boolean {
    return this.APPROVED_COMMANDS.has(commandName.toUpperCase());
  }

  /**
   * Validates target waypoint altitude ceiling
   */
  static validateAltitude(altM: number, maxCeilingM: number = 1000): boolean {
    return !isNaN(altM) && altM >= 0 && altM <= maxCeilingM;
  }
}
