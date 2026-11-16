// Word lists used by the matcher. Plain data, so it's easy to review and extend.
import type { Category } from "@/generated/prisma/enums";

/**
 * Words that mean the same thing for matching purposes → one canonical word.
 * Applied after plural stripping, so list singular forms.
 */
export const WORD_SYNONYMS: Record<string, string> = {
  // earbuds / headphones
  airpod: "earbud",
  earphone: "earbud",
  headphone: "earbud",
  headset: "earbud",
  bud: "earbud",
  // bags
  backpack: "bag",
  rucksack: "bag",
  knapsack: "bag",
  bookbag: "bag",
  satchel: "bag",
  tote: "bag",
  handbag: "bag",
  // phones
  cellphone: "phone",
  smartphone: "phone",
  mobile: "phone",
  iphone: "phone",
  android: "phone",
  // laptops
  macbook: "laptop",
  notebook: "laptop",
  chromebook: "laptop",
  ipad: "tablet",
  // wallets
  purse: "wallet",
  billfold: "wallet",
  // keys
  keychain: "key",
  keyring: "key",
  // clothing
  coat: "jacket",
  hoodie: "jacket",
  sweater: "jacket",
  sweatshirt: "jacket",
  jumper: "jacket",
  // bottles
  flask: "bottle",
  tumbler: "bottle",
  thermo: "bottle",
  // id cards
  id: "card",
  badge: "card",
  // misc
  spectacle: "glass",
  sunglass: "glass",
  cable: "charger",
};

/**
 * Words that carry no matching signal for the *item description*: report verbs
 * ("lost", "found"), time words and campus place words. Time and location
 * have their own signals, so counting them in the text too would double-count.
 */
export const STOPWORDS = new Set(
  `a an the and or but of to in on at by for with from into onto near nearby around beside
   next behind under over inside outside about this that these those it its is was were be been
   am are i me my mine we our you your he she his her they them their there here
   lost lose losing found find finding left leave forgot forget dropped drop
   yesterday today tonight morning afternoon evening night ago last week day
   some something thing item one very really maybe probably think please help
   have has had got get just also so not no any all can could would should will
   contain contains containing contained inside holding carrying
   monday tuesday wednesday thursday friday saturday sunday weekend
   library cafeteria coffee shop cafe canteen field football pitch gym hall building lab
   parking lot bus stop dorm dormitory entrance exit campus center centre room class classroom
   lecture bench table floor seat corridor stairs`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Colour vocabulary in free text → canonical colour (matching the COLORS list),
 * or a broad shade ("dark" / "light") when the text is vague.
 */
export const COLOR_WORDS: Record<string, string> = {
  black: "black",
  white: "white",
  grey: "grey",
  gray: "grey",
  silver: "silver",
  blue: "blue",
  navy: "navy",
  red: "red",
  maroon: "red",
  green: "green",
  yellow: "yellow",
  orange: "orange",
  pink: "pink",
  purple: "purple",
  violet: "purple",
  brown: "brown",
  tan: "beige",
  beige: "beige",
  cream: "beige",
  gold: "gold",
  golden: "gold",
  multicolor: "multicolor",
  multicolored: "multicolor",
  colorful: "multicolor",
  dark: "dark",
  darker: "dark",
  light: "light",
  pale: "light",
};

/** Extra words removed from text tokens because the colour signal covers them. */
export const COLOR_FILLER = new Set(["colored", "coloured", "color", "colour", "ish", "shade"]);

/**
 * Colours that people often mix up or describe loosely. Two colours in the
 * same group count as "similar" (partial points).
 */
export const COLOR_GROUPS: readonly (readonly string[])[] = [
  ["dark", "black", "navy", "grey", "brown"],
  ["light", "white", "beige", "silver", "grey", "yellow"],
  ["silver", "grey", "gold"],
  ["blue", "navy"],
  ["red", "pink", "orange"],
  ["purple", "pink"],
  ["brown", "beige"],
];

/**
 * Categories that are easily confused or reported either way
 * (an ID card inside a wallet, earbuds vs. a phone accessory).
 */
export const RELATED_CATEGORIES: readonly (readonly [Category, Category])[] = [
  ["WALLET", "ID_CARD"],
  ["EARBUDS", "PHONE"],
  ["LAPTOP", "BAG"],
  ["KEYS", "WALLET"],
];
