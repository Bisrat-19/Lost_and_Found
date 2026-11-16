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
# 1. Start Postgres
docker compose up -d

# 2. Install dependencies
npm install

# 3. Set up the database
cp .env.example .env
npx prisma migrate dev
npx prisma db seed        # loads sample reports, including the examples from the brief

# 4. Run the app
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

Each lost/found pair gets a score from 0 to 100:

| Signal | Weight | Notes |
|---|---|---|
| Category | 30 | Same category, or partial points for related categories |
| Description similarity | 25 | TF-IDF + cosine similarity, with stop-words removed and synonyms normalised (AirPods ≈ earbuds) |
| Colour | 15 | Exact or similar colour group (black ≈ dark); neutral if unknown |
| Location | 15 | Same place, or partial points for the same campus zone |
| Time | 15 | Highest when found soon after the loss, fading to 0 by 14 days |

- **Excluded:** found date before lost date (1-day grace), and closed reports.
- **Labels:** ≥ 70 Strong, 45–69 Possible, below that hidden by default.

Using the brief's example, a dark backpack found near the library entrance the same evening scores as a
**Strong** match. A black backpack found at the football field two weeks later is a **Possible**
match, flagged with "different area, 2 weeks later" so a human can judge.

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
| **Secret link** instead of accounts | Keeps scores private with no login system |
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
