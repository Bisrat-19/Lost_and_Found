// Demo data, including the examples from the assessment brief.
//
//   npx prisma db seed
//
// Safe to run repeatedly: it only replaces rows whose id starts with "seed_",
// so reports you created yourself are left alone. Dates are relative to today,
// so the demo never "expires".
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import type { Category } from "../src/generated/prisma/enums.ts";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Midnight UTC, `n` days ago (matches how the date picker stores dates). */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

type Seed = {
  id: string;
  category: Category;
  color: string | null;
  location: string;
  date: Date;
  description: string;
  contact?: string;
};

// ---------------------------------------------------------------------------
// Found items (public list)
// ---------------------------------------------------------------------------
const FOUND: Seed[] = [
  // Brief: "Dark-colored backpack found near the library entrance Monday evening."
  { id: "seed_found_backpack_library", category: "BAG", color: null, location: "library-entrance", date: daysAgo(16), description: "Dark-colored backpack found near the library entrance Monday evening.", contact: "finder.library@example.edu" },
  // Brief: "Black backpack found at the football field two weeks later."
  { id: "seed_found_backpack_field", category: "BAG", color: "black", location: "football-field", date: daysAgo(2), description: "Black backpack found at the football field.", contact: "coach@example.edu" },
  // Brief: "Found a dark wireless earbud case beside the coffee shop."
  { id: "seed_found_earbuds", category: "EARBUDS", color: null, location: "coffee-shop", date: daysAgo(1), description: "Found a dark wireless earbud case beside the coffee shop.", contact: "barista@example.edu" },
  { id: "seed_found_phone", category: "PHONE", color: "black", location: "library", date: daysAgo(15), description: "Black phone with a cracked screen protector, left on a library desk." },
  { id: "seed_found_keys", category: "KEYS", color: "silver", location: "bus-stop", date: daysAgo(4), description: "Three keys on a red keychain, found on the bench at the bus stop.", contact: "+251 911 000 111" },
  { id: "seed_found_bottle", category: "BOTTLE", color: "navy", location: "gym", date: daysAgo(1), description: "Navy steel water bottle with a university sticker, left in the gym changing room." },
  { id: "seed_found_wallet", category: "WALLET", color: "brown", location: "cafeteria", date: daysAgo(3), description: "Brown leather wallet, no cash, has a student card inside.", contact: "cafeteria.desk@example.edu" },
  { id: "seed_found_hoodie", category: "CLOTHING", color: "grey", location: "dormitories", date: daysAgo(6), description: "Grey zip hoodie, size M, found in the dorm laundry room." },
  { id: "seed_found_umbrella", category: "OTHER", color: "black", location: "main-hall", date: daysAgo(2), description: "Black folding umbrella left under a seat after the morning lecture." },
  { id: "seed_found_laptop", category: "LAPTOP", color: "silver", location: "computer-lab", date: daysAgo(7), description: "Silver laptop in a black neoprene sleeve, found in the computer lab." },
  // Already returned (see the resolved demo below), so it is hidden from the public list
  { id: "seed_found_glasses", category: "OTHER", color: "black", location: "science-building", date: daysAgo(9), description: "Black reading glasses in a hard case, found in a science lab." },
];

// ---------------------------------------------------------------------------
// Lost reports, each with a fixed demo token so the links are predictable
// ---------------------------------------------------------------------------
const LOST: (Seed & { token: string })[] = [
  // Brief: "Black backpack containing a laptop charger. Lost around the library on Monday afternoon."
  { id: "seed_lost_backpack", token: "demo-black-backpack-0001", category: "BAG", color: "black", location: "library", date: daysAgo(16), description: "Black backpack containing a laptop charger. Lost around the library on Monday afternoon.", contact: "owner.backpack@example.edu" },
  // Brief: "I lost my black AirPods case yesterday near the cafeteria."
  { id: "seed_lost_airpods", token: "demo-airpods-case-0002", category: "EARBUDS", color: "black", location: "cafeteria", date: daysAgo(2), description: "I lost my black AirPods case yesterday near the cafeteria.", contact: "owner.airpods@example.edu" },
  { id: "seed_lost_keys", token: "demo-silver-keys-0003", category: "KEYS", color: "silver", location: "parking-lot", date: daysAgo(5), description: "Set of three silver keys on a red keychain.", contact: "owner.keys@example.edu" },
  { id: "seed_lost_bottle", token: "demo-blue-bottle-0004", category: "BOTTLE", color: "blue", location: "gym", date: daysAgo(1), description: "Blue metal water bottle with a university sticker on it.", contact: "owner.bottle@example.edu" },
  { id: "seed_lost_student_id", token: "demo-student-id-0005", category: "ID_CARD", color: null, location: "main-hall", date: daysAgo(4), description: "Student ID card in a clear plastic holder.", contact: "owner.id@example.edu" },
];

// A report that was already closed with "I got it back"
const RESOLVED_LOST = {
  id: "seed_lost_glasses",
  token: "demo-returned-glasses-0006",
  category: "OTHER" as const,
  color: "black",
  location: "science-building",
  date: daysAgo(10),
  description: "Black reading glasses in a hard case.",
  contact: "owner.glasses@example.edu",
};

async function main() {
  const removed = await db.report.deleteMany({ where: { id: { startsWith: "seed_" } } });

  await db.report.createMany({
    data: FOUND.map((f) => ({
      ...f,
      type: "FOUND" as const,
      contact: f.contact ?? null,
      status: f.id === "seed_found_glasses" ? ("RESOLVED" as const) : ("OPEN" as const),
      resolvedAt: f.id === "seed_found_glasses" ? daysAgo(8) : null,
    })),
  });
  await db.report.createMany({
    data: [
      ...LOST.map((l) => ({ ...l, type: "LOST" as const })),
      { ...RESOLVED_LOST, type: "LOST" as const, status: "RESOLVED" as const, resolvedAt: daysAgo(8), resolvedWithId: "seed_found_glasses" },
    ],
  });

  const base = process.env.APP_URL ?? "http://localhost:3000";
  console.log(`Seeded ${FOUND.length} found + ${LOST.length + 1} lost reports (replaced ${removed.count} old seed rows).\n`);
  console.log("Private match links for the demo lost reports:");
  for (const l of [...LOST, RESOLVED_LOST]) {
    console.log(`  ${l.description.slice(0, 48).padEnd(48)}  ${base}/matches/${l.token}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
