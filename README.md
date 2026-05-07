# NotarizePro

Certified English → Spanish document translation service. Upload a PDF or DOCX, receive a translated and notarized PDF in seconds.

**Live:** [notarify.pro](https://notarify.pro)

## Architecture

→ **[View system architecture diagram](https://romanskl.github.io/translation-notarization/architecture.html)**

**Stack:**
- **Frontend + API** — Next.js 16 (App Router, TypeScript)
- **Auth** — NextAuth v5 (Credentials + Google OAuth)
- **Queue** — BullMQ + Redis
- **Worker** — Node.js (tsx), separate Docker container
- **Translation** — Claude claude-sonnet-4-6 (Anthropic API)
- **Storage** — MongoDB Atlas (users, sessions, translated PDFs)
- **Infrastructure** — Docker, Nginx, Cloudflare, VPS

## How it works

1. User uploads PDF or DOCX
2. Next.js enqueues a translation job in Redis (BullMQ)
3. Worker picks up the job, calls Claude API for EN→ES translation
4. Worker builds a certified PDF and saves it to MongoDB
5. Browser polls job status every 2s — download button appears when ready
6. Translated PDFs accessible via the History page

## Local development

```bash
npm install
npm run dev       # Next.js on http://localhost:3018
npm run worker    # BullMQ worker (separate terminal)
```

Required env vars: `ANTHROPIC_API_KEY`, `MONGODB_URI`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `REDIS_URL`
