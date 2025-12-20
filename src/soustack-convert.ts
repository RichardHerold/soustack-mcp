type ConversionDirection = "schemaorg" | "soustack";

class ConversionError extends Error {
  code = "CONVERSION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "ConversionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ConversionError(`Expected ${field} to be an array of strings.`);
  }
  return value;
}

function fromSchemaOrg(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    throw new ConversionError("Schema.org payload must be an object.");
  }
  if (payload["@type"] !== "Recipe") {
    throw new ConversionError("Schema.org payload must be a Recipe.");
  }

  const name = payload.name;
  if (typeof name !== "string" || name.length === 0) {
    throw new ConversionError("Schema.org Recipe name must be a non-empty string.");
  }

  const ingredients = toStringArray(payload.recipeIngredient, "recipeIngredient");
  const instructions = toStringArray(payload.recipeInstructions, "recipeInstructions");

  return {
    type: "recipe",
    name,
    ingredients,
    instructions,
  };
}

function toSchemaOrg(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    throw new ConversionError("Soustack payload must be an object.");
  }
  if (payload.type !== "recipe") {
    throw new ConversionError("Soustack payload must be a recipe.");
  }

  const name = payload.name;
  if (typeof name !== "string" || name.length === 0) {
    throw new ConversionError("Soustack recipe name must be a non-empty string.");
  }

  const ingredients = toStringArray(payload.ingredients, "ingredients");
  const instructions = toStringArray(payload.instructions, "instructions");

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name,
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
  };
}

export function convertTool(input: Record<string, unknown>): Record<string, unknown> {
  const from = input.from;
  const to = input.to;
  const payload = input.payload;

  if (from !== "schemaorg" && from !== "soustack") {
    throw new ConversionError("Conversion input from must be schemaorg or soustack.");
  }

  if (to !== "schemaorg" && to !== "soustack") {
    throw new ConversionError("Conversion input to must be schemaorg or soustack.");
  }

  let converted: Record<string, unknown>;

  if (from === "schemaorg" && to === "soustack") {
    converted = fromSchemaOrg(payload);
  } else if (from === "soustack" && to === "schemaorg") {
    converted = toSchemaOrg(payload);
  } else {
    throw new ConversionError("Conversion input from/to must be schemaorg or soustack.");
  }

  return { payload: converted };
}
