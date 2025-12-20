export async function resolve(specifier, context, defaultResolve) {
  if (specifier === "soustack") {
    return {
      url: new URL("./fixtures/soustack.js", import.meta.url).href,
      shortCircuit: true,
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
}
