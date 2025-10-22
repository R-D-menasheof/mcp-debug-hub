import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Debug } from '@/managers/debug';
import type { Mutex } from '@/mutex';
import { getLogger } from '@/logger';
import { registerSessionTools } from '@/mcp/tools/session';
import { registerBreakpointTools } from '@/mcp/tools/breakpoint';
import { registerExecutionTools } from '@/mcp/tools/execution';
import { registerInspectionTools } from '@/mcp/tools/inspection';

const logger = getLogger();

export function registerTools(
  mcpServer: McpServer,
  debugManager: Debug,
  mutex: Mutex
): void {
  logger.info('Registering MCP tools...');

  registerBreakpointTools(mcpServer, debugManager, mutex);
  registerExecutionTools(mcpServer, debugManager, mutex);
  registerInspectionTools(mcpServer, debugManager, mutex);
  registerSessionTools(mcpServer, debugManager, mutex);

  logger.info('✓ All MCP tools registered');
}
