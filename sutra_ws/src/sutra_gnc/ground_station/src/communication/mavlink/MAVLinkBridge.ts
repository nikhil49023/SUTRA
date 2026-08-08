import type { MAVLinkPacket } from '../types';

type PacketHandler = (packet: MAVLinkPacket) => void;

export class MAVLinkBridge {
  private static handlers: Set<PacketHandler> = new Set();

  public static dispatch(packet: MAVLinkPacket): void {
    this.handlers.forEach((h) => h(packet));
  }

  public static subscribe(handler: PacketHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}
