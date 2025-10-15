import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Debug } from '@/managers/debug';
import type { Mutex } from '@/mutex';
import { z } from 'zod';
import { getLogger } from '@/logger';

const logger = getLogger();

const breakpointSchema = z.object({
  file: z.string().describe('Absolute path to the source file (e.g., "/workspace/src/main.py")'),
  line: z.number().int().positive().describe('Line number where the breakpoint should be set (1-based, first line is 1)'),
  condition: z.string().optional().describe('Optional condition expression - breakpoint only triggers when this evaluates to true (e.g., "x > 10")'),
  hitCondition: z.string().optional().describe('Optional hit count condition (e.g., ">5" means break after 5th hit, "==3" means break only on 3rd hit)'),
  logMessage: z.string().optional().describe('Optional log message to output instead of breaking (logpoint). Use {expression} for variable interpolation.'),
});

const setBreakpointSchema = breakpointSchema;

const setBatchBreakpointsSchema = z.object({
  breakpoints: z.array(breakpointSchema).min(1).max(50).describe('Array of breakpoints to set (minimum 1, maximum 50 per batch)'),
});

const removeBreakpointSchema = z.object({
  file: z.string().describe('Absolute path to the source file containing the breakpoint to remove'),
  line: z.number().int().positive().describe('Line number of the breakpoint to remove (1-based)'),
});

export function registerBreakpointTools(
  mcpServer: McpServer,
  debugManager: Debug,
  mutex: Mutex
): void {
  mcpServer.tool(
    'set_breakpoint',
    'Sets a breakpoint at a specific line in a source file with optional conditions, hit counts, or log messages',
    setBreakpointSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug(`[set_breakpoint] ${args.file}:${args.line}`);
          const bp = await debugManager.breakpoints.set(
            args.file,
            args.line,
            {
              condition: args.condition,
              hitCondition: args.hitCondition,
              logMessage: args.logMessage,
            }
          );
          return {
            content: [{
              type: 'text',
              text: `Breakpoint set at ${args.file}:${bp.line}${bp.verified ? ' (verified)' : ' (pending)'}`,
            }],
          };
        } catch (error) {
          logger.error('[set_breakpoint] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'set_breakpoints',
    'Sets multiple breakpoints at once. Returns success/failure status for each breakpoint individually.',
    setBatchBreakpointsSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug(`[set_breakpoints] Setting ${args.breakpoints.length} breakpoints`);
          
          const results = await Promise.allSettled(
            args.breakpoints.map(async (bp) => {
              const breakpoint = await debugManager.breakpoints.set(
                bp.file,
                bp.line,
                {
                  condition: bp.condition,
                  hitCondition: bp.hitCondition,
                  logMessage: bp.logMessage,
                }
              );
              return {
                file: bp.file,
                line: bp.line,
                status: 'success' as const,
                id: breakpoint.id,
                verified: breakpoint.verified,
              };
            })
          );

          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const failedCount = results.filter(r => r.status === 'rejected').length;

          const detailedResults = results.map((result, index) => {
            const bp = args.breakpoints[index];
            if (result.status === 'fulfilled') {
              return result.value;
            } else {
              return {
                file: bp.file,
                line: bp.line,
                status: 'failed' as const,
                error: result.reason instanceof Error ? result.reason.message : String(result.reason),
              };
            }
          });

          const summary = {
            total: args.breakpoints.length,
            successful: successCount,
            failed: failedCount,
            results: detailedResults,
          };

          logger.info(`[set_breakpoints] Completed: ${successCount} succeeded, ${failedCount} failed`);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            }],
          };
        } catch (error) {
          logger.error('[set_breakpoints] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'remove_breakpoint',
    'Removes a breakpoint from a specific line in a source file',
    removeBreakpointSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug(`[remove_breakpoint] ${args.file}:${args.line}`);
          await debugManager.breakpoints.remove(args.file, args.line);
          return {
            content: [{
              type: 'text',
              text: `Breakpoint removed from ${args.file}:${args.line}`,
            }],
          };
        } catch (error) {
          logger.error('[remove_breakpoint] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'list_breakpoints',
    'Lists all breakpoints currently set in the workspace including their locations, conditions, and verification status',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[list_breakpoints] Getting all breakpoints');
          const breakpoints = await debugManager.breakpoints.getAll();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(breakpoints, null, 2),
            }],
          };
        } catch (error) {
          logger.error('[list_breakpoints] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'clear_all_breakpoints',
    'Clears all breakpoints from all files in the workspace',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[clear_all_breakpoints] Clearing all');
          await debugManager.breakpoints.clearAll();
          return {
            content: [{
              type: 'text',
              text: 'All breakpoints cleared',
            }],
          };
        } catch (error) {
          logger.error('[clear_all_breakpoints] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );
}

