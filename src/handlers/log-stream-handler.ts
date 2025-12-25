import type { WSContext } from 'hono/ws';
import * as winston from 'winston';
import logger from '../utils/logger';

/**
 * WebSocket log streaming handler
 * Manages WebSocket connections and broadcasts log messages to all connected clients
 */
class LogStreamHandler {
  private clients: Set<WSContext> = new Set();

  /**
   * Add a WebSocket client to receive log broadcasts
   * @param ws - WebSocket context
   */
  addClient(ws: WSContext): void {
    this.clients.add(ws);
    logger.info('Log stream client connected', {
      totalClients: this.clients.size,
    });
  }

  /**
   * Remove a WebSocket client from receiving log broadcasts
   * @param ws - WebSocket context
   */
  removeClient(ws: WSContext): void {
    this.clients.delete(ws);
    logger.info('Log stream client disconnected', {
      totalClients: this.clients.size,
    });
  }

  /**
   * Broadcast a log message to all connected clients
   * @param message - Formatted log message
   */
  broadcast(message: string): void {
    // Remove any clients that have closed connections
    const deadClients: WSContext[] = [];

    for (const client of this.clients) {
      try {
        // Check if the connection is still open
        if (client.readyState === 1) {
          // 1 = WebSocket.OPEN
          client.send(message);
        } else {
          deadClients.push(client);
        }
      } catch (error) {
        // If sending fails, mark client for removal
        deadClients.push(client);
      }
    }

    // Clean up dead connections
    for (const deadClient of deadClients) {
      this.clients.delete(deadClient);
    }
  }

  /**
   * Get the number of currently connected clients
   * @returns Number of active WebSocket connections
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

/**
 * Custom Winston transport that broadcasts logs to WebSocket clients
 */
export class WebSocketTransport extends winston.transports.Stream {
  constructor(handler: LogStreamHandler, opts?: any) {
    // Create a custom stream that forwards to our handler
    const stream = new (require('stream').Writable)({
      write: (chunk: Buffer, _encoding: string, callback: () => void) => {
        try {
          handler.broadcast(chunk.toString());
          callback();
        } catch (error) {
          callback();
        }
      },
    });

    super({ stream, ...opts });
  }
}

// Export singleton instance
export const logStreamHandler = new LogStreamHandler();
