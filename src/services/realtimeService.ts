import { WebSocketMessage } from '../types/websocket';
import { ErrorLogger } from '../utils/errorLogger';

interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

class RealtimeService {
  private ws: WebSocket | null = null;
  private reconnectCount = 0;
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private config: Required<WebSocketConfig>;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 3000,
      ...config
    };
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.config.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectCount = 0;
      };

      this.ws.onmessage = (event) => {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        ErrorLogger.log(error as Error, 'high', { 
          context: 'websocket',
          url: this.config.url 
        });
      };
    } catch (error) {
      ErrorLogger.log(error as Error, 'high', { context: 'websocket-connect' });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message.payload));
    }
  }

  private handleReconnect(): void {
    if (this.reconnectCount < this.config.reconnectAttempts) {
      this.reconnectCount++;
      setTimeout(() => this.connect(), this.config.reconnectDelay);
    }
  }

  subscribe(type: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.messageHandlers.clear();
  }

  subscribeToGameUpdates(gameId: string, callback: (data: GameUpdate) => void) {
    this.ws?.send(JSON.stringify({
      type: 'subscribe',
      event: 'game_updates',
      gameId
    }));
    
    this.messageHandlers.set(`game_${gameId}`, callback);
  }
}

export const realtimeService = new RealtimeService({
  url: import.meta.env.VITE_WEBSOCKET_URL
}); 