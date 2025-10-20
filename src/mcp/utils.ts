import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function createErrorResult(error: unknown): CallToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return {
    isError: true,
    content: [{
      type: 'text',
      text: errorMessage,
    }],
  };
}

