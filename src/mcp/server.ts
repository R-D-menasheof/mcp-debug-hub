import * as http from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Debug } from '@/managers/debug';
import { getLogger } from '@/logger';
import { Mutex } from '@/mutex';
import { registerTools } from './tools';
import { EXTENSION_NAME } from '@/constants';

const logger = getLogger();
const MCP_ENDPOINT = '/mcp';

const HttpStatus = {
  NO_CONTENT: 204,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export class HttpMcpServer {
  private httpServer: http.Server;
  private mcpServer: McpServer;
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(HttpStatus.NO_CONTENT).end();
      return;
    }

    if (req.url?.startsWith(MCP_ENDPOINT)) {
      await this.handleMcpRequest(req, res);
    } else {
      res.writeHead(404).end('Not Found');
    }
  }

  private async handleMcpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      const parsedBody = await this.parseBody(req);

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      await this.mcpServer.connect(transport);
      await transport.handleRequest(req, res, parsedBody);

    } catch (error) {
      logger.error('Error handling MCP request:', error instanceof Error ? error : new Error(String(error)));
      
      if (!res.headersSent) {
        res.writeHead(HttpStatus.INTERNAL_SERVER_ERROR);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        }));
      }
    }
  }

  private parseBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => body += chunk);
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : undefined);
        } catch (err) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    return new Promise<void>((resolve, reject) => {
      this.httpServer.listen(this.port, this.host, () => {
        this.isRunning = true;
        logger.info(`MCP Server (Streamable HTTP) started at http://${this.host}:${this.port}${MCP_ENDPOINT}`);
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
    return `http://${this.host}:${this.port}${MCP_ENDPOINT}`;
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }
}

