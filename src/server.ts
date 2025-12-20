import readline from "node:readline";
import type { Request, Response } from "./protocol.js";

type ToolHandler = (input: Record<string, unknown>) =>
  | Record<string, unknown>
  | Promise<Record<string, unknown>>;

const toolRegistry = new Map<string, ToolHandler>();

export function registerTool(name: string, handler: ToolHandler): void {
  toolRegistry.set(name, handler);
}

registerTool("ping", async () => ({ pong: true }));

function writeResponse(stream: NodeJS.WritableStream, response: Response): void {
  stream.write(`${JSON.stringify(response)}\n`);
}

function toErrorResponse(id: string, code: string, message: string, details?: unknown): Response {
  return {
    id,
    ok: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}

function isRequest(value: unknown): value is Request {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Request;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.tool === "string" &&
    typeof candidate.input === "object" &&
    candidate.input !== null
  );
}

function serializeError(error: unknown): { message: string; details?: unknown } {
  if (error instanceof Error) {
    return { message: error.message, details: { name: error.name, stack: error.stack } };
  }
  return { message: "Unknown error", details: error };
}

export function startServer(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
): void {
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      const { message, details } = serializeError(error);
      writeResponse(output, toErrorResponse("", "PARSE_ERROR", message, details));
      return;
    }

    if (!isRequest(parsed)) {
      writeResponse(output, toErrorResponse("", "INVALID_REQUEST", "Invalid request payload", parsed));
      return;
    }

    const handler = toolRegistry.get(parsed.tool);
    if (!handler) {
      writeResponse(
        output,
        toErrorResponse(parsed.id, "UNKNOWN_TOOL", `Unknown tool: ${parsed.tool}`),
      );
      return;
    }

    try {
      const outputPayload = await handler(parsed.input);
      const response: Response = {
        id: parsed.id,
        ok: true,
        output: outputPayload,
      };
      writeResponse(output, response);
    } catch (error) {
      const { message, details } = serializeError(error);
      writeResponse(output, toErrorResponse(parsed.id, "TOOL_ERROR", message, details));
    }
  });
}
