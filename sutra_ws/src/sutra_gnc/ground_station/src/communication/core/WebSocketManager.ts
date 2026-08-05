import { WebSocketStateMachine } from './WebSocketStateMachine';
import { ConnectionMetrics } from './ConnectionMetrics';
import { SubscriptionManager, type TopicHandler } from './SubscriptionManager';
import { ReconnectManager } from './ReconnectManager';
import { HeartbeatMonitor } from './HeartbeatMonitor';
import { MessageDispatcher } from './MessageDispatcher';
import type { ConnectionState, ChannelType, NetworkPacket } from './ConnectionState';

export class WebSocketManager {
  private static instances: Map<ChannelType, WebSocketManager> = new Map();

  private channel: ChannelType;
  private url: string;
  private socket: WebSocket | null = null;
  private stateMachine = new WebSocketStateMachine();
  private metrics = new ConnectionMetrics();
  private subscriptions = new SubscriptionManager();
  private reconnectManager = new ReconnectManager();
  private dispatcher: MessageDispatcher;
  private heartbeat: HeartbeatMonitor;

  private outgoingQueue: NetworkPacket[] = [];

  private constructor(channel: ChannelType, url: string) {
    this.channel = channel;
    this.url = url;
    this.dispatcher = new MessageDispatcher(this.subscriptions);

    this.heartbeat = new HeartbeatMonitor(
      () => this.send('PING', { timestamp: Date.now() }),
      () => this.handleHeartbeatTimeout()
    );
  }

  public static getChannel(channel: ChannelType = 'TELEMETRY', url: string = 'ws://localhost:8080/mavlink'): WebSocketManager {
    if (!this.instances.has(channel)) {
      this.instances.set(channel, new WebSocketManager(channel, url));
    }
    return this.instances.get(channel)!;
  }

  public connect(): void {
    if (this.stateMachine.getState() === 'CONNECTED' || this.stateMachine.getState() === 'READY') return;

    this.stateMachine.transitionTo('CONNECTING', `Connecting to ${this.url}`);

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.stateMachine.transitionTo('CONNECTED', 'Socket open');
        this.stateMachine.transitionTo('AUTHENTICATING', 'Authenticating channel handshake');
        
        setTimeout(() => {
          this.stateMachine.transitionTo('READY', 'Channel authenticated and operational');
          this.reconnectManager.reset();
          this.heartbeat.start();
          this.flushOutgoingQueue();
        }, 300);
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.metrics.recordPacket(event.data.length || 100);

        try {
          const packet: NetworkPacket = JSON.parse(event.data);
          if (packet.header?.topic === 'PONG') {
            const rtt = this.heartbeat.registerPong();
            this.metrics.updateLatency(rtt);
            return;
          }
          this.dispatcher.dispatch(packet);
        } catch {
          // Plain telemetry payload fallback
          this.subscriptions.publish('telemetry', JSON.parse(event.data));
        }
      };

      this.socket.onerror = () => {
        this.metrics.incrementDropped();
        this.handleFailure('Socket error encounter');
      };

      this.socket.onclose = () => {
        this.heartbeat.stop();
        this.handleFailure('Socket closed by remote peer');
      };
    } catch (err) {
      this.handleFailure(`Connection exception: ${err}`);
    }
  }

  private handleHeartbeatTimeout(): void {
    this.stateMachine.transitionTo('TIMEOUT', 'Heartbeat ping timeout');
    if (this.socket) {
      this.socket.close();
    }
  }

  private handleFailure(reason: string): void {
    this.stateMachine.transitionTo('RECONNECTING', reason);
    this.metrics.incrementReconnect();

    const scheduled = this.reconnectManager.scheduleReconnect(() => this.connect());
    if (!scheduled) {
      this.stateMachine.transitionTo('FALLBACK', 'Max reconnect attempts exhausted, activating physics simulation fallback');
    }
  }

  public send(topic: string, payload: any): void {
    const packet: NetworkPacket = {
      header: {
        topic,
        channel: this.channel,
        sequence: Date.now(),
        timestamp: Date.now()
      },
      payload
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stateMachine.getState() === 'READY') {
      this.socket.send(JSON.stringify(packet));
    } else {
      this.outgoingQueue.push(packet);
    }
  }

  private flushOutgoingQueue(): void {
    while (this.outgoingQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const packet = this.outgoingQueue.shift()!;
      this.socket.send(JSON.stringify(packet));
    }
  }

  public subscribe<T = any>(topic: string, handler: TopicHandler<T>): () => void {
    return this.subscriptions.subscribe(topic, handler);
  }

  public getState(): ConnectionState {
    return this.stateMachine.getState();
  }

  public getMetrics() {
    return this.metrics.getMetrics();
  }

  public disconnect(): void {
    this.heartbeat.stop();
    this.reconnectManager.reset();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.stateMachine.transitionTo('DISCONNECTED', 'Manual disconnect');
  }
}

export const webSocketManager = WebSocketManager.getChannel('TELEMETRY');
