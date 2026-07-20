# 🚀 Bulk Email Sender - SvelteKit Frontend Migration Project

## 📋 Project Overview

This is a **Bulk Email Sender** web application currently built with **Hono** (backend) and vanilla **HTML/CSS/JavaScript** (frontend). Your assignment is to **migrate the frontend to SvelteKit** while maintaining the existing Hono backend functionality.

## 🏗️ Architecture (SvelteKit + Node.js)

The application uses a modern separated architecture:

### 1. Frontend: SvelteKit 5
- **Framework**: SvelteKit with Svelte 5 runes
- **Styling**: Vanilla CSS with CSS custom properties (premium design system)
- **Features**: Real-time dashboard polling, rich text editor (Quill), drag-and-drop file uploads
- **State**: Event-driven polling system to minimize backend requests
- **Location**: `/frontend` directory

### 2. Backend: Node.js (Hono + better-sqlite3)
- **Framework**: Hono (running on Node.js via `@hono/node-server`)
- **Database**: SQLite (`better-sqlite3`)
- **Email Engine**: Nodemailer
- **Authentication**: Argon2 hashing, secure session cookies
- **Location**: Root directory (`/src`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm or bun

### 1. Backend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Frontend Setup
In a new terminal:
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at **http://localhost:5173**.

---

## 🎯 Assignment Objectives


### 1. **Implement SvelteKit Frontend**
- ✅ Create a **modern, clean UI** using SvelteKit
- ✅ Implement all existing features with enhanced UX
- ✅ Add client-side validation and error handling
- ✅ Implement responsive design (mobile-friendly)

### 2. **Remove Old Frontend**
- ✅ Delete `public/` folder (HTML, CSS, JS files)
- ✅ Remove static file serving routes from backend (except API endpoints)
- ✅ Ensure no dependencies on old frontend code

### 3. **Update Documentation**
- ✅ Update `README.md` with new architecture
- ✅ Document setup instructions for both backend and frontend
- ✅ Add API documentation
- ✅ Include screenshots/demos of new UI

## 🎨 UI/UX Requirements

### Design Principles
- **Clean and modern** design (avoid cluttered UI)
- **Intuitive navigation** (clear tabs/sections)
- **Responsive layout** (mobile, tablet, desktop)
- **Accessible** (ARIA labels, keyboard navigation)
- **Fast and performant** (lazy loading, optimistic updates)


## 💡 Pro Tips

1. **Use TypeScript strictly** - Helps catch errors early
2. **Component first** - Build reusable components
3. **API client abstraction** - Centralize API calls
4. **Form validation** - Use Zod or similar library
5. **Loading states everywhere** - Better UX
6. **Error boundaries** - Graceful error handling
7. **Optimistic updates** - Instant feedback
8. **Debounce searches** - Reduce API calls
9. **Lazy load routes** - Faster initial load
10. **Test on mobile** - Responsive design matters


## 📞 Questions?

If you have questions during implementation:
1. Check existing backend code for API behavior
2. Review types.ts for data structures
3. Test API endpoints with Postman/Thunder Client
4. Read SvelteKit docs for routing/forms
5. Use browser DevTools for debugging

---

**Good luck! 🚀 Build something amazing!**
