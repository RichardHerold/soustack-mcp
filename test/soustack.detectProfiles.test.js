import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { PassThrough } from "node:stream";
import { test } from "node:test";

const require = createRequire(import.meta.url);

function resetSoustackModule() {
  delete require.cache[require.resolve("soustack")];
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

test.afterEach(() => {
  delete globalThis.__soustackValidateRecipe;
  delete globalThis.__soustackDisableDetectProfiles;
  resetSoustackModule();
});

test("soustack.detectProfiles returns profiles for minimal recipes", async () => {
  globalThis.__soustackDisableDetectProfiles = true;
  globalThis.__soustackValidateRecipe = async (recipe, options) => ({
    ok: ["lite", "base"].includes(options?.profile),
    warnings: [],
    schemaErrors: [],
    conformanceIssues: [],
  });

  resetSoustackModule();
  const { startServer } = await import(`../dist/server.js?profiles-min=${Date.now()}`);
  const response = await sendRequest(startServer, {
    id: "profiles-min-1",
    tool: "soustack.detectProfiles",
    input: { recipe: { name: "Salad" } },
  });

  assert.equal(response.ok, true);
  assert.deepEqual(response.output, { profiles: ["lite", "base"] });
});

test("soustack.detectProfiles returns profiles for scalable recipes", async () => {
  globalThis.__soustackDisableDetectProfiles = true;
  globalThis.__soustackValidateRecipe = async (recipe, options) => ({
    ok:
      recipe?.scalable === true
        ? ["lite", "base", "scalable"].includes(options?.profile)
        : ["lite", "base"].includes(options?.profile),
    warnings: [],
    schemaErrors: [],
    conformanceIssues: [],
  });

  resetSoustackModule();
  const { startServer } = await import(`../dist/server.js?profiles-scale=${Date.now()}`);
  const response = await sendRequest(startServer, {
    id: "profiles-scale-1",
    tool: "soustack.detectProfiles",
    input: { recipe: { name: "Salad", scalable: true } },
  });

  assert.equal(response.ok, true);
  assert.deepEqual(response.output, { profiles: ["lite", "base", "scalable"] });
});
