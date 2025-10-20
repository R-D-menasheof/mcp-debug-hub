import * as vscode from "vscode";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type DebugState =
  | "idle"
  | "launching"
  | "running"
  | "paused"
  | "stopped";

export interface DebugSessionInfo {
  id: string;
  name: string;
  type: string;
  workspaceFolder: string;
  state: DebugState;
  parent: string | null;
  children: string[];
}

export interface SessionNode {
  session: vscode.DebugSession;
  parent: string | null;
  children: string[];
  state: DebugState;
  startTime: number;
}

export interface SessionTreeNode {
  id: string;
  name: string;
  type: string;
  state: DebugState;
  workspaceFolder: string;
  children: SessionTreeNode[];
}

export interface SessionTree {
  roots: SessionTreeNode[];
  totalSessions: number;
}

export interface ThreadInfo {
  id: number;
  name: string;
}

export interface BreakpointInfo {
  id: string;
  file: string;
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  enabled: boolean;
  verified: boolean;
}

export interface StackFrameInfo {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
}

export interface VariableInfo {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
}

export interface DebugLocation {
  threadId: number;
  threadName: string;
  file: string;
  line: number;
  column: number;
}
