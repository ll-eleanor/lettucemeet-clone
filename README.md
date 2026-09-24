# EoN Day availability

LettuceMeet-style availability page for September 29, 2026, with Exec/JIT filters.

## Run locally

```bash
npm install
npm run dev
```

Without environment variables, the app uses browser storage and remains fully interactive on one device.

## Shared Supabase setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local`.
3. Add the project URL and anonymous key, then restart the app.

The provided policies intentionally allow anyone with the page link to add, edit, or delete responses, matching the requested access model.
