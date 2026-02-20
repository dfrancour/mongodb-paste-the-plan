/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-utils/setup.ts"],
  },
  resolve: {
    alias: {
      "#components": path.resolve(__dirname, "./src/components"),
      "#lib": path.resolve(__dirname, "./src/lib"),
      "#types": path.resolve(__dirname, "./src/types"),
      "#data": path.resolve(__dirname, "./src/data"),
      "#hooks": path.resolve(__dirname, "./src/hooks"),
      "#test-utils": path.resolve(__dirname, "./src/test-utils"),
    },
  },
});
