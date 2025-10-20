import * as vscode from "vscode";
import { getLogger } from "@/logger";
import type { ThreadInfo } from "@/types";

const logger = getLogger();

export class Execution {
  async continue(session?: vscode.DebugSession): Promise<void> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
      throw new Error("No active debug session");
    }
    await vscode.commands.executeCommand("workbench.action.debug.continue");
  }

  async stepOver(session?: vscode.DebugSession): Promise<void> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
      throw new Error("No active debug session");
    }

    await vscode.commands.executeCommand("workbench.action.debug.stepOver");
  }

  async stepInto(session?: vscode.DebugSession): Promise<void> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
      throw new Error("No active debug session");
    }

    await vscode.commands.executeCommand("workbench.action.debug.stepInto");
  }

  async stepOut(session?: vscode.DebugSession): Promise<void> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
      throw new Error("No active debug session");
    }
    await vscode.commands.executeCommand("workbench.action.debug.stepOut");
  }

  async pause(session?: vscode.DebugSession): Promise<void> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
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
        sessionId: session.id,
      });
      return [];
    }
  }
}
