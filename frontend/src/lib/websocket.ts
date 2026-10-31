/**
 * Real-time WebSocket connection manager with automatic reconnection,
 * query token authentication, heartbeat ping-pong, and typed event listeners.
 */

export type WebSocketEventHandler = (data: any) => void;

export function getWebSocketUrl(path: string): string {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const envWs = process.env.NEXT_PUBLIC_WS_URL;
  let base = "";

  if (envWs) {
    base = envWs.replace(/\/$/, "");
  } else if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_API_URL
      ? new URL(process.env.NEXT_PUBLIC_API_URL).host
      : window.location.hostname === "localhost"
      ? "localhost:8000"
      : window.location.host;
    base = `${proto}//${host}`;
  } else {
    base = "ws://localhost:8000";
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${cleanPath}`);
  if (token) {
    url.searchParams.set("token", token);
  }
  return url.toString();
}

export class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private listeners: Map<string, Set<WebSocketEventHandler>> = new Map();
  private isExplicitlyClosed = false;
  public isConnected = false;

  constructor(path: string) {
    this.url = getWebSocketUrl(path);
  }

  public connect(): void {
    if (typeof window === "undefined") return;
    this.isExplicitlyClosed = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit("open", { status: "connected" });
        this.startHeartbeat();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type || "message";
          this.emit(type, payload.data !== undefined ? payload.data : payload);
          this.emit("*", payload);
        } catch (e) {
          this.emit("raw", event.data);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit("close", { code: event.code, reason: event.reason });

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.emit("error", error);
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "ping" });
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const backoff = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;

    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, backoff);
  }

  public on(event: string, handler: WebSocketEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  public off(event: string, handler: WebSocketEventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          console.error(`Error in WebSocket listener for ${event}:`, err);
        }
      });
    }
  }

  public send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.isConnected = false;
  }
}
