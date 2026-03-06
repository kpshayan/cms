# ProjectFlow – Scrum Management (Vercel + Render)

A full-stack project management application built with **React + Vite** (frontend) and **Express + MongoDB** (backend), deployed to **Vercel** (frontend) and **Render** (backend).

---

## 🌐 Live URLs

| Service | URL |
|---|---|
| Frontend | `https://your-app.vercel.app` ← update after deploying |
| Backend API | `https://your-app-name.onrender.com` ← update after deploying |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 7, Tailwind CSS, Lucide React |
| Backend | Node 18, Express, MongoDB Atlas (Mongoose) |
| Auth | Session cookies (httpOnly) + bcrypt |
| Frontend hosting | Vercel (free) |
| Backend hosting | Render (free web service) |
| PDF generation | jsPDF, html2canvas |

---

## 📁 Project Structure

```
/
├── src/                        # React frontend
│   ├── pages/                  # Dashboard, Backlog, Board, Summary, Quotations, etc.
│   ├── components/             # Sidebar, Header, Modals, etc.
│   ├── context/                # AuthContext, DataContext, ThemeContext, SidebarContext
│   └── services/api.js         # All API calls (uses /api prefix → proxied by Vercel)
├── backend/                    # Express API server (deployed to Render)
│   ├── src/
│   │   ├── app.js              # Express app (CORS, middleware, routes)
│   │   ├── server.js           # Entry point
│   │   ├── controllers/        # projectController, taskController, authController, userController
│   │   ├── models/             # Project, Task, Session, Account, etc.
│   │   ├── routes/             # authRoutes, projectRoutes, taskRoutes, userRoutes
│   │   └── middleware/auth.js  # Session verification + permission checks
│   ├── .env.example            # Copy to .env and fill in for local dev
│   └── package.json
├── vercel.json                 # Vercel config — proxies /api/* to Render backend
├── render.yaml                 # Render config — one-click backend deploy
├── vite.config.js              # Local dev: proxies /api/* to localhost:5000
└── public/
```

---

## 🔑 How cookies work across Vercel + Render (important!)

The frontend calls `/api/*` — Vercel's **server-side rewrite** (in `vercel.json`) proxies those requests to the Render backend **before they hit the browser**. This means:

- The browser only ever talks to `your-app.vercel.app`
- `httpOnly` session cookies are set on the Vercel domain → **first-party cookies** → no browser blocking
- No `VITE_API_URL` env var needed on Vercel — just `/api` with rewrites handles everything

---

## ⚙️ Environment Variables

### Render (backend)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing session tokens |
| `CLIENT_ORIGIN` | Your Vercel frontend URL (e.g. `https://your-app.vercel.app`) |
| `ADMIN1_USERNAMES` | **Required** — comma-separated FULL_ACCESS usernames (e.g. `phani,admin1`) |
| `ADMIN2_USERNAMES` | Comma-separated TASK_EDITOR usernames (e.g. `admin2`) |
| `ADMIN4_USERNAMES` | Comma-separated PROJECT_READ_ONLY usernames (e.g. `admin4`) |
| `ALLOW_VERCEL_PREVIEWS` | Set `true` to allow all `*.vercel.app` preview URLs (optional) |

### Vercel (frontend)

No environment variables needed — the proxy in `vercel.json` handles the backend URL.

---

## 🚀 Deployment

### Step 1 — Deploy backend to Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo, select branch `vercel-render-version`
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Runtime:** Node
4. Add environment variables:
   - `MONGODB_URI` — your MongoDB Atlas URI
   - `JWT_SECRET` — a long random secret
   - `CLIENT_ORIGIN` — leave blank for now (fill in after Vercel deploy)
   - `ADMIN1_USERNAMES` — **critical**: comma-separated FULL_ACCESS usernames (e.g. `phani,admin1`)
   - `ADMIN2_USERNAMES` — comma-separated TASK_EDITOR usernames (e.g. `admin2`)
   - `ADMIN4_USERNAMES` — comma-separated PROJECT_READ_ONLY usernames (e.g. `admin4`)
5. Deploy — note your Render URL (e.g. `https://projectflow-api.onrender.com`)

### Step 2 — Configure vercel.json

Edit `vercel.json` and replace `YOUR_APP_NAME` with your actual Render service name:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://projectflow-api.onrender.com/api/:path*"
    }
  ]
}
```

Commit and push this change.

### Step 3 — Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo, select branch `vercel-render-version`
3. Vercel auto-detects Vite — no extra config needed
4. Deploy — note your Vercel URL (e.g. `https://projectflow.vercel.app`)

### Step 4 — Finish CORS wiring

Go back to Render → **Environment** tab → set:
```
CLIENT_ORIGIN=https://projectflow.vercel.app
```
Render will auto-redeploy.

### Updating the app

```bash
# Make changes, then:
git add .
git commit -m "your message"
git push origin vercel-render-version
# Vercel and Render both auto-deploy on push
```

---

## ⚡ Cold start warning (Render free tier)

Render's free tier **sleeps after 15 minutes of inactivity** — the first request takes ~30 seconds to wake up. To mitigate this, you can ping the health endpoint periodically using a free uptime monitor like [UptimeRobot](https://uptimerobot.com):

```
Monitor URL: https://your-app-name.onrender.com/api/health
Interval: every 14 minutes
```

---

## 💻 Local Development

```bash
# Frontend (http://localhost:5173)
npm install
npm run dev

# Backend (http://localhost:5000)
cd backend
npm install
npm run dev
```

The frontend proxies `/api/*` to the local backend via `vite.config.js`.

---

## 👤 Roles & Permissions

| Role | Login username | Capabilities |
|---|---|---|
| `FULL_ACCESS` | `admin1` / `phani` | Full control — projects, tasks, team, quotations, PDF |
| `TASK_EDITOR` | `admin2` | Create / edit tasks |
| `PROJECT_READ_ONLY` | `admin4` | View only |
| `EXECUTOR` | any `admin3-*` username | Work on assigned tasks only |

### Onboarding flow
1. **FULL_ACCESS / TASK_EDITOR / PROJECT_READ_ONLY**: Use the Signup page with the exact username to set a password.
2. **Executors**: FULL_ACCESS admin creates the executor account from a project Summary page → Team section. The executor then uses Signup with their `admin3-*` username.

---

## 📋 Features

### Projects
- Create projects — key auto-generated as `MSB{YYYY}{NNN}` (e.g. `MSB2026001`)
- Per-project tabs: Summary, Backlog, Board, Quotations
- Non-FULL_ACCESS users land on **Backlog** by default; FULL_ACCESS lands on **Summary**

### Tasks
- Statuses: `todo` · `in-progress` · `hold` · `submitted` · `closed`
- Priorities: `low` · `medium` · `high`
- Assignee, description, file attachments, comments
- Drag-and-drop Kanban board (5 columns)

### Quotations (FULL_ACCESS only)
- Build a line-item quotation from a fixed service list (Data Management, Edit, DI, Dubbing, SFX, etc.)
- Generate PDF → saves a versioned PDF (`MSBQ{YY}{MM}{NNN}.pdf`) and automatically creates/syncs matching tasks in the Backlog
  - New line items → new tasks created (unassigned, `todo`)
  - Removed line items → tasks deleted
  - Existing line items → tasks left untouched (assignee/status preserved)
- Summary page shows **PDF Versions** panel: current + 2 older shown by default, "View More" expands all

### Auth
- JWT stored in httpOnly cookies
- Sessions tracked in MongoDB (`Session` model)
- Auto-logout on session expiry

---

## 📝 Scripts

```bash
npm run dev       # Start Vite dev server
npm run build     # Build to dist/
npm run preview   # Preview production build locally
```

---

## 📄 License

MIT
