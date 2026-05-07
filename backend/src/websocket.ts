/**
 * WebSocket Server for Real-Time Item Synchronization.
 * Broadcasts item updates to all connected clients with role-based filtering.
 */

import { Server as HTTPServer } from 'node:http';
import pino from 'pino';
import { WebSocket, WebSocketServer } from 'ws';

const logger = pino();

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'todo:created' | 'todo:updated' | 'todo:deleted';
  data?: unknown;
  room?: string; // 'todos' or specific category
}

interface ClientSubscription {
  rooms: Set<string>;
  userId: string;
  role: 'admin' | 'internal' | 'stakeholder';
}

export function setupWebSocket(httpServer: HTTPServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<WebSocket, ClientSubscription>();

  wss.on('connection', (ws: WebSocket) => {
    const clientId = Math.random().toString(36).slice(2, 9);
    logger.info({ clientId }, 'WebSocket client connected');

    // Initialize client subscription
    clients.set(ws, {
      rooms: new Set(['todos']), // default room
      userId: '',
      role: 'stakeholder',
    });

    ws.on('message', (message: Buffer) => {
      try {
        const msg = JSON.parse(message.toString()) as WSMessage;
        const clientSub = clients.get(ws);

        if (!clientSub) {
          return;
        }

        switch (msg.type) {
          case 'subscribe':
            if (msg.room) {
              clientSub.rooms.add(msg.room);
              logger.debug({ clientId, room: msg.room }, 'Client subscribed to room');
            }
            break;

          case 'unsubscribe':
            if (msg.room) {
              clientSub.rooms.delete(msg.room);
              logger.debug({ clientId, room: msg.room }, 'Client unsubscribed from room');
            }
            break;

          default:
            logger.warn({ clientId, msgType: msg.type }, 'Unknown message type');
        }
      } catch (error) {
        logger.error({ error }, 'Failed to parse WebSocket message');
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      logger.info({ clientId }, 'WebSocket client disconnected');
    });

    ws.on('error', (error: Error) => {
      logger.error({ error, clientId }, 'WebSocket error');
    });
  });

  /**
   * Broadcasts an item update to all connected clients.
   * Respects RBAC: stakeholders only see P0 items and no internal_notes.
   */
  function broadcastTodoUpdate(
    eventType: 'created' | 'updated' | 'deleted',
    todo: {
      id: string;
      priority: string;
      category: string;
      internal_notes?: string | null;
      [key: string]: unknown;
    }
  ) {
    const message: WSMessage = {
      type: `todo:${eventType}`,
      data: todo,
    };

    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState !== WebSocket.OPEN) {
        return;
      }

      const clientSub = clients.get(client);
      if (!clientSub) {
        return;
      }

      // Check if client is subscribed to the relevant room
      if (!clientSub.rooms.has('todos') && !clientSub.rooms.has(todo.category)) {
        return;
      }

      // RBAC: stakeholders only see P0 items
      if (clientSub.role === 'stakeholder' && todo.priority !== 'P0') {
        return;
      }

      // Remove internal_notes for stakeholders
      const payload = { ...todo };
      if (clientSub.role === 'stakeholder') {
        delete payload.internal_notes;
      }

      client.send(
        JSON.stringify({
          type: message.type,
          data: payload,
        })
      );
    });
  }

  return Object.assign(wss, { broadcastTodoUpdate });
}

export type WebSocketServerWithBroadcast = ReturnType<typeof setupWebSocket>;
