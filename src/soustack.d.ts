declare module "soustack" {
  export type SoustackProfile =
    | "lite"
    | "base"
    | "timed"
    | "scalable"
    | "illustrated"
    | "equipped"
    | "prepped"
    | "minimal"
    | "core";

  export type ValidateRecipeOptions = {
    profile?: SoustackProfile;
    mode?: "schema" | "full";
    includeNormalized?: boolean;
    collectAllErrors?: boolean;
    schema?: string;
  };

  export type ValidateRecipeResult = {
    ok: boolean;
    warnings?: string[];
    schemaErrors?: { path: string; keyword?: string; message: string }[];
    conformanceIssues?: { code: string; path: string; severity: string; message: string }[];
    normalizedRecipe?: object;
  };

  export const SOUSTACK_VERSION: string;
  export const SOUSTACK_SPEC_VERSION: string;

  export function validateRecipe(
    recipe: unknown,
    options?: ValidateRecipeOptions,
  ): ValidateRecipeResult | Promise<ValidateRecipeResult>;

  export function detectProfiles(
    recipe: unknown,
  ):
    | SoustackProfile[]
    | { profiles: SoustackProfile[] }
    | Promise<SoustackProfile[] | { profiles: SoustackProfile[] }>;
  export function scaleRecipe(
    recipe: unknown,
    options: { multiplier: number },
  ): unknown;
}
