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

function toOptionalStringArray(value: unknown, field: string): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  return toStringArray(value, field);
}

const IMPERATIVE_VERBS = new Set([
  "add",
  "bake",
  "beat",
  "blend",
  "boil",
  "brush",
  "chop",
  "combine",
  "cook",
  "cut",
  "drizzle",
  "fold",
  "fry",
  "garnish",
  "grate",
  "grill",
  "heat",
  "knead",
  "marinate",
  "mix",
  "melt",
  "place",
  "pour",
  "preheat",
  "rest",
  "roast",
  "saute",
  "season",
  "serve",
  "simmer",
  "slice",
  "spread",
  "sprinkle",
  "stir",
  "toast",
  "toss",
  "whisk",
]);

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "onto",
  "or",
  "out",
  "over",
  "the",
  "then",
  "through",
  "to",
  "until",
  "up",
  "with",
]);

function isImperativeLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  const firstTokenMatch = trimmed.match(/^[A-Za-z][A-Za-z'-]*/);
  if (!firstTokenMatch) {
    return false;
  }
  return IMPERATIVE_VERBS.has(firstTokenMatch[0].toLowerCase());
}

function extractNounPhrases(line: string): string[] {
  const tokens = Array.from(line.matchAll(/[A-Za-z0-9][A-Za-z0-9/'-]*/g));
  if (tokens.length === 0) {
    return [];
  }

  const phrases: string[] = [];
  let current: string[] = [];

  tokens.forEach((match, index) => {
    const token = match[0];
    const normalized = token.toLowerCase();
    const isStopword = STOPWORDS.has(normalized);
    const isVerb = IMPERATIVE_VERBS.has(normalized);

    if (index === 0 && isVerb) {
      return;
    }

    if (isStopword) {
      if (current.length > 0) {
        phrases.push(current.join(" "));
        current = [];
      }
      return;
    }

    if (current.length === 0 && isVerb) {
      return;
    }

    current.push(token);
  });

  if (current.length > 0) {
    phrases.push(current.join(" "));
  }

  return phrases;
}

function inferIngredientsFromInstructions(instructions: string[]): string[] {
  const imperativeLines = instructions.filter(isImperativeLine);
  if (imperativeLines.length < 2) {
    return [];
  }

  const inferred = new Map<string, string>();
  for (const line of imperativeLines) {
    for (const phrase of extractNounPhrases(line)) {
      const key = phrase.toLowerCase();
      if (!inferred.has(key)) {
        inferred.set(key, phrase);
      }
    }
  }

  if (inferred.size < 2) {
    return [];
  }

  return Array.from(inferred.values());
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

  const ingredients = toOptionalStringArray(payload.recipeIngredient, "recipeIngredient");
  const instructions = toStringArray(payload.recipeInstructions, "recipeInstructions");
  const finalIngredients =
    ingredients.length === 0 ? inferIngredientsFromInstructions(instructions) : ingredients;

  return {
    type: "recipe",
    name,
    ingredients: finalIngredients,
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

  try {
    if (from === "schemaorg" && to === "soustack") {
      converted = fromSchemaOrg(payload);
    } else if (from === "soustack" && to === "schemaorg") {
      converted = toSchemaOrg(payload);
    } else {
      throw new ConversionError("Conversion input from/to must be schemaorg or soustack.");
    }
  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Conversion failed.";
    const wrapped = new ConversionError(message);
    wrapped.name = error instanceof Error ? error.name : wrapped.name;
    throw wrapped;
  }

  return { payload: converted };
}
