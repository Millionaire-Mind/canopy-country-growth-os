// Blocks destructive commands (db:reset) from running against production. See
// src/lib/destructive-reset-guard.ts for the actual decision logic (unit tested there).
import { checkDestructiveResetAllowed } from "@/lib/destructive-reset-guard";

const result = checkDestructiveResetAllowed(process.env);

if (!result.allowed) {
  console.error(result.reason);
  process.exit(1);
}

console.log("Destructive reset allowed (non-production, ALLOW_DESTRUCTIVE_RESET=true).");
