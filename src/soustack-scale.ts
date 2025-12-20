import { scaleRecipe } from "soustack";

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

  if (typeof multiplier !== "number" || !Number.isFinite(multiplier) || multiplier <= 0) {
    throw new ScaleError("Multiplier must be a finite number greater than 0.");
  }

  const scaledRecipe = scaleRecipe(recipe, { multiplier });

  return { recipe: scaledRecipe };
}
