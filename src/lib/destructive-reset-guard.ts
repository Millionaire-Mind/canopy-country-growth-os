// Pure decision logic for scripts/guard-dev-only.ts — separated from the script's
// process.exit() side effects so it's directly unit-testable (tests/seed-guard.test.ts).
// Two independent checks, both required — belt and suspenders, since a single
// misconfigured env var should not be enough to let a destructive command through.
export interface DestructiveResetCheck {
  allowed: boolean;
  reason?: string;
}

export function checkDestructiveResetAllowed(env: {
  NODE_ENV?: string;
  ALLOW_DESTRUCTIVE_RESET?: string;
}): DestructiveResetCheck {
  if (env.NODE_ENV === "production") {
    return {
      allowed: false,
      reason:
        "Refused: NODE_ENV=production. db:reset drops and recreates every table, " +
        "including real leads, customers, sales, and users. This command must never " +
        "run against production.",
    };
  }

  if (env.ALLOW_DESTRUCTIVE_RESET !== "true") {
    return {
      allowed: false,
      reason:
        "Refused: ALLOW_DESTRUCTIVE_RESET is not set to 'true'.\n" +
        "This command drops and recreates the entire database schema — all real data\n" +
        "would be lost, not just sample data. Set ALLOW_DESTRUCTIVE_RESET=true only when\n" +
        "you are certain DATABASE_URL points at a throwaway local/dev database, e.g.:\n" +
        "  ALLOW_DESTRUCTIVE_RESET=true npm run db:reset",
    };
  }

  return { allowed: true };
}
