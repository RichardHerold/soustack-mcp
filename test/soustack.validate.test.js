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
