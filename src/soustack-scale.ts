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
  code = "INVALID_MULTIPLIER";

  constructor(message: string) {
    super(message);
    this.name = "ScaleError";
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
    throw new Error("Soustack package not available.");
  }

  const scaledRecipe = scaleRecipe(recipe, { multiplier });

  return { recipe: scaledRecipe };
}
