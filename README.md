# ProjectFlow – Scrum Management (Azure SWA)

A full-stack project management application built with **React + Vite** (frontend) and **Azure Functions + MongoDB** (backend), deployed to **Azure Static Web Apps**.

---

## 🌐 Live URL

```
https://blue-grass-0ef9bcc10.6.azurestaticapps.net
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 7, Tailwind CSS, Lucide React |
| Backend | Azure Functions (Node 18), Express-style routing via adapter |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT (httpOnly cookies) + bcrypt |
| Hosting | Azure Static Web Apps |
| PDF generation | jsPDF, html2canvas |
| CI/CD | GitHub Actions (`.github/workflows/`) |

---

## 📁 Project Structure

```
/
├── src/                        # React frontend
│   ├── pages/                  # Dashboard, Backlog, Board, Summary, Quotations, etc.
│   ├── components/             # Sidebar, Header, Modals, etc.
│   ├── context/                # AuthContext, DataContext, ThemeContext, SidebarContext
│   └── services/api.js         # All API calls
├── api/                        # Azure Functions (deployed as the /api/* backend)
│   ├── backend/src/            # Controllers, models, middleware, utils
│   │   ├── controllers/        # projectController.js, taskController.js, authController.js, userController.js
│   │   ├── models/             # Project.js, Task.js, Session.js, etc.
│   │   └── middleware/auth.js  # JWT session verification
│   ├── projects/index.js       # Azure Function: /api/projects/*
│   ├── tasks/index.js          # Azure Function: /api/tasks/*
│   ├── auth/index.js           # Azure Function: /api/auth/*
│   ├── users/index.js          # Azure Function: /api/users/*
│   ├── shared/
│   │   ├── bootstrap.js        # MongoDB connect + access group seeding
│   │   ├── adapter.js          # Express-like req/res adapter for Azure Functions
│   │   └── cookies.js          # Cookie helpers
│   ├── host.json
│   └── package.json            # API dependencies (must be committed with package-lock.json)
├── backend/                    # Local dev Express server (mirrors api/backend/src/)
├── public/
│   └── staticwebapp.config.json
├── dist/                       # Built frontend (committed for SWA deployment)
├── .github/workflows/
│   └── azure-static-web-apps-blue-grass-0ef9bcc10.yml
└── vite.config.js
```

---

## ⚙️ Environment Variables (Azure Portal → SWA → Environment Variables)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |

---

## 🚀 Deployment

### Option 1 — Manual deploy (immediate, recommended for quick updates)

```bash
# 1. Build the frontend
npm run build

# 2. Deploy dist + api to Azure SWA
swa deploy --app-location "dist" --api-location "api" --deployment-token "<TOKEN>" --api-language "node" --api-version "18" --env "production"
```

**Deployment token:**
```
cdd4bd1328e1aef235aa7391a0b9178c4052724482c2f7bd16edd8404e53041906-10939402-530e-4c43-b7dc-e3e7b446968201002150ef9bcc10
```

> After deploying, also commit and push `dist/` + source changes to keep git in sync.

### Option 2 — GitHub Actions (auto-deploy on push)

Pushing to the `azure-final-version` branch triggers the workflow at `.github/workflows/azure-static-web-apps-blue-grass-0ef9bcc10.yml`, which:
1. Runs `npm install && npm run build`
2. Deploys `dist/` as the static app
3. Deploys `api/` as the Azure Functions backend

**Important:** Always commit `api/package-lock.json` after adding new API dependencies — Azure installs from the lockfile.

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
