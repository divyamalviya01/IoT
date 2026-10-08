import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "@react-router/dev/config";
import { prerenderPaths } from "./app/content/registry";

export default {
  // No runtime server: every page is pre-rendered to static HTML so the lab
  // can be served from any static host or opened on a college LAN.
  ssr: false,
  prerender: {
    paths: prerenderPaths(),
    concurrency: 4,
  },
  // Static hosts (Cloudflare Workers assets, Pages) serve 404.html for unknown
  // URLs. Using the SPA fallback there boots the app so the not-found route renders.
  async buildEnd({ reactRouterConfig }) {
    const client = join(reactRouterConfig.buildDirectory, "client");
    await copyFile(join(client, "__spa-fallback.html"), join(client, "404.html"));
  },
} satisfies Config;
