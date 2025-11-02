import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as vscode from 'vscode';

export const NO_FRAME_ID = -1;

export function createErrorResult(error: unknown): CallToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return {
    isError: true,
    content: [{
      type: 'text',
      text: errorMessage,
    }],
  };
}

export function getFrameFromActiveStackItem(): { frameId: number; threadId: number } | null {
  const activeItem = vscode.debug.activeStackItem;

  if (!activeItem) {
    return null;
  }

  if (activeItem instanceof vscode.DebugStackFrame) {
    return {
      frameId: activeItem.frameId,
      threadId: activeItem.threadId,
    };
  }

  if (activeItem instanceof vscode.DebugThread) {
    return {
      frameId: NO_FRAME_ID,
      threadId: activeItem.threadId,
    };
  }

  return null;
}

export async function resolveFrameIdFromThreadId(
  session: vscode.DebugSession,
  threadId: number
): Promise<number> {
  const stackResponse = await session.customRequest("stackTrace", {
    threadId,
    startFrame: 0,
    levels: 1,
  });

  if (!stackResponse?.stackFrames || stackResponse.stackFrames.length === 0) {
    throw new Error(`No stack frames found for thread ${threadId}. Is the thread paused?`);
  }

  return stackResponse.stackFrames[0].id;
}


export function getAllLaunchConfigurations(
  workspaceFolder?: vscode.WorkspaceFolder
): vscode.DebugConfiguration[] {
  const folder = workspaceFolder || vscode.workspace.workspaceFolders?.[0];

  if (!folder) {
    return [];
  }

  const launchConfig = vscode.workspace.getConfiguration('launch', folder.uri);
  return launchConfig.get<vscode.DebugConfiguration[]>('configurations') || [];
}

