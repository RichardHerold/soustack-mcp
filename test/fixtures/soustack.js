export function validateRecipe(recipe, options) {
  const override = globalThis.__soustackValidateRecipe;
  if (typeof override === "function") {
    return override(recipe, options);
  }
  return {
    ok: false,
    warnings: [],
    schemaErrors: [{ path: "", message: "No validateRecipe mock configured" }],
    conformanceIssues: [],
  };
}

export function scaleRecipe(recipe, options) {
  const override = globalThis.__soustackScaleRecipe;
  if (typeof override === "function") {
    return override(recipe, options);
  }
  return { recipe, options };
}

export const SOUSTACK_SPEC_VERSION = "test";
