# 🗄️ Database Schema - Multi-Tenant System

> **Feature:** Multi-Tenant Database Design  
> **Version:** 2.0  
> **Last Updated:** January 2026

---

## 📋 Table of Contents

1. [Schema Overview](#-schema-overview)
2. [Collection Details](#-collection-details)
3. [Indexes](#-indexes)
4. [Migration Strategy](#-migration-strategy)
5. [Query Patterns](#-query-patterns)

---

## 🎯 Schema Overview

### Tenant Model

```typescript
type TenantId = string;  // Format: "college_{uuid}" | "global"

type TenantType = "college" | "global";
```

### Collection Structure

```
Firestore Root
│
├── colleges/                    # NEW: College definitions
│   └── {collegeId}/
│       ├── id: string
│       ├── name: string
│       ├── code: string
│       ├── adminEmails: string[]
│       └── settings: object
│
├── globalAdmins/                # NEW: Global admin emails
│   └── {adminId}/
│       ├── email: string
│       ├── uid: string
│       └── status: string
│
├── students/                    # MODIFIED: Add tenant fields
│   └── {studentId}/
│       ├── tenantId: string    # NEW
│       ├── tenantType: string  # NEW
│       ├── collegeId: string   # NEW (optional)
│       └── ... existing fields
│
├── recruiters/                  # MODIFIED: Add tenant fields
│   └── {recruiterId}/
│       ├── tenantId: string    # NEW
│       ├── tenantType: string  # NEW
│       └── ... existing fields
│
├── drives/                      # MODIFIED: Add tenant fields
│   └── {driveId}/
│       ├── tenantId: string    # NEW
│       ├── tenantType: string  # NEW
│       └── ... existing fields
│
└── applications/                # MODIFIED: Add tenant fields
    └── {applicationId}/
        ├── tenantId: string    # NEW
        ├── tenantType: string  # NEW
        └── ... existing fields
```

---

## 📊 Collection Details

### 1. `colleges` Collection (NEW)

**Purpose:** Store college/institution information and admin mappings

```typescript
interface College {
  // Identity
  id: string;                           // Auto-generated UUID
  name: string;                         // "Massachusetts Institute of Technology"
  code: string;                         // "MIT" (unique, URL-friendly)
  
  // Location
  location: string;                     // "Cambridge, MA, USA"
  address?: string;                     // Full address (optional)
  
  // Admin Management
  adminEmails: string[];                // ["admin1@mit.edu", "admin2@mit.edu"]
  
  // Settings
  settings: {
    // Registration
    allowStudentRegistration: boolean;  // Can students self-register?
    requireEmailDomain?: string;        // "@mit.edu" - enforce email domain
    requireApproval: boolean;           // Require admin approval for new students
    
    // Branding
    branding?: {
      logo?: string;                    // URL to college logo (R2 storage)
      primaryColor?: string;            // "#A31F34" (hex color)
      secondaryColor?: string;          // "#8A8B8C"
    };
    
    // Features
    features?: {
      enableAIResume: boolean;          // Allow AI resume generation
      enableSkillGap: boolean;          // Show skill gap analysis
      maxApplicationsPerStudent?: number; // Limit applications (optional)
    };
  };
  
  // Status
  status: "active" | "inactive" | "suspended";
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;                    // Global admin UID
  
  // Statistics (denormalized for quick access)
  stats?: {
    totalStudents: number;
    totalRecruiters: number;
    totalDrives: number;
    activeDrives: number;
  };
}
```

**Validation Rules:**
- `code` must be unique across all colleges
- `code` must be alphanumeric with hyphens only (e.g., "MIT-COE")
- `adminEmails` must contain at least one valid email
- `name` is required and non-empty

**Example Document:**

```json
{
  "id": "college_a1b2c3d4",
  "name": "MIT College of Engineering",
  "code": "MIT-COE",
  "location": "Pune, Maharashtra, India",
  "adminEmails": [
    "placement.officer@mitcoe.edu",
    "dean.academics@mitcoe.edu"
  ],
  "settings": {
    "allowStudentRegistration": true,
    "requireEmailDomain": "@mitcoe.edu",
    "requireApproval": false,
    "branding": {
      "logo": "https://r2.placecraft.com/colleges/mit-coe/logo.png",
      "primaryColor": "#003366"
    },
    "features": {
      "enableAIResume": true,
      "enableSkillGap": true
    }
  },
  "status": "active",
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z",
  "createdBy": "global_admin_uid_123"
}
```

---

### 2. `globalAdmins` Collection (NEW)

**Purpose:** Manage global/super admin access

```typescript
interface GlobalAdmin {
  // Identity
  id: string;                           // Auto-generated
  email: string;                        // "superadmin@placecraft.com"
  
  // User Info (populated after first login)
  uid?: string;                         // Firebase Auth UID
  name?: string;                        // "John Doe"
  photoURL?: string;                    // Profile picture URL
  
  // Access Control
  status: "active" | "revoked";
  permissions?: string[];               // ["manage_colleges", "manage_admins", "view_analytics"]
  
  // Metadata
  addedAt: Timestamp;
  addedBy: string;                      // UID of admin who added this
  lastLoginAt?: Timestamp;
  
  // Audit
  notes?: string;                       // Admin notes about this user
}
```

**Validation Rules:**
- `email` must be unique
- `email` must be valid email format
- Only existing global admins can add new global admins

**Example Document:**

```json
{
  "id": "gadmin_xyz789",
  "email": "admin@placecraft.com",
  "uid": "firebase_uid_abc123",
  "name": "Sarah Johnson",
  "status": "active",
  "permissions": ["manage_colleges", "manage_admins", "view_analytics"],
  "addedAt": "2026-01-01T00:00:00Z",
  "addedBy": "system",
  "lastLoginAt": "2026-01-16T09:30:00Z"
}
```

---

### 3. `students` Collection (MODIFIED)

**New Fields Added:**

```typescript
interface StudentProfile {
  // ... ALL EXISTING FIELDS REMAIN ...
  
  // NEW: Tenant Context
  tenantId: string;                     // "college_a1b2c3d4" or "global"
  tenantType: "college" | "global";
  
  // NEW: College Reference (if tenantType = "college")
  collegeId?: string;                   // Reference to colleges/{collegeId}
  collegeName?: string;                 // Denormalized: "MIT College of Engineering"
  collegeCode?: string;                 // Denormalized: "MIT-COE"
  
  // ... rest of existing fields ...
}
```

**Migration Impact:**
- Existing students: Set `tenantId = "global"`, `tenantType = "global"`
- New college students: Set `tenantId = college.id`, `tenantType = "college"`

**Example Document (College Student):**

```json
{
  "id": "student_123",
  "uid": "firebase_uid_456",
  "email": "student@mitcoe.edu",
  "name": "Rahul Sharma",
  "tenantId": "college_a1b2c3d4",
  "tenantType": "college",
  "collegeId": "college_a1b2c3d4",
  "collegeName": "MIT College of Engineering",
  "collegeCode": "MIT-COE",
  "college": "MIT College of Engineering",
  "branch": "Computer Engineering",
  "graduationYear": 2026
}
```

**Example Document (Global Student):**

```json
{
  "id": "student_789",
  "uid": "firebase_uid_101",
  "email": "freelancer@gmail.com",
  "name": "Priya Patel",
  "tenantId": "global",
  "tenantType": "global",
  "college": "Self-taught Developer",
  "skills": ["React", "Node.js", "Python"]
}
```

---

### 4. `recruiters` Collection (MODIFIED)

**New Fields Added:**

```typescript
interface RecruiterProfile {
  // ... ALL EXISTING FIELDS REMAIN ...
  
  // NEW: Tenant Context
  tenantId: string;                     // "college_a1b2c3d4" or "global"
  tenantType: "college" | "global";
  
  // NEW: College Reference (if tenantType = "college")
  collegeId?: string;                   // Reference to colleges/{collegeId}
  collegeName?: string;                 // Denormalized
  
  // ... rest of existing fields ...
}
```

**Example Document (College Recruiter):**

```json
{
  "id": "recruiter_456",
  "uid": "firebase_uid_789",
  "email": "hr@techcorp.com",
  "name": "Amit Desai",
  "tenantId": "college_a1b2c3d4",
  "tenantType": "college",
  "collegeId": "college_a1b2c3d4",
  "company": "TechCorp India",
  "designation": "Campus Recruitment Manager",
  "verified": true
}
```

---

### 5. `drives` Collection (MODIFIED)

**New Fields Added:**

```typescript
interface PlacementDrive {
  // ... ALL EXISTING FIELDS REMAIN ...
  
  // NEW: Tenant Context
  tenantId: string;                     // "college_a1b2c3d4" or "global"
  tenantType: "college" | "global";
  
  // NEW: College Reference (if tenantType = "college")
  collegeId?: string;
  collegeName?: string;
  
  // NEW: Visibility Control (future feature)
  visibility: "tenant" | "public";      // Default: "tenant"
  
  // ... rest of existing fields ...
}
```

**Visibility Rules:**
- `"tenant"`: Only visible to students/recruiters in same tenant
- `"public"`: Visible across tenants (future feature for cross-college hiring)

**Example Document:**

```json
{
  "id": "drive_abc123",
  "tenantId": "college_a1b2c3d4",
  "tenantType": "college",
  "collegeId": "college_a1b2c3d4",
  "visibility": "tenant",
  "company": "Google India",
  "role": "Software Engineering Intern",
  "type": "internship",
  "eligibility": {
    "branches": ["Computer Engineering", "IT"],
    "minCGPA": 7.0,
    "graduationYears": [2026, 2027]
  },
  "status": "active"
}
```

---

### 6. `applications` Collection (MODIFIED)

**New Fields Added:**

```typescript
interface Application {
  // ... ALL EXISTING FIELDS REMAIN ...
  
  // NEW: Tenant Context (inherited from drive)
  tenantId: string;
  tenantType: "college" | "global";
  
  // ... rest of existing fields ...
}
```

**Note:** `tenantId` is automatically set from the drive's `tenantId` when application is created.

---

## 🔍 Indexes

### Required Composite Indexes

#### `colleges` Collection

```json
{
  "collectionGroup": "colleges",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "code", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "colleges",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "colleges",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "adminEmails", "arrayConfig": "CONTAINS" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

---

#### `globalAdmins` Collection

```json
{
  "collectionGroup": "globalAdmins",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "email", "order": "ASCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "globalAdmins",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "addedAt", "order": "DESCENDING" }
  ]
}
```

---

#### `students` Collection

```json
{
  "collectionGroup": "students",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "email", "order": "ASCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "students",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "graduationYear", "order": "ASCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "students",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "branch", "order": "ASCENDING" },
    { "fieldPath": "graduationYear", "order": "ASCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "students",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

#### `recruiters` Collection

```json
{
  "collectionGroup": "recruiters",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "verified", "order": "ASCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "recruiters",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

#### `drives` Collection

```json
{
  "collectionGroup": "drives",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "drives",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "drives",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

#### `applications` Collection

```json
{
  "collectionGroup": "applications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "driveId", "order": "ASCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "applications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "studentId", "order": "ASCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "applications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 🔄 Migration Strategy

### Phase 1: Add New Collections

```typescript
// Create colleges collection with initial global college
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

// Create globalAdmins collection with initial admin
const initialAdmin = {
  id: "admin_001",
  email: "admin@placecraft.com",
  status: "active",
  addedAt: Timestamp.now(),
  addedBy: "system"
};
```

---

### Phase 2: Migrate Existing Data

```typescript
// Migration script for students
async function migrateStudents() {
  const studentsRef = collection(db, "students");
  const snapshot = await getDocs(studentsRef);
  
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(doc => {
    const studentRef = doc.ref;
    batch.update(studentRef, {
      tenantId: "global",
      tenantType: "global"
    });
  });
  
  await batch.commit();
  console.log(`Migrated ${snapshot.size} students to global tenant`);
}

// Similar functions for recruiters, drives, applications
```

---

### Phase 3: Deploy Indexes

```bash
# Deploy new indexes
firebase deploy --only firestore:indexes

# Wait for index creation (can take several minutes)
```

---

### Phase 4: Update Security Rules

```javascript
// Deploy updated security rules with tenant checks
firebase deploy --only firestore:rules
```

---

## 🔍 Query Patterns

### Common Queries

#### 1. Get All Students in a College

```typescript
const studentsRef = collection(db, "students");
const q = query(
  studentsRef,
  where("tenantId", "==", collegeId),
  orderBy("createdAt", "desc")
);
const snapshot = await getDocs(q);
```

---

#### 2. Get Active Drives for a Tenant

```typescript
const drivesRef = collection(db, "drives");
const q = query(
  drivesRef,
  where("tenantId", "==", tenantId),
  where("status", "==", "active"),
  orderBy("createdAt", "desc")
);
const snapshot = await getDocs(q);
```

---

#### 3. Check if Email is College Admin

```typescript
const collegesRef = collection(db, "colleges");
const q = query(
  collegesRef,
  where("adminEmails", "array-contains", email),
  where("status", "==", "active")
);
const snapshot = await getDocs(q);

if (!snapshot.empty) {
  const college = snapshot.docs[0].data();
  return { isAdmin: true, collegeId: college.id };
}
return { isAdmin: false };
```

---

#### 4. Get College by Code

```typescript
const collegesRef = collection(db, "colleges");
const q = query(
  collegesRef,
  where("code", "==", collegeCode),
  limit(1)
);
const snapshot = await getDocs(q);

if (!snapshot.empty) {
  return snapshot.docs[0].data();
}
return null;
```

---

#### 5. Get Applications for Student (Tenant-Scoped)

```typescript
const applicationsRef = collection(db, "applications");
const q = query(
  applicationsRef,
  where("tenantId", "==", studentTenantId),
  where("studentId", "==", studentId),
  orderBy("createdAt", "desc")
);
const snapshot = await getDocs(q);
```

---

## 📊 Data Size Estimates

### Per College (1000 students)

| Collection | Documents | Avg Size | Total Size |
|------------|-----------|----------|------------|
| students | 1,000 | 5 KB | 5 MB |
| recruiters | 50 | 2 KB | 100 KB |
| drives | 200 | 3 KB | 600 KB |
| applications | 5,000 | 4 KB | 20 MB |
| **Total** | **6,250** | - | **~26 MB** |

### System-Wide (100 colleges)

| Collection | Documents | Total Size |
|------------|-----------|------------|
| colleges | 100 | 500 KB |
| globalAdmins | 10 | 20 KB |
| students | 100,000 | 500 MB |
| recruiters | 5,000 | 10 MB |
| drives | 20,000 | 60 MB |
| applications | 500,000 | 2 GB |
| **Total** | **625,110** | **~2.6 GB** |

**Firestore Limits:**
- Max document size: 1 MB ✅ (we're well under)
- Max collection size: Unlimited ✅
- Max writes per second: 10,000 ✅ (we won't hit this)

---

## 🔒 Security Considerations

### Tenant Isolation Guarantees

1. **Query-Level Isolation:** All queries MUST include `tenantId` filter
2. **Rule-Level Isolation:** Firestore rules enforce tenant checks
3. **API-Level Isolation:** Backend validates tenant access before queries
4. **Token-Level Isolation:** User's `tenantId` stored in Firebase custom claims

### Audit Requirements

- Log all cross-tenant access attempts
- Monitor queries without `tenantId` filter
- Alert on security rule violations
- Regular security audits of tenant isolation

---

**Document Version:** 2.0  
**Last Updated:** January 2026  
**Status:** 📝 Design Phase
