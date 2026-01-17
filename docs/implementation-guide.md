# 🛠️ Implementation Guide - Multi-Tenant System

> **Feature:** Step-by-Step Implementation Guide  
> **Version:** 2.0  
> **Last Updated:** January 2026

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Phase 1: Database Setup](#-phase-1-database-setup)
3. [Phase 2: Authentication Layer](#-phase-2-authentication-layer)
4. [Phase 3: Global Admin Dashboard](#-phase-3-global-admin-dashboard)
5. [Phase 4: Tenant-Aware Data Layer](#-phase-4-tenant-aware-data-layer)
6. [Phase 5: UI Updates](#-phase-5-ui-updates)
7. [Phase 6: Testing](#-phase-6-testing)
8. [Deployment](#-deployment)

---

## ✅ Prerequisites

### Required Tools
- Node.js 18+ installed
- Firebase CLI installed and configured
- Access to Firebase Console
- Git for version control

### Required Knowledge
- TypeScript/JavaScript
- Next.js App Router
- Firebase Firestore
- Firebase Authentication

### Backup Current System
```bash
# Create a backup branch
git checkout -b backup-before-multitenant
git push origin backup-before-multitenant

# Export Firestore data
firebase firestore:export gs://your-bucket/backups/pre-multitenant

# Document current admin emails
# Save contents of src/lib/constants.ts
```

---

## 📊 Phase 1: Database Setup

### Step 1.1: Create New Collections

**File:** `scripts/setup-multitenant-db.ts`

```typescript
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setupMultiTenantDatabase() {
  console.log("🚀 Setting up multi-tenant database...");

  // 1. Create global college entry
  const globalCollege = {
    id: "global",
    name: "Placecraft Global",
    code: "GLOBAL",
    location: "Worldwide",
    adminEmails: [],
    settings: {
      allowStudentRegistration: true,
      requireApproval: false,
      features: {
        enableAIResume: true,
        enableSkillGap: true
      }
    },
    status: "active",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: "system"
  };

  await setDoc(doc(db, "colleges", "global"), globalCollege);
  console.log("✅ Created global college");

  // 2. Create initial global admin
  // Replace with your actual admin email
  const initialAdmin = {
    id: "admin_001",
    email: "admin@placecraft.com", // CHANGE THIS
    status: "active",
    addedAt: Timestamp.now(),
    addedBy: "system",
    permissions: ["manage_colleges", "manage_admins", "view_analytics"]
  };

  await setDoc(doc(db, "globalAdmins", "admin_001"), initialAdmin);
  console.log("✅ Created initial global admin");

  console.log("🎉 Multi-tenant database setup complete!");
}

setupMultiTenantDatabase().catch(console.error);
```

**Run:**
```bash
npx tsx scripts/setup-multitenant-db.ts
```

---

### Step 1.2: Migrate Existing Data

**File:** `scripts/migrate-to-multitenant.ts`

```typescript
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";

async function migrateExistingData() {
  const db = getFirestore();
  
  console.log("🔄 Migrating existing data to multi-tenant...");

  // Migrate students
  console.log("Migrating students...");
  const studentsRef = collection(db, "students");
  const studentsSnapshot = await getDocs(studentsRef);
  
  let batch = writeBatch(db);
  let count = 0;
  
  for (const studentDoc of studentsSnapshot.docs) {
    const studentRef = doc(db, "students", studentDoc.id);
    batch.update(studentRef, {
      tenantId: "global",
      tenantType: "global"
    });
    
    count++;
    
    // Firestore batch limit is 500
    if (count % 500 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`  Migrated ${count} students...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  console.log(`✅ Migrated ${count} students`);

  // Migrate recruiters
  console.log("Migrating recruiters...");
  const recruitersRef = collection(db, "recruiters");
  const recruitersSnapshot = await getDocs(recruitersRef);
  
  batch = writeBatch(db);
  count = 0;
  
  for (const recruiterDoc of recruitersSnapshot.docs) {
    const recruiterRef = doc(db, "recruiters", recruiterDoc.id);
    batch.update(recruiterRef, {
      tenantId: "global",
      tenantType: "global"
    });
    
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`  Migrated ${count} recruiters...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  console.log(`✅ Migrated ${count} recruiters`);

  // Migrate drives
  console.log("Migrating drives...");
  const drivesRef = collection(db, "drives");
  const drivesSnapshot = await getDocs(drivesRef);
  
  batch = writeBatch(db);
  count = 0;
  
  for (const driveDoc of drivesSnapshot.docs) {
    const driveRef = doc(db, "drives", driveDoc.id);
    batch.update(driveRef, {
      tenantId: "global",
      tenantType: "global",
      visibility: "tenant"
    });
    
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`  Migrated ${count} drives...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  console.log(`✅ Migrated ${count} drives`);

  // Migrate applications
  console.log("Migrating applications...");
  const applicationsRef = collection(db, "applications");
  const applicationsSnapshot = await getDocs(applicationsRef);
  
  batch = writeBatch(db);
  count = 0;
  
  for (const appDoc of applicationsSnapshot.docs) {
    const appRef = doc(db, "applications", appDoc.id);
    batch.update(appRef, {
      tenantId: "global",
      tenantType: "global"
    });
    
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`  Migrated ${count} applications...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  console.log(`✅ Migrated ${count} applications`);

  console.log("🎉 Data migration complete!");
}

migrateExistingData().catch(console.error);
```

**Run:**
```bash
npx tsx scripts/migrate-to-multitenant.ts
```

---

### Step 1.3: Create Firestore Indexes

**File:** `firestore.indexes.json` (append to existing)

```json
{
  "indexes": [
    {
      "collectionGroup": "colleges",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "code", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "colleges",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "adminEmails", "arrayConfig": "CONTAINS" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "globalAdmins",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "email", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "students",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "email", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "students",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "graduationYear", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "recruiters",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "verified", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "drives",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "applications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "driveId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Deploy:**
```bash
firebase deploy --only firestore:indexes
```

---

### Step 1.4: Update Firestore Security Rules

**File:** `firestore.rules` (update)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isGlobalAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/globalAdmins/$(request.auth.token.email));
    }
    
    function isCollegeAdmin(collegeId) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/colleges/$(collegeId)).data.adminEmails.hasAny([request.auth.token.email]);
    }
    
    function hasAccessToTenant(tenantId) {
      // Global admins can access any tenant
      if (isGlobalAdmin()) {
        return true;
      }
      
      // College admins can access their college
      if (isCollegeAdmin(tenantId)) {
        return true;
      }
      
      // Users can access their own tenant
      return isAuthenticated() && request.auth.token.tenantId == tenantId;
    }
    
    // Colleges collection
    match /colleges/{collegeId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isGlobalAdmin();
    }
    
    // Global admins collection
    match /globalAdmins/{adminId} {
      allow read, write: if isGlobalAdmin();
    }
    
    // Students collection
    match /students/{studentId} {
      allow read: if hasAccessToTenant(resource.data.tenantId);
      allow create: if isAuthenticated() && 
                       request.resource.data.uid == request.auth.uid &&
                       request.resource.data.tenantId != null;
      allow update: if hasAccessToTenant(resource.data.tenantId) &&
                       resource.data.uid == request.auth.uid;
      allow delete: if isGlobalAdmin() || isCollegeAdmin(resource.data.tenantId);
    }
    
    // Recruiters collection
    match /recruiters/{recruiterId} {
      allow read: if hasAccessToTenant(resource.data.tenantId);
      allow create: if isAuthenticated() && 
                       request.resource.data.uid == request.auth.uid;
      allow update: if hasAccessToTenant(resource.data.tenantId);
      allow delete: if isGlobalAdmin() || isCollegeAdmin(resource.data.tenantId);
    }
    
    // Drives collection
    match /drives/{driveId} {
      allow read: if hasAccessToTenant(resource.data.tenantId);
      allow create: if hasAccessToTenant(request.resource.data.tenantId);
      allow update, delete: if hasAccessToTenant(resource.data.tenantId);
    }
    
    // Applications collection
    match /applications/{applicationId} {
      allow read: if hasAccessToTenant(resource.data.tenantId);
      allow create: if isAuthenticated() && 
                       request.resource.data.studentId == request.auth.uid;
      allow update: if hasAccessToTenant(resource.data.tenantId);
      allow delete: if isGlobalAdmin();
    }
  }
}
```

**Deploy:**
```bash
firebase deploy --only firestore:rules
```

---

## 🔐 Phase 2: Authentication Layer

### Step 2.1: Create Tenant Service

**File:** `src/lib/firebase/tenant.ts`

```typescript
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { getDb } from "./config";
import { getStudentByUid, getRecruiterByUid } from "./firestore";

export interface TenantContext {
  role: "global_admin" | "college_admin" | "student" | "recruiter" | null;
  tenantId: string | null;
  tenantType: "college" | "global" | null;
  collegeId?: string;
  collegeName?: string;
  collegeCode?: string;
  profileId?: string;
  verified?: boolean;
  canAccessAllTenants: boolean;
  needsOnboarding?: boolean;
}

export async function isGlobalAdmin(email: string): Promise<boolean> {
  try {
    const adminsRef = collection(getDb(), "globalAdmins");
    const q = query(
      adminsRef,
      where("email", "==", email),
      where("status", "==", "active"),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking global admin:", error);
    return false;
  }
}

export async function getCollegeForAdmin(email: string): Promise<any | null> {
  try {
    const collegesRef = collection(getDb(), "colleges");
    const q = query(
      collegesRef,
      where("adminEmails", "array-contains", email),
      where("status", "==", "active"),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (error) {
    console.error("Error getting college for admin:", error);
    return null;
  }
}

export async function resolveTenantContext(
  user: { uid: string; email: string | null }
): Promise<TenantContext> {
  if (!user.email) {
    return {
      role: null,
      tenantId: null,
      tenantType: null,
      canAccessAllTenants: false,
      needsOnboarding: true
    };
  }
  
  // Check global admin
  const globalAdmin = await isGlobalAdmin(user.email);
  if (globalAdmin) {
    return {
      role: "global_admin",
      tenantId: "global",
      tenantType: "global",
      canAccessAllTenants: true
    };
  }
  
  // Check college admin
  const college = await getCollegeForAdmin(user.email);
  if (college) {
    return {
      role: "college_admin",
      tenantId: college.id,
      tenantType: "college",
      collegeId: college.id,
      collegeName: college.name,
      collegeCode: college.code,
      canAccessAllTenants: false
    };
  }
  
  // Check student profile
  const student = await getStudentByUid(user.uid);
  if (student) {
    return {
      role: "student",
      tenantId: student.tenantId,
      tenantType: student.tenantType,
      collegeId: student.collegeId,
      collegeName: student.collegeName,
      profileId: student.id,
      canAccessAllTenants: false
    };
  }
  
  // Check recruiter profile
  const recruiter = await getRecruiterByUid(user.uid);
  if (recruiter) {
    return {
      role: "recruiter",
      tenantId: recruiter.tenantId,
      tenantType: recruiter.tenantType,
      collegeId: recruiter.collegeId,
      profileId: recruiter.id,
      verified: recruiter.verified,
      canAccessAllTenants: false
    };
  }
  
  // New user
  return {
    role: null,
    tenantId: null,
    tenantType: null,
    canAccessAllTenants: false,
    needsOnboarding: true
  };
}
```

---

### Step 2.2: Update Types

**File:** `src/types/index.ts` (add to existing)

```typescript
// Add to existing types
export interface College {
  id: string;
  name: string;
  code: string;
  location: string;
  adminEmails: string[];
  settings: {
    allowStudentRegistration: boolean;
    requireEmailDomain?: string;
    requireApproval: boolean;
    branding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
    features?: {
      enableAIResume: boolean;
      enableSkillGap: boolean;
      maxApplicationsPerStudent?: number;
    };
  };
  status: "active" | "inactive" | "suspended";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  stats?: {
    totalStudents: number;
    totalRecruiters: number;
    totalDrives: number;
    activeDrives: number;
  };
}

export interface GlobalAdmin {
  id: string;
  email: string;
  uid?: string;
  name?: string;
  photoURL?: string;
  status: "active" | "revoked";
  permissions?: string[];
  addedAt: Timestamp;
  addedBy: string;
  lastLoginAt?: Timestamp;
  notes?: string;
}

export type TenantType = "college" | "global";

// Update existing interfaces
export interface StudentProfile {
  // ... existing fields ...
  
  // NEW: Tenant fields
  tenantId: string;
  tenantType: TenantType;
  collegeId?: string;
  collegeName?: string;
  collegeCode?: string;
}

export interface RecruiterProfile {
  // ... existing fields ...
  
  // NEW: Tenant fields
  tenantId: string;
  tenantType: TenantType;
  collegeId?: string;
  collegeName?: string;
}

export interface PlacementDrive {
  // ... existing fields ...
  
  // NEW: Tenant fields
  tenantId: string;
  tenantType: TenantType;
  collegeId?: string;
  collegeName?: string;
  visibility: "tenant" | "public";
}

export interface Application {
  // ... existing fields ...
  
  // NEW: Tenant fields
  tenantId: string;
  tenantType: TenantType;
}
```

---

### Step 2.3: Update Auth Hook

**File:** `src/hooks/use-auth.ts` (update)

```typescript
"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { onTokenChange, setSessionCookie, clearSessionCookie } from "@/lib/firebase/auth";
import { resolveTenantContext, type TenantContext } from "@/lib/firebase/tenant";
import { AuthUser, StudentProfile, RecruiterProfile } from "@/types";
import { getStudentById, getRecruiterById } from "@/lib/firebase/firestore";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [profile, setProfile] = useState<StudentProfile | RecruiterProfile | null | undefined>(undefined);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onTokenChange(async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(authUser);
        
        // Resolve tenant context
        const context = await resolveTenantContext(firebaseUser);
        setTenantContext(context);
        
        // Load profile if applicable
        setProfileLoading(true);
        try {
          if (context.role === "student" && context.profileId) {
            const studentProfile = await getStudentById(context.profileId);
            setProfile(studentProfile);
          } else if (context.role === "recruiter" && context.profileId) {
            const recruiterProfile = await getRecruiterById(context.profileId);
            setProfile(recruiterProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Failed to load profile:", error);
          setProfile(null);
        } finally {
          setProfileLoading(false);
        }
        
        // Set session cookie
        try {
          const idToken = await firebaseUser.getIdToken();
          setSessionCookie(idToken);
        } catch (error) {
          console.error("Failed to set session cookie:", error);
        }
      } else {
        setUser(null);
        setTenantContext(null);
        setProfile(null);
        setProfileLoading(false);
        clearSessionCookie();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!tenantContext?.profileId) return;

    try {
      if (tenantContext.role === "student") {
        const studentProfile = await getStudentById(tenantContext.profileId);
        setProfile(studentProfile);
      } else if (tenantContext.role === "recruiter") {
        const recruiterProfile = await getRecruiterById(tenantContext.profileId);
        setProfile(recruiterProfile);
      }
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  };

  return { 
    user, 
    loading, 
    tenantContext, 
    profile, 
    profileLoading, 
    refreshProfile 
  };
}
```

---

## 🎨 Phase 3: Global Admin Dashboard

### Step 3.1: Create College Management Functions

**File:** `src/lib/firebase/colleges.ts`

```typescript
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { getDb } from "./config";
import { College } from "@/types";
import { v4 as uuidv4 } from "uuid";

const COLLECTIONS = {
  COLLEGES: "colleges",
  GLOBAL_ADMINS: "globalAdmins"
};

export async function getAllColleges(): Promise<College[]> {
  const collegesRef = collection(getDb(), COLLECTIONS.COLLEGES);
  const q = query(collegesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as College[];
}

export async function getCollegeById(id: string): Promise<College | null> {
  const docRef = doc(getDb(), COLLECTIONS.COLLEGES, id);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as College;
}

export async function getCollegeByCode(code: string): Promise<College | null> {
  const collegesRef = collection(getDb(), COLLECTIONS.COLLEGES);
  const q = query(collegesRef, where("code", "==", code));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as College;
}

export async function createCollege(
  data: Omit<College, "id" | "createdAt" | "updatedAt">,
  createdBy: string
): Promise<College> {
  const id = `college_${uuidv4()}`;
  const now = Timestamp.now();
  
  const college: Omit<College, "id"> = {
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy
  };
  
  await setDoc(doc(getDb(), COLLECTIONS.COLLEGES, id), college);
  return { id, ...college };
}

export async function updateCollege(
  id: string,
  data: Partial<College>
): Promise<void> {
  const docRef = doc(getDb(), COLLECTIONS.COLLEGES, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
}

export async function addCollegeAdmin(
  collegeId: string,
  email: string
): Promise<void> {
  const college = await getCollegeById(collegeId);
  if (!college) throw new Error("College not found");
  
  if (!college.adminEmails.includes(email)) {
    await updateCollege(collegeId, {
      adminEmails: [...college.adminEmails, email]
    });
  }
}

export async function removeCollegeAdmin(
  collegeId: string,
  email: string
): Promise<void> {
  const college = await getCollegeById(collegeId);
  if (!college) throw new Error("College not found");
  
  await updateCollege(collegeId, {
    adminEmails: college.adminEmails.filter(e => e !== email)
  });
}
```

---

### Step 3.2: Create Global Admin API Routes

**File:** `src/app/api/admin/colleges/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebase/auth-api";
import { isGlobalAdmin } from "@/lib/firebase/tenant";
import { getAllColleges, createCollege } from "@/lib/firebase/colleges";

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check if user is global admin
  const email = request.headers.get("x-user-email");
  if (!email || !(await isGlobalAdmin(email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  try {
    const colleges = await getAllColleges();
    return NextResponse.json({ colleges });
  } catch (error) {
    console.error("Error fetching colleges:", error);
    return NextResponse.json({ error: "Failed to fetch colleges" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const email = request.headers.get("x-user-email");
  if (!email || !(await isGlobalAdmin(email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    const college = await createCollege(body, authResult.userId!);
    return NextResponse.json({ college }, { status: 201 });
  } catch (error) {
    console.error("Error creating college:", error);
    return NextResponse.json({ error: "Failed to create college" }, { status: 500 });
  }
}
```

---

### Step 3.3: Create Global Admin Dashboard UI

**File:** `src/app/global-admin/page.tsx`

```typescript
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GlobalAdminDashboard() {
  const { tenantContext, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && tenantContext?.role !== "global_admin") {
      router.push("/login");
    }
  }, [loading, tenantContext, router]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Global Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Colleges</h2>
          <p className="text-gray-600">Manage colleges and institutions</p>
          <button 
            onClick={() => router.push("/global-admin/colleges")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Manage Colleges
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Admins</h2>
          <p className="text-gray-600">Manage global and college admins</p>
          <button 
            onClick={() => router.push("/global-admin/admins")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Manage Admins
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Analytics</h2>
          <p className="text-gray-600">View system-wide analytics</p>
          <button 
            onClick={() => router.push("/global-admin/analytics")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 📦 Phase 4: Tenant-Aware Data Layer

### Step 4.1: Update Firestore Functions

**File:** `src/lib/firebase/firestore.ts` (update existing functions)

```typescript
// Update createStudent to accept tenantId
export async function createStudent(
  uid: string,
  email: string,
  name: string,
  tenantId: string,
  tenantType: "college" | "global",
  data: Partial<StudentProfile>
): Promise<StudentProfile> {
  const id = uuidv4();
  const now = Timestamp.now();

  const student: Omit<StudentProfile, "id"> = {
    uid,
    email,
    name,
    tenantId,
    tenantType,
    collegeId: data.collegeId,
    collegeName: data.collegeName,
    collegeCode: data.collegeCode,
    phone: data.phone || "",
    college: data.college || "",
    branch: data.branch || "",
    graduationYear: data.graduationYear || new Date().getFullYear() + 1,
    cgpa: data.cgpa,
    skills: data.skills || [],
    education: data.education || [],
    experience: data.experience || [],
    projects: data.projects || [],
    certifications: data.certifications || [],
    achievements: data.achievements || [],
    profileComplete: false,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(getDb(), COLLECTIONS.STUDENTS, id), student);
  return { id, ...student };
}

// Update getAllStudents to filter by tenantId
export async function getAllStudents(tenantId?: string): Promise<StudentProfile[]> {
  const studentsRef = collection(getDb(), COLLECTIONS.STUDENTS);
  
  let q;
  if (tenantId) {
    q = query(
      studentsRef,
      where("tenantId", "==", tenantId),
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(studentsRef, orderBy("createdAt", "desc"));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StudentProfile[];
}

// Similar updates for recruiters, drives, applications...
```

---

## 🎨 Phase 5: UI Updates

### Step 5.1: Create Onboarding Flow

**File:** `src/app/onboarding/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { getAllColleges } from "@/lib/firebase/colleges";
import { College } from "@/types";

export default function OnboardingPage() {
  const { user, tenantContext } = useAuth();
  const router = useRouter();
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (tenantContext && !tenantContext.needsOnboarding) {
      router.push("/student/dashboard");
    }
  }, [tenantContext, router]);
  
  useEffect(() => {
    loadColleges();
  }, []);
  
  async function loadColleges() {
    try {
      const data = await getAllColleges();
      setColleges(data.filter(c => c.status === "active"));
    } catch (error) {
      console.error("Failed to load colleges:", error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleSubmit() {
    if (!selectedTenant) return;
    
    // Create student profile with selected tenant
    // Redirect to profile completion
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Welcome to Placecraft!</h1>
        <p className="text-gray-600 mb-6">
          Please select your institution or continue as a global user.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => setSelectedTenant("global")}
            className={`w-full p-4 border rounded-lg text-left ${
              selectedTenant === "global" ? "border-blue-600 bg-blue-50" : ""
            }`}
          >
            <div className="font-semibold">Global User</div>
            <div className="text-sm text-gray-600">
              Access public job postings and opportunities
            </div>
          </button>
          
          <div className="text-center text-gray-500">OR</div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Your College
            </label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Choose a college...</option>
              {colleges.map(college => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!selectedTenant}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
```

---

## ✅ Phase 6: Testing

### Test Checklist

- [ ] Global admin can log in and access global admin dashboard
- [ ] Global admin can create new colleges
- [ ] Global admin can add/remove college admins
- [ ] College admin can log in and access college-scoped admin dashboard
- [ ] College admin cannot see other colleges' data
- [ ] New students see onboarding flow
- [ ] Students can select college or global context
- [ ] College students only see their college's drives
- [ ] Global students only see global drives
- [ ] Data isolation verified (no cross-tenant leaks)
- [ ] Firestore security rules prevent unauthorized access
- [ ] All database queries include tenantId filter

---

## 🚀 Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Database migration completed
- [ ] Firestore indexes deployed
- [ ] Security rules deployed
- [ ] Environment variables configured
- [ ] Backup created

### Deployment Steps

```bash
# 1. Build the application
npm run build

# 2. Deploy Firestore rules and indexes
firebase deploy --only firestore

# 3. Deploy to production
npm run deploy
# or
vercel --prod
```

---

## 🔄 Rollback Plan

If issues occur:

```bash
# 1. Revert to backup branch
git checkout backup-before-multitenant

# 2. Restore Firestore data
firebase firestore:import gs://your-bucket/backups/pre-multitenant

# 3. Deploy previous version
npm run deploy
```

---

**Document Version:** 2.0  
**Last Updated:** January 2026  
**Status:** 📝 Implementation Guide
