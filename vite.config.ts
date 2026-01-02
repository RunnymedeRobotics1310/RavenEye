import { defineConfig } from "vite";
import version from "vite-plugin-package-version";
import tsconfigPaths from "vite-tsconfig-paths";
import { reactRouter } from "@react-router/dev/vite";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths(), version()],
});
