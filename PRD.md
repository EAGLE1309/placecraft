# 📄 Product Requirements Document

> **Project:** Placecraft  
> **Type:** AI-Powered Placement & Internship Management Platform  
> **Version:** 1.0  
> **Status:** Locked & Implemented

---

## 📋 Table of Contents

1. [Product Vision](#-product-vision)
2. [Core Objectives](#-core-objectives)
3. [User Roles](#-user-roles)
4. [Features & Workflows](#-features--workflows)
5. [Technical Requirements](#-technical-requirements)
6. [Non-Functional Requirements](#-non-functional-requirements)
7. [Future Scope](#-future-scope)

---

## 🎯 Product Vision

Placecraft is a **college-first, AI-powered placement platform** that unifies the entire campus recruitment process into a single, intelligent system.

### Problem Statement

Current campus placement processes are fragmented across:
- WhatsApp groups for announcements
- Excel sheets for tracking
- Email chains for communication
- Manual resume screening
- Disconnected application workflows

### Solution

A centralized platform that provides:
- **AI-driven resume analysis** and improvement
- **Skill gap detection** with learning recommendations
- **Streamlined application workflow** from posting to selection
- **Role-based access** for students, admins, and recruiters
- **Real-time tracking** and analytics

### Key Differentiators

1. **AI-First Approach** - Google Gemini powers resume analysis and generation
2. **Zero-Friction Onboarding** - Resume upload optional, AI can generate from profile
3. **Intelligent Matching** - Automatic skill gap analysis and eligibility filtering
4. **Complete Governance** - Placement cell maintains full control and visibility
5. **Google Ecosystem** - Built on Firebase, Firestore, and Gemini AI

---

## 🎯 Core Objectives

| Objective | Description | Success Metric |
|-----------|-------------|----------------|
| **Student Readiness** | Improve placement preparation with AI feedback | 80%+ students with resume score >70 |
| **Recruiter Efficiency** | Reduce screening time with pre-filtered candidates | 50% reduction in screening time |
| **Admin Control** | Centralized management and visibility | 100% placement activities tracked |
| **User Experience** | Seamless, intuitive interface for all roles | <2 second page load times |
| **Scalability** | Support multiple colleges and thousands of students | Handle 10K+ students per college |

---

## 👥 User Roles

### 🎓 Student

* Create profile
* Upload or auto-generate resume
* Get resume score, feedback, learning suggestions
* Apply to internships/jobs
* Track application status

### 🏫 Placement Cell (Admin)

* Manage students, recruiters, drives
* Define eligibility rules
* Monitor placements
* Control visibility & overrides

### 🏢 Recruiter

* Post roles
* View eligible applications
* Shortlist / reject candidates
* Update hiring stages

---

## 4. End-to-End Placement Workflow

### 4.1 Student Onboarding

#### Step 1: Account Creation

* Google Sign-In preferred
* Required details:

  * Name
  * Email
  * Phone
  * College
  * Branch
  * Graduation year

#### Step 2: Resume Handling (Two Paths)

**Path A — Resume Uploaded**

* Student uploads PDF / DOCX
* Resume stored using **Google Drive API**
* System:

  * Parses resume via AI
  * Extracts skills, education, experience
  * Auto-fills student profile
  * Generates resume score

**Path B — No Resume**

* Student fills structured form:

  * Education
  * Skills
  * Projects
  * Experience
* System:

  * Generates ATS-friendly resume
  * Saves generated resume to Google Drive
  * Uses it as the active resume

➡️ Resume upload is **optional**, but resume existence is **mandatory before applying**

---

## 5. Resume Intelligence & AI Features

### Resume Parsing & Scoring

* Extract skills, tools, experience
* Generate:

  * Resume quality score (0–100)
  * ATS compatibility score
  * Strengths & weaknesses

### Resume Improvement

* Bullet-point rewriting
* Keyword optimization
* Role-specific resume suggestions

---

## 6. Learning Suggestions (IMMEDIATE FEATURE)

### Purpose

Convert resume weaknesses into **actionable learning paths**.

### How It Works

* Compare resume skills vs target role requirements
* Identify missing or weak skills
* Generate learning suggestions with:

  * Skill name
  * Priority (High / Medium / Low)
  * Learning type (Concept / Tool / Practice)
  * Estimated time

### Example Output

* Learn React Hooks – High Priority
* Improve Git collaboration – Medium Priority

➡️ Learning suggestions update automatically after resume changes

---

## 7. Placement Drive Lifecycle

### 7.1 Drive Creation (Placement Cell)

* Company
* Role (Internship / Full-time)
* Eligibility rules:

  * Branch
  * CGPA
  * Skills
  * Batch
* Drive published only to eligible students

---

### 7.2 Student Applications

* Student applies to a drive
* System:

  * Locks resume version (Drive file ID)
  * Stores resume score snapshot
  * Revalidates eligibility

Application status: **Applied**

---

### 7.3 System Pre-Screening

Before recruiter access:

* Filter ineligible applications
* Rank candidates by:

  * Resume score
  * Skill match %
  * CGPA

---

### 7.4 Recruiter Visibility (CRITICAL)

Recruiters can see **only**:

* Applications submitted to their role
* Students who pass eligibility
* Locked resume versions
* Resume metadata (score, skills)

Recruiters **cannot** see:

* Entire student database
* Students from other companies
* Students who didn’t apply
* Admin analytics

---

### 7.5 Shortlisting & Hiring

Status transitions:

* Applied → Shortlisted
* Shortlisted → Interview
* Interview → Selected / Rejected

All updates notify:

* Student
* Placement cell

Placement cell can override if required.

---

## 8. File Storage Architecture

### Storage Solution: Cloudflare R2

**Primary storage for all resume files**

#### Why Cloudflare R2?
- **S3-compatible API** - Easy integration with existing tools
- **No egress fees** - Cost-effective for file downloads
- **Global CDN** - Fast access worldwide
- **Secure** - Private bucket with signed URL access

#### Implementation
- **Upload Flow:** Student uploads → R2 bucket → Signed URL returned
- **Access Control:** Files accessed via backend-generated signed URLs only
- **Organization:** Files stored in student-specific folders (`resumes/{studentId}/`)
- **Versioning:** Multiple resume versions maintained per student
- **Security:** Private bucket, temporary signed URLs with expiration

---

## 🛠️ Technical Requirements

### Frontend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16 | React framework with App Router |
| **TypeScript** | 5 | Type-safe development |
| **TailwindCSS** | 4 | Utility-first styling |
| **Radix UI** | Latest | Accessible UI components |
| **Zustand** | 5 | State management |

### Backend & Services
| Technology | Purpose |
|------------|---------|
| **Firebase Auth** | Google OAuth authentication |
| **Firestore** | NoSQL database for users, applications, drives |
| **Next.js API Routes** | Serverless API endpoints |
| **Google Gemini AI** | Resume analysis and generation |
| **Cloudflare R2** | Resume file storage |
| **Puppeteer** | PDF generation |

### AI Capabilities
- **Resume Parsing** - Extract text and structure from PDFs
- **Resume Scoring** - Quality and ATS compatibility scores (0-100)
- **Resume Generation** - Create ATS-friendly resumes from profile data
- **Skill Gap Analysis** - Compare skills vs job requirements
- **Learning Suggestions** - Personalized skill improvement recommendations
- **Content Optimization** - Improve bullet points and descriptions

---

## 📊 Non-Functional Requirements

### Performance
| Metric | Target | Implementation |
|--------|--------|----------------|
| **Page Load** | < 2 seconds | Server-side rendering, code splitting |
| **Resume Parsing** | < 30 seconds | Local parsing first, AI fallback |
| **API Response** | < 500ms | Firestore caching, indexed queries |
| **AI Response** | < 10 seconds | Cached responses, rate limiting |

### Security
- ✅ **Role-Based Access Control (RBAC)** - Firestore security rules
- ✅ **API Key Protection** - Server-side only, environment variables
- ✅ **File Access Control** - Signed URLs with expiration
- ✅ **Input Validation** - All user inputs sanitized
- ✅ **Session Management** - Firebase Auth tokens
- ✅ **Resume Version Locking** - Immutable snapshots per application

### Scalability
| Aspect | Capacity | Scaling Strategy |
|--------|----------|------------------|
| **Students** | 10,000+ per college | Horizontal scaling via serverless |
| **Concurrent Users** | 1,000+ | Next.js auto-scaling on Vercel |
| **File Storage** | Unlimited | Cloudflare R2 scales automatically |
| **Database** | 1M+ documents | Firestore indexes, caching |
| **AI Requests** | 1,500/day (free tier) | Caching reduces calls by 70% |

### Reliability
- **Uptime Target:** 99.9%
- **Data Backup:** Firestore automatic backups
- **Error Handling:** Graceful degradation, user-friendly messages
- **Monitoring:** Firebase Analytics, error logging

---

## 🚀 Future Scope (Post-MVP)

### Phase 2 Features
- **Interview Scheduling** - Calendar integration for interview slots
- **Video Interviews** - Built-in video call functionality
- **Alumni Network** - Referral system and mentorship
- **Course Integration** - Link learning suggestions to online courses
- **Advanced Analytics** - Placement trends, success rates, insights

### Phase 3 Features
- **Multi-College SaaS** - White-label solution for multiple institutions
- **Mobile Apps** - Native iOS and Android applications
- **AI Interview Prep** - Mock interviews with AI feedback
- **Skill Assessments** - Integrated coding challenges and tests
- **Company Reviews** - Student feedback on companies and roles

### Enterprise Features
- **Custom Branding** - College-specific themes and logos
- **API Access** - Third-party integrations
- **Advanced Reporting** - Custom reports and exports
- **Dedicated Support** - Priority support for enterprise clients

---

## 📈 Success Metrics

### Student Metrics
- Resume score improvement (target: +20 points average)
- Application success rate (target: 50%+ shortlist rate)
- Time to first application (target: < 1 hour from signup)
- Learning engagement (target: 60%+ complete at least 1 suggestion)

### Admin Metrics
- Placement tracking coverage (target: 100% of drives)
- Time saved vs manual process (target: 80% reduction)
- Data accuracy (target: 95%+ accurate records)

### Recruiter Metrics
- Screening time reduction (target: 50% faster)
- Quality of candidates (target: 80%+ meet requirements)
- Application completion rate (target: 90%+ complete profiles)

---

## 📚 Related Documentation

- [README.md](./README.md) - Setup and installation guide
- [architecture-diagram.md](./architecture-diagram.md) - Technical architecture
- [.env.example](./.env.example) - Environment configuration template

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Status:** ✅ Locked & Implemented