# PDF Catalogue & Price List Viewer

React/Vite catalogue search and quotation tool backed by Express, Supabase Postgres, Supabase Storage, and Supabase Auth.

## Setup

Requires Node.js 20+.

```bash
npm install
npm install --prefix client
npm install --prefix server
cp .env.example .env
npm run dev
```

Add your Supabase URL and publishable key to `.env`; do not commit this file. Open `http://localhost:5173`.

## Supabase setup

1. In the Supabase SQL Editor, run [001_catalogue_schema.sql](supabase/migrations/001_catalogue_schema.sql).
2. In **Authentication → Users**, create the administrator's email/password account.
3. In the SQL Editor, promote it:

```sql
update public.profiles set role = 'admin' where email = 'your-admin-email@example.com';
```

The app automatically creates every new authenticated user's `viewer` profile. Public visitors can read/view catalogues. Only an authenticated `admin` profile can upload or delete them. The server independently validates this rule; hiding a button is not relied upon for security.

## Architecture

```
client/    React + Vite + Tailwind; public viewing and admin sign-in UI
server/    Express API; PDF text extraction plus Supabase-backed catalogue operations
supabase/  SQL migration and schema documentation
```

`catalogues` stores metadata and extracted text. Files live in the public `catalogue-pdfs` Storage bucket. On upload, the API extracts text with `pdf-parse`, stores normalized search text, and also creates whitespace-free numeric text so `673401` finds `6734 01` and `67 3401`. Scanned PDFs require OCR to become searchable.

The viewer's calculator and item list remain browser-session data by design; they are not saved to the database.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | client/server | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client/server | Supabase publishable key |
| `VITE_API_URL` | client deployment | Public URL of deployed Express API; leave blank locally |
| `PORT` | server | API port, default 4000 |
| `CLIENT_ORIGIN` | server deployment | Comma-separated permitted frontend origins |

Never use or expose a Supabase service-role key in the frontend.

## Tests

Run the production build:

```bash
npm run build
```

## Deployment

Deploy `client/` to Netlify. `netlify.toml` configures the Vite build and SPA fallback.

- Base directory: `client`
- Build command: `npm run build`
- Publish directory: `dist`
- Netlify environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL`

Deploy `server/` separately to a persistent Node host such as Render or Railway. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or their Vite-name equivalents), `CLIENT_ORIGIN`, and `PORT` there. Set the resulting URL as `VITE_API_URL` in Netlify.

## GitHub

```bash
git init
git add .
git commit -m "Initial PDF catalogue viewer"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```
