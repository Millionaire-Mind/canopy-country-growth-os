// Staff account management for Canopy Country Growth OS.
//
// There is no self-service signup or in-app admin UI by design — this app will hold
// customer PII and revenue data, so accounts are created deliberately by whoever
// controls the production database, from their own machine, using DATABASE_URL
// pointed at the real (Prisma Postgres) database. Run with: npx tsx scripts/manage-users.ts <command> [...args]
//
// Commands:
//   create   --email <email> [--name <name>] [--password <password>]
//            (omit --password to auto-generate and print a one-time password)
//   list
//   activate   --email <email>
//   deactivate --email <email>   (blocks future logins; does not revoke an
//                                 already-issued session token until it expires —
//                                 see docs/DEPLOYMENT.md)
//   delete   --email <email>

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value === undefined || value.startsWith("--")) {
        flags[key] = "true";
      } else {
        flags[key] = value;
        i++;
      }
    }
  }
  return flags;
}

function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

async function create(flags: Record<string, string>) {
  const email = flags.email?.trim().toLowerCase();
  if (!email) throw new Error("--email is required");

  const password = flags.password ?? generatePassword();
  const passwordHash = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: flags.name, passwordHash, isActive: true },
    update: { name: flags.name, passwordHash, isActive: true },
  });

  console.log(`User ready: ${user.email} (id ${user.id})`);
  if (!flags.password) {
    console.log(`One-time generated password: ${password}`);
    console.log("Communicate this out of band. It is not stored anywhere in plaintext.");
  }
}

async function list() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  if (users.length === 0) {
    console.log("No users yet.");
    return;
  }
  for (const u of users) {
    console.log(`${u.isActive ? "ACTIVE  " : "DISABLED"}  ${u.email}${u.name ? ` (${u.name})` : ""}`);
  }
}

async function setActive(flags: Record<string, string>, isActive: boolean) {
  const email = flags.email?.trim().toLowerCase();
  if (!email) throw new Error("--email is required");

  const user = await prisma.user.update({ where: { email }, data: { isActive } });
  console.log(`${user.email} is now ${isActive ? "ACTIVE" : "DISABLED"}.`);
  if (!isActive) {
    console.log(
      "Note: this blocks future sign-ins immediately. An already-issued session token " +
        "for this user remains valid until it expires (max 12 hours) — see docs/DEPLOYMENT.md."
    );
  }
}

async function remove(flags: Record<string, string>) {
  const email = flags.email?.trim().toLowerCase();
  if (!email) throw new Error("--email is required");

  await prisma.user.delete({ where: { email } });
  console.log(`Deleted ${email}.`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  switch (command) {
    case "create":
      await create(flags);
      break;
    case "list":
      await list();
      break;
    case "activate":
      await setActive(flags, true);
      break;
    case "deactivate":
      await setActive(flags, false);
      break;
    case "delete":
      await remove(flags);
      break;
    default:
      console.error(
        "Usage: npx tsx scripts/manage-users.ts <create|list|activate|deactivate|delete> [--email ...] [--name ...] [--password ...]"
      );
      process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
