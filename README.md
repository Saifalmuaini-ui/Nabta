# Nabta, نبتة

A working prototype of a national planting platform for the UAE: growers photograph
their work, an AI verifier confirms it, points are awarded, and those points buy real
things, seeds, tools, discounts, vouchers. Beginners get a route in, everyone gets a
shared marketplace, and government services attach to a verified growing record.

Built for **IGCF**, in service of the **UAE National Food Security Strategy 2051**.

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:3000>.

The camera needs `localhost` or HTTPS, that is a browser rule, not an app one. On
`localhost` it works. If you deploy, deploy behind HTTPS.

> **Stop `npm run dev` before running `npm run build` or `npm run export`.**
> They share the `.next` directory, so a build run alongside the dev server
> overwrites the files the dev server is serving. The symptom is an unstyled
> page, the browser requests the dev stylesheet and gets a 404, because only
> the production CSS is left on disk. Fix: stop everything, delete `.next`,
> start again.

To install it on a phone: open the site in mobile Chrome or Safari and choose
*Add to Home Screen*. It is a PWA, so it runs full-screen with the camera available.

### Handing it to someone who has no dev tools

There is no backend, so the whole app exports to static HTML:

```bash
npm run export
```

That writes `out/`. Copy it to `windows-launcher/app/`, zip the `windows-launcher`
folder, and the recipient double-clicks `START.bat`, no Node, no npm, no internet,
no admin rights. The launcher prefers Python if the machine has it and falls back to
a PowerShell server built into Windows if not.

The camera will not work from `file://`, that is why the launcher runs a real local
server rather than just opening the HTML.

---

## What is here

| Route | What it does |
| --- | --- |
| `/` | Dashboard, balance, streak, national rank, personal and country-wide impact, live challenges |
| `/verify` | **The core loop.** Camera capture → staged AI analysis → verdict, points breakdown, integrity checks |
| `/leaderboard` | Growers, schools & community gardens, and emirate standings; monthly and all-time |
| `/rewards` | Redeem points for discounts, seeds, tools and mall vouchers; issues a voucher code |
| `/market` | Peer marketplace, sell, swap, or give away. Post your own listing |
| `/learn` | For people who have never planted: guided paths and a UAE sowing calendar |
| `/gov` | Government hub, permits, subsidies, advisories, and the 2051 strategy alignment |

---

## How the AI verification works

Today it is **simulated**, and deliberately so, it demos anywhere, needs no API key,
and costs nothing to run in front of an audience.

The simulation is not random noise. It is seeded by a hash of the image itself, which
means:

- the same photo always produces the same verdict,
- submitting a photo twice is caught by the duplicate check,
- different photos genuinely produce different species, health scores and point totals.

It runs six visible checks, plant detected, species identified, activity matches what
was logged, capture is live (not a re-photographed screen), not a duplicate, location
plausible, and three outcomes: **approved**, **flagged for review**, **rejected**.

### Swapping in a real model

Everything lives behind one interface in `src/lib/verifier.ts`:

```ts
export interface Verifier {
  id: string;
  label: string;
  analyze(input: VerifyInput): Promise<VerificationDraft>;
}
```

Write a second implementation that POSTs the captured frame to a vision model (Claude
takes image blocks directly), map the response onto `VerificationDraft`, and point
`activeVerifier` at it. **No UI code changes.** Put the API key behind a route handler,
never in the browser.

---

## Points economy

| Action | Base |
| --- | --- |
| New planting | 60 |
| Harvest | 45 |
| Composting | 30 |
| Pruning / care | 20 |
| Watering | 15 |

Bonuses stack on top: healthy plant `+15`, first time growing a species `+40`, native
species such as ghaf or date palm `+50`, water-efficient irrigation `+25`. A streak
multiplier then applies to the whole total, ×1.15 at three days, ×1.25 at seven,
×1.5 at fourteen.

The design intent: **the incentive and the national strategy point the same direction.**
Native planting and drip irrigation are worth more because they are worth more.

---

## Architecture

```
src/
  app/            one folder per route, all client components
  components/     AppShell (nav) and the shared UI primitives
  lib/
    types.ts      domain model, actions, listings, rewards, verifications
    data.ts       all seed/demo data, isolated in one file
    store.tsx     React context + localStorage persistence
    verifier.ts   the Verifier interface and the simulated implementation
    samplePhoto.ts  procedurally drawn stand-in photo for demoing without a camera

windows-launcher/  one-click package for machines with no dev tools
  START.bat        double-click entry point
  launcher/        Python server, with a PowerShell fallback
```

State lives in `localStorage` under `nabta.state.v1`. There is no backend, no account
and no network call, everything runs in the browser. "Reset demo data" in the sidebar
clears it.

---

## What is real and what is placeholder

Honest labelling, because this will be shown to people who should be able to trust it:

- **Real:** the interaction design, the points maths, the verification flow and its
  checks, the crop calendar and sowing windows, the strategy pillars.
- **Placeholder:** every other grower, team and emirate total; partner brands
  (Nakhla Agri Supply, Wadi Tools, Marsa Mall and the rest are invented); the national
  impact figures; the government programmes.

The government page carries this notice on-screen. Nothing in this prototype has been
reviewed or endorsed by any authority, and the listed ministries are shown to
illustrate where the platform would connect, not to claim that it does.

---

## If this goes further

The prototype deliberately stops short of the things that need real infrastructure:

1. **Backend and accounts**, UAE Pass sign-in would be the natural route.
2. **Real vision model** behind the `Verifier` interface, with a human review queue for
   flagged submissions.
3. **Anti-fraud that survives contact with reality**, EXIF and capture-time checks,
   perceptual hashing across all users rather than just your own history, device
   attestation, and rate limits per plot.
4. **In-app messaging and escrow** for the marketplace, plus identity verification
   before money changes hands.
5. **Arabic as a full RTL locale**, not just the labels it carries today.
6. **Real government integration**, which is a partnership question long before it is
   an engineering one.
