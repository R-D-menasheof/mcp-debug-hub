import * as vscode from 'vscode';
import { HttpMcpServer } from '@/mcp/server';
import { ConfigManager } from '@/config/config-manager';
import { EXTENSION_ID } from '@/constants';

export class StatusViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = `${EXTENSION_ID}.statusView`;
  private _view?: vscode.WebviewView;
  private _updateInterval?: NodeJS.Timeout;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _mcpServer: HttpMcpServer,
    private readonly _configManager: ConfigManager
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'start':
          await vscode.commands.executeCommand(`${EXTENSION_ID}.start`);
          break;
        case 'stop':
          await vscode.commands.executeCommand(`${EXTENSION_ID}.stop`);
          break;
        case 'restart':
          await vscode.commands.executeCommand(`${EXTENSION_ID}.restart`);
          break;
        case 'copyUrl':
          await vscode.commands.executeCommand(`${EXTENSION_ID}.getServerUrl`);
          break;
        case 'openSettings':
          await vscode.commands.executeCommand('workbench.action.openSettings', EXTENSION_ID);
          break;
        case 'openLogs':
          await vscode.commands.executeCommand(`${EXTENSION_ID}.showStatus`);
          break;
      }
    });

    // Update UI every 2 seconds
    this._updateInterval = setInterval(() => {
      this._update();
    }, 2000);

    // Initial update
    this._update();
  }

  private _update() {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'update',
        data: {
          isRunning: this._mcpServer.isServerRunning(),
          url: this._mcpServer.getUrl(),
          port: this._mcpServer.getPort(),
          host: this._configManager.sseHost,
          activeConnections: this._mcpServer.getActiveConnectionCount(),
          autostart: this._configManager.autostart,
        },
      });
    }
  }

  public dispose() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Debug Hub</title>
  <style>
    :root {
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 12px;
      --spacing-lg: 16px;
      --spacing-xl: 20px;
      --radius: 6px;
      --border-width: 1px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: var(--spacing-lg);
    }

    .header {
      background: var(--vscode-sideBarSectionHeader-background);
      border: var(--border-width) solid var(--vscode-sideBarSectionHeader-border);
      border-radius: var(--radius);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      background: var(--vscode-badge-background);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--vscode-badge-foreground);
      font-weight: bold;
      font-size: 16px;
    }

    .logo-text {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-md);
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: var(--border-width) solid transparent;
    }

    .status-pill::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-running {
      background: var(--vscode-testing-iconPassed);
      color: var(--vscode-sideBar-background);
    }

    .status-running::before {
      background: var(--vscode-sideBar-background);
    }

    .status-stopped {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
      border-color: var(--vscode-inputValidation-errorBorder);
    }

    .status-stopped::before {
      background: var(--vscode-inputValidation-errorForeground);
    }

    .server-info {
      padding-top: var(--spacing-md);
      border-top: var(--border-width) solid var(--vscode-panel-border);
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-xs) 0;
      font-size: 12px;
    }

    .info-label {
      color: var(--vscode-descriptionForeground);
    }

    .info-value {
      font-weight: 600;
      font-family: var(--vscode-editor-font-family);
      color: var(--vscode-foreground);
    }

    .connection-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 2px var(--spacing-sm);
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: var(--radius);
      font-size: 11px;
      font-weight: 600;
    }

    .connection-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--vscode-testing-iconPassed);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
    }

    .metric-card {
      background: var(--vscode-editorWidget-background);
      border: var(--border-width) solid var(--vscode-editorWidget-border);
      border-radius: var(--radius);
      padding: var(--spacing-md);
      text-align: center;
    }

    .metric-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--vscode-textLink-foreground);
      margin-bottom: var(--spacing-xs);
      font-family: var(--vscode-editor-font-family);
    }

    .metric-label {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .actions {
      margin-bottom: var(--spacing-lg);
    }

    .action-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
    }

    button {
      padding: var(--spacing-md) var(--spacing-lg);
      border: none;
      border-radius: var(--radius);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      font-family: var(--vscode-font-family);
    }

    button:hover {
      opacity: 0.9;
    }

    button:active {
      opacity: 0.8;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .btn-danger {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
      border: var(--border-width) solid var(--vscode-inputValidation-errorBorder);
    }

    .btn-danger:hover {
      opacity: 1;
      filter: brightness(1.1);
    }

    .btn-full {
      grid-column: 1 / -1;
    }

    .quick-actions {
      margin-bottom: var(--spacing-lg);
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: var(--spacing-sm);
    }

    .quick-action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-sm);
    }

    .quick-action-btn {
      padding: var(--spacing-sm);
      font-size: 12px;
      justify-content: flex-start;
      gap: var(--spacing-sm);
    }

    .icon {
      width: 16px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .footer {
      padding-top: var(--spacing-md);
      border-top: var(--border-width) solid var(--vscode-panel-border);
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }

    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div class="logo">
        <div class="logo-icon">⚡</div>
        <div class="logo-text">MCP Debug Hub</div>
      </div>
      <div id="statusPill" class="status-pill status-stopped">Stopped</div>
    </div>
    <div class="server-info">
      <div class="info-row">
        <span class="info-label">Endpoint</span>
        <span id="serverUrl" class="info-value">Not running</span>
      </div>
      <div class="info-row">
        <span class="info-label">Port</span>
        <span id="serverPort" class="info-value">-</span>
      </div>
      <div class="info-row">
        <span class="info-label">Connections</span>
        <span id="connections" class="connection-badge">
          <span class="connection-dot"></span>
          <span id="connectionCount">0</span>
        </span>
      </div>
    </div>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <div id="metricSessions" class="metric-value">0</div>
      <div class="metric-label">Active</div>
    </div>
    <div class="metric-card">
      <div id="metricUptime" class="metric-value">0m</div>
      <div class="metric-label">Uptime</div>
    </div>
    <div class="metric-card">
      <div id="metricErrors" class="metric-value">0</div>
      <div class="metric-label">Errors</div>
    </div>
  </div>

  <div class="actions">
    <div class="action-row">
      <button id="btnStart" class="btn-primary">
        <span class="icon">▶</span>
        <span>Start</span>
      </button>
      <button id="btnStop" class="btn-danger hidden">
        <span class="icon">■</span>
        <span>Stop</span>
      </button>
      <button id="btnRestart" class="btn-secondary">
        <span class="icon">↻</span>
        <span>Restart</span>
      </button>
    </div>
    <div class="action-row">
      <button id="btnCopyUrl" class="btn-secondary btn-full">
        <span class="icon">⎘</span>
        <span>Copy Server URL</span>
      </button>
    </div>
  </div>

  <div class="quick-actions">
    <div class="section-title">Quick Actions</div>
    <div class="quick-action-grid">
      <button id="btnSettings" class="btn-secondary quick-action-btn">
        <span class="icon">⚙</span>
        <span>Settings</span>
      </button>
      <button id="btnLogs" class="btn-secondary quick-action-btn">
        <span class="icon">≡</span>
        <span>Logs</span>
      </button>
    </div>
  </div>

  <div class="footer">
    MCP Debug Hub Extension
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let startTime = null;

    // Button handlers
    document.getElementById('btnStart').addEventListener('click', () => {
      vscode.postMessage({ type: 'start' });
    });

    document.getElementById('btnStop').addEventListener('click', () => {
      vscode.postMessage({ type: 'stop' });
    });

    document.getElementById('btnRestart').addEventListener('click', () => {
      vscode.postMessage({ type: 'restart' });
    });

    document.getElementById('btnCopyUrl').addEventListener('click', () => {
      vscode.postMessage({ type: 'copyUrl' });
    });

    document.getElementById('btnSettings').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    document.getElementById('btnLogs').addEventListener('click', () => {
      vscode.postMessage({ type: 'openLogs' });
    });


    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'update') {
        updateUI(message.data);
      }
    });

    function updateUI(data) {
      const statusPill = document.getElementById('statusPill');
      const btnStart = document.getElementById('btnStart');
      const btnStop = document.getElementById('btnStop');
      const serverUrl = document.getElementById('serverUrl');
      const serverPort = document.getElementById('serverPort');
      const connectionCount = document.getElementById('connectionCount');
      const metricSessions = document.getElementById('metricSessions');
      const metricUptime = document.getElementById('metricUptime');

      if (data.isRunning) {
        statusPill.textContent = 'Running';
        statusPill.className = 'status-pill status-running';
        btnStart.classList.add('hidden');
        btnStop.classList.remove('hidden');
        serverUrl.textContent = data.url;
        serverPort.textContent = data.port;
        
        if (!startTime) {
          startTime = Date.now();
        }
        const uptime = Math.floor((Date.now() - startTime) / 60000);
        metricUptime.textContent = uptime + 'm';
      } else {
        statusPill.textContent = 'Stopped';
        statusPill.className = 'status-pill status-stopped';
        btnStart.classList.remove('hidden');
        btnStop.classList.add('hidden');
        serverUrl.textContent = 'Not running';
        serverPort.textContent = '-';
        startTime = null;
        metricUptime.textContent = '0m';
      }

      connectionCount.textContent = data.activeConnections;
      metricSessions.textContent = data.activeConnections;
    }
  </script>
</body>
</html>`;
  }
}
