export interface ConnectedOperator {
  operatorId: string;
  callsign: string;
  role: string;
  activeView: string;
  lastActive: string;
}

export interface CollaborationMessage {
  id: string;
  senderCallsign: string;
  text: string;
  timestamp: string;
}

export class CollaborationManager {
  private static instance: CollaborationManager;
  private activeOperators: ConnectedOperator[] = [
    { operatorId: 'OP-01', callsign: 'VANCE-01 (Commander)', role: 'COMMANDER', activeView: 'GIS_MAP', lastActive: 'NOW' },
    { operatorId: 'OP-02', callsign: 'MILLER-02 (Pilot)', role: 'OPERATOR', activeView: 'LIVE_OPERATIONS', lastActive: 'NOW' }
  ];

  private chatMessages: CollaborationMessage[] = [
    { id: 'MSG-01', senderCallsign: 'VANCE-01', text: 'Op Desert Falcon initialized. Sector 4-B cleared for takeoff.', timestamp: '14:30:10' }
  ];

  private constructor() {}

  public static getInstance(): CollaborationManager {
    if (!CollaborationManager.instance) {
      CollaborationManager.instance = new CollaborationManager();
    }
    return CollaborationManager.instance;
  }

  public getActiveOperators(): ConnectedOperator[] {
    return this.activeOperators;
  }

  public getChatMessages(): CollaborationMessage[] {
    return this.chatMessages;
  }

  public sendMessage(senderCallsign: string, text: string): void {
    this.chatMessages.push({
      id: `MSG-${Date.now()}`,
      senderCallsign,
      text,
      timestamp: new Date().toTimeString().split(' ')[0]
    });
  }
}

export const collaborationManager = CollaborationManager.getInstance();
