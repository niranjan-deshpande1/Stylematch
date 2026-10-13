# StyleMatch

StyleMatch builds outfits from clothes you already own.

You photograph your clothes, and StyleMatch removes the background and tags each piece by type, color, fit, and style. From there you can:

- **Generate outfits** from your closet, filtered by season and style theme.
- **Upload an inspiration photo** (a Pinterest save, a street-style shot, anything) and see how much of that look your closet already covers.
- **Find the missing pieces**: for whatever your closet doesn't cover, get specific items to look for, search terms, and where to buy them.

You can use it with an account or as a guest. If a guest signs up later, everything they uploaded moves over to their new account.

## Stack

- **Client:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui components, TanStack Query, wouter
- **Server:** Node.js, Express, Passport (local strategy), express-session with a Postgres session store
- **Data:** PostgreSQL (hosted on Neon) with Drizzle ORM
- **Images:** a private S3-compatible bucket (Neon Object Storage), with a local-disk fallback for development
- **AI:** OpenAI vision models for tagging and recommendations; background removal runs in the browser with `@imgly/background-removal`

## How it's put together

```
client/src/
  pages/        one component per route
  components/   layout, header, footer, and the shadcn/ui primitives in ui/
  hooks/        useAuth (session state) and useToast
  lib/          typed API client, query client setup, background removal

server/
  index.ts      Express app: middleware, routes, error handling, dev/prod client serving
  auth.ts       sessions, login/register, guest sessions, owner checks
  storage.ts    every database query, always scoped to the current owner
  images.ts     image storage (S3-compatible bucket or local disk) behind one interface
  ai.ts         OpenAI calls, with responses validated before use
  prompts.ts    the prompts and the fit/style guide the model tags against
  outfits.ts    outfit validation and closet-matching logic
  routes/       closet, inspiration, outfits, images, and site/admin endpoints

shared/
  schema.ts     database tables plus types and constants used by both sides
```

A few design decisions worth knowing about:

- **Guests are real sessions.** Choosing "continue as guest" gives the session a random negative owner id. Closet items and inspiration images belong to an owner id, so signed-in users and guests go through exactly the same code.
- **Images are never public.** Photos live in a private bucket and are served through `GET /api/images/:key`, which checks that the requester owns the image.
- **Outfits are validated on the server.** The outfit prompt states the rules (one top and one bottom, or a dress; one pair of shoes; no repeated pairs), but `outfits.ts` validates every suggestion against the real closet anyway and drops anything that breaks them.
- **Coming-soon mode.** An admin can swap the whole site for a waitlist page from `/admin`. The setting is stored in the database.

## Running it locally

Requirements: Node 20.6+, a PostgreSQL database, and optionally an OpenAI key and an S3-compatible bucket.

```bash
npm install
cp .env.example .env     # then fill in DATABASE_URL at minimum
npm run db:push          # creates the tables
npm run dev              # http://localhost:5000
```

Without a bucket configured, uploads are saved to `./uploads`.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Builds the client and bundles the server into `dist/` |
| `npm start` | Runs the production build |
| `npm run check` | Type-checks the whole project |

## Deploying

The production setup uses free tiers that are enough for a low-traffic site:

1. **Database (Neon):** create a project, copy the pooled connection string into `DATABASE_URL`, then run `npm run db:push` once to create the tables.
2. **Images (Neon Object Storage):** in the same Neon project, create a private bucket and copy the storage credentials from **Connect > Storage** into the `S3_` variables. Any other S3-compatible provider (Cloudflare R2, AWS S3) works the same way.
3. **Server:** any Node host (Render, Railway, Fly.io). Build command `npm install && npm run build`, start command `npm start`, and set the variables below.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | In production | Signs session cookies |
| `OPENAI_API_KEY` | For AI features | Tagging, outfit generation, and missing-piece recommendations |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `S3_BUCKET` | For cloud storage | Bucket name. Keep it private; the server serves images itself |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | For cloud storage | API token with read and write access to that bucket |
| `S3_ENDPOINT` | For non-AWS providers | The provider's S3 endpoint. Leave blank for AWS S3 |
| `S3_REGION` | Depends on provider | e.g. `us-east-2` for Neon. Defaults to `auto` |
| `S3_FORCE_PATH_STYLE` | Depends on provider | `true` for Neon and other providers that need path-style URLs |
| `UPLOAD_DIR` | No | Where images go when no bucket is configured, defaults to `./uploads` |
| `ADMIN_PASSWORD` | No | Enables the `/admin` page. Admin login is disabled when unset. |
| `SITE_MODE` | No | Default mode (`app` or `coming-soon`) until an admin changes it |
| `PORT` | No | Defaults to `5000` |

## License

All rights reserved. No license is granted to use, copy, or distribute this code.

## Contact

Niranjan Deshpande ([LinkedIn](https://linkedin.com/in/niranjan-deshpande-09ad))
