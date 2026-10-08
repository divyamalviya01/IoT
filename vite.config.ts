import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    // MDX must run before the React Router plugin so theory pages compile to JSX first.
    { enforce: "pre", ...mdx({ remarkPlugins: [remarkGfm] }) },
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
    // tsconfig paths only cover TypeScript importers; MDX files need the alias too.
    alias: [{ find: /^~\//, replacement: `${fileURLToPath(new URL("./app/", import.meta.url))}` }],
  },
});
