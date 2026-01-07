# 📄 PRODUCT REQUIREMENTS DOCUMENT (FINAL)

## Project Name

**Placecraft**

## Product Type

Centralized Placement & Internship Management Platform

---

## 1. Product Vision

Placecraft is a **college-first, AI-powered placement platform** that unifies:

* Student onboarding & resume creation
* Skill gap detection + learning suggestions
* Internship & job applications
* Recruiter shortlisting
* Placement cell governance

The platform replaces fragmented tools (WhatsApp, Excel, emails) with a **single controlled system** powered by **Google-native tools**.

---

## 2. Core Objectives

* Improve student placement readiness
* Reduce recruiter screening effort
* Give placement cells full control & visibility
* Use **maximum Google tools** (hackathon focus)
* Ensure zero-friction onboarding (resume optional)

---

## 3. User Roles

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

## 8. Google Drive API — Core Usage

### Why Google Drive

* Native Google ecosystem
* Versioning
* Familiar UX
* Strong hackathon alignment

### Usage

* Store:

  * Uploaded resumes
  * AI-generated resumes
* Maintain:

  * Resume version history
  * Locked resume snapshots per application
* Store only Drive File IDs in database
* Files accessed via backend only (secure)

---

## 9. Tech Stack (FINAL)

### Frontend

* Next.js 16
* TypeScript
* App Router

### Backend & Platform

* **Firebase**

  * Authentication (Google Sign-In)
  * Firestore (users, applications, drives)
  * Cloud Functions (resume parsing, AI jobs)

### AI

* **Gemini AI (Free Tier)**

  * Resume parsing
  * Resume scoring
  * Resume generation
  * Learning suggestions

### Storage

* **Google Drive API** – primary
* **Cloudflare R2** – optional mirroring / downloads

---

## 10. Non-Functional Requirements

### Performance

* Resume parsing < 30 seconds
* Dashboard load < 2 seconds

### Security

* Role-based access control
* Drive file access via backend only
* Resume version locking per application

### Scalability

* Supports multiple colleges
* Thousands of students per college

---

## 11. Hackathon Strengths Summary

* Heavy **Google ecosystem usage**
* AI with real, measurable impact
* Solves real campus placement problems
* Clean role separation & governance
* Practical, deployable architecture

---

## 12. Future Scope (Post-MVP)

* Interview scheduling
* Alumni referrals
* Course integrations
* Multi-college SaaS mode
* Placement analytics dashboards

---

## 13. Status

✅ **PRD LOCKED**