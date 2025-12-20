declare module "soustack" {
  export type ValidateRecipeOptions = {
    profile?: string;
    mode?: "schema" | "full";
    includeNormalized?: boolean;
  };

  export type ValidateRecipeResult = {
    ok: boolean;
    warnings?: string[];
    schemaErrors?: { path: string; keyword?: string; message: string }[];
    conformanceIssues?: { code: string; path: string; severity: string; message: string }[];
    normalizedRecipe?: object;
  };

  export const SOUSTACK_SPEC_VERSION: string;

  export function validateRecipe(
    recipe: unknown,
    options?: ValidateRecipeOptions,
  ): ValidateRecipeResult | Promise<ValidateRecipeResult>;

  export function detectProfiles(
    recipe: unknown,
  ): string[] | { profiles: string[] } | Promise<string[] | { profiles: string[] }>;
}
