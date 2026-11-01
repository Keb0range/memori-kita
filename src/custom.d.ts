// Ambient module declarations for static asset imports.
// TypeScript does not natively understand non-JS/TS file imports;
// these declarations silence TS2882 ("Cannot find module … for side-effect import").

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
