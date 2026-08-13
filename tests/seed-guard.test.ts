import { describe, it, expect } from "vitest";
import { checkDestructiveResetAllowed } from "@/lib/destructive-reset-guard";

describe("checkDestructiveResetAllowed", () => {
  it("refuses when NODE_ENV is production, even with the override flag set", () => {
    const result = checkDestructiveResetAllowed({
      NODE_ENV: "production",
      ALLOW_DESTRUCTIVE_RESET: "true",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/NODE_ENV=production/);
  });

  it("refuses when the override flag is missing", () => {
    const result = checkDestructiveResetAllowed({ NODE_ENV: "development" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/ALLOW_DESTRUCTIVE_RESET/);
  });

  it("refuses when the override flag is set to something other than the literal string 'true'", () => {
    const result = checkDestructiveResetAllowed({
      NODE_ENV: "development",
      ALLOW_DESTRUCTIVE_RESET: "1",
    });
    expect(result.allowed).toBe(false);
  });

  it("allows the reset only when both conditions are satisfied", () => {
    const result = checkDestructiveResetAllowed({
      NODE_ENV: "development",
      ALLOW_DESTRUCTIVE_RESET: "true",
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
