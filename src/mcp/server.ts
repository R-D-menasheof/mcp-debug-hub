import * as http from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Debug } from '@/managers/debug';
import { getLogger } from '@/logger';
import { Mutex } from '@/mutex';
import { registerTools } from './tools';
import { EXTENSION_NAME } from '@/constants';

const logger = getLogger();
const SSE_ENDPOINT = '/mcp';

const HttpStatus = {
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export class HttpMcpServer {
  private httpServer: http.Server;
  private mcpServer: McpServer;
  private activeConnections: Map<string, SSEServerTransport> = new Map();
  private mutex: Mutex = new Mutex();
  private isRunning: boolean = false;

  constructor(
    private debugManager: Debug,
    private port: number,
    private host: string = 'localhost',
    private version: string = '0.0.0'
  ) {
    this.mcpServer = new McpServer({
      name: EXTENSION_NAME,
      version: this.version,
    });

    registerTools(this.mcpServer, this.debugManager, this.mutex);

    this.httpServer = http.createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    this.httpServer.timeout = 0;
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(HttpStatus.NO_CONTENT).end();
    } else if (req.method === 'GET' && req.url === SSE_ENDPOINT) {
      await this.handleGet(req, res);
    } else if (req.method === 'POST' && req.url?.startsWith(SSE_ENDPOINT)) {
      await this.handlePost(req, res);
    } else {
      logger.warn(`404 Not Found: ${req.method} ${req.url}`);
      res.writeHead(HttpStatus.NOT_FOUND).end('Not Found');
    }
  }

  private async handleGet(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    logger.debug('New SSE connection request');

    try {
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Keep-Alive', 'timeout=0');

      const transport = new SSEServerTransport(SSE_ENDPOINT, res);
      const sessionId = transport.sessionId;

      this.activeConnections.set(sessionId, transport);
      logger.debug(`Tracking connection: ${sessionId}`);

      await this.mcpServer.connect(transport);

      res.on('close', () => {
        this.activeConnections.delete(sessionId);
        logger.debug(`SSE connection closed: ${sessionId}`);
      });

      res.on('error', (error) => {
        logger.error(`SSE connection error for ${sessionId}:`, error);
        this.activeConnections.delete(sessionId);
      });

      req.on('aborted', () => {
        logger.warn(`SSE request aborted for ${sessionId}`);
        this.activeConnections.delete(sessionId);
      });
    } catch (error) {
      logger.error('Error establishing SSE connection:', error instanceof Error ? error : new Error(String(error)));
      if (!res.headersSent) {
        res.writeHead(HttpStatus.INTERNAL_SERVER_ERROR).end('Internal Server Error');
      }
    }
  }

  private async handlePost(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        logger.warn(`POST ${SSE_ENDPOINT} missing sessionId`);
        res.writeHead(HttpStatus.BAD_REQUEST).end('Missing sessionId parameter');
        return;
      }

      const transport = this.activeConnections.get(sessionId);
      if (!transport) {
        logger.warn(`POST ${SSE_ENDPOINT} for unknown session: ${sessionId}`);
        res.writeHead(HttpStatus.NOT_FOUND).end('Session not found');
        return;
      }

      await transport.handlePostMessage(req, res);
    } catch (error) {
      logger.error('Error handling POST message:', error instanceof Error ? error : new Error(String(error)));
      if (!res.headersSent) {
        res.writeHead(HttpStatus.INTERNAL_SERVER_ERROR).end('Internal Server Error');
      }
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    return new Promise<void>((resolve, reject) => {
      this.httpServer.listen(this.port, this.host, () => {
        this.isRunning = true;
        logger.info(`MCP Server started at http://${this.host}:${this.port}${SSE_ENDPOINT}`);
        resolve();
      });
      
      this.httpServer.on('error', (error) => {
        logger.error('HTTP server error:', error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping MCP server...');

    const closePromises: Promise<void>[] = [];
    for (const [sessionId, transport] of this.activeConnections) {
      closePromises.push(
        transport.close()
          .then(() => {
            logger.debug(`Closed SSE connection: ${sessionId}`);
          })
          .catch((error) => {
            logger.error(`Error closing connection ${sessionId}:`, error);
          })
      );
    }
    
    await Promise.allSettled(closePromises);
    this.activeConnections.clear();

    return new Promise<void>((resolve) => {
      this.httpServer.close(() => {
        this.isRunning = false;
        logger.info('MCP Server stopped');
        resolve();
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  getUrl(): string {
    return `http://${this.host}:${this.port}${SSE_ENDPOINT}`;
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }
}

