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
} satisfies Config;
