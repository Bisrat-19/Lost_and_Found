// Shared constants for forms, validation and matching.
// Safe to import on both client and server.
import { Category } from "@/generated/prisma/enums";

export { Category };

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export const CATEGORY_LABELS: Record<Category, string> = {
  BAG: "Bag / backpack",
  PHONE: "Phone",
  EARBUDS: "Earbuds / headphones",
  LAPTOP: "Laptop / tablet",
  KEYS: "Keys",
  WALLET: "Wallet / purse",
  ID_CARD: "ID / student card",
  BOTTLE: "Water bottle",
  CLOTHING: "Clothing",
  OTHER: "Other",
};

export const CATEGORIES = Object.values(Category);

// ---------------------------------------------------------------------------
// Colours: a short fixed list keeps the data clean for matching.
// Similar colours (black ≈ dark grey) are handled by the matcher, not here.
// ---------------------------------------------------------------------------
export const COLORS = [
  "black",
  "white",
  "grey",
  "silver",
  "blue",
  "navy",
  "red",
  "green",
  "yellow",
  "orange",
  "pink",
  "purple",
  "brown",
  "beige",
  "gold",
  "multicolor",
] as const;

export type Color = (typeof COLORS)[number];

// ---------------------------------------------------------------------------
// Campus locations. Each belongs to a zone, so "library" and "library
// entrance" count as close by when matching.
// ---------------------------------------------------------------------------
export const LOCATIONS = [
  { id: "library", label: "Library", zone: "library" },
  { id: "library-entrance", label: "Library entrance", zone: "library" },
  { id: "cafeteria", label: "Cafeteria", zone: "student-center" },
  { id: "coffee-shop", label: "Coffee shop", zone: "student-center" },
  { id: "student-center", label: "Student center", zone: "student-center" },
  { id: "main-hall", label: "Main lecture hall", zone: "academic" },
  { id: "science-building", label: "Science building", zone: "academic" },
  { id: "engineering-building", label: "Engineering building", zone: "academic" },
  { id: "computer-lab", label: "Computer lab", zone: "academic" },
  { id: "gym", label: "Gym", zone: "sports" },
  { id: "football-field", label: "Football field", zone: "sports" },
  { id: "dormitories", label: "Dormitories", zone: "residential" },
  { id: "parking-lot", label: "Parking lot", zone: "transport" },
  { id: "bus-stop", label: "Bus stop", zone: "transport" },
  { id: "other", label: "Other / not sure", zone: "unknown" },
] as const;

export type LocationId = (typeof LOCATIONS)[number]["id"];

export const LOCATION_IDS = LOCATIONS.map((l) => l.id) as [LocationId, ...LocationId[]];

export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l])) as Record<
  LocationId,
  (typeof LOCATIONS)[number]
>;

// ---------------------------------------------------------------------------
// Validation limits
// ---------------------------------------------------------------------------
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 500;
export const MAX_REPORT_AGE_DAYS = 90; // older reports are not useful to match
export const REPORT_EXPIRY_DAYS = 60; // open reports auto-expire after this
