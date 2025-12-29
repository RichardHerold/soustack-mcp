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
  delete globalThis.__soustackValidateRecipe;
});

test("soustack.validate returns ok:false for invalid recipes", async () => {
  globalThis.__soustackValidateRecipe = async () => ({
    ok: false,
    warnings: [],
    schemaErrors: [{ path: "/name", message: "Required" }],
    conformanceIssues: [],
  });

  const { startServer } = await import(`../dist/server.js?invalid=${Date.now()}`);
  const response = await sendRequest(startServer, {
    id: "invalid-1",
    tool: "soustack.validate",
    input: { recipe: {} },
  });

  assert.equal(response.ok, true);
  assert.deepEqual(response.output, {
    ok: false,
    warnings: [],
    schemaErrors: [{ path: "/name", message: "Required" }],
    conformanceIssues: [],
  });
});

test("soustack.validate returns ok:true for valid recipes", async () => {
  globalThis.__soustackValidateRecipe = async () => ({
    ok: true,
    warnings: [],
    schemaErrors: [],
    conformanceIssues: [],
  });

  const { startServer } = await import(`../dist/server.js?valid=${Date.now()}`);
  const response = await sendRequest(startServer, {
    id: "valid-1",
    tool: "soustack.validate",
    input: { recipe: { name: "Salad" } },
  });

  assert.equal(response.ok, true);
  assert.deepEqual(response.output, {
    ok: true,
    warnings: [],
    schemaErrors: [],
    conformanceIssues: [],
  });
});

test("soustack.validate normalizes legacy $schema to canonical in normalizedRecipe", async () => {
  const legacySchemaUrl = "https://soustack.ai/schemas/soustack.schema.json";
  const canonicalSchemaUrl = "https://spec.soustack.org/soustack.schema.json";

  globalThis.__soustackValidateRecipe = async () => ({
    ok: true,
    warnings: [],
    schemaErrors: [],
    conformanceIssues: [],
    normalizedRecipe: {
      type: "recipe",
      name: "Test Recipe",
      $schema: legacySchemaUrl,
    },
  });

  const { startServer } = await import(`../dist/server.js?legacy=${Date.now()}`);
  const response = await sendRequest(startServer, {
    id: "legacy-1",
    tool: "soustack.validate",
    input: {
      recipe: {
        type: "recipe",
        name: "Test Recipe",
        $schema: legacySchemaUrl,
      },
      options: { includeNormalized: true },
    },
  });

  assert.equal(response.ok, true);
  assert.equal(response.output.ok, true);
  assert.ok(response.output.normalizedRecipe);
  assert.equal(
    response.output.normalizedRecipe.$schema,
    canonicalSchemaUrl,
  );
});
