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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
    }

    .header {
      background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-button-hoverBackground) 100%);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: var(--vscode-editor-background);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-editor-background);
    }

    .status-pill {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-running {
      background: rgba(76, 175, 80, 0.2);
      color: #4CAF50;
      border: 1px solid #4CAF50;
    }

    .status-stopped {
      background: rgba(244, 67, 54, 0.2);
      color: #F44336;
      border: 1px solid #F44336;
    }

    .server-info {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
    }

    .info-label {
      opacity: 0.7;
    }

    .info-value {
      font-weight: 600;
      font-family: var(--vscode-editor-font-family);
    }

    .connection-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .connection-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4CAF50;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .actions {
      margin-bottom: 16px;
    }

    .action-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }

    button {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    button:active {
      transform: translateY(0);
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
      background: rgba(244, 67, 54, 0.8);
      color: white;
    }

    .btn-danger:hover {
      background: rgba(244, 67, 54, 1);
    }

    .btn-full {
      grid-column: 1 / -1;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .metric-card {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--vscode-button-background);
      margin-bottom: 4px;
    }

    .metric-label {
      font-size: 11px;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .quick-actions {
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
      margin-bottom: 8px;
    }

    .quick-action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }

    .quick-action-btn {
      padding: 8px;
      font-size: 11px;
      flex-direction: column;
      gap: 4px;
    }

    .icon {
      font-size: 16px;
    }

    .footer {
      padding-top: 12px;
      border-top: 1px solid var(--vscode-input-border);
      font-size: 11px;
      opacity: 0.5;
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
        <div class="logo-icon">🔧</div>
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
        <span class="icon">▶️</span>
        <span>Start</span>
      </button>
      <button id="btnStop" class="btn-danger hidden">
        <span class="icon">⏹️</span>
        <span>Stop</span>
      </button>
      <button id="btnRestart" class="btn-secondary">
        <span class="icon">🔄</span>
        <span>Restart</span>
      </button>
    </div>
    <div class="action-row">
      <button id="btnCopyUrl" class="btn-secondary btn-full">
        <span class="icon">📋</span>
        <span>Copy Server URL</span>
      </button>
    </div>
  </div>

  <div class="quick-actions">
    <div class="section-title">Quick Actions</div>
    <div class="quick-action-grid">
      <button id="btnSettings" class="btn-secondary quick-action-btn">
        <span class="icon">⚙️</span>
        <span>Settings</span>
      </button>
      <button id="btnLogs" class="btn-secondary quick-action-btn">
        <span class="icon">📝</span>
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
