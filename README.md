# MCP Debug Hub

[![Build VSIX](https://github.com/R-D-menasheof/mcp-debug-hub/actions/workflows/build-vsix.yml/badge.svg)](https://github.com/R-D-menasheof/mcp-debug-hub/actions/workflows/build-vsix.yml)

`mcp-debug-hub` is a VS Code extension that exposes VS Code's debugging capabilities through the Model Context Protocol (MCP). It enables AI coding assistants (such as Cline, Claude, Cursor, or Copilot) to control and inspect debugging sessions directly within VS Code, providing powerful debugging automation and inspection capabilities.

## Key features

- **Debug session control**: Launch, stop, and manage VS Code debug sessions programmatically
- **Multi-process debugging**: Debug parent-child process hierarchies with full support for subprocesses, workers, and spawned processes
- **Breakpoint management**: Set, remove, and list breakpoints with conditions, hit counts, and log messages
- **Code execution control**: Step through code, continue execution, and pause at any point
- **Runtime inspection**: Evaluate expressions, inspect variables, and examine call stacks
- **Session-aware operations**: Target specific debug sessions in multi-process scenarios
- **Multi-language support**: Works with any language supported by VS Code's debug adapters
- **Built-in status view**: Monitor server status, active connections, and metrics from the activity bar. Includes quick actions for server control, URL copying, and autostart toggle

## Requirements

- [VS Code](https://code.visualstudio.com/) version 1.99.0 or newer
- [Node.js](https://nodejs.org/) v22.x or newer
- A workspace with debug configurations (in `launch.json` or `workspace.code-workspace`)

## Getting started

### Installation

Install the extension from the VS Code Marketplace or build from source:

```bash
git clone https://github.com/R-D-menasheof/mcp-debug-hub.git
cd mcp-debug-hub
npm install
npm run vsix
code --install-extension dist/mcp-debug-hub.vsix
```

### MCP Client configuration

Configure your MCP client according to which one you're using. Each client has a slightly different configuration format.

> [!NOTE]  
> The default port is 37337. You can change this in VS Code settings under `mcpDebugHub.ssePort`.

### MCP Client configuration examples

<details>
  <summary>Cursor</summary>

Go to `Cursor Settings` -> `MCP` -> Edit Config (or directly edit `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "debug-mcp": {
      "url": "http://localhost:37337/mcp"
    }
  }
}
```

</details>

<details>
  <summary>Cline</summary>
  
Follow the [Cline MCP documentation](https://docs.cline.bot/mcp/configuring-mcp-servers) and add this configuration:

```json
{
  "mcpServers": {
    "debug-mcp": {
      "command": "node",
      "args": [],
      "transport": {
        "type": "sse",
        "url": "http://localhost:37337/mcp"
      }
    }
  }
}
```

Make sure to configure the SSE transport type correctly.

</details>

<details>
  <summary>Continue</summary>

Add the configuration to your Continue config file (`~/.continue/config.json`):

```json
{
  "mcpServers": {
    "debug-mcp": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:37337/mcp"
      }
    }
  }
}
```

</details>

### Starting the server

The extension can start automatically when VS Code opens (configure `mcpDebugHub.autostart` in settings), or manually using:

- Open the MCP Debug Hub view from the activity bar (layers icon)
- Click the **Start** button or enable the **Autostart** toggle
- Alternatively, use Command Palette: `MCP Debug Hub: Start`

### Your first prompt

1. Make sure you have debug configurations in your workspace (`.vscode/launch.json` or `workspace.code-workspace`)
2. Enter the following prompt in your MCP Client:

```
Launch the debug configuration "Python: Current File" and set a breakpoint at line 10 of main.py
```

Your MCP client should launch the debug session and set the breakpoint.

## Tools

<!-- Tool categories organized by functionality -->

- **Debug session management** (7 tools)

  - [`launch_debug`](#launch_debug)
  - [`launch_child_debug`](#launch_child_debug)
  - [`stop_debug`](#stop_debug)
  - [`get_debug_state`](#get_debug_state)
  - [`list_debug_sessions`](#list_debug_sessions)
  - [`get_session_hierarchy`](#get_session_hierarchy)
  - [`get_session_info`](#get_session_info)

- **Breakpoint management** (5 tools)

  - [`set_breakpoint`](#set_breakpoint)
  - [`set_breakpoints`](#set_breakpoints)
  - [`remove_breakpoint`](#remove_breakpoint)
  - [`list_breakpoints`](#list_breakpoints)
  - [`clear_all_breakpoints`](#clear_all_breakpoints)

- **Execution control** (5 tools)

  - [`continue_execution`](#continue_execution)
  - [`pause_execution`](#pause_execution)
  - [`step_over`](#step_over)
  - [`step_into`](#step_into)
  - [`step_out`](#step_out)

- **Runtime inspection** (5 tools)
  - [`evaluate_expression`](#evaluate_expression)
  - [`list_threads`](#list_threads)
  - [`get_stack_frames`](#get_stack_frames)
  - [`get_variables`](#get_variables)
  - [`get_current_location`](#get_current_location)

### Tool reference

#### launch_debug

Launches a new debug session using a named configuration from workspace settings (launch.json or workspace.code-workspace).

**Parameters:**

- `configuration` (string, required): Name of the debug configuration from workspace settings (e.g., "Python: Current File", "Node: Launch Program")

**Example:**

```json
{
  "configuration": "Python: Current File"
}
```

#### launch_child_debug

Launches a new debug session as a child of an existing session. Useful for debugging subprocesses, workers, or spawned processes in multi-process applications.

**Parameters:**

- `parentSessionId` (string, required): ID of the parent debug session
- `configuration` (string, required): Name of the debug configuration from workspace settings
- `consoleMode` (string, optional): Whether to use a separate console or merge with parent (default: "separate"). Options: "separate", "merged"
- `lifecycleManagedByParent` (boolean, optional): Whether lifecycle (restart/stop) is managed by parent (default: false)

**Example:**

```json
{
  "parentSessionId": "abc123",
  "configuration": "Python: Worker Process",
  "consoleMode": "merged",
  "lifecycleManagedByParent": true
}
```

#### stop_debug

Stops a debug session and terminates the debugged program. Can target a specific session in multi-process debugging.

**Parameters:**

- `sessionId` (string, optional): Optional session ID to stop. If not provided, stops the active session

**Example:**

```json
{
  "sessionId": "worker-123"
}
```

#### get_debug_state

Gets detailed information about the currently active debug session including session ID, state, and configuration.

**Parameters:** None

#### list_debug_sessions

Lists all active debug sessions with their hierarchy information. Shows parent-child relationships for multi-process debugging scenarios.

**Parameters:** None

**Example output:**

```json
{
  "sessions": [
    {
      "id": "main-123",
      "name": "Python: main.py",
      "type": "python",
      "state": "paused",
      "parent": null,
      "children": ["worker-456", "worker-789"]
    }
  ],
  "total": 3
}
```

#### get_session_hierarchy

Gets the debug session hierarchy as a tree structure. Useful for visualizing parent-child relationships in multi-process debugging.

**Parameters:** None

#### get_session_info

Gets detailed information about a specific debug session by ID. Includes parent, children, state, and session metadata.

**Parameters:**

- `sessionId` (string, required): ID of the debug session to get info for

**Example:**

```json
{
  "sessionId": "worker-456"
}
```

#### set_breakpoint

Sets a breakpoint at a specific line in a source file with optional conditions, hit counts, or log messages.

**Parameters:**

- `file` (string, required): Absolute path to the source file (e.g., "/workspace/src/main.py")
- `line` (number, required): Line number where the breakpoint should be set (1-based, first line is 1)
- `condition` (string, optional): Optional condition expression - breakpoint only triggers when this evaluates to true (e.g., "x > 10")
- `hitCondition` (string, optional): Optional hit count condition (e.g., ">5" means break after 5th hit, "==3" means break only on 3rd hit)
- `logMessage` (string, optional): Optional log message to output instead of breaking (logpoint). Use {expression} for variable interpolation.

**Example:**

```json
{
  "file": "/workspace/src/main.py",
  "line": 42,
  "condition": "x > 10"
}
```

#### set_breakpoints

Sets multiple breakpoints at once. Returns success/failure status for each breakpoint individually.

**Parameters:**

- `breakpoints` (array, required): Array of breakpoints to set (minimum 1, maximum 50 per batch)

**Example:**

```json
{
  "breakpoints": [
    {
      "file": "/workspace/src/main.py",
      "line": 10
    },
    {
      "file": "/workspace/src/utils.py",
      "line": 25,
      "condition": "count > 5"
    }
  ]
}
```

#### remove_breakpoint

Removes a breakpoint from a specific line in a source file.

**Parameters:**

- `file` (string, required): Absolute path to the source file containing the breakpoint to remove
- `line` (number, required): Line number of the breakpoint to remove (1-based)

#### list_breakpoints

Lists all breakpoints currently set in the workspace including their locations, conditions, and verification status.

**Parameters:** None

#### clear_all_breakpoints

Clears all breakpoints from all files in the workspace.

**Parameters:** None

#### continue_execution

Continues program execution until the next breakpoint is hit or the program terminates. Can target a specific session in multi-process debugging.

**Parameters:**

- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

#### pause_execution

Pauses the currently running program at its current execution point. Can target a specific session in multi-process debugging.

**Parameters:**

- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

#### step_over

Steps over the current line of code, executing it without entering any function calls. Can target a specific session in multi-process debugging.

**Parameters:**

- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

#### step_into

Steps into the function call on the current line to debug inside the called function. Can target a specific session in multi-process debugging.

**Parameters:**

- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

#### step_out

Steps out of the current function, continuing execution until it returns to the calling function. Can target a specific session in multi-process debugging.

**Parameters:**

- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

#### evaluate_expression

Evaluates an expression in the context of a paused debug session and returns its result. Can target a specific session in multi-process debugging.

**Parameters:**

- `expression` (string, required): Expression to evaluate (e.g., "x + y", "user.name", "len(items)"). Uses the current stack frame context.
- `frameId` (number, optional): Optional stack frame ID from `get_stack_frames`. If provided, `threadId` is ignored.
- `threadId` (number, optional): Optional thread ID. Required if `frameId` is not provided. Use `list_threads` to see available threads.
- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

**Note:** Either `frameId` or `threadId` must be provided. Call `list_threads` first to see available threads, then specify `threadId` to evaluate in a specific thread's context.

**Examples:**

```json
{
  "expression": "user.name",
  "threadId": 1
}
```

```json
{
  "expression": "len(items)",
  "frameId": 2
}
```

#### list_threads

Lists all threads in the debug session with their IDs and names. Use this to see which threads are available before calling `get_stack_frames`, `evaluate_expression`, or `get_variables` with a specific `threadId`.

**Parameters:**

- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

**Example output:**

```json
{
  "threads": [
    { "id": 1, "name": "MainThread" },
    { "id": 2, "name": "Worker-1" },
    { "id": 3, "name": "Worker-2" }
  ],
  "total": 3
}
```

#### get_stack_frames

Gets the current call stack frames including file locations, line numbers, and frame IDs. Can optionally specify which thread to get frames from for multi-threaded debugging.

**Parameters:**

- `threadId` (number, optional): Optional thread ID. If omitted, returns stack frames from the first thread. Use `list_threads` to see all thread IDs
- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

**Example:**

```json
{
  "threadId": 2,
  "sessionId": "worker-123"
}
```

#### get_variables

Gets all variables and their values in the current scope including locals, globals, and closure variables. Can target a specific session in multi-process debugging.

**Parameters:**

- `frameId` (number, optional): Optional stack frame ID from `get_stack_frames`. If provided, `threadId` is ignored.
- `threadId` (number, optional): Optional thread ID. Required if `frameId` is not provided. Use `list_threads` to see available threads.
- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

**Note:** Either `frameId` or `threadId` must be provided. Call `list_threads` first to see available threads, then specify `threadId` to get variables from a specific thread's context.

**Examples:**

```json
{
  "threadId": 1
}
```

```json
{
  "frameId": 2,
  "sessionId": "worker-123"
}
```

#### get_current_location

Returns the exact file path, line number, and column where execution is currently paused in the debugger. Use this to understand the current execution context before inspecting variables or evaluating expressions. Can target a specific session in multi-process debugging.

**Parameters:**

- `sessionId` (string, optional): Optional session ID. If not provided, operates on the active debug session

## Configuration

The MCP Debug Hub extension supports the following configuration options in VS Code settings:

- **`mcpDebugHub.ssePort`**
  Port number for the MCP SSE (Server-Sent Events) server. Used by AI clients like Cursor, Continue, and Cline to connect for debugging.

  - **Type:** number
  - **Default:** `37337`
  - **Range:** 1024-65535

- **`mcpDebugHub.sseHost`**
  Host address where the MCP SSE server will listen. Use 'localhost' for local connections or '0.0.0.0' to allow remote connections.

  - **Type:** string
  - **Default:** `"localhost"`

- **`mcpDebugHub.autostart`**
  Automatically start the MCP server when VS Code opens. When disabled, use 'MCP Debug Hub: Start Server' command to start manually. This setting can also be toggled directly from the MCP Debug Hub status view.

  - **Type:** boolean
  - **Default:** `false`

- **`mcpDebugHub.logLevel`**
  Logging verbosity level. 'debug' shows all messages, 'error' shows only errors. View logs in the 'MCP Debug Hub' output channel.
  - **Type:** string
  - **Choices:** `debug`, `info`, `warn`, `error`
  - **Default:** `"info"`

### Changing the port

To use a different port, update your VS Code settings:

```json
{
  "mcpDebugHub.ssePort": 8080
}
```

Then update your MCP client configuration to use the new port. The exact format depends on your client:

**For Cursor:**
```json
{
  "mcpServers": {
    "debug-mcp": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

**For Cline:**
```json
{
  "mcpServers": {
    "debug-mcp": {
      "command": "node",
      "args": [],
      "transport": {
        "type": "sse",
        "url": "http://localhost:8080/mcp"
      }
    }
  }
}
```

**For Continue:**
```json
{
  "mcpServers": {
    "debug-mcp": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:8080/mcp"
      }
    }
  }
}
```

## Concepts

### Debug configurations

The extension uses VS Code's debug configurations from your workspace settings. Configurations can be stored in `.vscode/launch.json` (single-root workspaces) or `workspace.code-workspace` (multi-root workspaces). You must have at least one debug configuration set up for your project before using the MCP Debug Hub.

Example `launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Current File",
      "type": "python",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal"
    }
  ]
}
```

### Breakpoint verification

When you set a breakpoint, it may be in a "pending" state until the debug session reaches code that can verify it. Verified breakpoints are guaranteed to be hit, while pending breakpoints may need adjustment.

### Stack frames

Stack frames represent the call stack at a paused execution point. Frame ID 0 is the current (topmost) frame. Use frame IDs with `evaluate_expression` and `get_variables` to inspect different levels of the call stack.

## Development

### Building from source

```bash
git clone https://github.com/R-D-menasheof/mcp-debug-hub.git
cd mcp-debug-hub
npm install
npm run compile
```

### Running in development

1. Open the project in VS Code
2. Press F5 to start debugging
3. A new VS Code window will open with the extension loaded
4. Configure your MCP client to connect to `http://localhost:37337/mcp`

### Running tests

```bash
npm test
```

## Known limitations

- The extension requires an active VS Code workspace with debug configurations
- Some debug adapters may have limited support for certain features (e.g., conditional breakpoints)
- The SSE transport requires the MCP client to support Server-Sent Events

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See [LICENSE](LICENSE) file for details.

## Links

- [GitHub Repository](https://github.com/R-D-menasheof/mcp-debug-hub)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Model Context Protocol](https://modelcontextprotocol.io/)
