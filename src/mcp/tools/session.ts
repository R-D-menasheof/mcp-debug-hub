import * as vscode from 'vscode';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Debug } from '@/managers/debug';
import type { Mutex } from '@/mutex';
import { z } from 'zod';
import { getLogger } from '@/logger';

const logger = getLogger();

const launchDebugSchema = z.object({
  configuration: z.string().describe('Name of the debug configuration from launch.json (e.g., "Python: Current File", "Node: Launch Program")'),
});

export function registerSessionTools(
  mcpServer: McpServer,
  debugManager: Debug,
  mutex: Mutex
): void {
  mcpServer.tool(
    'launch_debug',
    'Launches a new debug session using a named configuration from the workspace launch.json file',
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
            throw new Error('No debug configurations found in launch.json');
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
          logger.error('[launch_debug] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );

  mcpServer.tool(
    'stop_debug',
    'Stops the currently active debug session and terminates the debugged program',
    {},
    async (): Promise<CallToolResult> => {
      return mutex.runExclusive(async () => {
        try {
          logger.debug('[stop_debug] Stopping active session');
          await debugManager.sessions.terminate();
          return {
            content: [{
              type: 'text',
              text: 'Debug session stopped successfully',
            }],
          };
        } catch (error) {
          logger.error('[stop_debug] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
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
          logger.error('[get_debug_state] Error:', error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    }
  );
}

