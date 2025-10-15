import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Debug } from '@/managers/debug';
import type { Mutex } from '@/mutex';
import { getLogger } from '@/logger';

const logger = getLogger();

export function registerExecutionTools(
  mcpServer: McpServer,
  debugManager: Debug,
  mutex: Mutex
): void {
  mcpServer.tool(
    'continue_execution',
    'Continues program execution until the next breakpoint is hit or the program terminates',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[continue_execution] Continuing');
          await debugManager.execution.continue();
          return {
            content: [{
              type: 'text',
              text: 'Execution continued',
            }],
          };
        } catch (error) {
          logger.error('[continue_execution] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'pause_execution',
    'Pauses the currently running program at its current execution point',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[pause_execution] Pausing');
          await debugManager.execution.pause();
          return {
            content: [{
              type: 'text',
              text: 'Execution paused',
            }],
          };
        } catch (error) {
          logger.error('[pause_execution] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'step_over',
    'Steps over the current line of code, executing it without entering any function calls',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[step_over] Stepping over');
          await debugManager.execution.stepOver();
          return {
            content: [{
              type: 'text',
              text: 'Stepped over',
            }],
          };
        } catch (error) {
          logger.error('[step_over] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'step_into',
    'Steps into the function call on the current line to debug inside the called function',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[step_into] Stepping into');
          await debugManager.execution.stepInto();
          return {
            content: [{
              type: 'text',
              text: 'Stepped into',
            }],
          };
        } catch (error) {
          logger.error('[step_into] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'step_out',
    'Steps out of the current function, continuing execution until it returns to the calling function',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[step_out] Stepping out');
          await debugManager.execution.stepOut();
          return {
            content: [{
              type: 'text',
              text: 'Stepped out',
            }],
          };
        } catch (error) {
          logger.error('[step_out] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );
}

