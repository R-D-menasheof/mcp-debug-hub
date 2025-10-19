import * as vscode from "vscode";
import { getLogger } from "@/logger";
import { ConfigManager } from "@/config/config-manager";
import { Debug } from "@/managers/debug";
import { HttpMcpServer } from "@/mcp/server";
import { StatusViewProvider } from "@/ui/StatusViewProvider";
import { EXTENSION_ID } from "@/constants";

let configManager: ConfigManager;
let debugManager: Debug;
let mcpServer: HttpMcpServer;
let statusViewProvider: StatusViewProvider;

export function activate(context: vscode.ExtensionContext) {
  configManager = new ConfigManager();
  const logger = getLogger();

  logger.setLevel(configManager.logLevel);
  logger.info("Extension activating");

  // Initialize debug manager
  debugManager = new Debug();
  context.subscriptions.push(debugManager);
  logger.info("Debug manager initialized");

  const extensionVersion = context.extension.packageJSON.version as string;

  mcpServer = new HttpMcpServer(
    debugManager,
    configManager.ssePort,
    configManager.sseHost,
    extensionVersion
  );

  // Register UI view provider
  statusViewProvider = new StatusViewProvider(
    context.extensionUri,
    mcpServer,
    configManager
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      StatusViewProvider.viewType,
      statusViewProvider
    )
  );

  logger.info("UI view provider registered");

  if (configManager.autostart) {
    mcpServer.start().catch((error) => {
      logger.error("Failed to auto-start MCP server", error);
      vscode.window.showErrorMessage(
        `Failed to start MCP server: ${error.message}`
      );
    });
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_ID}.start`, async () => {
      logger.info("Start command called");
      try {
        if (mcpServer.isServerRunning()) {
          vscode.window.showInformationMessage(
            `MCP Server already running at ${mcpServer.getUrl()}`
          );
          return;
        }
        await mcpServer.start();
        vscode.window.showInformationMessage(
          `MCP Server started at ${mcpServer.getUrl()}`
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Failed to start MCP server", err);
        vscode.window.showErrorMessage(
          `Failed to start MCP server: ${err.message}`
        );
      }
    }),

    vscode.commands.registerCommand(`${EXTENSION_ID}.stop`, async () => {
      logger.info("Stop command called");
      try {
        if (!mcpServer.isServerRunning()) {
          vscode.window.showInformationMessage("MCP Server is not running");
          return;
        }
        await mcpServer.stop();
        vscode.window.showInformationMessage("MCP Server stopped");
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Failed to stop MCP server", err);
        vscode.window.showErrorMessage(
          `Failed to stop MCP server: ${err.message}`
        );
      }
    }),

    vscode.commands.registerCommand(`${EXTENSION_ID}.restart`, async () => {
      logger.info("Restart command called");
      try {
        if (mcpServer.isServerRunning()) {
          await mcpServer.stop();
        }
        await mcpServer.start();
        vscode.window.showInformationMessage(
          `MCP Server restarted at ${mcpServer.getUrl()}`
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Failed to restart MCP server", err);
        vscode.window.showErrorMessage(
          `Failed to restart MCP server: ${err.message}`
        );
      }
    }),

    vscode.commands.registerCommand(`${EXTENSION_ID}.showStatus`, () => {
      logger.info("Show status command called");
      const status = mcpServer.isServerRunning()
        ? `MCP Server is running at ${mcpServer.getUrl()}\nActive connections: ${mcpServer.getActiveConnectionCount()}`
        : "MCP Server is stopped";
      vscode.window.showInformationMessage(status);
      logger.show();
    }),

    vscode.commands.registerCommand(`${EXTENSION_ID}.getServerUrl`, async () => {
      logger.info("Get server URL command called");
      if (!mcpServer.isServerRunning()) {
        const action = await vscode.window.showWarningMessage(
          "MCP Server is not running. Start it first to get the URL.",
          "Start Server"
        );
        if (action === "Start Server") {
          await vscode.commands.executeCommand(`${EXTENSION_ID}.start`);
        }
        return;
      }

      const url = mcpServer.getUrl();
      await vscode.env.clipboard.writeText(url);
      vscode.window.showInformationMessage(
        `MCP Server URL copied to clipboard: ${url}\n\nUse this URL to configure your AI client (Cursor, Continue, Cline, etc.)`
      );
    }),

    configManager.onDidChange(() => {
      logger.setLevel(configManager.logLevel);
      logger.info("Configuration changed", {
        logLevel: configManager.logLevel,
        ssePort: configManager.ssePort,
      });
    }),
  );

  logger.info("Extension activated", {
    autostart: configManager.autostart,
    ssePort: configManager.ssePort,
  });
}

export async function deactivate() {
  const logger = getLogger();
  logger.info("Extension deactivating");

  if (mcpServer?.isServerRunning()) {
    await mcpServer.stop();
    logger.info("MCP server stopped");
  }

  if (debugManager) {
    debugManager.dispose();
    logger.info("Debug manager disposed");
  }

  if (statusViewProvider) {
    statusViewProvider.dispose();
    logger.info("UI view provider disposed");
  }
}
