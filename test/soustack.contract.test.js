import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { PassThrough } from "node:stream";
import { test } from "node:test";

const require = createRequire(import.meta.url);

function resetSoustackModule() {
  delete require.cache[require.resolve("soustack")];
  delete require.cache[require.resolve("soustack/package.json")];
}

function sendRequest(startServer, request) {
  const input = new PassThrough();
  const output = new PassThrough();
  output.setEncoding("utf8");

  const responsePromise = new Promise((resolve, reject) => {
    let buffer = "";
    output.on("data", (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex);
        resolve(JSON.parse(line));
      }
    });
    output.on("error", reject);
  });

  startServer(input, output);
  input.write(`${JSON.stringify(request)}\n`);

  return responsePromise;
}

const minimalSoustackRecipe = {
  type: "recipe",
  name: "Contract Salad",
  ingredients: [{ name: "Greens", quantity: 1, unit: "cup" }],
  instructions: ["Mix."],
  equipment: [{ id: "bowl", name: "Mixing bowl", quantity: 1 }],
};

const schemaOrgRecipe = {
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Contract Salad",
  recipeIngredient: ["1 cup greens"],
  recipeInstructions: ["Mix."],
};

const soustackStringRecipe = {
  type: "recipe",
  name: "Contract Salad",
  ingredients: ["Greens"],
  instructions: ["Mix."],
};

test.afterEach(() => {
  delete globalThis.__soustackValidateRecipe;
  delete globalThis.__soustackScaleRecipe;
  delete globalThis.__soustackDisableDetectProfiles;
  resetSoustackModule();
});

test("soustack tools return stable envelopes and minimal fixtures", async () => {
  globalThis.__soustackDisableDetectProfiles = false;
  globalThis.__soustackValidateRecipe = (_recipe, options) => ({
    ok: true,
    warnings: options?.mode === "schema" ? ["schema-only"] : [],
    schemaErrors: [],
    conformanceIssues: options?.mode === "schema" ? [] : [],
    normalizedRecipe: { ...minimalSoustackRecipe, normalized: true },
  });
  globalThis.__soustackScaleRecipe = (recipe, { multiplier }) => ({
    ...recipe,
    ingredients: (recipe.ingredients ?? []).map((ingredient) => ({
      ...ingredient,
      quantity: (ingredient.quantity ?? 0) * multiplier,
    })),
    equipment: (recipe.equipment ?? []).map((equipment) => ({
      ...equipment,
      quantity: (equipment.quantity ?? 1) * multiplier,
    })),
  });

  resetSoustackModule();
  const { startServer } = await import(`../dist/server.js?contract=${Date.now()}`);

  const metaResponse = await sendRequest(startServer, {
    id: "meta-1",
    tool: "soustack.meta",
    input: {},
  });

  assert.equal(metaResponse.ok, true);
  assert.equal(typeof metaResponse.output.mcpVersion, "string");
  assert.equal(metaResponse.output.soustackVersion, "test");
  assert.equal(metaResponse.output.specVersion, "test");
  assert.deepEqual(
    metaResponse.output.supportedProfiles,
    ["lite", "base", "timed", "scalable", "illustrated", "equipped", "prepped", "minimal", "core"],
  );
  assert.equal(typeof metaResponse.output.timestamp, "string");

  const validateResponse = await sendRequest(startServer, {
    id: "validate-1",
    tool: "soustack.validate",
    input: { recipe: minimalSoustackRecipe, options: { mode: "schema" } },
  });
  assert.equal(validateResponse.ok, true);
  assert.deepEqual(validateResponse.output, {
    ok: true,
    warnings: ["schema-only"],
    schemaErrors: [],
    conformanceIssues: [],
    normalizedRecipe: { ...minimalSoustackRecipe, normalized: true },
  });

  const detectProfilesResponse = await sendRequest(startServer, {
    id: "detect-1",
    tool: "soustack.detectProfiles",
    input: { recipe: minimalSoustackRecipe },
  });
  assert.equal(detectProfilesResponse.ok, true);
  assert.deepEqual(detectProfilesResponse.output, {
    profiles: ["lite", "base", "timed", "scalable", "illustrated", "equipped", "prepped", "minimal", "core"],
  });

  const scaleResponse = await sendRequest(startServer, {
    id: "scale-1",
    tool: "soustack.scale",
    input: { recipe: minimalSoustackRecipe, options: { multiplier: 2 } },
  });
  assert.equal(scaleResponse.ok, true);
  assert.deepEqual(scaleResponse.output, {
    recipe: {
      ...minimalSoustackRecipe,
      ingredients: [{ name: "Greens", quantity: 2, unit: "cup" }],
      equipment: [{ id: "bowl", name: "Mixing bowl", quantity: 2 }],
    },
    equipment: [{ id: "bowl", name: "Mixing bowl", quantity: 2 }],
  });

  const convertResponse = await sendRequest(startServer, {
    id: "convert-1",
    tool: "soustack.convert",
    input: { from: "soustack", to: "schemaorg", payload: soustackStringRecipe },
  });
  assert.equal(convertResponse.ok, true);
  assert.deepEqual(convertResponse.output, {
    payload: {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Contract Salad",
      recipeIngredient: ["Greens"],
      recipeInstructions: ["Mix."],
    },
  });

  const convertInboundResponse = await sendRequest(startServer, {
    id: "convert-2",
    tool: "soustack.convert",
    input: { from: "schemaorg", to: "soustack", payload: schemaOrgRecipe },
  });
  assert.equal(convertInboundResponse.ok, true);
  assert.deepEqual(convertInboundResponse.output, {
    payload: {
      type: "recipe",
      name: "Contract Salad",
      ingredients: ["1 cup greens"],
      instructions: ["Mix."],
    },
  });
});
