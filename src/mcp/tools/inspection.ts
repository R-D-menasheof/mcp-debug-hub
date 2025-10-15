import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Debug } from '@/managers/debug';
import type { Mutex } from '@/mutex';
import { z } from 'zod';
import { getLogger } from '@/logger';

const logger = getLogger();

const evaluateExpressionSchema = z.object({
  expression: z.string().describe('Expression to evaluate (e.g., "x + y", "user.name", "len(items)"). Uses the current stack frame context.'),
  frameId: z.number().int().optional().describe('Optional stack frame ID from get_stack_frames. If omitted, evaluates in the topmost (current) frame.'),
});

const getVariablesSchema = z.object({
  frameId: z.number().int().optional().describe('Optional stack frame ID from get_stack_frames. If omitted, returns variables from the topmost (current) frame.'),
});

export function registerInspectionTools(
  mcpServer: McpServer,
  debugManager: Debug,
  mutex: Mutex
): void {
  mcpServer.tool(
    'evaluate_expression',
    'Evaluates an expression in the context of a paused debug session and returns its result',
    evaluateExpressionSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug(`[evaluate_expression] ${args.expression}`);
          const result = await debugManager.inspection.evaluateExpression(
            args.expression,
            args.frameId
          );
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          logger.error('[evaluate_expression] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'get_stack_frames',
    'Gets the current call stack frames including file locations, line numbers, and frame IDs',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[get_stack_frames] Getting stack trace');
          
          const session = debugManager.sessions.getActiveSession();
          if (!session) {
            throw new Error('No active debug session');
          }
          
          const threads = await debugManager.execution.getThreads(session);
          if (!threads || threads.length === 0) {
            throw new Error('No active threads found');
          }
          
          const frames = await debugManager.inspection.getStackTrace(threads[0].id);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(frames, null, 2),
            }],
          };
        } catch (error) {
          logger.error('[get_stack_frames] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'get_variables',
    'Gets all variables and their values in the current scope including locals, globals, and closure variables',
    getVariablesSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[get_variables] Getting variables', { frameId: args.frameId });
          
          const scopes = await debugManager.inspection.getScopes(args.frameId);
          
          const allVariables: Record<string, any> = {};
          for (const scope of scopes) {
            if (scope.variablesReference > 0) {
              const variables = await debugManager.inspection.getVariables(scope.variablesReference);
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
          logger.error('[get_variables] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'get_current_location',
    'Returns the exact file path, line number, and column where execution is currently paused in the debugger. Use this to understand the current execution context before inspecting variables or evaluating expressions.',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[get_current_location] Getting current debug location');

          const location = await debugManager.inspection.getCurrentLocation();

          if (!location) {
            throw new Error('Debugger is not paused. Use continue_execution, step_over, or hit a breakpoint first.');
          }

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(location, null, 2),
            }],
          };
        } catch (error) {
          logger.error('[get_current_location] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );
}

