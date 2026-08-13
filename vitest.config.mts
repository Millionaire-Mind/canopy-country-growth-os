import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

// Minimal .env loader (no `dotenv` dependency in this project) — only used so the
// DB-backed integration test (tests/sample-real-separation.test.ts) can see
// DATABASE_URL locally. CI sets DATABASE_URL directly and skips this file entirely.
const envPath = path.resolve(import.meta.dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
