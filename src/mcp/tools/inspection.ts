import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Debug } from '@/managers/debug';
import type { Mutex } from '@/mutex';
import { z } from 'zod';
import { getLogger } from '@/logger';
import { createErrorResult } from '../utils';

const logger = getLogger();

const evaluateExpressionSchema = z.object({
  expression: z.string().describe('Expression to evaluate (e.g., "x + y", "user.name", "len(items)"). Uses the current stack frame context.'),
  frameId: z.number().int().optional().describe('Optional stack frame ID from get_stack_frames. If omitted, evaluates in the topmost (current) frame.'),
  sessionId: z.string().optional().describe('Optional session ID. If not provided, operates on the active debug session'),
});

const getVariablesSchema = z.object({
  frameId: z.number().int().optional().describe('Optional stack frame ID from get_stack_frames. If omitted, returns variables from the topmost (current) frame.'),
  sessionId: z.string().optional().describe('Optional session ID. If not provided, operates on the active debug session'),
});

const sessionSchema = z.object({
  sessionId: z.string().optional().describe('Optional session ID. If not provided, operates on the active debug session'),
});

const getStackFramesSchema = z.object({
  threadId: z.number().int().optional().describe('Optional thread ID. If omitted, returns stack frames from the first thread. Use get_current_location to see all thread IDs'),
  sessionId: z.string().optional().describe('Optional session ID. If not provided, operates on the active debug session'),
});

export function registerInspectionTools(
  mcpServer: McpServer,
  debugManager: Debug,
  mutex: Mutex
): void {
  mcpServer.tool(
    'evaluate_expression',
    'Evaluates an expression in the context of a paused debug session and returns its result. Can target a specific session in multi-process debugging',
    evaluateExpressionSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          const session = args.sessionId
            ? debugManager.sessions.getSession(args.sessionId)
            : undefined;

          if (args.sessionId && !session) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          logger.debug(`[evaluate_expression] ${args.expression}`, { sessionId: args.sessionId });
          const result = await debugManager.inspection.evaluateExpression(
            args.expression,
            args.frameId,
            undefined,
            session
          );
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          logger.debug('[evaluate_expression] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'list_threads',
    'Lists all threads in the debug session with their IDs and names. Use this to see which threads are available before calling get_stack_frames or get_current_location with a specific threadId',
    sessionSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          const session = args.sessionId
            ? debugManager.sessions.getSession(args.sessionId)
            : debugManager.sessions.getActiveSession();

          if (args.sessionId && !session) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          if (!session) {
            throw new Error('No active debug session');
          }

          logger.debug('[list_threads] Listing threads', { sessionId: args.sessionId });

          const threads = await debugManager.execution.getThreads(session);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ threads, total: threads.length }, null, 2),
            }],
          };
        } catch (error) {
          logger.debug('[list_threads] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'get_stack_frames',
    'Gets the current call stack frames including file locations, line numbers, and frame IDs. Can optionally specify which thread to get frames from. Use list_threads to see all available threads and their IDs',
    getStackFramesSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          const session = args.sessionId
            ? debugManager.sessions.getSession(args.sessionId)
            : debugManager.sessions.getActiveSession();

          if (args.sessionId && !session) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          if (!session) {
            throw new Error('No active debug session');
          }

          logger.debug('[get_stack_frames] Getting stack trace', { threadId: args.threadId, sessionId: args.sessionId });

          let targetThreadId = args.threadId;

          if (!targetThreadId) {
            const threads = await debugManager.execution.getThreads(session);
            if (!threads || threads.length === 0) {
              throw new Error('No active threads found');
            }
            targetThreadId = threads[0].id;
          }
          
          const frames = await debugManager.inspection.getStackTrace(targetThreadId, session);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(frames, null, 2),
            }],
          };
        } catch (error) {
          logger.debug('[get_stack_frames] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'get_variables',
    'Gets all variables and their values in the current scope including locals, globals, and closure variables. Can target a specific session in multi-process debugging',
    getVariablesSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          const session = args.sessionId
            ? debugManager.sessions.getSession(args.sessionId)
            : undefined;

          if (args.sessionId && !session) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          logger.debug('[get_variables] Getting variables', { frameId: args.frameId, sessionId: args.sessionId });

          const scopes = await debugManager.inspection.getScopes(args.frameId, session);
          
          const allVariables: Record<string, any> = {};
          for (const scope of scopes) {
            if (scope.variablesReference > 0) {
              const variables = await debugManager.inspection.getVariables(scope.variablesReference, session);
              allVariables[scope.name] = variables;
            }
          }
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(allVariables, null, 2),
            }],
          };
        } catch (error) {
          logger.debug('[get_variables] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'get_current_location',
    'Returns the file path, line number, and column where execution is currently paused for ALL threads in the debug session. Each thread location includes threadId and threadName. For multi-process applications, use sessionId to target specific process',
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

          logger.debug('[get_current_location] Getting current debug locations', { sessionId: args.sessionId });

          const locations = await debugManager.inspection.getCurrentLocation(session);

          if (locations.length === 0) {
            throw new Error('No threads are paused. Use continue_execution, step_over, or hit a breakpoint first.');
          }

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ threads: locations, total: locations.length }, null, 2),
            }],
          };
        } catch (error) {
          logger.debug('[get_current_location] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );
}
