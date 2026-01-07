# ProjectFlow - Project Guide

## 📋 Quick Start Guide

### 1. Landing Page (`/`)
- Beautiful hero section with real images from Unsplash
- Feature highlights showcasing key capabilities
- Statistics display (10K+ users, 50K+ projects)
- Call-to-action buttons for Sign Up and Sign In
- Professional footer with links

### 2. Features Page (`/features`)
- Detailed feature showcase with 12+ features
- Visual icons for each feature
- Hover effects and smooth animations
- CTA section to encourage sign-ups

### 3. Authentication Pages

#### Login (`/login`)
- Email and password fields with validation
- Remember me checkbox
- Forgot password link
- Social login options (Google, GitHub)
- Link to sign up page

#### Sign Up (`/signup`)
- Full name, email, password, and confirm password fields
- Form validation (email format, password length, matching passwords)
- Terms of service checkbox
- Social sign-up options
- Link to login page

### 4. Dashboard (`/dashboard`)

Once logged in, users access the full Scrum management system:

#### Sidebar Features:
- Collapsible navigation
- Project list with color-coded project keys
- User profile display
- Logout button

#### Available Views:

**Summary** (`/dashboard/project/:id/summary`)
- Project description visible to every admin
- Task statistics (completed, in progress, on hold, total)
- Team members list with task counts
- Quotations snapshot with PDF view/download
- Quick actions for adding tasks and team members

**Backlog** (`/dashboard/project/:id/backlog`)
- Tasks grouped by status lanes (To Do, In Progress, Hold, Done)
- Rich task cards with IDs, types, priority, and assignee info
- Empty state guidance for each lane
- Quick actions to edit or delete tasks inline

**Board** (`/dashboard/project/:id/board`)
- Kanban-style board with 3 columns (To Do, In Progress, Done)
- Drag-and-drop functionality
- Visual task cards with all details
- Priority color coding
- Real-time status updates

## 🎨 Design System

### Colors
- **Primary Blue**: `#0052CC` (jira-blue)
- **Light Blue**: `#0065FF` (jira-blue-light)
- **Dark Gray**: `#42526E` (jira-gray)
- **Background**: `#F4F5F7` (jira-bg)

### Typography
- **Headings**: Bold, large sizes (text-2xl to text-6xl)
- **Body**: Regular weight, gray-600 for secondary text
- **Buttons**: Semibold, clear hierarchy

### Components
- **Rounded corners**: rounded-lg to rounded-2xl
- **Shadows**: Subtle (shadow-sm) to prominent (shadow-2xl)
- **Transitions**: All interactive elements have smooth transitions
- **Hover states**: Scale, color, and shadow changes

## 🔐 Authentication Flow

1. **New User**:
   - Lands on home page → Clicks "Sign Up"
   - Fills registration form → Submits
   - Automatically logged in → Redirected to dashboard

2. **Returning User**:
   - Lands on home page → Clicks "Login"
   - Enters credentials → Submits
   - Logged in → Redirected to dashboard

3. **Protected Access**:
   - Trying to access `/dashboard/*` without login
   - Automatically redirected to `/login`
   - After successful login, redirected to dashboard

## 📊 Mock Data Structure

### Projects
- 3 sample projects (Website Redesign, Mobile App Development, Backend API)
- Each with unique color, key, and description

### Tasks
- 15+ tasks across all projects
- Different types: task, story, bug
- Priorities: high, medium, low
- Statuses: todo, in-progress, done
- Assigned to different team members

### Users
- 5 team members with avatars
- Name, email, and avatar initials

## 🚀 Development Tips

### Adding New Features
1. Create component in appropriate folder
2. Import and add to routes in App.jsx
3. Use existing Tailwind classes for consistency
4. Follow naming conventions (PascalCase for components)

### Styling Guidelines
- Use Tailwind utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing (p-4, p-6, p-8)
- Use existing color palette

### State Management
- Authentication: AuthContext (src/context/AuthContext.jsx)
- Local state: useState for component-specific data
- Data: Centralized in src/data.js

## 📱 Responsive Breakpoints

- **Mobile**: < 768px (single column, hamburger menu)
- **Tablet**: 768px - 1024px (2 columns)
- **Desktop**: > 1024px (3 columns, full sidebar)

## 🎯 Next Steps for Production

1. **Backend Integration**:
   - Replace mock data with API calls
   - Implement real authentication with JWT
   - Add database for persistent storage

2. **Enhanced Features**:
   - Real-time updates with WebSockets
   - File uploads for task attachments
   - Advanced filtering and search
   - Email notifications

3. **Performance**:
   - Code splitting
   - Image optimization
   - Lazy loading for routes
   - Caching strategies

4. **Testing**:
   - Unit tests for components
   - Integration tests for user flows
   - E2E tests for critical paths

## 📞 Support

For questions or issues:
- Check the README.md for installation instructions
- Review this guide for feature documentation
- Examine the code comments for implementation details

---

**Built with ❤️ using React, Tailwind CSS, and modern web technologies**
