# MCP Debug Hub

[![Build VSIX](https://github.com/R-D-menasheof/mcp-debug-hub/actions/workflows/build-vsix.yml/badge.svg)](https://github.com/R-D-menasheof/mcp-debug-hub/actions/workflows/build-vsix.yml)

`mcp-debug-hub` is a VS Code extension that exposes VS Code's debugging capabilities through the Model Context Protocol (MCP). It enables AI coding assistants (such as Cline, Claude, Cursor, or Copilot) to control and inspect debugging sessions directly within VS Code, providing powerful debugging automation and inspection capabilities.

## Key features

- **Debug session control**: Launch, stop, and manage VS Code debug sessions programmatically
- **Breakpoint management**: Set, remove, and list breakpoints with conditions, hit counts, and log messages
- **Code execution control**: Step through code, continue execution, and pause at any point
- **Runtime inspection**: Evaluate expressions, inspect variables, and examine call stacks
- **Multi-language support**: Works with any language supported by VS Code's debug adapters
- **Built-in status view**: Monitor server status, active connections, and metrics from the activity bar. Includes quick actions for server control, URL copying, and autostart toggle

## Requirements

- [VS Code](https://code.visualstudio.com/) version 1.105.0 or newer
- [Node.js](https://nodejs.org/) v22.x or newer
- A workspace with a configured `launch.json` file for your project

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

Add the following config to your MCP client:

```json
{
  "mcpServers": {
    "debug-mcp": {
      "command": "node",
      "args": [],
      "transport": {
        "type": "sse",
        "url": "http://localhost:37337/sse"
      }
    }
  }
}
```

> [!NOTE]  
> The default port is 37337. You can change this in VS Code settings under `mcpDebugHub.ssePort`.

### MCP Client configuration examples

<details>
  <summary>Cline</summary>
  
  Follow https://docs.cline.bot/mcp/configuring-mcp-servers and use the config provided above.
  
  Make sure to configure the SSE transport type correctly.
</details>

<details>
  <summary>Cursor</summary>

Go to `Cursor Settings` -> `MCP` -> `New MCP Server`. Use the config provided above with the SSE transport configuration.

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
        "url": "http://localhost:37337/sse"
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

1. Make sure you have a `launch.json` file in your workspace `.vscode` folder
2. Enter the following prompt in your MCP Client:

```
Launch the debug configuration "Python: Current File" and set a breakpoint at line 10 of main.py
```

Your MCP client should launch the debug session and set the breakpoint.

## Tools

<!-- Tool categories organized by functionality -->

- **Debug session management** (3 tools)

  - [`launch_debug`](#launch_debug)
  - [`stop_debug`](#stop_debug)
  - [`get_debug_state`](#get_debug_state)

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

- **Runtime inspection** (4 tools)
  - [`evaluate_expression`](#evaluate_expression)
  - [`get_stack_frames`](#get_stack_frames)
  - [`get_variables`](#get_variables)
  - [`get_current_location`](#get_current_location)

### Tool reference

#### launch_debug

Launches a new debug session using a named configuration from the workspace `launch.json` file.

**Parameters:**

- `configuration` (string, required): Name of the debug configuration from launch.json (e.g., "Python: Current File", "Node: Launch Program")

**Example:**

```json
{
  "configuration": "Python: Current File"
}
```

#### stop_debug

Stops the currently active debug session and terminates the debugged program.

**Parameters:** None

#### get_debug_state

Gets detailed information about the currently active debug session including session ID, state, and configuration.

**Parameters:** None

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

Continues program execution until the next breakpoint is hit or the program terminates.

**Parameters:** None

#### pause_execution

Pauses the currently running program at its current execution point.

**Parameters:** None

#### step_over

Steps over the current line of code, executing it without entering any function calls.

**Parameters:** None

#### step_into

Steps into the function call on the current line to debug inside the called function.

**Parameters:** None

#### step_out

Steps out of the current function, continuing execution until it returns to the calling function.

**Parameters:** None

#### evaluate_expression

Evaluates an expression in the context of a paused debug session and returns its result.

**Parameters:**

- `expression` (string, required): Expression to evaluate (e.g., "x + y", "user.name", "len(items)"). Uses the current stack frame context.
- `frameId` (number, optional): Optional stack frame ID from get_stack_frames. If omitted, evaluates in the topmost (current) frame.

**Example:**

```json
{
  "expression": "user.name",
  "frameId": 0
}
```

#### get_stack_frames

Gets the current call stack frames including file locations, line numbers, and frame IDs.

**Parameters:** None

#### get_variables

Gets all variables and their values in the current scope including locals, globals, and closure variables.

**Parameters:**

- `frameId` (number, optional): Optional stack frame ID from get_stack_frames. If omitted, returns variables from the topmost (current) frame.

#### get_current_location

Returns the exact file path, line number, and column where execution is currently paused in the debugger. Use this to understand the current execution context before inspecting variables or evaluating expressions.

**Parameters:** None

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

Then update your MCP client configuration to use the new port:

```json
{
  "mcpServers": {
    "debug-mcp": {
      "command": "node",
      "args": [],
      "transport": {
        "type": "sse",
        "url": "http://localhost:8080/sse"
      }
    }
  }
}
```

## Concepts

### Debug configurations

The extension uses VS Code's debug configurations from your workspace's `.vscode/launch.json` file. You must have at least one debug configuration set up for your project before using the MCP Debug Hub.

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
4. Configure your MCP client to connect to `http://localhost:37337/sse`

### Running tests

```bash
npm test
```

## Known limitations

- The extension requires an active VS Code workspace with a `launch.json` file
- Only one debug session can be active at a time
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
