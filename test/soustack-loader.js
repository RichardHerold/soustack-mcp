import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, defaultResolve) {
  if (specifier === "soustack") {
    return {
      url: new URL("./fixtures/soustack.js", import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier === "soustack/package.json") {
    return {
      url: new URL("./fixtures/soustack-package.json", import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (
    (specifier.startsWith(".") || specifier.startsWith("/")) &&
    specifier.endsWith(".js")
  ) {
    const resolvedUrl = new URL(specifier, context.parentURL);
    const tsUrl = new URL(resolvedUrl.href.replace(/\.js$/, ".ts"));
    try {
      await access(fileURLToPath(tsUrl));
      return {
        url: tsUrl.href,
        shortCircuit: true,
      };
    } catch {
      // fall through
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}
