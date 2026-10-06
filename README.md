# Date Helper

A small web app for planning a date without the usual back-and-forth.

One person creates an invitation with several possible times and places, a message and who pays, then sends the link in any messenger. The other person opens it **without signing up** and answers: yes, no, or a counter-proposal. From there the two keep proposing changes until one of them accepts or declines.

Live: https://date-helper.vercel.app

## Features

- Invitation with multiple times and places, a personal message and a "who pays" choice
- No accounts: access is granted by secret links (one for each side, plus a view-only link for a friend)
- Counter-proposals in both directions, each move with its own message
- Link previews in messengers (Open Graph cards that reflect the current state)
- "Add to calendar" (Google, Apple/Outlook via `.ics`), "Let a friend know" page
- Expiry for the first answer, cancelling by the author

## Tech stack

- Next.js 16 (App Router, Server Actions), React 19, TypeScript
- Tailwind CSS v4
- PostgreSQL (Neon) with Prisma 7
- Deployed on Vercel

## Getting started

Requirements: Node.js 20+ and a PostgreSQL database.

```bash
npm install
```

Create a `.env` file (see `.env.example`):

```
DATABASE_URL="postgresql://..."
```

Apply the migrations and start the dev server:

```bash
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command         | What it does                                     |
| --------------- | ------------------------------------------------ |
| `npm run dev`   | Development server                               |
| `npm run build` | Production build                                 |
| `npm start`     | Run the production build                         |
| `npm run lint`  | ESLint                                           |

## Project structure

```
prisma/        schema and migrations
src/app/       pages, route handlers and server actions (actions.ts)
src/components UI components
src/lib/       validation rules, view state, helpers
```

## How access works

| Link              | Who         | Can do                                  |
| ----------------- | ----------- | --------------------------------------- |
| `/manage/<token>` | Author      | Everything, including cancelling        |
| `/d/<token>`      | Author      | Answer the latest move from any device  |
| `/i/<token>`      | Guest       | Answer and counter-propose              |
| `/f/<token>`      | Friend      | View only                               |

Tokens are random and unguessable; database ids are never exposed.
