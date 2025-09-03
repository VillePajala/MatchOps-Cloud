# MatchOps Cloud – AI-Ready Feature Implementation System

## 🤖 **For AI Implementers: Start Here**

This system is designed for AI agents to implement features incrementally with full verification and tracking. **Read this entire README before starting any implementation.**

## **🔍 Pre-Implementation Requirements**

### **Environment Setup Verification**
Before implementing ANY feature, verify your environment:

```bash
# 1. Check you're in the correct directory
pwd  # Should show: /home/villepajala/projects/MatchOps-Cloud

# 2. Verify Node.js and dependencies
node --version  # Should be v18+
npm --version   # Should be v8+
npm install     # Install/update dependencies

# 3. Check development server works
npm run dev     # Should start without errors
# Open http://localhost:3000 - should show MatchOps interface

# 4. Verify Supabase connection
# Check .env.local exists with SUPABASE credentials
cat .env.local | grep SUPABASE
```

### **Database Schema Discovery**
Before modifying database, understand current structure:

```bash
# Get current schema from Supabase dashboard
# Or use this query in Supabase SQL editor:
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;
```

### **Current Codebase Understanding**
**Critical Files to Review First:**

1. **Authentication**: `src/context/AuthContext.tsx`
2. **Database Types**: `src/types/index.ts` 
3. **Supabase Client**: `src/lib/supabase.ts`
4. **Storage System**: `src/lib/storage/supabaseProvider.ts`
5. **Main App**: `src/app/page.tsx` (StartScreen)
6. **Game Page**: `src/components/HomePage.tsx`

**Use these commands to explore:**
```bash
# Find all TypeScript files
find src -name "*.ts" -o -name "*.tsx" | head -30

# Find all components
find src/components -name "*.tsx" | head -20

# Find all hooks  
find src/hooks -name "*.ts" | head -15

# See current database tables referenced
grep -r "\.from(" src/lib/storage/ | head -10
```

## **📋 Implementation Methodology**

### **Step Size Philosophy**
Each implementation step follows this micro-task approach:
- **2-5 minutes**: Database changes, type additions
- **5-10 minutes**: Simple component modifications, basic hooks
- **10-15 minutes**: Complex logic, new components
- **15+ minutes**: Integration, testing, debugging

**If any step takes longer than estimated, STOP and break it down further.**

### **The VERIFY-IMPLEMENT-TEST Pattern**

**Every step follows this pattern:**
1. **PRE-CHECK**: Verify prerequisites are met
2. **IMPLEMENT**: Make the specific change
3. **IMMEDIATE VERIFY**: Check change works in isolation
4. **INTEGRATION TEST**: Verify no regressions in existing functionality
5. **DOCUMENT**: Update tracking with actual time spent and any issues

## **🔧 Feature Implementation Process**

### **Phase 0: Pre-Implementation**
Before starting any feature:

- [ ] **Environment Check**: All setup verification steps pass
- [ ] **Dependency Review**: Read linked feature dependencies  
- [ ] **Time Allocation**: Block sufficient time (check estimates in `_IMPLEMENTATION_STATUS.md`)
- [ ] **Backup Point**: Commit current state to git
- [ ] **Issue Tracking**: Create tracking document for this implementation session

### **Phase 1: Database Changes**
For any database modifications:

- [ ] **Schema Backup**: Export current schema
- [ ] **Test Database**: Use development/test database first
- [ ] **SQL Validation**: Test SQL statements in Supabase SQL editor
- [ ] **RLS Testing**: Verify Row Level Security works correctly
- [ ] **Rollback Plan**: Know how to undo changes if needed

### **Phase 2: Code Implementation**  
For each code change:

- [ ] **File Backup**: Know git state before changes
- [ ] **TypeScript Check**: `npx tsc --noEmit` passes
- [ ] **Component Isolation**: Test component in isolation first
- [ ] **Integration Check**: Verify existing functionality unbroken
- [ ] **Browser Testing**: Check in actual browser, not just compilation

### **Phase 3: Verification & Testing**
After implementation:

- [ ] **Unit Tests**: Write and run tests for new functionality
- [ ] **Integration Tests**: Verify feature works with existing system
- [ ] **Manual Testing**: Test user workflows in browser
- [ ] **Performance Check**: No significant performance regression
- [ ] **Error Handling**: Test failure scenarios

## **🚨 Error Handling & Recovery**

### **When Things Go Wrong**

#### **Database Errors**
```sql
-- Rollback pattern for failed table creation
DROP TABLE IF EXISTS table_name;
-- Then re-run creation script
```

#### **TypeScript Errors**
```bash
# Check what's broken
npx tsc --noEmit

# If types are missing, check imports:
grep -r "import.*from.*types" src/
```

#### **Runtime Errors**
```bash
# Check console in browser dev tools
# Look for specific error messages
# Verify environment variables loaded correctly
```

#### **Test Failures**
```bash
# Run specific test
npm test -- --testPathPattern="filename"

# Run in watch mode for debugging
npm test -- --watch
```

### **Rollback Procedures**

**For Database Changes:**
1. Connect to Supabase dashboard
2. Go to SQL editor
3. Run DROP statements for new tables
4. Use schema backup to restore previous state

**For Code Changes:**
```bash
# See what changed
git diff

# Rollback specific files
git checkout HEAD -- path/to/file

# Full rollback to last commit
git reset --hard HEAD
```

## **📊 Progress Tracking System**

### **Implementation Tracking**
For each feature implementation, maintain a log:

```markdown
## Feature: Smart Roster Detection
**Start Time**: 2024-01-15 10:00 AM
**Estimated Time**: 6 hours
**Actual Time**: [UPDATE AS YOU GO]

### Steps Completed:
- [x] Step 1.1: Database table creation (5 min actual vs 5 min estimated)
- [x] Step 1.2: Types added (3 min actual vs 5 min estimated)  
- [ ] Step 1.3: Hook creation (IN PROGRESS - 10 min spent so far)

### Issues Encountered:
- **Issue**: TypeScript error on UserState interface
- **Resolution**: Added missing import from types file
- **Time Lost**: 5 minutes

### Notes:
- Database creation faster than expected
- Type definitions needed slight modification from plan
```

### **Validation Checklist Template**
Each step requires these verifications:

```markdown
**Step X.Y Validation:**
- [ ] Code compiles (`npx tsc --noEmit`)
- [ ] No console errors in browser
- [ ] Target functionality works as described
- [ ] No existing functionality broken
- [ ] Performance acceptable (no obvious slowdowns)
- [ ] Tests pass (if applicable)
```

## **🎯 Success Criteria**

### **Step-Level Success**
A step is complete when:
- ✅ All validation checkboxes pass
- ✅ Actual implementation matches specification
- ✅ No regressions introduced
- ✅ Time logged and issues documented

### **Feature-Level Success**
A feature is complete when:
- ✅ All steps in all phases completed
- ✅ Integration tests pass
- ✅ Manual user testing successful
- ✅ Performance benchmarks met
- ✅ Documentation updated with actual implementation details

## **📁 Navigation Guide**

### **Where to Find What:**

| Need | Location |
|------|----------|
| **Feature Overview** | `_IMPLEMENTATION_STATUS.md` |
| **Specific Feature Plan** | `[feature-name].md` |
| **Current Codebase** | `src/` directory |
| **Database Schema** | Supabase Dashboard > Database |
| **Tests** | `src/__tests__/` and `src/**/*.test.ts` |
| **Types** | `src/types/index.ts` |
| **Components** | `src/components/` |
| **Hooks** | `src/hooks/` |
| **Utils** | `src/utils/` |

### **Recommended Implementation Order:**

1. **Start Here**: `smart-roster-detection.md` (foundation for others)
2. **Then**: `adaptive-start-screen.md` (builds on #1)
3. **Next**: `team-management.md` (major feature)
4. **Continue**: Other features per priority in `_IMPLEMENTATION_STATUS.md`

## **🆘 Getting Unstuck**

### **Common Issues & Solutions:**

**"TypeScript errors I can't resolve"**
- Check `src/types/index.ts` for missing exports
- Verify all imports are correct
- Run `npx tsc --noEmit` for detailed error info

**"Supabase queries not working"**
- Check `.env.local` has correct credentials
- Verify RLS policies allow your user access
- Test query directly in Supabase SQL editor

**"Tests failing after changes"**
- Run tests in isolation: `npm test -- --testPathPattern="specific-test"`
- Check if mocks need updating
- Verify test database is in expected state

**"Feature works but breaks existing functionality"**
- Check git diff to see what changed
- Test core user workflows manually
- Look for shared dependencies you might have modified

### **When to Pause Implementation:**

Stop and reassess if:
- Any step takes >2x the estimated time
- You encounter >3 TypeScript errors in a row
- Existing tests start failing
- You're unsure about the correct approach

## **🚀 Ready to Implement?**

### **Pre-Flight Checklist:**
- [ ] Read this entire README
- [ ] Environment setup verification completed
- [ ] Current codebase explored and understood
- [ ] Feature selected from `_IMPLEMENTATION_STATUS.md`
- [ ] Time allocated for full feature implementation
- [ ] Git state clean (committed or stashed changes)

### **First Implementation:**
**Recommended:** Start with `smart-roster-detection.md` as it's foundational for other features.

---

**Remember**: This system prioritizes correctness and maintainability over speed. Take time to verify each step thoroughly. The tracking overhead pays for itself by preventing bugs and rework.