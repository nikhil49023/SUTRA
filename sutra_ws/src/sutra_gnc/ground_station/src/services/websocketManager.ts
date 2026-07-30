export type MessageHandler = (data: any) => void;

export class WebSocketManager {
  private url: string;
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectIntervalMs: number = 3000;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private mockFallbackInterval: number | null = null;
  private useMockFallback: boolean = true;

  constructor(url: string = 'ws://localhost:8080/mavlink') {
    this.url = url;
  }

  public connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.stopMockFallback();
        this.emit('connection', { status: 'CONNECTED', url: this.url });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.topic) {
            this.emit(payload.topic, payload.data);
          } else {
            this.emit('telemetry', payload);
          }
        } catch (err) {
          console.warn('Failed to parse WS payload', err);
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.startMockFallback();
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.startMockFallback();
        // Try reconnect after delay
        setTimeout(() => {
          if (!this.isConnected) {
            this.connect();
          }
        }, this.reconnectIntervalMs);
      };
    } catch (e) {
      this.isConnected = false;
      this.startMockFallback();
    }
  }

  public subscribe(topic: string, handler: MessageHandler) {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(handler);
  }

  public unsubscribe(topic: string, handler: MessageHandler) {
    if (this.listeners.has(topic)) {
      this.listeners.get(topic)!.delete(handler);
    }
  }

  public emit(topic: string, data: any) {
    if (this.listeners.has(topic)) {
      this.listeners.get(topic)!.forEach((handler) => handler(data));
    }
  }

  public send(topic: string, payload: any) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ topic, payload }));
    }
  }

  private startMockFallback() {
    if (this.mockFallbackInterval !== null || !this.useMockFallback) return;
    this.emit('connection', { status: 'FALLBACK_MOCK', url: 'Mock Physics Engine' });

    // Generate telemetry frames at 5Hz
    this.mockFallbackInterval = window.setInterval(() => {
      const now = new Date();
      const mockData = {
        timestamp: now.toISOString(),
        timeFormatted: now.toTimeString().split(' ')[0],
        pitch: +(Math.sin(now.getTime() / 1500) * 4 + 1.2).toFixed(1),
        roll: +(Math.cos(now.getTime() / 1200) * 3 - 0.8).toFixed(1),
        yaw: Math.round((142 + Math.sin(now.getTime() / 4000) * 15 + 360) % 360),
        altitudeAGL: Math.round(450 + Math.sin(now.getTime() / 2000) * 5),
        altitudeMSL: Math.round(1280 + Math.sin(now.getTime() / 2000) * 5),
        groundSpeed: +(54.2 + Math.sin(now.getTime() / 3000) * 3).toFixed(1),
        airSpeed: +(58.0 + Math.cos(now.getTime() / 2500) * 2).toFixed(1),
        climbRate: +(Math.sin(now.getTime() / 1800) * 1.5).toFixed(1),
        batteryVoltage: +(24.4 - (now.getTime() % 1000000) / 200000).toFixed(2),
        batteryCurrent: +(18.5 + Math.random() * 2 - 1).toFixed(1),
        batteryRemaining: Math.max(15, Math.round(84 - (now.getTime() % 3600000) / 120000)),
        satellites: 21 + (Math.random() > 0.8 ? 1 : 0),
        linkLatencyMs: Math.round(12 + Math.random() * 4),
        flightMode: 'AUTO_MISSION'
      };

      this.emit('telemetry', mockData);
    }, 200);
  }

  private stopMockFallback() {
    if (this.mockFallbackInterval !== null) {
      clearInterval(this.mockFallbackInterval);
      this.mockFallbackInterval = null;
    }
  }

  public disconnect() {
    this.stopMockFallback();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
