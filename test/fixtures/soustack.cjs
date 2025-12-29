const profiles = [
  "lite",
  "base",
  "timed",
  "scalable",
  "illustrated",
  "equipped",
  "prepped",
  "minimal",
  "core",
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

const detectProfilesEnabled = globalThis.__soustackDisableDetectProfiles !== true;

const detectProfiles = detectProfilesEnabled
  ? async function detectProfiles(recipe) {
      const detected = [];
      for (const profile of profiles) {
        const result = await validateRecipe(recipe, { profile });
        if (result?.ok === true) {
          detected.push(profile);
        }
      }
      return detected;
    }
  : undefined;

module.exports = {
  validateRecipe,
  scaleRecipe,
  detectProfiles,
  SOUSTACK_VERSION: "1.2.3",
  SOUSTACK_SPEC_VERSION: "test",
};
