import * as vscode from "vscode";
import type { LogLevel } from "@/types";
import { EXTENSION_ID, DEFAULT_SSE_PORT } from "@/constants";

export class ConfigManager {
  get ssePort(): number {
    return this.getConfig().get("ssePort", DEFAULT_SSE_PORT);
  }

  get sseHost(): string {
    return this.getConfig().get("sseHost", "localhost");
  }

  get autostart(): boolean {
    return this.getConfig().get("autostart", false);
  }

  get logLevel(): LogLevel {
    return this.getConfig().get("logLevel", "info");
  }

  async setAutostart(value: boolean): Promise<void> {
    await this.getConfig().update("autostart", value, vscode.ConfigurationTarget.Global);
  }

  onDidChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(EXTENSION_ID)) {
        callback();
      }
    });
  }

  private getConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_ID);
  }
}
