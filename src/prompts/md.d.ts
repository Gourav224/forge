// Bun bundles `.md` files imported with `{ type: "text" }` as their string contents.
declare module "*.md" {
  const content: string;
  export default content;
}
