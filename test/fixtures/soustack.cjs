const profiles = [
  "lite",
  "base",
  "timed",
  "scalable",
  "illustrated",
  "equipped",
  "prepped",
];

function validateRecipe(recipe, options) {
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

function scaleRecipe(recipe, options) {
  const override = globalThis.__soustackScaleRecipe;
  if (typeof override === "function") {
    return override(recipe, options);
  }
  return { recipe, options };
}

async function detectProfiles(recipe) {
  const detected = [];
  for (const profile of profiles) {
    const result = await validateRecipe(recipe, { profile });
    if (result?.ok === true) {
      detected.push(profile);
    }
  }
  return detected;
}

module.exports = {
  validateRecipe,
  scaleRecipe,
  detectProfiles,
  SOUSTACK_SPEC_VERSION: "test",
};
