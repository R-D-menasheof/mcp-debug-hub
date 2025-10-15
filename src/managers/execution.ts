import * as vscode from "vscode";
import { getLogger } from "@/logger";
import type { ThreadInfo } from "@/types";

const logger = getLogger();

export class Execution {
  async continue(threadId?: number): Promise<void> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new Error("No active debug session");
    }

    await vscode.commands.executeCommand("workbench.action.debug.continue");
  }

  async stepOver(): Promise<void> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new Error("No active debug session");
    }

    await vscode.commands.executeCommand("workbench.action.debug.stepOver");
  }

  async stepInto(): Promise<void> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new Error("No active debug session");
    }

    await vscode.commands.executeCommand("workbench.action.debug.stepInto");
  }

  async stepOut(): Promise<void> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new Error("No active debug session");
    }
    await vscode.commands.executeCommand("workbench.action.debug.stepOut");
  }

  async pause(): Promise<void> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new Error("No active debug session");
    }
    await vscode.commands.executeCommand("workbench.action.debug.pause");
  }

  async getThreads(session: vscode.DebugSession): Promise<ThreadInfo[]> {
    try {
      const response = await session.customRequest("threads");

      if (!response || !response.threads) {
        return [];
      }

      return response.threads.map((thread: any) => ({
        id: thread.id,
        name: thread.name,
      }));
    } catch (error) {
      logger.warn("Failed to get threads", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

