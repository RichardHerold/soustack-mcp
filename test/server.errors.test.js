import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { test } from "node:test";

function sendLine(startServer, line) {
  const input = new PassThrough();
  const output = new PassThrough();
  output.setEncoding("utf8");

  const responsePromise = new Promise((resolve, reject) => {
    let buffer = "";
    output.on("data", (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex >= 0) {
        const responseLine = buffer.slice(0, newlineIndex);
        resolve(JSON.parse(responseLine));
      }
    });
    output.on("error", reject);
  });

  startServer(input, output);
  input.write(`${line}\n`);

  return responsePromise;
}

test("invalid JSON returns BAD_JSON", async () => {
  const { startServer } = await import(`../dist/server.js?bad-json=${Date.now()}`);
  const response = await sendLine(startServer, "{not-json");

  assert.equal(response.ok, false);
  assert.equal(response.error.code, "BAD_JSON");
  assert.equal(typeof response.error.message, "string");
  assert.notEqual(response.error.message.length, 0);
});

test("unknown tool returns UNKNOWN_TOOL", async () => {
  const { startServer } = await import(`../dist/server.js?unknown-tool=${Date.now()}`);
  const response = await sendLine(
    startServer,
    JSON.stringify({ id: "missing-1", tool: "does.not.exist", input: {} }),
  );

  assert.equal(response.ok, false);
  assert.equal(response.error.code, "UNKNOWN_TOOL");
  assert.equal(response.error.message, "Unknown tool: does.not.exist");
});

test("tool exceptions return TOOL_ERROR", async () => {
  const { startServer, registerTool } = await import(
    `../dist/server.js?tool-error=${Date.now()}`,
  );
  registerTool("test.throw", () => {
    throw new Error("Boom");
  });

  const response = await sendLine(
    startServer,
    JSON.stringify({ id: "tool-1", tool: "test.throw", input: {} }),
  );

  assert.equal(response.ok, false);
  assert.equal(response.error.code, "TOOL_ERROR");
  assert.equal(response.error.message, "Boom");
});
