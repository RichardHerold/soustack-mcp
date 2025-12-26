import readline from "node:readline";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
type ValidateRecipe = typeof import("soustack")["validateRecipe"];
type SoustackProfile = import("soustack").SoustackProfile;
import type { Request, Response } from "./protocol.js";
import { convertTool } from "./soustack-convert.js";
import { scaleTool } from "./soustack-scale.js";

type ToolHandler = (input: Record<string, unknown>) =>
  | Record<string, unknown>
  | Promise<Record<string, unknown>>;

const toolRegistry = new Map<string, ToolHandler>();

class ToolError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ToolError";
    this.code = code;
    this.details = details;
  }
}

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
const supportedProfiles: SoustackProfile[] = [
  "lite",
  "base",
  "timed",
  "scalable",
  "illustrated",
  "equipped",
  "prepped",
  "minimal",
  "core",
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
    throw new ToolError(
      "MODULE_UNAVAILABLE",
      "Soustack package not available.",
      "validateRecipe",
    );
  }

  const mode = (options as { mode?: unknown } | undefined)?.mode;
  if (mode !== undefined && mode !== "schema" && mode !== "full") {
    throw new ToolError("INVALID_MODE", "options.mode must be \"schema\" or \"full\".");
  }

  try {
    const normalizedOptions =
      options && typeof options === "object"
        ? { ...options, ...(mode ? { mode } : {}) }
        : mode
          ? { mode }
          : undefined;
    const result = await validateRecipe(
      recipe,
      normalizedOptions as Parameters<typeof validateRecipe>[1],
    );
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
    throw new ToolError("VALIDATION_FAILED", message);
  }
});

function getDetectProfiles(): DetectProfiles | null {
  const soustackModule = getSoustackModule();
  return typeof soustackModule?.detectProfiles === "function"
    ? soustackModule.detectProfiles
    : null;
}

function normalizeProfiles(detected: unknown): string[] {
  const profiles = Array.isArray(detected)
    ? detected
    : Array.isArray((detected as { profiles?: unknown } | null)?.profiles)
      ? (detected as { profiles?: unknown[] }).profiles ?? []
      : [];
  const knownProfiles = new Set(
    profiles.filter((profile): profile is string => typeof profile === "string"),
  );
  return supportedProfiles.filter((profile) => knownProfiles.has(profile));
}

registerTool("soustack.detectProfiles", async (input) => {
  const { recipe } = input as { recipe?: unknown };
  const detectProfiles = getDetectProfiles();

  if (detectProfiles) {
    const detected = await detectProfiles(recipe);
    const profiles = normalizeProfiles(detected);
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
  const sanitized = sanitizeForJson(response);
  stream.write(`${JSON.stringify(sanitized)}\n`);
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

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function sanitizeForJson(value: unknown, seen = new Set<unknown>()): JsonValue {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "symbol" || typeof value === "function") {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }

  if (value instanceof Map) {
    return Array.from(value.entries()).map(([key, entryValue]) => [
      sanitizeForJson(key, seen),
      sanitizeForJson(entryValue, seen),
    ]);
  }

  if (value instanceof Set) {
    return Array.from(value.values()).map((entry) => sanitizeForJson(entry, seen));
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForJson(entry, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);
    const result: { [key: string]: JsonValue } = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeForJson(entryValue, seen);
    }
    seen.delete(value);
    return result;
  }

  return null;
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

function serializeError(error: unknown): { message: string } {
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Unknown error" };
}

function extractErrorCode(error: unknown): string {
  if (error instanceof ToolError) {
    return error.code;
  }
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "TOOL_ERROR";
}

function extractErrorDetails(error: unknown): unknown {
  if (error instanceof ToolError) {
    return error.details;
  }
  return (error as { details?: unknown } | null)?.details;
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
      const { message } = serializeError(error);
      writeResponse(output, toErrorResponse("", "BAD_JSON", message));
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
      const { message } = serializeError(error);
      const code = extractErrorCode(error);
      const details = extractErrorDetails(error);
      writeResponse(output, toErrorResponse(parsed.id, code, message, details));
    }
  });
}
