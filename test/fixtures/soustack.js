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

const detectProfilesEnabled = globalThis.__soustackDisableDetectProfiles !== true;

export const detectProfiles = detectProfilesEnabled
  ? async function detectProfiles(recipe) {
      const profiles = [
        "lite",
        "base",
        "timed",
        "scalable",
        "illustrated",
        "equipped",
        "prepped",
      ];
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

export const SOUSTACK_VERSION = "1.2.3";
export const SOUSTACK_SPEC_VERSION = "test";
