import { createRequire } from "node:module";
type ScaleRecipe = typeof import("soustack")["scaleRecipe"];

const require = createRequire(import.meta.url);

function getScaleRecipe(): ScaleRecipe | null {
  try {
    const soustackModule = require("soustack") as { scaleRecipe?: ScaleRecipe };
    return typeof soustackModule.scaleRecipe === "function"
      ? soustackModule.scaleRecipe
      : null;
  } catch (error) {
    return null;
  }
}

class ScaleError extends Error {
  code: string;

  constructor(message: string, code = "INVALID_MULTIPLIER") {
    super(message);
    this.name = "ScaleError";
    this.code = code;
  }
}

export function scaleTool(input: Record<string, unknown>): Record<string, unknown> {
  const { recipe, options } = input as { recipe?: unknown; options?: unknown };
  const multiplier = (options as { multiplier?: unknown } | undefined)?.multiplier;
  const scaleRecipe = getScaleRecipe();

  if (typeof multiplier !== "number" || !Number.isFinite(multiplier) || multiplier <= 0) {
    throw new ScaleError("Multiplier must be a finite number greater than 0.");
  }

  if (!scaleRecipe) {
    throw new ScaleError("Soustack package not available.", "MODULE_UNAVAILABLE");
  }

  let scaledRecipe: unknown;
  try {
    scaledRecipe = scaleRecipe(recipe, { multiplier });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scaling failed.";
    throw new ScaleError(message, "SCALE_FAILED");
  }

  const equipment = (scaledRecipe as { equipment?: unknown } | null)?.equipment;

  return {
    recipe: scaledRecipe,
    ...(equipment === undefined ? {} : { equipment }),
  };
}
