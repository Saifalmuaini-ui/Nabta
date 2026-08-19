# Nabta — Handover

**For:** the next Claude Code session picking this up cold.
**Written:** 15 August 2026.
**Project root:** `C:\Users\SaifA\Downloads\nabta`
**Status:** working prototype, demo-ready, no backend.

Read this file end to end before touching anything. The **Traps** section will
save you an hour — most entries are mistakes already made once in this project.

---

## 1. What this is

Nabta (نبتة — "seedling") is a prototype platform for the UAE. Growers
photograph what they did in the garden; an AI verifier reads the photo, awards
points, and those points buy real things. Beginners get a route in, everyone
gets a shared marketplace, and government services attach to a verified
growing record.

Built for **IGCF**, positioned against the **UAE National Food Security
Strategy 2051**.

### The thesis — use this framing, not the obvious one

**Weak (a judge will puncture it):** "We reduce the UAE's food-import
dependence by helping people grow food." Household gardening will not move a
90% import figure. Do not claim it.

**Strong:**

> The UAE imports roughly 90% of its food. Household and community growing
> already happens across the country — but outside commercial farms it is
> completely invisible to the people planning around that dependency. Nobody
> knows how many plots exist, what they yield, or what they consume in water.
> Nabta uses AI photo verification to turn that invisible activity into
> measured, auditable national data — and, in the same act, makes the growing
> itself more likely to succeed and more likely to continue.

Three supporting points:

- **The problem is measurement, not production.** You cannot manage what you
  cannot count. Verified photos produce structured records at ~1 US cent each.
- **AI is the unlock.** Self-reported logging was always possible and always
  worthless — unverifiable, so nothing could be built on it. Vision
  verification makes the data trustworthy enough to reward, therefore
  trustworthy enough to count.
- **Resilience, not substitution.** A population that knows how to grow, holds
  seed, and has active plots is more resilient to a supply shock. That is
  defensible; import replacement is not.

**The line to lead with:** the points, rewards, marketplace and leaderboards
are the *mechanism*. The verified data is the *product*.

---

## 2. Stack and commands

Next.js 15.5 (App Router) · React 19 · TypeScript · Tailwind v4 · lucide-react.
No backend, no database, no network calls. All state is `localStorage`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run export     # static HTML/CSS/JS into out/
npx tsc --noEmit   # typecheck — USE THIS, not `npm run build` (see Traps)
```

`npm run export` works because `next.config.mjs` checks
`npm_lifecycle_event === "export"` and switches on `output: "export"`. That
avoids needing cross-platform env-var syntax in the npm script.

---

## 3. File map

```
src/
  app/
    layout.tsx            StoreProvider + AppShell wrapper
    page.tsx              Dashboard — balance, streak, rank, impact, challenges
    verify/page.tsx       THE CORE LOOP. Camera → staged analysis → verdict
    leaderboard/page.tsx  Growers / Areas / Teams / Emirates boards
    market/page.tsx       Buy, sell, swap, give away + create listing
    rewards/page.tsx      Redeem points, issues voucher codes
    learn/page.tsx        Beginner paths + UAE sowing calendar
    gov/page.tsx          Permits, subsidies, advisories, 2051 alignment
    globals.css           Tailwind v4 @theme tokens (palm/sand/gold/ink/clay)
  components/
    AppShell.tsx          Desktop sidebar + mobile bottom bar + "More" sheet
    ui.tsx                Card, PageHeader, SectionTitle, Pill, Bar, Stat, Empty
  lib/
    types.ts              Domain model. ACTIONS, EMIRATES, AREAS live here
    data.ts               ALL seed/demo data, deliberately isolated in one file
    store.tsx             React context + localStorage. Key: nabta.state.v1
    verifier.ts           Verifier interface + simulated implementation
    samplePhoto.ts        Procedurally drawn photo, for demoing with no camera
    format.ts             num/aed/compact/litres/kg/timeAgo/dayKey/MONTHS

windows-launcher/         One-click package for machines with no dev tools
  START.bat               Double-click entry point
  launcher/server.py      Python server  (UNTESTED — see Traps)
  launcher/serve.ps1      PowerShell fallback  (tested end to end)
  app/                    Copy of out/ — gitignored, regenerate with npm run export

Nabta-Cost-Model.docx     7-page cost analysis (source: see §7)
```

---

## 4. The verification loop — the thing that matters

`src/app/verify/page.tsx` + `src/lib/verifier.ts`.

Phases: `setup → camera → review → analyzing → result`.

**The grower declares nothing.** There used to be a "What did you do?" action
picker; it was removed deliberately. The model now reads *both* the activity
and the species off the photo. This is a product improvement and a fraud fix —
you can no longer claim a 60-point planting for a 15-point watering.

### The Verifier interface — the extension point

```ts
export interface Verifier {
  id: string;
  label: string;
  analyze(input: VerifyInput): Promise<VerificationDraft>;
}
export const activeVerifier: Verifier = mockVerifier;
```

To go live: write a second implementation that POSTs the frame to a vision
model, map the response onto `VerificationDraft`, point `activeVerifier` at it.
**No UI code changes.** Put the API key behind a route handler, never in the
browser.

### How the simulation works

It is **not** random. Everything derives from an FNV hash of the image data
URL, so the same photo always produces the same verdict. That gives a property
a real perceptual hash would also give: submit the same photo twice and the
duplicate check catches it. Keep that property if you change anything here.

Outcomes: `approved` / `review` / `rejected`.

Eight visible analysis stages, in `STAGES`. Points: base by action, plus
healthy-plant +15, first-of-species +40, native species +50, water-efficient
+25, then a streak multiplier (×1.15 at 3 days, ×1.25 at 7, ×1.5 at 14).

---

## 5. Domain model notes

**Geography is three levels:** `Area` → `Emirate` → country. `AREAS` in
`types.ts` holds 24 districts (Aljada, Al Zahia, Al Tarfa, Muwaileh, …) each
with an Arabic name and parent emirate. Areas were added because that is the
level people actually compete at — you know your neighbours in Al Zahia, you do
not know "Sharjah".

Helpers: `areasIn(emirate)`, `areaEmirate(name)`.

**Leaderboard has four boards:** Growers, Areas, Teams, Emirates. Growers and
Teams take both an emirate and an area filter. Narrowing the emirate resets a
stranded area rather than showing an empty board — see `activeArea`.

**The rank card shows always** (`myIndex >= 0`), not only below 3rd place. It
was `myIndex > 2`, which hid your standing in your own area exactly when you
ranked well. If you are first it reads "You lead Aljada by N points."

---

## 6. What is real and what is placeholder

Be honest about this in any output — it is what makes the prototype credible.

| Real | Placeholder |
|---|---|
| Interaction design | Every grower/team but your own row |
| Points maths and bonuses | All partner brands (Nabta Seed Bank, Wadi Tools, Marsa Mall…) |
| Verification flow + integrity checks | National impact figures |
| UAE crop calendar and sowing windows | Government programmes |
| Area/emirate structure | Area point totals |

The government page carries an on-screen notice. Ministries are named to
illustrate where the platform *would* connect — never claim endorsement.

---

## 7. Cost model — summary

Full analysis in `Nabta-Cost-Model.docx` (7 pages). Rebuild script lives in the
session scratchpad, not the repo; if it is gone, the docx is the source of
truth and can be regenerated with the `docx` npm package.

Per verification: ~3,000 input tokens (1,500 cacheable system prompt, 1,200
image, 300 context) + ~700 output.

| Model | Per call (cached) | Per user/month | 100k MAU/month |
|---|---|---|---|
| Haiku 4.5 | $0.0052 | $0.036 | $3,605 |
| **Two-tier (recommended)** | **$0.0082** | **$0.058** | **$5,768** |
| Sonnet 5 | $0.0155 | $0.108 | $10,815 |
| Opus 5 | $0.0258 | $0.180 | $18,025 |

Two-tier = Haiku on routine logs (~70%: watering, pruning), Sonnet 5 on
high-value logs and anything low-confidence.

**The finding that matters:** AI is not the expensive line. At 1,800 points per
AED 100 voucher and ~40 points per log, each log creates **AED 2.22 of reward
liability against AED 0.030 of AI cost** — a 35–70× ratio depending on
redemption rate. If asked "who pays for the vouchers?", the answer is
partner-funded rewards, and the points-to-AED rate must become a tunable config
value rather than the hardcoded catalogue prices in `data.ts`.

Caveat carried in the doc: token counts are **modelled, not measured**. The
image figure is the biggest uncertainty — full-resolution photos on a
high-resolution-tier model can cost ~4× the assumption.

---

## 8. Fraud — the design position

Question already asked and answered: *what stops someone photographing someone
else's plant?*

**A single photo can never prove ownership.** Do not build on "is this yours?".
Build on **"is this the plant you have been tending?"**

The mechanism: register *plants*, not photos. Each plant gets an identity from
its first capture (branch structure, pot, soil, background). Later logs must
match a registered plant. A stolen photo becomes "new plant, day one" — no
history, no streak, minimum points. To profit the thief must return to that
plant repeatedly for weeks while it grows plausibly. And if the real owner also
logs it, the same plant appears under two accounts, flagging both.

Supporting layers, in priority order:

1. Plant registry + re-identification (highest leverage, high effort)
2. Points vesting + redemption thresholds (pure backend, no AI, makes fraud
   unprofitable — a watering log is worth about AED 0.83)
3. In-app capture only for points; uploads allowed but worth less
4. Plot geofence + device attestation (kills non-local theft, not neighbours)
5. Random post-capture challenge ("include your hand"), issued server-side
6. Cross-user duplicate plant detection

Set the expectation: zero fraud is not the goal, and chasing it costs real
growers. Aim for fraud that costs more than it pays, and **aggregate data that
stays sound** — the government-facing value survives a small percentage of bad
individual claims.

---

## 9. Idea backlog for the camera

Ranked by value, already discussed with the user.

**Highest value — diagnosis.** Pest and disease ID, nutrient deficiency from
leaf pattern, salinity burn (the UAE-specific failure mode), heat/water stress,
harvest readiness. Turns a scorekeeper into an advisor. Works with a general
vision model today, no training.

**Highest strategic value — yield estimation.** Count fruit, estimate
kilograms. Converts "184,300 activity logs" into "tonnes of domestic household
production" — a number a ministry can put in a report. This is the strongest
government-partnership argument in the whole project.

**Highest integrity value — same-plant re-identification.** See §8.

**The aggregate play — outbreak early warning.** Cluster disease detections
geographically; ten in one district in a week is a phytosanitary event. Crowd-
sourced surveillance across private gardens no inspector will visit.

Smaller: "what is this?" mode, weed vs seedling, site sun-exposure assessment,
photo→marketplace listing, auto time-lapse, Arabic voice description.

**Recommendation given for IGCF:** pest diagnosis + yield estimation. The first
makes judges want it; the second makes government need it.

---

## 10. Traps — read before working

Each of these has already cost time in this project.

**Never run `npm run build` or `npm run export` while `npm run dev` is
running.** They share `.next`. The build overwrites what the dev server is
serving; the symptom is a completely unstyled page, because the browser
requests the dev stylesheet and gets a 404. Use `npx tsc --noEmit` to
typecheck. If it happens: stop everything, delete `.next`, restart.

**The PowerShell launcher binds port 3000 through HTTP.sys.** `netstat` shows
the owner as PID 4 (System), not PowerShell, and killing by window title misses
it. It then silently serves the *stale static export* on the port you expect
the dev server on — which looks exactly like "my code changes aren't
applying". Kill it by command line:

```powershell
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
  Where-Object { $_.CommandLine -match 'serve\.ps1' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

**`launcher/server.py` has never been executed.** Python is not installed on
this machine. `START.bat` preflights it (imports + `compile()`) and silently
falls back to the PowerShell server if anything fails, so the package works
regardless — but do not claim the Python path is verified. The PowerShell path
*is* tested end to end: all routes, port fallback, 404s, path traversal.

**PowerShell `-replace` is case-insensitive by default.** A rename of
`Zaraa`→`Nabta` also rewrote `zaraa.state.v1` to `Nabta.state.v1`, silently
desyncing the README from the code. Use `.Replace()` for case-sensitive work.

**Batch: `if cond set X & goto :y` runs the `goto` unconditionally.** Use a
parenthesised block.

**Not all Arabic in the codebase is the brand.** `زراعة جديدة` (new planting),
`الزراعة المائية` (hydroponics), `ابدأ الزراعة` (start growing) are content
strings. Only the logo/manifest instances are branding. Never blanket-replace
Arabic.

**`store.tsx` `redeem()` must compute synchronously.** It returns the voucher
to the caller; a `setState` updater has not run yet at return time. Do not
"tidy" it back into the updater.

**localStorage quota.** `trim()` keeps 40 verifications and strips image data
beyond the newest 8. There is a quota-exceeded fallback that re-saves with all
images dropped. Captures are downscaled to 640px before storage.

**Camera needs `localhost` or HTTPS.** `getUserMedia` is blocked on `file://`.
That is the entire reason the Windows launcher runs a real HTTP server instead
of just opening the HTML.

---

## 11. State of play / suggested next steps

**Done:** all 7 pages, AI verification loop with AI-detected activity, area-level
leaderboards, static export, one-click Windows launcher, cost model document.

**Open, roughly in order of value:**

1. Rebuild the deliverable zips — they predate the area leaderboards, the
   verify-page change, and the CSS fix. `npm run export`, copy `out/` to
   `windows-launcher/app/`, then zip.
2. Verify `launcher/server.py` (needs Python installed).
3. Pest-diagnosis card in the verification result — highest demo value, and the
   simulated verifier can produce it without touching the AI budget.
4. Plant registry + "new plant / known plant" result state — demonstrates the
   whole anti-fraud design on one screen.
5. Make the points-to-AED rate a config value instead of hardcoded catalogue
   prices.
6. Arabic as a full RTL locale, not just the labels it carries today.

**Not started, needs real infrastructure:** backend and accounts (UAE Pass
would be the natural route), real vision model behind the `Verifier` interface,
human review queue, in-app messaging and escrow for the marketplace, actual
government integration (a partnership question long before an engineering one).

---

## 12. Working with this user

- They want things that **run**, not just code. Deliverables have repeatedly
  been "give me a zip with a one-click launcher".
- They are on **Windows**, no Node/Python installed by default (Node was
  installed during the first session, Python was not).
- Messages are often typo-heavy and sometimes arrive mid-turn. Read intent, and
  when a request is ambiguous in a way that changes the work, ask — but do the
  unambiguous parts first rather than blocking.
- They asked for "a simple answer" once when given a long one. Match length to
  the question.
- Be straight about what is verified vs assumed. Several deliverables here
  carry honest "this part is untested" notes, and that has been the right call.
