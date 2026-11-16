# Lost & Found Matcher

A small web app that helps a university match **lost** item reports with **found** item reports.
Students post reports, and the app suggests **scored, explained matches** that only the person who
lost the item can see.

> Status: in progress. See [PLAN.md](PLAN.md) for the full build plan.

---

## How it works (in 5 steps)

```
 Lost something?                         Found something?
       │                                        │
 1. Post a LOST report                   2. Post a FOUND report
    (category, colour, place,               (category, colour, place,
     date, description, contact)             date, description)
       │                                        │
       ▼                                        ▼
 You get a PRIVATE LINK               It appears in the PUBLIC found list
 /matches/<secret-token>              (limited details, no contact info)
       │                                        │
       └──────────────┬─────────────────────────┘
                      ▼
 3. The app SCORES every lost/found pair (0–100) and explains why
                      │
                      ▼
 4. Only YOU, through your private link, see your matches + scores
    New matches appear live while the page is open (SSE)
                      │
                      ▼
 5. Got it back? Click "I got it back" → your report and the matched
    found report are closed and leave the public list
```

**In short:**

1. **Lost an item?** Post a lost report. You get a **private link**. Save it, because it is your key.
2. **Found an item?** Post a found report. It shows up in the **public found list** so anyone can browse it.
3. **Matching:** the app compares your lost report to every open found report and gives each a **score
   (0–100)** and a label: **Strong** or **Possible**, with reasons such as "same category · same area ·
   found 1 day later".
4. **Privacy:** scores, matches and contact details are only visible through your private link.
   Others can see found items but not who is looking for them or how well they match.
5. **Closing:** when you get your item back, you mark it as returned from your private link. Both
   reports are closed and removed from the public list. Reports nobody closes expire after 60 days.

---

## How to run

**Requirements:** Node.js 20+, Docker

```bash
# 1. Environment
cp .env.example .env

# 2. Start Postgres (Docker, exposed on localhost:5433)
docker compose up -d

# 3. Install dependencies (also generates the Prisma client)
npm install

# 4. Set up the database
npx prisma migrate dev
npx prisma db seed        # loads sample reports, including the examples from the brief

# 5. Run the app
npm run dev               # http://localhost:3000

# Tests (matching logic)
npm test
```

---

## Approach

The app does not decide ownership. It **suggests** likely matches and explains why, and a person
makes the final call. I kept the build small and put the effort into three things:

1. **Clean input:** category, colour, location and date are picked from lists, and the description is free text.
2. **Explainable matching:** every score comes with reasons a person can check.
3. **Privacy:** found items are public with limited details, while matches, scores and contact details are private.

## How matching works

Code: [`src/lib/matching/`](src/lib/matching/). These are pure functions with no database, covered by unit tests.

Each lost/found pair gets a score from 0 to 100, made of five signals. **Every signal also produces a
reason**, shown to the user, so a person can check why two reports matched.

| Signal | Max | Full points | Partial points | Zero |
|---|---|---|---|---|
| Category | 30 | Same type | Related types (wallet ↔ ID card) = 12; one is "Other" = 10 | Unrelated |
| Description | 25 | TF-IDF cosine ≥ 0.8 | Scaled below that | No key words shared |
| Colour | 15 | Same colour | Similar (black ≈ navy ≈ "dark") = 10; unknown = 5 | Different |
| Location | 15 | Same place | Same campus zone (library ≈ library entrance) = 10; unknown = 5 | Different zone |
| Time | 15 | Found 0–3 days after the loss | Fades linearly from day 3 to day 14 | 14+ days |

**Description similarity (TF-IDF).** Each description is turned into keywords:
1. Remove filler words. Also remove colour, time and place words, because those already have their own signals and would otherwise be counted twice.
2. Remove plurals (backpacks → backpack).
3. Map synonyms to one word (AirPods / earphones → *earbud*, backpack / rucksack → *bag*).
4. Weight words by how rare they are across all open reports. Sharing "charger" counts more than sharing "bag".

**Missing information is neutral, not negative.** If the colour field is empty, the matcher looks for a
colour word in the description ("dark-colored backpack" → *dark*). If there is none, both reports get
a neutral 5 points instead of 0.

**Hard rules**
- Found more than 1 day **before** the loss → not a match. One day is allowed for date mistakes.
- **Unrelated categories are capped at 30**, so a black phone never matches a black bag just because colour, place and time agree.
- Closed and expired reports are never matched.

**Labels:** ≥ 70 **Strong**, 45–69 **Possible**, below 45 hidden.

**The brief's examples, as scored by the app** (also unit tests):

| Lost: *black backpack with a laptop charger, library, Monday* vs. found... | Score |
|---|---|
| Dark-colored backpack near the library entrance, Monday evening | **79, Strong** |
| Black backpack at the football field, two weeks later | **59, Possible**, flagged "different area" and "14 days later" |
| Black backpack with a laptop charger inside, library, next day | **100, Strong** |
| Black phone in the library, same day | **30, hidden** (different type of item) |

| Lost: *black AirPods case near the cafeteria* vs. found... | Score |
|---|---|
| Dark wireless earbud case beside the coffee shop, next day | **87, Strong** |

These are scored as single pairs. In the running app, the description score shifts by a point or two,
because word rarity is computed across all open reports.

The football-field case is intentionally **Possible**, not hidden: it's the same kind of bag, but the
place and time don't fit, so the app shows it with those doubts spelled out and lets a person decide.

## Report lifecycle (how we know an item was returned)

| Status | Meaning | Visible publicly? |
|---|---|---|
| `OPEN` | Still lost / still waiting for its owner | Found reports: yes |
| `RESOLVED` | Owner clicked **"I got it back"** on their private link | No |
| `EXPIRED` | Open for more than 60 days with no update | No |

- The owner closes the report from their private link. If they pick which found report was theirs,
  that found report is closed too.
- The finder cannot close a report, because they have no private link. In this version the
  owner's confirmation is the source of truth.
- Closed reports are **kept in the database, not deleted**, so they could be used later to measure
  how well matching works.

## Assumptions

- One university with a fixed list of campus locations.
- Reports are honest. There is no spam or abuse protection.
- A found item cannot be found before it was lost (1-day grace for date mistakes).
- Matches are suggestions and are never automatic handovers. The owner and the finder or lost-and-found office arrange the handover themselves.
- The person who lost the item saves their private link. Without accounts, a lost link cannot be recovered.
- Small data volume, so matches are computed on request instead of stored.

## Technical decisions

| Decision | Reason |
|---|---|
| **Next.js (App Router)** for UI and API | One project, one command to run |
| **PostgreSQL in Docker + Prisma** | Reproducible DB, typed queries, migrations and seed |
| **HeroUI** (formerly NextUI) with reusable wrapper components | Consistent, accessible UI with thin pages |
| **React Context + `useReducer`** (Redux pattern) | Global live state without an extra library; easy to move to Redux Toolkit |
| **Server-Sent Events** for live reports and matches | Updates only go server→client, so SSE is simpler than WebSockets and reconnects on its own |
| **Rule-based scoring + TF-IDF** instead of an LLM API | Free, fast, predictable and explainable |
| **Secret link** instead of accounts | Keeps scores private with no login system. The page is `noindex` and sends no Referer, so the link doesn't leak |
| **Finder contact shown only on Strong matches** | Otherwise anyone could post vague fake lost reports just to collect finders' emails |
| **Matches computed on request**, not stored | Always reflects the latest reports. Fine at university scale (see "What I would build next") |
| **Soft close (status) instead of delete** | Keeps history for auditing and for measuring match quality |
| **zod** validation shared by client and server | One source of truth for input rules |

## Not built on purpose

The brief asked for a small app, so I left these out to focus on matching and clear decisions.

| Not built | Why I skipped it | What the app does instead |
|---|---|---|
| **User accounts / login** | Auth adds a lot of code (passwords, sessions, reset flows) and isn't needed to show matching | A **secret private link** per lost report acts as the key |
| **Email / SMS / push notifications** | Needs an email provider, templates and background jobs | **Live updates (SSE)** while the private page is open |
| **AI / LLM scoring** | Costs money, needs an API key, and scores are harder to explain and test | **Rule-based scoring + TF-IDF**: free, predictable, explainable |
| **Human evaluator / staff review** | Needs roles, permissions and an admin UI | The **owner** confirms the return by clicking "I got it back" |
| **Ownership verification** | Needs a claim flow and a reviewer | Public found list shows **limited details**, so false claims are harder |
| **Photo upload / image matching** | Needs file storage and image models | Text, category, colour, place and time only |
| **Finder closing reports** | Finders have no link or account | Only the owner can close |
| **Multi-server realtime** | Needs Redis or Postgres `LISTEN/NOTIFY` | In-memory event bus (single server) |
| **Spam protection / rate limiting** | Not core to the problem | Input validation only |

## What I would build next for a real product

**1. Accounts and notifications**
- Students sign in with their **university account (SSO)**, so no separate passwords are needed.
- Reports belong to the account. "My reports" and "My matches" replace the secret link, so nothing is lost if a link is forgotten.
- **Notifications** by email or push when a new **Strong** match appears, instead of only live updates while the page is open.

**2. Public found list (kept, but improved)**
- Found items stay **public** so anyone can browse them.
- Search and filters by category, place and date.
- Optional photo, blurred or cropped so unique details stay hidden.

**3. Real AI scoring**
- Replace TF-IDF with **text embeddings** stored in Postgres with **pgvector**, so meaning matches,
  not just words ("wireless earbud case" ≈ "AirPods case").
- Optional **LLM check** on the top few candidates, which returns a score plus a short explanation.
- **Image similarity** when photos are added.
- Keep the rule-based signals (time, place, date limits) as guardrails, so AI cannot match a
  found item dated before the loss.

**4. Evaluator (human in the loop)**
- A **lost-and-found staff dashboard**: see strong matches, contact both sides, and confirm handovers.
- **Ownership verification:** the claimant describes a hidden detail (serial number, sticker, contents),
  and staff compare it before handing the item over.
- The staff confirmation marks reports as `RESOLVED`, which is more trustworthy than the owner alone.

**5. Measuring and improving match quality**
- Record which suggested matches were **confirmed or rejected** by staff and owners.
- Use that data to **tune the weights** or train a ranking model, and track precision
  (how many suggested matches were real).

**6. Running at scale**
- Compute matches when a report is posted (background job) instead of on every page view.
- Realtime over Redis or Postgres `LISTEN/NOTIFY` so it works across several servers.
- Spam protection, rate limiting and automatic expiry jobs.

## Screenshots

_To be added._

## AI usage

_To be completed._ (e.g. which parts were generated with AI, what was reviewed and changed by hand,
and why.)
