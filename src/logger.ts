import * as vscode from "vscode";
import type { LogLevel } from "@/types";
import { EXTENSION_NAME } from "@/constants";

class Logger {
  private channel: vscode.LogOutputChannel;
  private level: LogLevel = "info";

  constructor(name: string) {
    this.channel = vscode.window.createOutputChannel(name, { log: true });
  }

  debug(message: string, context?: object): void {
    if (this.shouldLog("debug")) {
      this.channel.debug(this.format(message, context));
    }
  }

  info(message: string, context?: object): void {
    if (this.shouldLog("info")) {
      this.channel.info(this.format(message, context));
    }
  }

  warn(message: string, context?: object): void {
    if (this.shouldLog("warn")) {
      this.channel.warn(this.format(message, context));
    }
  }

  error(message: string, error?: Error, context?: object): void {
    const errorInfo = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.channel.error(this.format(message, { ...context, error: errorInfo }));
  }

  private format(message: string, context?: object): string {
    return context ? `${message} ${JSON.stringify(context)}` : message;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  show(): void {
    this.channel.show();
  }

  dispose(): void {
    this.channel.dispose();
  }
}

let _logger: Logger | undefined;

export function getLogger(): Logger {
  if (!_logger) {
    _logger = new Logger(EXTENSION_NAME);
  }
  return _logger;
}
