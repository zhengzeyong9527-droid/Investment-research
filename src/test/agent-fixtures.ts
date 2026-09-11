import { vi } from "vitest";
import type { ToolRegistry, ToolResult, ToolRuntimeContext } from "@/tools/types";

type ToolCallHandler = (
  toolKey: string,
  input: Record<string, unknown>,
  context: ToolRuntimeContext
) => ToolResult<unknown> | Promise<ToolResult<unknown>>;

export function mockToolCall(handler: ToolCallHandler): ToolRegistry["call"] {
  return vi.fn(async (toolKey: string, input: Record<string, unknown>, context: ToolRuntimeContext) =>
    handler(toolKey, input, context)
  ) as unknown as ToolRegistry["call"];
}

export function testProcessEnv(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...process.env, NODE_ENV: "test", ...overrides };
}
