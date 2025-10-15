import * as vscode from "vscode";
import { getLogger } from "@/logger";
import type { DebugSessionInfo, DebugState } from "@/types";

const logger = getLogger();

export class Sessions {
  private sessions: Map<string, vscode.DebugSession> = new Map();
  private sessionStates: Map<string, DebugState> = new Map();

  async launch(launchConfig: vscode.DebugConfiguration): Promise<string> {
    const sessionPromise = this.waitForSession();

    const success = await vscode.debug.startDebugging(
      vscode.workspace.workspaceFolders?.[0],
      launchConfig,
    );

    if (!success) {
      throw new Error("Failed to start debug session");
    }

    const session = await sessionPromise;
    this.sessions.set(session.id, session);
    this.sessionStates.set(session.id, "running");

    logger.info("Debug session launched", { sessionId: session.id });
    return session.id;
  }

  getActiveSession(): vscode.DebugSession | undefined {
    return vscode.debug.activeDebugSession;
  }

  getSession(sessionId: string): vscode.DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): DebugSessionInfo[] {
    return Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      name: session.name,
      type: session.type,
      workspaceFolder: session.workspaceFolder?.name || "",
      state: this.sessionStates.get(session.id) || "idle",
    }));
  }

  async terminate(sessionId?: string): Promise<void> {
    const session = sessionId
      ? this.getSession(sessionId)
      : this.getActiveSession();

    if (!session) {
      throw new Error("No active debug session");
    }

    await vscode.debug.stopDebugging(session);
    logger.info("Debug session terminated", { sessionId: session.id });
  }

  updateSessionState(sessionId: string, state: DebugState): void {
    this.sessionStates.set(sessionId, state);
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.sessionStates.delete(sessionId);
  }

  private waitForSession(): Promise<vscode.DebugSession> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for debug session"));
      }, 10000);

      const disposable = vscode.debug.onDidStartDebugSession((session) => {
        clearTimeout(timeout);
        disposable.dispose();
        resolve(session);
      });
    });
  }
}

