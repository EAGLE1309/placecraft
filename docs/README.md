# 📚 Multi-Tenant System Documentation

> **Placecraft Multi-Tenant Architecture**  
> **Version:** 2.0  
> **Last Updated:** January 2026

---

## 📖 Overview

This documentation suite describes the implementation of a **multi-tenant architecture** for Placecraft, enabling the platform to serve both individual colleges and a global audience while maintaining complete data isolation.

---

## 🎯 Key Features

### Two-Tier Admin System
- **Global Admin:** Manages the entire platform, creates colleges, assigns college admins
- **College Admin:** Manages their specific college (students, drives, recruiters)

### Data Isolation
- College students see only college-specific data
- Global students see only public/global data
- Complete separation between tenants
- No cross-tenant data leakage

### Same Application, Different Contexts
- Identical UI and features across all tenants
- Context-aware data filtering
- Seamless user experience

---

## 📄 Documentation Files

### 1. [Multi-Tenant Architecture](./multi-tenant-architecture.md)
**Purpose:** High-level architecture overview and design decisions

**Contents:**
- User roles and hierarchy
- Architecture changes from single to multi-tenant
- Data isolation strategy overview
- Implementation roadmap (7 phases)
- Success metrics and critical considerations

**Read this first** to understand the overall system design.

---

### 2. [Database Schema](./database-schema.md)
**Purpose:** Detailed database structure and schema changes

**Contents:**
- New collections: `colleges`, `globalAdmins`
- Modified collections: `students`, `recruiters`, `drives`, `applications`
- Field definitions and validation rules
- Firestore indexes (composite indexes for tenant-scoped queries)
- Migration strategy from single to multi-tenant
- Query patterns and examples

**Read this** when implementing database changes or writing queries.

---

### 3. [Authentication Flow](./authentication-flow.md)
**Purpose:** Complete authentication and authorization system

**Contents:**
- Login flows for all user types (global admin, college admin, student, recruiter)
- Tenant resolution logic
- Role-based access control (RBAC)
- Middleware implementation
- Code examples for auth layer
- Testing scenarios

**Read this** when implementing authentication or authorization features.

---

### 4. [Data Isolation Strategy](./data-isolation.md)
**Purpose:** Security and data isolation implementation

**Contents:**
- Isolation principles and guarantees
- Four-layer isolation strategy
- Complete Firestore security rules
- Query patterns for tenant-scoped data
- Testing scenarios and validation
- Performance considerations

**Read this** when implementing data access or security features.

---

### 5. [Implementation Guide](./implementation-guide.md)
**Purpose:** Step-by-step implementation instructions

**Contents:**
- 6 implementation phases with detailed tasks
- Database setup scripts
- Migration scripts
- Code examples for each phase
- Testing checklist
- Deployment and rollback procedures

**Read this** when ready to implement the multi-tenant system.

---

## 🚀 Quick Start

### For Developers

1. **Understand the Architecture**
   - Read [`multi-tenant-architecture.md`](./multi-tenant-architecture.md)
   - Review the user role hierarchy
   - Understand tenant isolation principles

2. **Review Database Changes**
   - Read [`database-schema.md`](./database-schema.md)
   - Understand new collections and fields
   - Review required indexes

3. **Implement Authentication**
   - Follow [`authentication-flow.md`](./authentication-flow.md)
   - Implement tenant resolution
   - Update auth hooks and middleware

4. **Ensure Data Isolation**
   - Study [`data-isolation.md`](./data-isolation.md)
   - Implement Firestore security rules
   - Add tenant filters to all queries

5. **Follow Implementation Guide**
   - Execute [`implementation-guide.md`](./implementation-guide.md) phase by phase
   - Run migration scripts
   - Test thoroughly

---

## 🏗️ Implementation Phases

### Phase 1: Database Setup (Week 1)
- Create new collections (`colleges`, `globalAdmins`)
- Add tenant fields to existing collections
- Deploy Firestore indexes
- Update security rules

### Phase 2: Authentication Layer (Week 2)
- Implement tenant resolution service
- Update authentication flow
- Add admin authorization
- Update auth hooks

### Phase 3: Global Admin Dashboard (Week 3)
- Build college management UI
- Create admin management interface
- Implement API routes
- Add analytics dashboard

### Phase 4: Tenant-Aware Data Layer (Week 4)
- Update all Firestore queries with tenant filters
- Modify create/update functions
- Add tenant validation
- Write unit tests

### Phase 5: UI Updates (Week 5)
- Create onboarding flow
- Add college selection
- Update navigation
- Implement branding support

### Phase 6: Testing & Migration (Week 6)
- Integration testing
- Data migration
- Security audit
- Performance testing

---

## 🔑 Key Concepts

### Tenant ID
Every data entity has a `tenantId` field:
- Format: `"college_{uuid}"` for colleges
- Format: `"global"` for global context

### Tenant Types
- **College:** Data belongs to a specific college
- **Global:** Data belongs to the public/global context

### User Roles
- **Global Admin:** System-wide access, manages colleges
- **College Admin:** College-scoped access, manages college data
- **Student:** Access to own tenant's data only
- **Recruiter:** Access to own tenant's data only

---

## 🔒 Security Principles

### Defense in Depth
1. **Firestore Security Rules:** Database-level enforcement
2. **Application Code:** Explicit tenant filtering in queries
3. **API Middleware:** Request-level validation
4. **Session Tokens:** Tenant context in user tokens

### Data Isolation Guarantees
- ✅ No cross-tenant queries
- ✅ No cross-tenant visibility
- ✅ No cross-tenant applications
- ✅ Admin scope enforcement
- ✅ Immutable tenant assignment

---

## 📊 Database Collections

### New Collections
- **`colleges`** - College/institution definitions
- **`globalAdmins`** - Global admin email whitelist

### Modified Collections
All existing collections get these new fields:
- `tenantId: string` - Tenant identifier
- `tenantType: "college" | "global"` - Tenant type
- `collegeId?: string` - College reference (if applicable)
- `collegeName?: string` - Denormalized college name

---

## 🧪 Testing Strategy

### Unit Tests
- Tenant resolution logic
- Authorization checks
- Query filtering

### Integration Tests
- Cross-tenant access prevention
- Admin permission enforcement
- Data isolation validation

### Manual Tests
- User flows for each role
- Onboarding experience
- Admin dashboards
- Security rule validation

---

## 📈 Success Metrics

### Technical
- **Data Isolation:** 100% - No cross-tenant leaks
- **Query Performance:** < 500ms for tenant-scoped queries
- **Authentication:** < 2s for tenant resolution

### Business
- **College Onboarding:** < 5 minutes per college
- **Admin Management:** < 1 minute to add/remove admin
- **User Experience:** No performance degradation

---

## 🚨 Critical Warnings

### DO NOT
- ❌ Query without `tenantId` filter (except for global admins)
- ❌ Allow users to change their `tenantId` after creation
- ❌ Trust client-provided tenant context
- ❌ Skip Firestore security rules deployment
- ❌ Deploy without testing data isolation

### ALWAYS
- ✅ Include `tenantId` in all queries
- ✅ Validate tenant access in API routes
- ✅ Test security rules thoroughly
- ✅ Audit cross-tenant access attempts
- ✅ Back up data before migration

---

## 🔄 Migration Checklist

- [ ] Back up current database
- [ ] Create `colleges` and `globalAdmins` collections
- [ ] Run migration script to add `tenantId` to existing data
- [ ] Deploy Firestore indexes
- [ ] Deploy updated security rules
- [ ] Test authentication flows
- [ ] Verify data isolation
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 📞 Support & Resources

### Documentation
- [PRD.md](../PRD.md) - Product requirements
- [architecture-diagram.md](../architecture-diagram.md) - Technical architecture
- [README.md](../README.md) - Setup guide

### Code References
- `src/lib/firebase/tenant.ts` - Tenant resolution
- `src/lib/firebase/colleges.ts` - College management
- `src/hooks/use-auth.ts` - Authentication hook
- `firestore.rules` - Security rules

---

## 🎯 Next Steps

1. **Read all documentation** in order
2. **Set up development environment**
3. **Create backup** of current system
4. **Follow implementation guide** phase by phase
5. **Test thoroughly** at each phase
6. **Deploy to production** with monitoring

---

## 📝 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| Multi-Tenant Architecture | ✅ Complete | Jan 2026 |
| Database Schema | ✅ Complete | Jan 2026 |
| Authentication Flow | ✅ Complete | Jan 2026 |
| Data Isolation | ✅ Complete | Jan 2026 |
| Implementation Guide | ✅ Complete | Jan 2026 |

---

**Version:** 2.0  
**Status:** 📝 Design Phase - Ready for Implementation  
**Last Updated:** January 2026

---

## 💡 Quick Reference

### Common Tasks

**Check if user is global admin:**
```typescript
const isGlobalAdmin = await isGlobalAdmin(user.email);
```

**Get college for admin:**
```typescript
const college = await getCollegeForAdmin(user.email);
```

**Query students in a tenant:**
```typescript
const students = await getDocs(
  query(
    collection(db, "students"),
    where("tenantId", "==", tenantId)
  )
);
```

**Create college:**
```typescript
const college = await createCollege({
  name: "MIT College",
  code: "MIT-COE",
  adminEmails: ["admin@mit.edu"],
  // ... other fields
}, globalAdminUid);
```

---

**For questions or clarifications, refer to the specific documentation file or review the implementation guide.**
