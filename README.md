# 🎓 Placecraft

**AI-Powered Placement & Internship Management Platform**

Placecraft is a centralized platform that streamlines campus placement processes with AI-driven resume analysis, skill gap detection, and intelligent job matching. Built for students, placement administrators, and recruiters.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12-orange)](https://firebase.google.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI-purple)](https://ai.google.dev/)

---

## ✨ Key Features

- **🤖 AI Resume Analysis** - Intelligent resume scoring and feedback powered by Google Gemini
- **📄 Smart Resume Builder** - Auto-generate ATS-friendly resumes from profile data
- **📊 Skill Gap Detection** - Compare skills against job requirements with learning suggestions
- **💼 Placement Drive Management** - Create and manage internship/job opportunities
- **🎯 Application Tracking** - Real-time status updates from application to selection
- **👥 Multi-Role System** - Separate dashboards for students, admins, and recruiters
- **☁️ Secure File Storage** - Resume storage on Cloudflare R2
- **🔐 Google Authentication** - Secure sign-in with Google OAuth
- **📈 Analytics Dashboard** - Placement insights and metrics for administrators
- **⚡ Performance Optimized** - AI response caching and efficient processing

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS v4** - Modern styling
- **Radix UI** - Accessible component primitives
- **Zustand** - State management

### Backend & Services
- **Firebase Auth** - User authentication
- **Firestore** - NoSQL database
- **Google Gemini AI** - Resume analysis and generation
- **Cloudflare R2** - Object storage
- **Puppeteer** - PDF generation

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and npm
- **Firebase Account** - [console.firebase.google.com](https://console.firebase.google.com/)
- **Google AI Studio Account** - [aistudio.google.com](https://aistudio.google.com/)
- **Cloudflare Account** - [dash.cloudflare.com](https://dash.cloudflare.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/placecraft.git
   cd placecraft
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your credentials in `.env.local`:
   - Firebase configuration
   - Gemini API key
   - Cloudflare R2 credentials

   See [`.env.example`](.env.example) for detailed setup instructions.

4. **Set up Firebase**
   - Create a new Firebase project
   - Enable Authentication → Google Sign-In
   - Enable Firestore Database
   - Copy configuration to `.env.local`

5. **Set up Firestore indexes**
   ```bash
   npm run deploy:indexes
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```
placements-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (home)/            # Protected routes
│   │   │   ├── student/       # Student dashboard & features
│   │   │   ├── admin/         # Admin panel
│   │   │   └── recruiter/     # Recruiter interface
│   │   ├── api/               # API routes
│   │   │   ├── resume/        # Resume operations
│   │   │   ├── learning/      # Learning suggestions
│   │   │   └── profile/       # Profile management
│   │   └── login/             # Authentication
│   ├── components/            # React components
│   │   ├── ui/                # Reusable UI components
│   │   ├── admin-panel/       # Admin components
│   │   └── resume/            # Resume-related components
│   ├── lib/                   # Core libraries
│   │   ├── firebase/          # Firebase config & helpers
│   │   ├── google/            # Gemini AI integration
│   │   ├── ai/                # AI processing logic
│   │   └── r2/                # Cloudflare R2 storage
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
├── docs/                      # Documentation
├── .env.example               # Environment variables template
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
└── package.json               # Dependencies
```

---

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run deploy:indexes  # Deploy Firestore indexes
```

---

## 🎯 User Roles

### 👨‍🎓 Student
- Create and manage profile
- Upload or generate AI-powered resumes
- Get resume scores and improvement suggestions
- View skill gaps and learning recommendations
- Apply to placement drives
- Track application status

### 🏫 Admin (Placement Cell)
- Manage students and recruiters
- Create and manage placement drives
- Set eligibility criteria
- Monitor placement statistics
- Override application decisions

### 🏢 Recruiter
- Create company profile
- Post job/internship opportunities
- View eligible applications
- Shortlist and update candidate status
- Track hiring pipeline

---

## 📊 Google Technologies Used

1. **Google Gemini AI** - AI model for resume analysis, scoring, and intelligent content generation
2. **Firebase Authentication** - Secure user authentication with Google Sign-In integration
3. **Firestore Database** - NoSQL document database for storing user profiles, applications, and AI cache

---

Made by Dhanashree, Shreyash, Vighnesh and Srushti for GDG Hackathon