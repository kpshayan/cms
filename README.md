# ProjectFlow - Jira-like Scrum Management

A complete, modern Scrum management application built with React and Tailwind CSS, featuring a beautiful landing page, authentication system, and full project management dashboard designed to closely resemble Atlassian Jira's interface.

## 🚀 Features

### **Landing & Authentication**
- **Professional Landing Page**: Hero section with images, feature highlights, and call-to-action
- **Modern Navbar**: Responsive navigation with mobile menu support
- **User Authentication**: Complete login and signup flows with validation
- **Protected Routes**: Secure dashboard accessible only to authenticated users
- **Session Management**: JWT-based sessions stored securely in localStorage
- **MongoDB Persistence**: Shared backend API keeps every admin in sync

### **Dashboard Features**
- **Project Navigation**: Fixed sidebar with project list and collapsible functionality
- **Summary Dashboard**: Overview of project health, team members, and task statistics
- **Backlog Management**: Organized view of tasks grouped by status lanes
- **Kanban Board**: Drag-and-drop interface for task management
- **User Profile**: Display current user info with logout functionality
- **Responsive Design**: Works seamlessly on desktop and tablet devices
- **Modern UI**: Clean, minimal design with smooth transitions and hover effects

## 🛠️ Tech Stack

- **React** - UI framework
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Vite** - Build tool and dev server
- **Node.js + Express** - REST API server
- **MongoDB + Mongoose** - Cloud data persistence
- **JWT + bcrypt** - Authentication & password security

## 📦 Installation

### Frontend (Vite)
1. Install dependencies:
```bash
npm install
```

2. Copy the example environment file and update values if needed:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser at `http://localhost:5173`

### Backend (Express API)
1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# then edit .env with your MongoDB URI and JWT secret
```

3. Run the API server:
```bash
npm run dev
```

The backend listens on `http://localhost:5000` by default; the frontend proxy URL is configurable through `VITE_API_URL`.

## 🏗️ Project Structure

- `backend/` – Express + MongoDB API (controllers, models, routes)
- `src/` – React client

```
src/
├── components/
│   ├── Navbar.jsx          # Public navigation bar for landing pages
│   ├── Sidebar.jsx         # Dashboard sidebar with project list
│   ├── Header.jsx          # Dashboard header with tab navigation
│   └── ProtectedRoute.jsx  # Route protection wrapper
├── pages/
│   ├── Home.jsx            # Landing page with hero section
│   ├── Login.jsx           # Login page with authentication
│   ├── Signup.jsx          # Registration page
│   ├── Dashboard.jsx       # Dashboard layout wrapper
│   ├── Summary.jsx         # Project overview page
│   ├── Backlog.jsx         # Backlog management page
│   └── Board.jsx           # Kanban board page
├── context/
│   └── AuthContext.jsx     # Authentication state management
├── data.js                 # Mock data for projects, tasks, and users
├── App.jsx                 # Main router setup
├── main.jsx                # Application entry point
└── index.css               # Tailwind CSS imports
```

## 🧭 Routes

### Public Routes
- `/` - Landing page with hero section and features
- `/login` - User login page
- `/signup` - User registration page
- `/features` - Features page (redirects to home)
- `/pricing` - Pricing page (redirects to home)

### Protected Dashboard Routes
- `/dashboard` - Redirects to default project summary
- `/dashboard/project/:id/summary` - Project overview with stats
- `/dashboard/project/:id/backlog` - Backlog grouped by task status
- `/dashboard/project/:id/board` - Kanban board with drag-and-drop

## 🧪 Usage

1. **Run both servers**: Start the backend (`npm run dev` inside `backend/`) and the Vite dev server.
2. **Sign up once per static account**: Use usernames `admin1`, `admin2`, or `admin4` on the signup page to set an initial password (minimum 6 chars). Repeat the process only if you reset the account.
3. **Provision executors**: While signed in as `admin1`, open a project summary page and add team members with an `admin3-*` username. This issues real executor accounts via the backend.
4. **Executor onboarding**: Each executor uses the Signup page with their exact `admin3-*` username to set a password, then signs in via the Login page.
5. **Shared data**: Every admin sees the same projects, tasks, and attachments because they are persisted in MongoDB.
6. **Role-aware permissions**: Admin1 has full control, admin2 can edit tasks, admin4 is read-only, and admin3 accounts can only work on their assigned tasks.

## �🎨 Design Features

- Beautiful landing page with hero section and real images
- Modern authentication pages with form validation
- White backgrounds with subtle shadows
- Blue and gray color scheme
- Rounded corners (rounded-2xl)
- Smooth hover and transition effects
- Responsive grid and flex layouts
- Gradient accents for visual interest
- Professional navbar with mobile support

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🎯 Future Enhancements

- Implement proper user authentication with JWT
- Add real-time collaboration features with WebSockets
- Include task commenting and file attachments
- Add throughput tracking and burndown charts
- Implement advanced filtering and search functionality
- Add email notifications for task updates
- Support for multiple teams and organizations
- Data export and reporting features
- Mobile app version

## 📄 License

This project is open source and available under the MIT License.
