import * as vscode from "vscode";
import type { BreakpointInfo } from "@/types";

export class Breakpoints {
  async set(
    filePath: string,
    line: number,
    options?: {
      condition?: string;
      hitCondition?: string;
      logMessage?: string;
    },
  ): Promise<BreakpointInfo> {
    const uri = vscode.Uri.file(filePath);
    const position = new vscode.Position(line - 1, 0);

    const breakpoint = new vscode.SourceBreakpoint(
      new vscode.Location(uri, position),
      true,
      options?.condition,
      options?.hitCondition,
      options?.logMessage,
    );

    vscode.debug.addBreakpoints([breakpoint]);

    return {
      id: breakpoint.id,
      file: filePath,
      line,
      condition: options?.condition,
      hitCondition: options?.hitCondition,
      logMessage: options?.logMessage,
      enabled: breakpoint.enabled,
      verified: breakpoint.enabled,
    };
  }

  async remove(filePath: string, line: number): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const breakpoints = vscode.debug.breakpoints.filter((bp) => {
      if (bp instanceof vscode.SourceBreakpoint) {
        return (
          bp.location.uri.fsPath === uri.fsPath &&
          bp.location.range.start.line === line - 1
        );
      }
      return false;
    });

    vscode.debug.removeBreakpoints(breakpoints);
  }

  getAll(): BreakpointInfo[] {
    return vscode.debug.breakpoints
      .filter((bp) => bp instanceof vscode.SourceBreakpoint)
      .map((bp) => {
        const sbp = bp as vscode.SourceBreakpoint;
        const column = sbp.location.range.start.character;
        return {
          id: bp.id,
          file: sbp.location.uri.fsPath,
          line: sbp.location.range.start.line + 1,
          ...(column > 0 && { column }),
          condition: sbp.condition,
          hitCondition: sbp.hitCondition,
          logMessage: sbp.logMessage,
          enabled: bp.enabled,
          verified: bp.enabled,
        };
      });
  }

  getByFile(filePath: string): BreakpointInfo[] {
    const uri = vscode.Uri.file(filePath);
    return this.getAll().filter((bp) => bp.file === uri.fsPath);
  }

  clearAll(): void {
    vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
  }

  clearFile(filePath: string): void {
    const uri = vscode.Uri.file(filePath);
    const breakpoints = vscode.debug.breakpoints.filter((bp) => {
      if (bp instanceof vscode.SourceBreakpoint) {
        return bp.location.uri.fsPath === uri.fsPath;
      }
      return false;
    });

    vscode.debug.removeBreakpoints(breakpoints);
  }

  async toggle(filePath: string, line: number, enabled: boolean): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const breakpoints = vscode.debug.breakpoints.filter((bp) => {
      if (bp instanceof vscode.SourceBreakpoint) {
        return (
          bp.location.uri.fsPath === uri.fsPath &&
          bp.location.range.start.line === line - 1
        );
      }
      return false;
    });

    if (breakpoints.length === 0) {
      throw new Error(`No breakpoint found at ${filePath}:${line}`);
    }

    const oldBp = breakpoints[0] as vscode.SourceBreakpoint;
    vscode.debug.removeBreakpoints(breakpoints);

    const newBp = new vscode.SourceBreakpoint(
      oldBp.location,
      enabled,
      oldBp.condition,
      oldBp.hitCondition,
      oldBp.logMessage,
    );

    vscode.debug.addBreakpoints([newBp]);
  }
}
