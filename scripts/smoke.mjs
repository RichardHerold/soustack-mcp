import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import readline from "node:readline";

const supportedProfiles = [
  "lite",
  "base",
  "timed",
  "scalable",
  "illustrated",
  "equipped",
  "prepped",
];

function createLineReader(stream) {
  const rl = readline.createInterface({ input: stream });
  const lines = [];
  const waiters = [];

  rl.on("line", (line) => {
    if (waiters.length > 0) {
      const resolve = waiters.shift();
      resolve(line);
    } else {
      lines.push(line);
    }
  });

  const nextLine = () => {
    if (lines.length > 0) {
      return Promise.resolve(lines.shift());
    }
    return new Promise((resolve) => {
      waiters.push(resolve);
    });
  };

  return { nextLine, close: () => rl.close() };
}

async function sendRequest(child, reader, request) {
  child.stdin.write(`${JSON.stringify(request)}\n`);
  const line = await reader.nextLine();
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch (error) {
    throw new Error(`Failed to parse response: ${line}`);
  }
  return parsed;
}

function assertSuccess(response, id) {
  assert.equal(response.id, id);
  assert.equal(response.ok, true);
  assert.ok(response.output && typeof response.output === "object");
}

async function main() {
  const child = spawn(process.execPath, ["dist/cli.js"], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  const reader = createLineReader(child.stdout);

  try {
    const pingResponse = await sendRequest(child, reader, {
      id: "ping-1",
      tool: "ping",
      input: {},
    });
    assertSuccess(pingResponse, "ping-1");
    assert.deepEqual(pingResponse.output, { pong: true });

    const metaResponse = await sendRequest(child, reader, {
      id: "meta-1",
      tool: "soustack.meta",
      input: {},
    });
    assertSuccess(metaResponse, "meta-1");
    assert.equal(typeof metaResponse.output.mcpVersion, "string");
    assert.equal(typeof metaResponse.output.timestamp, "string");
    assert.deepEqual(metaResponse.output.supportedProfiles, supportedProfiles);

    const validateResponse = await sendRequest(child, reader, {
      id: "validate-1",
      tool: "soustack.validate",
      input: { recipe: {} },
    });
    assertSuccess(validateResponse, "validate-1");
    assert.equal(validateResponse.output.ok, false);
    assert.ok(Array.isArray(validateResponse.output.schemaErrors));

    const schemaOrgPayload = {
      "@type": "Recipe",
      name: "Soup",
      recipeIngredient: ["1 cup water"],
      recipeInstructions: ["Boil"],
    };
    const convertResponse = await sendRequest(child, reader, {
      id: "convert-1",
      tool: "soustack.convert",
      input: {
        from: "schemaorg",
        to: "soustack",
        payload: schemaOrgPayload,
      },
    });
    assertSuccess(convertResponse, "convert-1");
    assert.deepEqual(convertResponse.output, {
      payload: {
        type: "recipe",
        name: "Soup",
        ingredients: ["1 cup water"],
        instructions: ["Boil"],
      },
    });

    const scaleResponse = await sendRequest(child, reader, {
      id: "scale-1",
      tool: "soustack.scale",
      input: {
        recipe: {
          type: "recipe",
          name: "Scaled",
          ingredients: [{ item: "Flour", quantity: { amount: 1, unit: "cup" } }],
          instructions: ["Mix"],
        },
        options: { multiplier: 2 },
      },
    });
    assertSuccess(scaleResponse, "scale-1");
    assert.equal(scaleResponse.output.recipe.ingredients[0].quantity.amount, 2);
  } finally {
    child.stdin.end();
    reader.close();
    child.kill();
  }
}

await main();
