import assert from "node:assert/strict";
import test from "node:test";
import { convertTool } from "../src/soustack-convert.js";

test("converts Schema.org Recipe JSON-LD to Soustack recipe", () => {
  const schemaOrgRecipe = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: "Test Recipe",
    recipeIngredient: ["1 cup sugar"],
    recipeInstructions: ["Mix."],
  };

  const result = convertTool({
    from: "schemaorg",
    to: "soustack",
    payload: schemaOrgRecipe,
  });

  assert.deepEqual(result, {
    payload: {
      type: "recipe",
      name: "Test Recipe",
      ingredients: ["1 cup sugar"],
      instructions: ["Mix."],
    },
  });
});

test("converts Soustack recipe to Schema.org Recipe JSON-LD", () => {
  const soustackRecipe = {
    type: "recipe",
    name: "Test Recipe",
    ingredients: ["1 cup sugar"],
    instructions: ["Mix."],
  };

  const result = convertTool({
    from: "soustack",
    to: "schemaorg",
    payload: soustackRecipe,
  });

  assert.deepEqual(result, {
    payload: {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Test Recipe",
      recipeIngredient: ["1 cup sugar"],
      recipeInstructions: ["Mix."],
    },
  });
});
