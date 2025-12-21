import readline from "node:readline";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
type ValidateRecipe = typeof import("soustack")["validateRecipe"];
import type { Request, Response } from "./protocol.js";
import { convertTool } from "./soustack-convert.js";
import { scaleTool } from "./soustack-scale.js";

type ToolHandler = (input: Record<string, unknown>) =>
  | Record<string, unknown>
  | Promise<Record<string, unknown>>;

const toolRegistry = new Map<string, ToolHandler>();

export function registerTool(name: string, handler: ToolHandler): void {
  toolRegistry.set(name, handler);
}

registerTool("ping", async () => ({ pong: true }));
const require = createRequire(import.meta.url);
type DetectProfiles = (recipe: unknown) => Promise<unknown> | unknown;

function getSoustackModule():
  | { validateRecipe?: ValidateRecipe; detectProfiles?: DetectProfiles }
  | null {
  try {
    return require("soustack") as {
      validateRecipe?: ValidateRecipe;
      detectProfiles?: DetectProfiles;
    };
  } catch (error) {
    return null;
  }
}

function getValidateRecipe(): ValidateRecipe | null {
  const soustackModule = getSoustackModule();
  return typeof soustackModule?.validateRecipe === "function"
    ? soustackModule.validateRecipe
    : null;
}
const supportedProfiles = [
  "lite",
  "base",
  "timed",
  "scalable",
  "illustrated",
  "equipped",
  "prepped",
];

async function readMcpVersion(): Promise<string> {
  const packageUrl = new URL("../package.json", import.meta.url);
  const contents = await readFile(packageUrl, "utf-8");
  const parsed = JSON.parse(contents) as { version?: string };
  if (typeof parsed.version !== "string") {
    throw new Error("Unable to resolve MCP package version.");
  }
  return parsed.version;
}

function readSoustackVersion(): string | null {
  try {
    const soustackPackage = require("soustack/package.json") as { version?: string };
    return typeof soustackPackage?.version === "string" ? soustackPackage.version : null;
  } catch (error) {
    return null;
  }
}

function readSoustackSpecVersion(): string | null {
  try {
    const soustackModule = require("soustack") as { SOUSTACK_SPEC_VERSION?: unknown };
    return typeof soustackModule?.SOUSTACK_SPEC_VERSION === "string"
      ? soustackModule.SOUSTACK_SPEC_VERSION
      : null;
  } catch (error) {
    return null;
  }
}

registerTool("soustack.meta", async () => {
  const mcpVersion = await readMcpVersion();
  const soustackVersion = readSoustackVersion();
  const specVersion = readSoustackSpecVersion();

  return {
    mcpVersion,
    soustackVersion,
    specVersion,
    supportedProfiles: [...supportedProfiles],
    timestamp: new Date().toISOString(),
  };
});
registerTool("soustack.convert", async (input) => convertTool(input));
registerTool("soustack.scale", async (input) => scaleTool(input));

registerTool("soustack.validate", async (input) => {
  const { recipe, options } = input as { recipe?: unknown; options?: unknown };
  const validateRecipe = getValidateRecipe();

  if (!validateRecipe) {
    return {
      ok: false,
      warnings: [],
      schemaErrors: [{ path: "", message: "Soustack package not available." }],
      conformanceIssues: [],
    };
  }

  try {
    const result = await validateRecipe(recipe, options as Parameters<typeof validateRecipe>[1]);
    const ok = result?.ok === true;
    const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
    const schemaErrors = Array.isArray(result?.schemaErrors) ? result.schemaErrors : [];
    const conformanceIssues = Array.isArray(result?.conformanceIssues)
      ? result.conformanceIssues
      : [];

    return {
      ok,
      warnings,
      schemaErrors,
      conformanceIssues,
      ...(result?.normalizedRecipe === undefined
        ? {}
        : { normalizedRecipe: result.normalizedRecipe }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      warnings: [],
      schemaErrors: [{ path: "", message }],
      conformanceIssues: [],
    };
  }
});

function getDetectProfiles(): DetectProfiles | null {
  const soustackModule = getSoustackModule();
  return typeof soustackModule?.detectProfiles === "function"
    ? soustackModule.detectProfiles
    : null;
}

registerTool("soustack.detectProfiles", async (input) => {
  const { recipe } = input as { recipe?: unknown };
  const detectProfiles = getDetectProfiles();

  if (detectProfiles) {
    const detected = await detectProfiles(recipe);
    const profiles = Array.isArray(detected)
      ? detected
      : Array.isArray((detected as { profiles?: unknown } | null)?.profiles)
        ? ((detected as { profiles?: string[] }).profiles ?? [])
        : [];
    return { profiles };
  }

  const validateRecipe = getValidateRecipe();
  if (!validateRecipe) {
    return { profiles: [] };
  }

  const results = await Promise.all(
    supportedProfiles.map(async (profile) => {
      try {
        const result = await validateRecipe(recipe, { profile });
        return result?.ok === true;
      } catch (error) {
        return false;
      }
    }),
  );

  const profiles = supportedProfiles.filter((_, index) => results[index]);
  return { profiles };
});

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

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  const candidate = error as { code?: unknown };
  return typeof candidate.code === "string" ? candidate.code : null;
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
      const errorCode = getErrorCode(error) ?? "TOOL_ERROR";
      writeResponse(output, toErrorResponse(parsed.id, errorCode, message, details));
    }
  });
}
