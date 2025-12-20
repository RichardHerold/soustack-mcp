import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { test } from "node:test";

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

test.afterEach(() => {
  delete globalThis.__soustackScaleRecipe;
});

test("soustack.scale scales recipe quantities by multiplier", async () => {
  globalThis.__soustackScaleRecipe = (recipe, options) => {
    return {
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        quantity: ingredient.quantity * options.multiplier,
      })),
    };
  };

  const recipe = {
    type: "recipe",
    name: "Scaled",
    ingredients: [
      { name: "Flour", quantity: 1, unit: "cup" },
      { name: "Sugar", quantity: 2, unit: "tbsp" },
    ],
  };

  const { startServer } = await import(`../dist/server.js?scale=${Date.now()}`);
  const response = await sendRequest(startServer, {
    id: "scale-1",
    tool: "soustack.scale",
    input: { recipe, options: { multiplier: 2 } },
  });

  assert.equal(response.ok, true);
  assert.deepEqual(response.output, {
    recipe: {
      ...recipe,
      ingredients: [
        { name: "Flour", quantity: 2, unit: "cup" },
        { name: "Sugar", quantity: 4, unit: "tbsp" },
      ],
    },
  });
});
