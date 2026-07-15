# GardenEye Dashboard

Web dashboard for the GardenEye Raspberry Pi garden monitoring system. Built with React + Vite + Tailwind.

## Important: this needs a backend

This dashboard doesn't come with fake/sample data — it expects a real API to talk to (in your case, the Raspberry Pi). It calls these endpoints, defined in `src/lib/api-client.tsx`:

| Method | Path                     | Purpose                          |
|--------|--------------------------|-----------------------------------|
| GET    | `/api/dashboard/summary` | totals + last sync time           |
| GET    | `/api/trees`             | list of all trees                 |
| GET    | `/api/trees/alerts`      | trees currently needing attention |
| POST   | `/api/trees`             | register a new tree               |
| GET    | `/api/trees/:id`         | one tree + its latest reading     |
| PATCH  | `/api/trees/:id`         | rename a tree                     |
| DELETE | `/api/trees/:id`         | remove a tree                     |
| GET    | `/api/trees/:id/readings`| sensor/photo history for a tree   |

See the type shapes (`Tree`, `Reading`, `DashboardSummary`) in `src/lib/api-client.tsx` for exact fields expected.

Your Pi needs to run something (Flask/FastAPI, for example) that serves these routes with matching JSON shapes.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in VITE_API_BASE_URL
npm run dev
```

## Building

```bash
npm run build
```
Output goes to `dist/public`.

## Free deployment via GitHub Pages

This repo includes `.github/workflows/deploy.yml`, which auto-builds and publishes to GitHub Pages on every push to `main`.

Setup (one-time):
1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages** and set Source to **GitHub Actions**.
3. In **Settings → Secrets and variables → Actions → Variables**, add a repository variable named `VITE_API_BASE_URL` set to the public URL of your Pi's API (see below).
4. Push to `main` (or run the workflow manually) — the site will publish at `https://<your-username>.github.io/<repo-name>/`.

### Getting your Pi's API a public URL

Since the Pi is likely on your home network, GitHub's servers can't reach `192.168.x.x` directly. The easiest free option is a **Cloudflare Tunnel**:

```bash
# on the Pi
cloudflared tunnel --url http://localhost:5000
```
This gives you a public `https://xxxx.trycloudflare.com` URL to use as `VITE_API_BASE_URL`. For something more permanent, set up a named Cloudflare Tunnel tied to a domain you own (also free).
