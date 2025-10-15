import * as vscode from "vscode";
import { getLogger } from "@/logger";
import { Sessions } from "./sessions";
import { Breakpoints } from "./breakpoints";
import { Execution } from "./execution";
import { Inspection } from "./inspection";

const logger = getLogger();

export class Debug {
  public sessions: Sessions;
  public breakpoints: Breakpoints;
  public execution: Execution;
  public inspection: Inspection;

  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.sessions = new Sessions();
    this.breakpoints = new Breakpoints();
    this.execution = new Execution();
    this.inspection = new Inspection();

    this.registerDebugEventHandlers();
  }

  private registerDebugEventHandlers(): void {
    // Session started
    this.disposables.push(
      vscode.debug.onDidStartDebugSession((session) => {
        logger.info("Debug session started", {
          id: session.id,
          name: session.name,
          type: session.type,
        });
      }),
    );

    // Session terminated
    this.disposables.push(
      vscode.debug.onDidTerminateDebugSession((session) => {
        logger.info("Debug session terminated", { id: session.id });
        this.sessions.removeSession(session.id);
      }),
    );

    // Breakpoint changed
    this.disposables.push(
      vscode.debug.onDidChangeBreakpoints((event) => {
        if (event.added.length > 0) {
          logger.debug("Breakpoints added", { count: event.added.length });
        }
        if (event.removed.length > 0) {
          logger.debug("Breakpoints removed", { count: event.removed.length });
        }
        if (event.changed.length > 0) {
          logger.debug("Breakpoints changed", { count: event.changed.length });
        }
      }),
    );

    // Active session changed
    this.disposables.push(
      vscode.debug.onDidChangeActiveDebugSession((session) => {
        if (session) {
          logger.debug("Active debug session changed", { id: session.id });
        }
      }),
    );
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

