import * as vscode from "vscode";
import { getLogger } from "@/logger";
import type { StackFrameInfo, VariableInfo, DebugLocation } from "@/types";

const logger = getLogger();

export class Inspection {
  async evaluateExpression(
    expression: string,
    frameId?: number,
    context?: "watch" | "repl" | "hover",
    session?: vscode.DebugSession,
  ): Promise<string> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
      throw new Error("No active debug session");
    }

    try {
      let actualFrameId = frameId;
      if (actualFrameId === undefined) {
        actualFrameId = await this.getCurrentFrameId(targetSession);
      }

      const response = await targetSession.customRequest("evaluate", {
        expression,
        frameId: actualFrameId,
        context: context || "repl",
      });

      return response.result;
    } catch (error) {
      logger.error("Failed to evaluate expression", error as Error, {
        expression,
        sessionId: targetSession.id,
      });
      throw error;
    }
  }

  async getStackTrace(
    threadId: number,
    session?: vscode.DebugSession,
  ): Promise<StackFrameInfo[]> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
      throw new Error("No active debug session");
    }

    try {
      const response = await targetSession.customRequest("stackTrace", {
        threadId,
        startFrame: 0,
        levels: 50,
      });

      if (!response || !response.stackFrames) {
        return [];
      }

      return response.stackFrames.map((frame: any) => ({
        id: frame.id,
        name: frame.name,
        file: frame.source?.path || "",
        line: frame.line,
        column: frame.column,
      }));
    } catch (error) {
      logger.warn("Failed to get stack trace", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: targetSession.id,
      });
      return [];
    }
  }

  async getVariables(
    variablesReference: number,
    session?: vscode.DebugSession,
  ): Promise<VariableInfo[]> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
      throw new Error("No active debug session");
    }

    try {
      const response = await targetSession.customRequest("variables", {
        variablesReference,
      });

      if (!response || !response.variables) {
        return [];
      }

      return response.variables.map((variable: any) => ({
        name: variable.name,
        value: variable.value,
        type: variable.type,
        variablesReference: variable.variablesReference,
      }));
    } catch (error) {
      logger.warn("Failed to get variables", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: targetSession.id,
      });
      return [];
    }
  }

  async getScopes(
    frameId?: number,
    session?: vscode.DebugSession,
  ): Promise<any[]> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
      throw new Error("No active debug session");
    }

    try {
      let actualFrameId = frameId;
      if (actualFrameId === undefined) {
        actualFrameId = await this.getCurrentFrameId(targetSession);
      }

      const response = await targetSession.customRequest("scopes", {
        frameId: actualFrameId,
      });

      return response?.scopes || [];
    } catch (error) {
      logger.warn("Failed to get scopes", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: targetSession.id,
      });
      return [];
    }
  }

  async getCurrentLocation(
    session?: vscode.DebugSession,
  ): Promise<DebugLocation[]> {
    const targetSession = session || vscode.debug.activeDebugSession;
    if (!targetSession) {
      return [];
    }

    try {
      const threadsResponse = await targetSession.customRequest("threads");
      if (!threadsResponse?.threads || threadsResponse.threads.length === 0) {
        return [];
      }

      const locations: DebugLocation[] = [];

      for (const thread of threadsResponse.threads) {
        try {
          const stackResponse = await targetSession.customRequest("stackTrace", {
            threadId: thread.id,
            startFrame: 0,
            levels: 1,
          });

          if (stackResponse?.stackFrames && stackResponse.stackFrames.length > 0) {
            const topFrame = stackResponse.stackFrames[0];
            const filePath = topFrame.source?.path;

            if (filePath) {
              locations.push({
                threadId: thread.id,
                threadName: thread.name,
                file: filePath,
                line: topFrame.line,
                column: topFrame.column,
              });
            }
          }
        } catch (threadError) {
          logger.debug("Failed to get location for thread", {
            threadId: thread.id,
            error: threadError instanceof Error ? threadError.message : String(threadError),
          });
        }
      }

      return locations;
    } catch (error) {
      logger.warn("Failed to get current locations", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: targetSession.id,
      });
      return [];
    }
  }

  private async getCurrentFrameId(session: vscode.DebugSession): Promise<number> {
    const threadsResponse = await session.customRequest("threads");
    if (!threadsResponse?.threads || threadsResponse.threads.length === 0) {
      throw new Error("No threads found in debug session");
    }

    const threadId = threadsResponse.threads[0].id;
    const stackResponse = await session.customRequest("stackTrace", {
      threadId,
      startFrame: 0,
      levels: 1,
    });

    if (!stackResponse?.stackFrames || stackResponse.stackFrames.length === 0) {
      throw new Error("No stack frames found. Is the debugger paused?");
    }

    return stackResponse.stackFrames[0].id;
  }
}
