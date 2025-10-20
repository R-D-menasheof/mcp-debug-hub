import * as vscode from "vscode";
import { getLogger } from "@/logger";
import type {
  DebugSessionInfo,
  DebugState,
  SessionNode,
  SessionTree,
  SessionTreeNode,
} from "@/types";

const logger = getLogger();

export class Sessions {
  private sessions: Map<string, SessionNode> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      vscode.debug.onDidStartDebugSession((session) => {
        this.addSession(session);
      }),
    );

    this.disposables.push(
      vscode.debug.onDidTerminateDebugSession((session) => {
        this.removeSession(session.id);
      }),
    );

    if (vscode.debug.activeDebugSession) {
      this.addSession(vscode.debug.activeDebugSession);
    }
  }

  private addSession(session: vscode.DebugSession): void {
    if (this.sessions.has(session.id)) {
      return;
    }

    const node: SessionNode = {
      session,
      parent: session.parentSession?.id || null,
      children: [],
      state: "running",
      startTime: Date.now(),
    };

    this.sessions.set(session.id, node);

    if (node.parent) {
      const parent = this.sessions.get(node.parent);
      if (parent) {
        parent.children.push(session.id);
        logger.debug(`Added child session ${session.id} to parent ${node.parent}`);
      }
    }

    logger.info("Session tracked", {
      sessionId: session.id,
      name: session.name,
      type: session.type,
      parent: node.parent,
    });
  }

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
    this.updateSessionState(session.id, "running");

    logger.info("Debug session launched", { sessionId: session.id });
    return session.id;
  }

  async launchChild(
    parentSessionId: string,
    launchConfig: vscode.DebugConfiguration,
    options?: {
      consoleMode?: "separate" | "merged";
      lifecycleManagedByParent?: boolean;
    },
  ): Promise<string> {
    const parentNode = this.sessions.get(parentSessionId);
    if (!parentNode) {
      throw new Error(`Parent session ${parentSessionId} not found`);
    }

    const sessionPromise = this.waitForSession();

    const debugOptions: vscode.DebugSessionOptions = {
      parentSession: parentNode.session,
      consoleMode:
        options?.consoleMode === "merged"
          ? vscode.DebugConsoleMode.MergeWithParent
          : vscode.DebugConsoleMode.Separate,
      lifecycleManagedByParent: options?.lifecycleManagedByParent ?? false,
    };

    const success = await vscode.debug.startDebugging(
      vscode.workspace.workspaceFolders?.[0],
      launchConfig,
      debugOptions,
    );

    if (!success) {
      throw new Error("Failed to start child debug session");
    }

    const session = await sessionPromise;
    logger.info("Child debug session launched", {
      sessionId: session.id,
      parentId: parentSessionId,
    });
    return session.id;
  }

  getActiveSession(): vscode.DebugSession | undefined {
    return vscode.debug.activeDebugSession;
  }

  getSession(sessionId: string): vscode.DebugSession | undefined {
    return this.sessions.get(sessionId)?.session;
  }

  getAllSessions(): DebugSessionInfo[] {
    return Array.from(this.sessions.values()).map((node) => ({
      id: node.session.id,
      name: node.session.name,
      type: node.session.type,
      workspaceFolder: node.session.workspaceFolder?.name || "",
      state: node.state,
      parent: node.parent,
      children: [...node.children],
    }));
  }

  getSessionTree(): SessionTree {
    const roots: SessionTreeNode[] = [];

    for (const [id, node] of this.sessions) {
      if (!node.parent) {
        roots.push(this.buildTreeNode(id));
      }
    }

    return {
      roots,
      totalSessions: this.sessions.size,
    };
  }

  private buildTreeNode(sessionId: string): SessionTreeNode {
    const node = this.sessions.get(sessionId);
    if (!node) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      id: node.session.id,
      name: node.session.name,
      type: node.session.type,
      state: node.state,
      workspaceFolder: node.session.workspaceFolder?.name || "",
      children: node.children.map((childId) => this.buildTreeNode(childId)),
    };
  }

  getSessionNode(sessionId: string): SessionNode | undefined {
    return this.sessions.get(sessionId);
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
    const node = this.sessions.get(sessionId);
    if (node) {
      node.state = state;
      logger.debug(`Session ${sessionId} state updated to ${state}`);
    }
  }

  removeSession(sessionId: string): void {
    const node = this.sessions.get(sessionId);
    if (!node) {
      return;
    }

    if (node.parent) {
      const parent = this.sessions.get(node.parent);
      if (parent) {
        parent.children = parent.children.filter((id) => id !== sessionId);
      }
    }

    this.sessions.delete(sessionId);
    logger.debug(`Session ${sessionId} removed from tracking`);
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

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.sessions.clear();
  }
}
