# FamKit — Deployment Guide

## What you need (all free)

- [Supabase](https://supabase.com) account — database, auth, storage
- [Vercel](https://vercel.com) account — hosting
- [Anthropic](https://console.anthropic.com) API key — receipt scanning
- [GitHub](https://github.com) account — to connect Vercel

---

## Step 1 — Set up Supabase (15 min)

### Create a project
1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `famkit`, pick a strong database password, choose a region close to you
3. Wait ~2 minutes for it to spin up

### Run the schema
1. In Supabase dashboard → **SQL Editor** → New query
2. Paste the contents of `supabase/migrations/001_schema.sql`
3. Click **Run**

### Enable Phone auth
1. **Authentication** → **Providers** → **Phone**
2. Enable it
3. For testing without SMS: go to **Authentication** → **Settings** → enable
   "Enable phone confirmations" → turn it **OFF** for dev (uses a mock OTP)
4. For production: connect Twilio (Supabase has a guide — takes 10 min)

### Get your API keys
1. **Settings** → **API**
2. Copy **Project URL** and **anon public** key — you'll need these shortly

### Enable Realtime
1. **Database** → **Replication**
2. Confirm `shopping_items` and `bill_splits` are in the publication (the SQL above handles this)

---

## Step 2 — Deploy to Vercel (5 min)

### Push to GitHub
```bash
cd famkit
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/famkit.git
git push -u origin main
```

### Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → Add New → Project
2. Import your `famkit` GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Add environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

5. Click **Deploy**

Your app is live at `https://famkit-xxx.vercel.app` 🎉

### Set your production URL back in Supabase
1. Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel URL
3. Add to **Redirect URLs**: `https://your-app.vercel.app/**`

---

## Step 3 — Install on phones (2 min per person)

### iPhone (Safari only)
1. Open the app URL in **Safari** (not Chrome)
2. Tap the **Share** button (square with arrow)
3. Scroll down → **Add to Home Screen**
4. Tap **Add**

### Android (Chrome)
1. Open the app URL in **Chrome**
2. Tap the **⋮** menu → **Add to Home screen**
3. Tap **Add**

The app icon appears on the home screen and opens full-screen, just like a native app.

---

## Step 4 — Invite family members

1. First person signs up, creates the group
2. Go to **Profile tab** → copy the **8-character invite code**
3. Share it (WhatsApp, text, etc.)
4. Each family member signs up with their own phone number
5. On onboarding, they tap "Join with code" and enter the code

---

## Recurring bill notifications (optional, 30 min)

To send push notifications when bills come due, deploy the Edge Function:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy check-due-bills
```

Then schedule it daily in Supabase SQL editor:
```sql
-- Run every day at 9am UTC
select cron.schedule(
  'check-due-bills',
  '0 9 * * *',
  $$
    select net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-due-bills',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    )
  $$
);
```

---

## Receipt scanning

The scan feature is at `/api/scan-receipt`. It's already wired up — just make sure
`ANTHROPIC_API_KEY` is set in Vercel. Claude Haiku processes each receipt in ~1 second
at a cost of roughly $0.001 per scan.

To use it from the app: go to Bills → + New bill → there's a camera icon to scan a receipt
and auto-populate the items. (The scan → bill creation flow uses the extracted items
to pre-fill a new bill.)

---

## Custom domain (optional)

1. Vercel → your project → **Domains**
2. Add your domain (e.g. `famkit.yourlastname.com`)
3. Follow the DNS instructions (takes ~10 min to propagate)

---

## Cost at family scale

| Service | Free tier | Paid if you exceed |
|---|---|---|
| Supabase | 500MB DB, 2GB bandwidth | $25/mo for Pro |
| Vercel | 100GB bandwidth, unlimited deploys | $20/mo for Pro |
| Anthropic (Haiku) | Pay as you go | ~$0.001/receipt |
| Twilio SMS (via Supabase) | $0.0079/SMS | Pay as you go |

**A family of 4–6 people costs ~$0/month.** You'd only start paying if you have
thousands of users, which is a good problem to have.

---

## Local development

```bash
# Clone / cd into the project
cp .env.example .env.local
# Fill in your Supabase + Anthropic keys

npm install
npm run dev
```

App runs at `http://localhost:3000`.

For Supabase local dev (optional):
```bash
supabase start          # starts local Supabase stack
supabase db reset       # applies migrations
supabase stop           # stops it
```
