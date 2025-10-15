import * as vscode from "vscode";
import { getLogger } from "@/logger";
import type { StackFrameInfo, VariableInfo, DebugLocation } from "@/types";

const logger = getLogger();

export class Inspection {
  async evaluateExpression(
    expression: string,
    frameId?: number,
    context?: "watch" | "repl" | "hover",
  ): Promise<string> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new Error("No active debug session");
    }

    try {
      let actualFrameId = frameId;
      if (actualFrameId === undefined) {
        actualFrameId = await this.getCurrentFrameId(session);
      }

      const response = await session.customRequest("evaluate", {
        expression,
        frameId: actualFrameId,
        context: context || "repl",
      });

      return response.result;
    } catch (error) {
      logger.error("Failed to evaluate expression", error as Error, { expression });
      throw error;
    }
  }

  async getStackTrace(threadId: number): Promise<StackFrameInfo[]> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new Error("No active debug session");
    }

    try {
      const response = await session.customRequest("stackTrace", {
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
      });
      return [];
    }
  }

  async getVariables(variablesReference: number): Promise<VariableInfo[]> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new Error("No active debug session");
    }

    try {
      const response = await session.customRequest("variables", {
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
      });
      return [];
    }
  }

  async getScopes(frameId?: number): Promise<any[]> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      throw new Error("No active debug session");
    }

    try {
      let actualFrameId = frameId;
      if (actualFrameId === undefined) {
        actualFrameId = await this.getCurrentFrameId(session);
      }

      const response = await session.customRequest("scopes", {
        frameId: actualFrameId,
      });

      return response?.scopes || [];
    } catch (error) {
      logger.warn("Failed to get scopes", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async getCurrentLocation(): Promise<DebugLocation | null> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      return null;
    }

    try {
      const threadsResponse = await session.customRequest("threads");
      if (!threadsResponse?.threads || threadsResponse.threads.length === 0) {
        return null;
      }

      const threadId = threadsResponse.threads[0].id;
      const stackResponse = await session.customRequest("stackTrace", {
        threadId,
        startFrame: 0,
        levels: 1,
      });

      if (!stackResponse?.stackFrames || stackResponse.stackFrames.length === 0) {
        return null;
      }

      const topFrame = stackResponse.stackFrames[0];
      const filePath = topFrame.source?.path;

      if (!filePath) {
        return null;
      }

      return {
        file: filePath,
        line: topFrame.line,
        column: topFrame.column,
      };
    } catch (error) {
      logger.warn("Failed to get current location", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
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

