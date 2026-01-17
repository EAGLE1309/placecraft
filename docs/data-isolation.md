# 🔒 Data Isolation Strategy

> **Feature:** Multi-Tenant Data Isolation  
> **Version:** 2.0  
> **Last Updated:** January 2026

---

## 📋 Table of Contents

1. [Isolation Principles](#-isolation-principles)
2. [Isolation Layers](#-isolation-layers)
3. [Query Patterns](#-query-patterns)
4. [Security Enforcement](#-security-enforcement)
5. [Testing & Validation](#-testing--validation)

---

## 🎯 Isolation Principles

### Core Principle

**Every piece of data belongs to exactly one tenant, and users can only access data within their tenant scope.**

### Tenant Hierarchy

```
System
├── Global Tenant (tenantId: "global")
│   ├── Global Students
│   ├── Global Recruiters
│   └── Global Drives
│
├── College A (tenantId: "college_abc123")
│   ├── College A Students
│   ├── College A Recruiters
│   └── College A Drives
│
└── College B (tenantId: "college_xyz789")
    ├── College B Students
    ├── College B Recruiters
    └── College B Drives
```

### Isolation Guarantees

1. **No Cross-Tenant Queries:** Students from College A cannot query College B's data
2. **No Cross-Tenant Visibility:** Drives from College A are invisible to College B students
3. **No Cross-Tenant Applications:** Students can only apply to drives in their tenant
4. **Admin Scope Enforcement:** College admins can only manage their college's data

---

## 🏗️ Isolation Layers

### Layer 1: Database Schema

**Every document has a `tenantId` field**

```typescript
interface TenantAwareDocument {
  tenantId: string;  // "college_abc123" or "global"
  tenantType: "college" | "global";
  // ... other fields
}
```

**Benefits:**
- Simple to understand and implement
- Easy to query and filter
- Supports indexing for performance

---

### Layer 2: Firestore Security Rules

**Rule-based enforcement at database level**

```javascript
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
  return request.auth.token.tenantId == tenantId;
}

match /students/{studentId} {
  allow read: if hasAccessToTenant(resource.data.tenantId);
  allow write: if hasAccessToTenant(resource.data.tenantId);
}
```

**Benefits:**
- Enforced at database level (cannot be bypassed)
- Works even if application code has bugs
- Provides defense in depth

---

### Layer 3: Application Code

**All queries must include tenantId filter**

```typescript
// ❌ WRONG: Query without tenant filter
const students = await getDocs(collection(db, "students"));

// ✅ CORRECT: Query with tenant filter
const students = await getDocs(
  query(
    collection(db, "students"),
    where("tenantId", "==", userTenantId)
  )
);
```

**Benefits:**
- Explicit and visible in code
- Easy to audit and review
- Prevents accidental cross-tenant access

---

### Layer 4: API Routes

**Middleware validates tenant access**

```typescript
export async function middleware(request: NextRequest) {
  const user = await getAuthUser(request);
  const tenantContext = await resolveTenantContext(user);
  
  // Add tenant context to request headers
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenantContext.tenantId || '');
  response.headers.set('x-user-role', tenantContext.role || '');
  
  return response;
}

// In API route
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');
  
  // Validate tenant access
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Query with tenant filter
  const data = await getData(tenantId);
  return NextResponse.json({ data });
}
```

**Benefits:**
- Centralized validation
- Consistent across all API routes
- Easy to test and monitor

---

## 🔍 Query Patterns

### Pattern 1: Student Queries (Scoped to Tenant)

```typescript
// Get all students in a college
async function getCollegeStudents(collegeId: string) {
  const studentsRef = collection(db, "students");
  const q = query(
    studentsRef,
    where("tenantId", "==", collegeId),
    orderBy("createdAt", "desc")
  );
  return await getDocs(q);
}

// Get students by graduation year (tenant-scoped)
async function getStudentsByYear(tenantId: string, year: number) {
  const studentsRef = collection(db, "students");
  const q = query(
    studentsRef,
    where("tenantId", "==", tenantId),
    where("graduationYear", "==", year)
  );
  return await getDocs(q);
}
```

---

### Pattern 2: Drive Queries (Scoped to Tenant)

```typescript
// Get active drives for a tenant
async function getActiveDrives(tenantId: string) {
  const drivesRef = collection(db, "drives");
  const q = query(
    drivesRef,
    where("tenantId", "==", tenantId),
    where("status", "==", "active"),
    orderBy("createdAt", "desc")
  );
  return await getDocs(q);
}

// Get drives by company (tenant-scoped)
async function getDrivesByCompany(tenantId: string, company: string) {
  const drivesRef = collection(db, "drives");
  const q = query(
    drivesRef,
    where("tenantId", "==", tenantId),
    where("company", "==", company)
  );
  return await getDocs(q);
}
```

---

### Pattern 3: Application Queries (Scoped to Tenant)

```typescript
// Get applications for a drive (tenant-scoped)
async function getDriveApplications(driveId: string, tenantId: string) {
  const applicationsRef = collection(db, "applications");
  const q = query(
    applicationsRef,
    where("tenantId", "==", tenantId),
    where("driveId", "==", driveId)
  );
  return await getDocs(q);
}

// Get student's applications (tenant-scoped)
async function getStudentApplications(studentId: string, tenantId: string) {
  const applicationsRef = collection(db, "applications");
  const q = query(
    applicationsRef,
    where("tenantId", "==", tenantId),
    where("studentId", "==", studentId),
    orderBy("createdAt", "desc")
  );
  return await getDocs(q);
}
```

---

### Pattern 4: Global Admin Queries (Cross-Tenant)

```typescript
// Global admins can query across tenants
async function getAllStudentsForAdmin(
  userRole: string,
  userTenantId: string
) {
  const studentsRef = collection(db, "students");
  
  if (userRole === "global_admin") {
    // No tenant filter for global admins
    return await getDocs(query(studentsRef, orderBy("createdAt", "desc")));
  } else if (userRole === "college_admin") {
    // Scoped to college for college admins
    return await getDocs(
      query(
        studentsRef,
        where("tenantId", "==", userTenantId),
        orderBy("createdAt", "desc")
      )
    );
  } else {
    throw new Error("Unauthorized");
  }
}
```

---

## 🔐 Security Enforcement

### Firestore Security Rules (Complete)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ==================== HELPER FUNCTIONS ====================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isGlobalAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/globalAdmins/$(request.auth.token.email)) &&
             get(/databases/$(database)/documents/globalAdmins/$(request.auth.token.email)).data.status == "active";
    }
    
    function isCollegeAdmin(collegeId) {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/colleges/$(collegeId)) &&
             get(/databases/$(database)/documents/colleges/$(collegeId)).data.adminEmails.hasAny([request.auth.token.email]) &&
             get(/databases/$(database)/documents/colleges/$(collegeId)).data.status == "active";
    }
    
    function hasAccessToTenant(tenantId) {
      // Global admins can access any tenant
      if (isGlobalAdmin()) {
        return true;
      }
      
      // College admins can access their college
      if (tenantId != "global" && isCollegeAdmin(tenantId)) {
        return true;
      }
      
      // Users can access their own tenant
      return isAuthenticated() && request.auth.token.tenantId == tenantId;
    }
    
    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }
    
    // ==================== COLLEGES ====================
    
    match /colleges/{collegeId} {
      // Anyone authenticated can read colleges (for onboarding)
      allow read: if isAuthenticated();
      
      // Only global admins can create/update/delete colleges
      allow create, update, delete: if isGlobalAdmin();
    }
    
    // ==================== GLOBAL ADMINS ====================
    
    match /globalAdmins/{adminId} {
      // Only global admins can read/write
      allow read, write: if isGlobalAdmin();
    }
    
    // ==================== STUDENTS ====================
    
    match /students/{studentId} {
      // Read: Must have access to tenant
      allow read: if hasAccessToTenant(resource.data.tenantId);
      
      // Create: Must be authenticated, own the profile, and set valid tenantId
      allow create: if isAuthenticated() && 
                       request.resource.data.uid == request.auth.uid &&
                       request.resource.data.tenantId != null &&
                       request.resource.data.tenantType != null;
      
      // Update: Must have access to tenant AND be the owner
      allow update: if hasAccessToTenant(resource.data.tenantId) &&
                       isOwner(resource.data.uid) &&
                       // Prevent changing tenantId after creation
                       request.resource.data.tenantId == resource.data.tenantId;
      
      // Delete: Only admins
      allow delete: if isGlobalAdmin() || 
                       (resource.data.tenantId != "global" && isCollegeAdmin(resource.data.tenantId));
    }
    
    // ==================== RECRUITERS ====================
    
    match /recruiters/{recruiterId} {
      // Read: Must have access to tenant
      allow read: if hasAccessToTenant(resource.data.tenantId);
      
      // Create: Must be authenticated and own the profile
      allow create: if isAuthenticated() && 
                       request.resource.data.uid == request.auth.uid &&
                       request.resource.data.tenantId != null;
      
      // Update: Admins or owner (for profile updates)
      allow update: if hasAccessToTenant(resource.data.tenantId) &&
                       (isOwner(resource.data.uid) || 
                        isGlobalAdmin() || 
                        (resource.data.tenantId != "global" && isCollegeAdmin(resource.data.tenantId)));
      
      // Delete: Only admins
      allow delete: if isGlobalAdmin() || 
                       (resource.data.tenantId != "global" && isCollegeAdmin(resource.data.tenantId));
    }
    
    // ==================== DRIVES ====================
    
    match /drives/{driveId} {
      // Read: Must have access to tenant
      allow read: if hasAccessToTenant(resource.data.tenantId);
      
      // Create: Must have access to tenant (admins or verified recruiters)
      allow create: if hasAccessToTenant(request.resource.data.tenantId) &&
                       (isGlobalAdmin() || 
                        (request.resource.data.tenantId != "global" && isCollegeAdmin(request.resource.data.tenantId)) ||
                        (isAuthenticated() && request.resource.data.recruiterId == request.auth.uid));
      
      // Update/Delete: Admins or drive creator
      allow update, delete: if hasAccessToTenant(resource.data.tenantId) &&
                               (isGlobalAdmin() || 
                                (resource.data.tenantId != "global" && isCollegeAdmin(resource.data.tenantId)) ||
                                isOwner(resource.data.recruiterId));
    }
    
    // ==================== APPLICATIONS ====================
    
    match /applications/{applicationId} {
      // Read: Must have access to tenant
      allow read: if hasAccessToTenant(resource.data.tenantId);
      
      // Create: Must be authenticated student applying to drive in their tenant
      allow create: if isAuthenticated() && 
                       request.resource.data.studentId == request.auth.uid &&
                       request.resource.data.tenantId == request.auth.token.tenantId;
      
      // Update: Admins or recruiters (for status updates)
      allow update: if hasAccessToTenant(resource.data.tenantId);
      
      // Delete: Only global admins
      allow delete: if isGlobalAdmin();
    }
  }
}
```

---

## 🧪 Testing & Validation

### Test Scenarios

#### Scenario 1: Student Cannot See Other College's Data

```typescript
// Setup
const collegeAStudent = { uid: "student1", tenantId: "college_A" };
const collegeBDrive = { id: "drive1", tenantId: "college_B" };

// Test
const result = await getDriveById("drive1", collegeAStudent.tenantId);

// Expected: null or error (drive not visible)
expect(result).toBeNull();
```

---

#### Scenario 2: College Admin Cannot Access Other College

```typescript
// Setup
const collegeAAdmin = { email: "admin@collegeA.edu", tenantId: "college_A" };
const collegeBStudents = await getStudents("college_B");

// Test
const hasAccess = await hasAccessToTenant(collegeAAdmin, "college_B");

// Expected: false
expect(hasAccess).toBe(false);
expect(collegeBStudents).toHaveLength(0);
```

---

#### Scenario 3: Global Admin Can Access All Tenants

```typescript
// Setup
const globalAdmin = { email: "admin@placecraft.com", role: "global_admin" };

// Test
const collegeAData = await getStudents("college_A");
const collegeBData = await getStudents("college_B");
const globalData = await getStudents("global");

// Expected: All queries succeed
expect(collegeAData).toBeDefined();
expect(collegeBData).toBeDefined();
expect(globalData).toBeDefined();
```

---

#### Scenario 4: Student Cannot Change Tenant

```typescript
// Setup
const student = { id: "student1", tenantId: "college_A" };

// Test: Try to update tenantId
try {
  await updateStudent(student.id, { tenantId: "college_B" });
  fail("Should not allow tenant change");
} catch (error) {
  // Expected: Firestore security rule blocks this
  expect(error.code).toBe("permission-denied");
}
```

---

### Automated Tests

**File:** `tests/data-isolation.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { setupTestEnvironment } from "./test-utils";

describe("Data Isolation", () => {
  it("prevents cross-tenant student queries", async () => {
    const { db, auth } = await setupTestEnvironment();
    
    // Create students in different tenants
    await createStudent(db, { tenantId: "college_A", name: "Student A" });
    await createStudent(db, { tenantId: "college_B", name: "Student B" });
    
    // Login as College A student
    await auth.signIn("student@collegeA.edu");
    
    // Query students - should only see College A
    const students = await getStudents("college_A");
    
    expect(students).toHaveLength(1);
    expect(students[0].name).toBe("Student A");
  });
  
  it("prevents cross-tenant drive applications", async () => {
    const { db, auth } = await setupTestEnvironment();
    
    // Create drive in College A
    const drive = await createDrive(db, { 
      tenantId: "college_A", 
      company: "TechCorp" 
    });
    
    // Login as College B student
    await auth.signIn("student@collegeB.edu");
    
    // Try to apply - should fail
    await expect(
      applyToDrive(drive.id, "student_B")
    ).rejects.toThrow("permission-denied");
  });
  
  it("allows global admin to access all tenants", async () => {
    const { db, auth } = await setupTestEnvironment();
    
    // Create data in multiple tenants
    await createStudent(db, { tenantId: "college_A" });
    await createStudent(db, { tenantId: "college_B" });
    await createStudent(db, { tenantId: "global" });
    
    // Login as global admin
    await auth.signIn("admin@placecraft.com");
    
    // Query all tenants
    const collegeA = await getStudents("college_A");
    const collegeB = await getStudents("college_B");
    const global = await getStudents("global");
    
    expect(collegeA).toHaveLength(1);
    expect(collegeB).toHaveLength(1);
    expect(global).toHaveLength(1);
  });
});
```

---

### Manual Testing Checklist

- [ ] College A student cannot see College B drives
- [ ] College A student cannot apply to College B drives
- [ ] College A admin cannot see College B students
- [ ] College A admin cannot edit College B drives
- [ ] Global students cannot see college drives
- [ ] College students cannot see global drives
- [ ] Student cannot change their tenantId after creation
- [ ] Global admin can access all colleges
- [ ] Global admin can create new colleges
- [ ] Firestore security rules block unauthorized access

---

### Monitoring & Alerts

**Set up alerts for:**

1. **Cross-Tenant Access Attempts**
   - Log all denied Firestore operations
   - Alert if pattern detected

2. **Queries Without Tenant Filter**
   - Monitor slow queries
   - Check for missing `where("tenantId", ...)` clauses

3. **Security Rule Violations**
   - Track `permission-denied` errors
   - Investigate suspicious patterns

4. **Tenant Context Mismatches**
   - Log when user's tenantId doesn't match queried tenantId
   - Alert on repeated mismatches

---

## 📊 Performance Considerations

### Index Strategy

All tenant-scoped queries require composite indexes:

```json
{
  "collectionGroup": "students",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "graduationYear", "order": "ASCENDING" }
  ]
}
```

### Query Optimization

- Always include `tenantId` as first filter
- Use composite indexes for common query patterns
- Limit result sets with pagination
- Cache tenant metadata in memory

---

## 🔒 Security Best Practices

1. **Never Trust Client Input**
   - Always validate tenantId server-side
   - Don't rely on client-provided tenant context

2. **Defense in Depth**
   - Enforce isolation at multiple layers
   - Firestore rules + application code + API middleware

3. **Audit Logging**
   - Log all admin actions
   - Track cross-tenant access attempts
   - Monitor for anomalies

4. **Regular Security Audits**
   - Review Firestore security rules
   - Test isolation with penetration testing
   - Update rules as features evolve

---

**Document Version:** 2.0  
**Last Updated:** January 2026  
**Status:** 📝 Design Phase
