import { eventBus } from '../services/eventBus';
import { securityManager } from '../security/securityManager';

export class GCSExtensionSDK {
  public static readonly VERSION = '1.5.0-ENTERPRISE';

  public subscribeToEvents(eventType: any, listener: any) {
    eventBus.subscribe(eventType, listener);
  }

  public dispatchCommand(commandName: string): boolean {
    return securityManager.authorizeCommand(commandName);
  }
}
