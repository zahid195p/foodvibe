# FoodVibe 🛵

**Open-source, zero-commission food delivery for Pakistan.**

Foodpanda takes up to 30% from restaurants. Riders get squeezed. Buyers pay inflated
prices. FoodVibe is the alternative: a community-owned platform where **no one takes
a cut** — not from restaurants, not from riders, not from buyers. Money flows directly
between the people involved; the platform never touches it.

Inspired by China's Meituan, built for Pakistan's reality: cash on delivery first,
JazzCash/Easypaisa direct transfers next, Urdu + English, and infrastructure that
costs ₨0 to run at launch.

## How it works

One web app, four interfaces, one database:

| Interface | Who | What they do |
|-----------|-----|--------------|
| **Buyer** (`/`) | Customers | Browse restaurants, order, track delivery live |
| **Restaurant** (`/restaurant`) | Shop owners | Receive orders, manage menu, set prep times |
| **Rider** (`/rider`) | Delivery riders | Accept deliveries, navigate, collect COD, earn tips |
| **Admin** (`/admin`) | Platform team | Approve KYC, resolve disputes, configure zones |

Everything revolves around one order state machine:

```
PLACED → ACCEPTED → PREPARING → READY → RIDER_ASSIGNED → PICKED_UP → DELIVERED
                                (side exits: REJECTED · CANCELLED · REFUND_REQUESTED)
```

## Principles

1. **Zero commission, forever.** The platform's design makes skimming impossible —
   it never holds money.
2. **Scam-proof by structure.** Handover OTPs, GPS checks, audit trail on every
   order transition.
3. **Privacy-respecting.** Riders see buyer phone numbers only during active
   deliveries. KYC documents are private and reviewed by humans.
4. **Free to run.** Built entirely on free-tier infrastructure so donations cover
   growth, not survival.

## Tech stack

- [Next.js](https://nextjs.org) (React, TypeScript, Tailwind) as an installable PWA
- [Supabase](https://supabase.com) — Postgres, auth, realtime, storage
- [MapLibre](https://maplibre.org) + OpenStreetMap — maps without Google's bill
- Cloudflare Pages — hosting and CDN

## Getting started (development)

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project keys
npm run dev                  # http://localhost:3000
```

Database schema lives in [`supabase/migrations/`](supabase/migrations/) — apply it
in your Supabase project's SQL editor.

## Roadmap

- [x] **P0 — Foundations**: repo, schema, auth wiring, role-based routes
- [ ] **P1 — Core loop**: browse → cart → COD order → restaurant accepts → rider delivers
- [ ] **P2 — Trust**: live tracking, reviews, refunds/disputes, KYC queues, Urdu
- [ ] **P3 — Soft launch**: one neighbourhood, 5–10 restaurants
- [ ] **P4 — Native apps** (Expo) + payment gateway integrations

## Contributing

This project is meant to be built by the community it serves. Issues and pull
requests are welcome — the roadmap above is the priority order.

## Funding

FoodVibe accepts no commission, so it runs on sponsorship: GitHub Sponsors and
Open Collective (links coming soon). Tips in the app go directly to riders and
restaurants — the platform never touches them.

## License

[AGPL-3.0](LICENSE) — free to use, study, and improve. If you run a modified
version as a service, you must share your changes with the community too.
