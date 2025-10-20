import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Debug } from '@/managers/debug';
import type { Mutex } from '@/mutex';
import { z } from 'zod';
import { getLogger } from '@/logger';
import { createErrorResult } from '../utils';

const logger = getLogger();

const sessionSchema = z.object({
  sessionId: z.string().optional().describe('Optional session ID. If not provided, operates on the active debug session'),
});

export function registerExecutionTools(
  mcpServer: McpServer,
  debugManager: Debug,
  mutex: Mutex
): void {
  mcpServer.tool(
    'continue_execution',
    'Continues program execution until the next breakpoint is hit or the program terminates. Can target a specific session in multi-process debugging',
    sessionSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          const session = args.sessionId
            ? debugManager.sessions.getSession(args.sessionId)
            : undefined;

          if (args.sessionId && !session) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          logger.debug('[continue_execution] Continuing', { sessionId: args.sessionId });
          await debugManager.execution.continue(session);
          return {
            content: [{
              type: 'text',
              text: `Execution continued${args.sessionId ? ` (session: ${args.sessionId})` : ''}`,
            }],
          };
        } catch (error) {
          logger.debug('[continue_execution] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'pause_execution',
    'Pauses the currently running program at its current execution point. Can target a specific session in multi-process debugging',
    sessionSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          const session = args.sessionId
            ? debugManager.sessions.getSession(args.sessionId)
            : undefined;

          if (args.sessionId && !session) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          logger.debug('[pause_execution] Pausing', { sessionId: args.sessionId });
          await debugManager.execution.pause(session);
          return {
            content: [{
              type: 'text',
              text: `Execution paused${args.sessionId ? ` (session: ${args.sessionId})` : ''}`,
            }],
          };
        } catch (error) {
          logger.debug('[pause_execution] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'step_over',
    'Steps over the current line of code, executing it without entering any function calls. Can target a specific session in multi-process debugging',
    sessionSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          const session = args.sessionId
            ? debugManager.sessions.getSession(args.sessionId)
            : undefined;

          if (args.sessionId && !session) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          logger.debug('[step_over] Stepping over', { sessionId: args.sessionId });
          await debugManager.execution.stepOver(session);
          return {
            content: [{
              type: 'text',
              text: `Stepped over${args.sessionId ? ` (session: ${args.sessionId})` : ''}`,
            }],
          };
        } catch (error) {
          logger.debug('[step_over] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'step_into',
    'Steps into the function call on the current line to debug inside the called function. Can target a specific session in multi-process debugging',
    sessionSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          const session = args.sessionId
            ? debugManager.sessions.getSession(args.sessionId)
            : undefined;

          if (args.sessionId && !session) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          logger.debug('[step_into] Stepping into', { sessionId: args.sessionId });
          await debugManager.execution.stepInto(session);
          return {
            content: [{
              type: 'text',
              text: `Stepped into${args.sessionId ? ` (session: ${args.sessionId})` : ''}`,
            }],
          };
        } catch (error) {
          logger.debug('[step_into] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'step_out',
    'Steps out of the current function, continuing execution until it returns to the calling function. Can target a specific session in multi-process debugging',
    sessionSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          const session = args.sessionId
            ? debugManager.sessions.getSession(args.sessionId)
            : undefined;

          if (args.sessionId && !session) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          logger.debug('[step_out] Stepping out', { sessionId: args.sessionId });
          await debugManager.execution.stepOut(session);
          return {
            content: [{
              type: 'text',
              text: `Stepped out${args.sessionId ? ` (session: ${args.sessionId})` : ''}`,
            }],
          };
        } catch (error) {
          logger.debug('[step_out] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );
}
