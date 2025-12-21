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

test("tool output is JSON-serializable and stable", async () => {
  const { startServer, registerTool } = await import(
    `../dist/server.js?serialize=${Date.now()}`
  );
  registerTool("test.serializable", () => ({
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    count: BigInt(42),
    nested: new Map([["k", new Set([1, 2])]]),
  }));

  const response = await sendRequest(startServer, {
    id: "serial-1",
    tool: "test.serializable",
    input: {},
  });

  assert.equal(response.ok, true);
  assert.deepEqual(response.output, {
    createdAt: "2024-01-01T00:00:00.000Z",
    count: "42",
    nested: [["k", [1, 2]]],
  });
});
