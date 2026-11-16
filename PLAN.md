# Lost & Found Matcher: Build Plan

Goal: a small app where students post **lost** and **found** reports, and the system suggests
**scored matches** that only the owner of the lost report can see. Live updates go out over SSE.

Time guide: about 3 hours. Matching and clear decisions come before polish.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router)**: UI + API in one app | One project, one run command |
| Database | **PostgreSQL in Docker** (`docker-compose.yml`) | Same DB for everyone, one command |
| ORM | **Prisma** | Typed queries, migrations, seed script |
| UI | **HeroUI** (formerly NextUI, `@heroui/react`) + Tailwind | Accessible, ready-made components |
| Validation | **zod** | One schema shared by forms and API |
| State | **React Context + `useReducer`** (Redux-style) | Global live state with no extra library |
| Realtime | **Server-Sent Events (SSE)** | One-way server→client push; simpler than WebSockets |
| Tests | **Vitest** | Unit tests for the matching logic |

> NextUI was renamed to HeroUI, and `@nextui-org/react` is deprecated, so we use `@heroui/react`.

---

## 2. Data model (Prisma)

```prisma
enum ReportType { LOST FOUND }
enum Category   { BAG PHONE EARBUDS KEYS WALLET ID_CARD LAPTOP BOTTLE CLOTHING OTHER }

model Report {
  id          String     @id @default(cuid())
  type        ReportType
  category    Category
  color       String?            // from a fixed list; optional (people may not know)
  location    String             // from a fixed list of campus places
  date        DateTime           // when it was lost / found
  description String
  contact     String?            // lost reports only, never shown publicly
  token       String?   @unique  // lost reports only: the secret link to view matches
  status      ReportStatus @default(OPEN)
  resolvedWithId String?           // the found report the owner said was theirs
  resolvedAt  DateTime?
  createdAt   DateTime  @default(now())
}

enum ReportStatus { OPEN RESOLVED EXPIRED }
```

### Report lifecycle
- **OPEN:** default. Found reports are shown publicly; lost reports are matched.
- **RESOLVED:** the owner clicks **"I got it back"** on `/matches/[token]` and can pick which found
  report was theirs. Both reports close and leave the public list and matching.
- **EXPIRED:** open for more than 60 days. Filtered out at query time (no cron needed in this version).
- Reports are **never deleted** (soft close), which keeps history for auditing and for measuring matching later.
- Only the owner (who holds the token) can close. Finders cannot.

Matches are **computed on demand**, not stored. That is fine at university scale and keeps the
model simple.

---

## 3. Folder structure

```
src/
  app/
    layout.tsx                 → HeroUI provider + LiveFeedProvider
    page.tsx                   → home: recent found items + "Report lost / found"
    lost/new/page.tsx          → lost form → shows the secret link
    found/new/page.tsx         → found form
    found/page.tsx             → public found list (limited details)
    matches/[token]/page.tsx   → private matches for one lost report
    api/
      reports/route.ts         → POST create, GET list
      matches/[token]/route.ts → GET matches for a lost report
      reports/[token]/resolve/route.ts → POST "I got it back" (closes lost + chosen found)
      events/route.ts          → SSE stream (public events)
      events/[token]/route.ts  → SSE stream (private match events)
  components/
    ui/                        → reusable building blocks (see §4)
    reports/                   → ReportForm, ReportCard, ReportList
    matches/                   → MatchCard, ScoreBadge, MatchReasons
  context/
    LiveFeedContext.tsx        → Context + reducer for live state
  lib/
    db.ts                      → Prisma client singleton
    schemas.ts                 → zod schemas + constants (categories, colors, locations)
    matching/
      score.ts                 → scoring rules
      text.ts                  → tokenizing + TF-IDF similarity
      synonyms.ts              → colour + word synonym groups
      score.test.ts            → unit tests
    events.ts                  → in-memory event bus for SSE
prisma/
  schema.prisma
  seed.ts                      → sample data, including the assessment's own examples
docker-compose.yml
```

---

## 4. Reusable components (HeroUI)

Small wrappers keep pages thin and the look consistent:

| Component | Built on | Used in |
|---|---|---|
| `FormField` | HeroUI `Input` / `Textarea` + zod error | both forms |
| `SelectField` | HeroUI `Select` | category / colour / location |
| `DateField` | HeroUI `DatePicker` | both forms |
| `ReportForm` | the fields above, `type` prop = LOST/FOUND | `/lost/new`, `/found/new` |
| `ReportCard` | HeroUI `Card` + `Chip` | public list, match list |
| `ScoreBadge` | HeroUI `Chip` (green/amber/grey) | match card |
| `MatchCard` | `ReportCard` + `ScoreBadge` + reasons list | matches page |
| `EmptyState` | HeroUI `Card` | lists with no data |
| `SecretLinkBox` | `Snippet` (copy button) | after posting a lost report |
| `LiveToast` | HeroUI toast | new report / new match events |

Rule: pages handle data. Components only receive props and render.

---

## 5. State management: Context + reducer (Redux pattern)

Server data comes from Server Components where possible. **Client-side global state** only holds
what changes live:

```ts
type LiveState = {
  recentFound: PublicReport[];      // pushed by SSE
  matches: Match[];                 // for the current token, pushed by SSE
  connection: "connecting" | "open" | "closed";
  unseenMatchCount: number;
};

type Action =
  | { type: "found/added"; report: PublicReport }
  | { type: "report/resolved"; id: string }
  | { type: "matches/set"; matches: Match[] }
  | { type: "match/added"; match: Match }
  | { type: "matches/seen" }
  | { type: "connection/changed"; status: LiveState["connection"] };
```

- `LiveFeedContext` = `createContext` + `useReducer(liveReducer, initialState)`.
- Hooks: `useLiveFeed()` (state) and `useLiveDispatch()` (actions).
- Same idea as Redux (actions, a pure reducer, one store) but with no extra dependency.
- **If it grows:** move to Redux Toolkit or Zustand. The reducer and actions carry over almost unchanged.

---

## 6. Realtime with SSE

**Why SSE:** updates only go server → client. SSE runs over plain HTTP, reconnects on its own
(`EventSource`), and works in Next.js Route Handlers on Node.js.

**Server**
- `lib/events.ts`: a small in-memory pub/sub (`EventEmitter`).
- When a report is created (`POST /api/reports`):
  1. save it
  2. publish `report.created` (public, safe fields only)
  3. if it is FOUND: score it against open LOST reports. For each score ≥ threshold, publish
     `match.found` on that lost report's **token channel**.
  4. if it is LOST: compute its matches right away (shown on the success screen).
- When a report is resolved: publish `report.resolved` so it disappears from open public lists.
- `GET /api/events` → public stream: `report.created`, `report.resolved`.
- `GET /api/events/[token]` → private stream: `match.found` for that lost report only.
- Each route returns a `ReadableStream` with `Content-Type: text/event-stream`, sends a
  heartbeat every ~25 s, and unsubscribes when `request.signal` aborts.

**Client**
- `LiveFeedProvider` opens an `EventSource` and dispatches reducer actions.
- Home page and found list: new items appear at the top.
- Matches page: new matches appear live, with a toast ("New possible match: 78%").

**Known limitation (goes in README):** the in-memory bus only works with **one server
instance**. With several instances you would use Postgres `LISTEN/NOTIFY` or Redis pub/sub.

---

## 7. Matching algorithm

Score from 0 to 100, made of weighted signals. Every signal also produces a **human-readable
reason**.

| Signal | Weight | Rule |
|---|---|---|
| Category | 30 | Same = 30; related (e.g. EARBUDS/PHONE accessories) = 10; else 0 |
| Text similarity | 25 | TF-IDF cosine on description (stop-words removed, synonyms normalised) |
| Colour | 15 | Same = 15; similar group (black ≈ dark ≈ charcoal) = 10; unknown = 5 (neutral) |
| Location | 15 | Same = 15; same zone (library ≈ library entrance) = 10; else 0 |
| Time | 15 | Found 0–3 days after lost = 15, fading to 0 at 14 days |

**Hard rules**
- A found date **before** the lost date (minus a 1-day grace) → excluded.
- Different category with no relation → score capped (avoids "black phone" ≈ "black bag").

**Labels:** ≥ 70 **Strong**, 45–69 **Possible**, < 45 hidden (shown only with "show weak").

**Example from the brief**
- Lost black backpack at the library, Monday, vs. found dark backpack at the library entrance, Monday → about 85, Strong.
- Same lost item vs. found black backpack at the football field two weeks later → about 45, Possible (shown, flagged with "far away + 2 weeks").

---

## 8. Privacy decisions

- **Public:** found items with category, colour, general location, date and a **trimmed** description.
- **Private:** contact details, scores and matches (only through the secret token link).
- Owners should be able to describe a detail **not shown publicly** to claim an item (future feature).

---

## 9. Input handling

- zod validation on both client and server; clear field errors.
- Description: 10–500 characters; trimmed; HTML stripped.
- Date: not in the future; not more than 90 days ago.
- Colour optional ("I don't know").
- Unknown token → friendly 404.

---

## 10. Build steps

| # | Step | Time |
|---|---|---|
| 1 | ✅ Scaffold Next.js, write README + PLAN | 10 min |
| 2 | ✅ Docker Postgres + Prisma schema + migrate + seed | 25 min |
| 3 | ✅ HeroUI setup + reusable components | 25 min |
| 4 | ✅ Forms + `POST /api/reports` + zod | 25 min |
| 5 | ✅ Matching (`score.ts`, `text.ts`) + Vitest tests | 45 min |
| 6 | ✅ Matches page + public found list | 20 min |
| 7 | ✅ SSE bus + routes + LiveFeed context | 30 min |
| 8 | ✅ Screenshots + finish README (AI usage, decisions) | 15 min |

---

## 11. Out of scope (on purpose)

Accounts/login, email/SMS notifications, photo upload, admin dashboard, claim workflow,
multi-instance realtime, i18n.
