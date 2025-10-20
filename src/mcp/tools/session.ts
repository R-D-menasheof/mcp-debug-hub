import * as vscode from 'vscode';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Debug } from '@/managers/debug';
import type { Mutex } from '@/mutex';
import { z } from 'zod';
import { getLogger } from '@/logger';
import { createErrorResult } from '../utils';

const logger = getLogger();

const launchDebugSchema = z.object({
  configuration: z.string().describe('Name of the debug configuration from workspace settings (e.g., launch.json or workspace.code-workspace). Examples: "Python: Current File", "Node: Launch Program"'),
});

const launchChildDebugSchema = z.object({
  parentSessionId: z.string().describe('ID of the parent debug session'),
  configuration: z.string().describe('Name of the debug configuration from workspace settings (e.g., launch.json or workspace.code-workspace)'),
  consoleMode: z.enum(['separate', 'merged']).optional().describe('Whether to use a separate console or merge with parent (default: separate)'),
  lifecycleManagedByParent: z.boolean().optional().describe('Whether lifecycle (restart/stop) is managed by parent (default: false)'),
});

const stopDebugSchema = z.object({
  sessionId: z.string().optional().describe('Optional session ID to stop. If not provided, stops the active session'),
});

const getSessionInfoSchema = z.object({
  sessionId: z.string().describe('ID of the debug session to get info for'),
});

export function registerSessionTools(
  mcpServer: McpServer,
  debugManager: Debug,
  mutex: Mutex
): void {
  mcpServer.tool(
    'launch_debug',
    'Launches a new debug session using a named configuration from workspace settings (launch.json or workspace.code-workspace)',
    launchDebugSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug(`[launch_debug] Starting with config: ${args.configuration}`);
          
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            throw new Error('No workspace folder found');
          }

          const launchConfig = vscode.workspace.getConfiguration('launch', workspaceFolder.uri);
          const configurations = launchConfig.get<vscode.DebugConfiguration[]>('configurations');

          if (!configurations || configurations.length === 0) {
            throw new Error('No debug configurations found in workspace settings');
          }

          const config = configurations.find(c => c.name === args.configuration);
          if (!config) {
            const available = configurations.map(c => c.name).join(', ');
            throw new Error(`Configuration '${args.configuration}' not found. Available: ${available}`);
          }

          const sessionId = await debugManager.sessions.launch(config);          
          return {
            content: [{
              type: 'text' as const,
              text: `Debug session launched successfully (ID: ${sessionId})`,
            }],
          };
        } catch (error) {
          logger.debug('[launch_debug] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'launch_child_debug',
    'Launches a new debug session as a child of an existing session. Useful for debugging subprocesses, workers, or spawned processes in multi-process applications',
    launchChildDebugSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[launch_child_debug] Starting child session', {
            parentId: args.parentSessionId,
            config: args.configuration,
          });

          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            throw new Error('No workspace folder found');
          }

          const launchConfig = vscode.workspace.getConfiguration('launch', workspaceFolder.uri);
          const configurations = launchConfig.get<vscode.DebugConfiguration[]>('configurations');

          if (!configurations || configurations.length === 0) {
            throw new Error('No debug configurations found in workspace settings');
          }

          const config = configurations.find(c => c.name === args.configuration);
          if (!config) {
            const available = configurations.map(c => c.name).join(', ');
            throw new Error(`Configuration '${args.configuration}' not found. Available: ${available}`);
          }

          const sessionId = await debugManager.sessions.launchChild(
            args.parentSessionId,
            config,
            {
              consoleMode: args.consoleMode,
              lifecycleManagedByParent: args.lifecycleManagedByParent,
            }
          );

          return {
            content: [{
              type: 'text',
              text: `Child debug session launched successfully (ID: ${sessionId}, Parent: ${args.parentSessionId})`,
            }],
          };
        } catch (error) {
          logger.debug('[launch_child_debug] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'stop_debug',
    'Stops a debug session and terminates the debugged program. If sessionId is provided, stops that specific session, otherwise stops the active session',
    stopDebugSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[stop_debug] Stopping session', { sessionId: args.sessionId });
          await debugManager.sessions.terminate(args.sessionId);
          return {
            content: [{
              type: 'text',
              text: `Debug session stopped successfully${args.sessionId ? ` (ID: ${args.sessionId})` : ''}`,
            }],
          };
        } catch (error) {
          logger.debug('[stop_debug] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'get_debug_state',
    'Gets detailed information about the currently active debug session including session ID, state, and configuration',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[get_debug_state] Getting state');
          const session = debugManager.sessions.getActiveSession();
          
          if (!session) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ state: 'no_active_session' }, null, 2),
              }],
            };
          }

          const state = {
            sessionId: session.id,
            sessionName: session.name,
            sessionType: session.type,
            workspaceFolder: session.workspaceFolder?.name,
          };

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(state, null, 2),
            }],
          };
        } catch (error) {
          logger.debug('[get_debug_state] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'list_debug_sessions',
    'Lists all active debug sessions with their hierarchy information. Shows parent-child relationships for multi-process debugging scenarios',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[list_debug_sessions] Listing all sessions');
          const sessions = debugManager.sessions.getAllSessions();

          if (sessions.length === 0) {
            return {
              content: [{
                type: 'text',
                text: 'No active debug sessions',
              }],
            };
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ sessions, total: sessions.length }, null, 2),
            }],
          };
        } catch (error) {
          logger.debug('[list_debug_sessions] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'get_session_hierarchy',
    'Gets the debug session hierarchy as a tree structure. Useful for visualizing parent-child relationships in multi-process debugging',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[get_session_hierarchy] Getting session tree');
          const tree = debugManager.sessions.getSessionTree();

          if (tree.totalSessions === 0) {
            return {
              content: [{
                type: 'text',
                text: 'No active debug sessions',
              }],
            };
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(tree, null, 2),
            }],
          };
        } catch (error) {
          logger.debug('[get_session_hierarchy] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );

  mcpServer.tool(
    'get_session_info',
    'Gets detailed information about a specific debug session by ID. Includes parent, children, state, and session metadata',
    getSessionInfoSchema.shape,
    async (args): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[get_session_info] Getting session info', { sessionId: args.sessionId });
          const sessionNode = debugManager.sessions.getSessionNode(args.sessionId);

          if (!sessionNode) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          const info = {
            id: sessionNode.session.id,
            name: sessionNode.session.name,
            type: sessionNode.session.type,
            workspaceFolder: sessionNode.session.workspaceFolder?.name || '',
            state: sessionNode.state,
            parent: sessionNode.parent,
            children: sessionNode.children,
            startTime: sessionNode.startTime,
            duration: Date.now() - sessionNode.startTime,
          };

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(info, null, 2),
            }],
          };
        } catch (error) {
          logger.debug('[get_session_info] Error:', { error: error instanceof Error ? error.message : String(error) });
          return createErrorResult(error);
        }
      });
    }
  );
}
