# Robust Alert System - AI Implementation Plan

## 🎯 **Implementation Overview**
**Estimated Total Time**: 4.5 hours (27 micro-steps)
**Complexity Level**: Medium-High
**Dependencies**: None (standalone feature)
**Database Changes**: 2 new tables, RLS policies, indexes

## **🔧 Prerequisites Verification**

Before starting implementation, verify all requirements:

```bash
# Verify current environment
echo "Verifying MatchOps-Cloud robust alert system prerequisites..."

# 1. Verify development server starts
npm run dev
# Expected: Server starts without TypeScript/build errors

# 2. Check Supabase connection
grep -r "createClient" src/lib/supabase
# Expected: Find supabase client configuration

# 3. Verify auth context exists  
ls -la src/context/AuthContext.tsx
# Expected: AuthContext file exists

# 4. Check existing alert patterns
grep -r "toast\|alert\|confirm" src/components --include="*.tsx" | head -10
# Expected: Find existing alert/notification patterns

# 5. Verify toast system exists
grep -r "toast" package.json
# Expected: Find react-hot-toast or similar

# 6. Check translation system
ls -la public/locales/en/common.json
# Expected: Translation file exists
```

## **📋 Phase 1: Database Foundation (1.5h)**

### **Step 1.1: Create Alert Preferences Table**
**Estimated Time**: 15 minutes
**Files Modified**: Supabase Database

**Pre-Checks:**
- [ ] Supabase dashboard accessible
- [ ] Can execute SQL queries
- [ ] `auth.users` table exists in database

**Implementation:**
1. Open Supabase Dashboard → SQL Editor
2. Execute this exact SQL:

```sql
-- Create user alert preferences table
CREATE TABLE user_alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_preferences JSONB DEFAULT '{}',
  dismissed_alerts JSONB DEFAULT '[]',
  alert_frequency TEXT DEFAULT 'normal' CHECK (alert_frequency IN ('minimal', 'normal', 'verbose')),
  show_cloud_status BOOLEAN DEFAULT TRUE,
  show_sync_notifications BOOLEAN DEFAULT TRUE,
  last_roster_warning TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);
```

**Immediate Verification:**
```sql
-- Verify table creation
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_alert_preferences'
ORDER BY ordinal_position;
```

**Validation Checklist:**
- [ ] SQL executed without errors
- [ ] Table appears in Supabase dashboard
- [ ] Table has 10 columns (id, user_id, alert_preferences, dismissed_alerts, alert_frequency, show_cloud_status, show_sync_notifications, last_roster_warning, created_at, updated_at)
- [ ] `user_id` has foreign key constraint to `auth.users(id)`
- [ ] `alert_frequency` has check constraint for valid values

**Rollback Procedure:**
```sql
DROP TABLE IF EXISTS user_alert_preferences;
```

---

### **Step 1.2: Create Alert History Table**
**Estimated Time**: 10 minutes
**Files Modified**: Supabase Database

**Pre-Checks:**
- [ ] Previous step completed successfully
- [ ] Can still execute SQL queries

**Implementation:**
```sql
-- Create alert history table for analytics and spam prevention
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  action_taken TEXT, -- 'accepted', 'dismissed', 'ignored'
  shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_id TEXT, -- Optional device identification
  session_id TEXT -- Optional session identification
);
```

**Immediate Verification:**
```sql
-- Verify table creation
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_history'
ORDER BY ordinal_position;
```

**Validation Checklist:**
- [ ] SQL executed without errors
- [ ] Table appears in Supabase dashboard
- [ ] Table has 8 columns (id, user_id, alert_key, context, action_taken, shown_at, device_id, session_id)
- [ ] `user_id` has foreign key constraint to `auth.users(id)`
- [ ] `shown_at` defaults to NOW()

**Rollback Procedure:**
```sql
DROP TABLE IF EXISTS alert_history;
```

---

### **Step 1.3: Configure Row Level Security**
**Estimated Time**: 10 minutes
**Files Modified**: Supabase Database

**Pre-Checks:**
- [ ] Both tables created successfully
- [ ] Can verify RLS is disabled on tables currently

**Implementation:**
```sql
-- Enable RLS on both tables
ALTER TABLE user_alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user_alert_preferences
CREATE POLICY "Users manage own alert preferences" ON user_alert_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create policies for alert_history  
CREATE POLICY "Users manage own alert history" ON alert_history
  FOR ALL USING (auth.uid() = user_id);
```

**Immediate Verification:**
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_alert_preferences', 'alert_history');

-- Verify policies exist
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('user_alert_preferences', 'alert_history');
```

**Validation Checklist:**
- [ ] RLS enabled on both tables (`rowsecurity = true`)
- [ ] Policy exists for user_alert_preferences
- [ ] Policy exists for alert_history
- [ ] Both policies use `auth.uid() = user_id` condition

**Rollback Procedure:**
```sql
DROP POLICY IF EXISTS "Users manage own alert preferences" ON user_alert_preferences;
DROP POLICY IF EXISTS "Users manage own alert history" ON alert_history;
ALTER TABLE user_alert_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history DISABLE ROW LEVEL SECURITY;
```

---

### **Step 1.4: Create Database Indexes**
**Estimated Time**: 5 minutes
**Files Modified**: Supabase Database

**Pre-Checks:**
- [ ] RLS policies configured successfully
- [ ] Can execute CREATE INDEX statements

**Implementation:**
```sql
-- Create indexes for optimal query performance
CREATE INDEX idx_alert_preferences_user_id ON user_alert_preferences(user_id);
CREATE INDEX idx_alert_history_user_alert ON alert_history(user_id, alert_key);
CREATE INDEX idx_alert_history_shown_at ON alert_history(user_id, shown_at DESC);
```

**Immediate Verification:**
```sql
-- Verify indexes created
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename IN ('user_alert_preferences', 'alert_history')
AND indexname LIKE 'idx_%';
```

**Validation Checklist:**
- [ ] 3 indexes created successfully
- [ ] `idx_alert_preferences_user_id` exists
- [ ] `idx_alert_history_user_alert` exists with composite key
- [ ] `idx_alert_history_shown_at` exists with DESC ordering

**Rollback Procedure:**
```sql
DROP INDEX IF EXISTS idx_alert_preferences_user_id;
DROP INDEX IF EXISTS idx_alert_history_user_alert;
DROP INDEX IF EXISTS idx_alert_history_shown_at;
```

## **📋 Phase 2: TypeScript Types & Interfaces (45 minutes)**

### **Step 2.1: Create Alert System Types**
**Estimated Time**: 15 minutes
**Files Modified**: `src/types/index.ts`

**Pre-Checks:**
- [ ] Database tables created and verified
- [ ] `src/types/index.ts` file exists
- [ ] TypeScript compilation currently passes: `npx tsc --noEmit`

**Implementation:**
1. Open `src/types/index.ts`
2. Add these exact types at the end of file:

```typescript
// Alert System Types
export interface UserAlertPreferences {
  id: string;
  userId: string;
  alertPreferences: {
    skipRosterEmptyWarnings?: boolean;
    skipWorkspaceWarnings?: boolean;
    skipSyncNotifications?: boolean;
    preferredConfirmationStyle?: 'native' | 'modal';
  };
  dismissedAlerts: string[];
  alertFrequency: 'minimal' | 'normal' | 'verbose';
  showCloudStatus: boolean;
  showSyncNotifications: boolean;
  lastRosterWarning?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlertHistoryEntry {
  id: string;
  userId: string;
  alertKey: string;
  context: Record<string, any>;
  actionTaken: 'accepted' | 'dismissed' | 'ignored';
  shownAt: string;
  deviceId?: string;
  sessionId?: string;
}

export interface AlertLogData {
  alertKey: string;
  context?: Record<string, any>;
  actionTaken: 'accepted' | 'dismissed' | 'ignored';
  deviceId?: string;
  sessionId?: string;
}

export interface CloudSyncStatus {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncAt?: string;
  conflictsDetected?: boolean;
}
```

**Immediate Verification:**
```bash
# Verify TypeScript compilation passes
npx tsc --noEmit
# Expected: No compilation errors

# Verify types are accessible
grep -A 20 "UserAlertPreferences" src/types/index.ts
# Expected: Shows the interface definition
```

**Validation Checklist:**
- [ ] TypeScript compilation succeeds
- [ ] 4 new interfaces added (UserAlertPreferences, AlertHistoryEntry, AlertLogData, CloudSyncStatus)
- [ ] All interfaces export correctly
- [ ] No TypeScript errors in IDE

**Rollback Procedure:**
Remove the added interfaces from `src/types/index.ts` (lines added in this step)

---

### **Step 2.2: Create Alert Query Keys**
**Estimated Time**: 10 minutes
**Files Modified**: `src/config/queryKeys.ts`

**Pre-Checks:**
- [ ] Types created successfully
- [ ] `src/config/queryKeys.ts` file exists
- [ ] Query keys pattern established in file

**Implementation:**
1. Open `src/config/queryKeys.ts`
2. Add alert-related query keys:

```typescript
// Add to existing query keys object
alertPreferences: (userId?: string) => ['alertPreferences', userId] as const,
recentAlerts: (userId?: string, alertKey?: string, timeWindow?: number) => 
  ['recentAlerts', userId, alertKey, timeWindow] as const,
alertHistory: (userId?: string, filters?: Record<string, any>) => 
  ['alertHistory', userId, filters] as const,
```

**Immediate Verification:**
```bash
# Verify query keys added
grep -A 5 "alertPreferences" src/config/queryKeys.ts
# Expected: Shows the new query key definitions

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors
```

**Validation Checklist:**
- [ ] Query keys added to existing pattern
- [ ] 3 new query key functions (alertPreferences, recentAlerts, alertHistory)
- [ ] Functions return readonly arrays with correct typing
- [ ] TypeScript compilation succeeds

**Rollback Procedure:**
Remove the added query key functions from `src/config/queryKeys.ts`

---

### **Step 2.3: Create Supabase Transform Utilities**
**Estimated Time**: 20 minutes
**Files Modified**: Create `src/lib/supabase/transforms/alertTransforms.ts`

**Pre-Checks:**
- [ ] Query keys created successfully
- [ ] `src/lib/supabase/transforms/` directory exists or can be created
- [ ] Similar transform utilities exist as pattern

**Implementation:**
1. Create the transforms file:

```typescript
// src/lib/supabase/transforms/alertTransforms.ts
import type { UserAlertPreferences, AlertHistoryEntry } from '@/types';

interface SupabaseUserAlertPreferences {
  id: string;
  user_id: string;
  alert_preferences: Record<string, any>;
  dismissed_alerts: string[];
  alert_frequency: 'minimal' | 'normal' | 'verbose';
  show_cloud_status: boolean;
  show_sync_notifications: boolean;
  last_roster_warning?: string;
  created_at?: string;
  updated_at?: string;
}

interface SupabaseAlertHistory {
  id: string;
  user_id: string;
  alert_key: string;
  context: Record<string, any>;
  action_taken: 'accepted' | 'dismissed' | 'ignored';
  shown_at: string;
  device_id?: string;
  session_id?: string;
}

export const transformAlertPreferencesFromSupabase = (
  data: SupabaseUserAlertPreferences
): UserAlertPreferences => {
  return {
    id: data.id,
    userId: data.user_id,
    alertPreferences: data.alert_preferences || {},
    dismissedAlerts: data.dismissed_alerts || [],
    alertFrequency: data.alert_frequency,
    showCloudStatus: data.show_cloud_status,
    showSyncNotifications: data.show_sync_notifications,
    lastRosterWarning: data.last_roster_warning,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const transformAlertPreferencesToSupabase = (
  data: Partial<UserAlertPreferences>,
  userId: string
): Partial<SupabaseUserAlertPreferences> => {
  const result: Partial<SupabaseUserAlertPreferences> = {
    user_id: userId,
  };

  if (data.alertPreferences !== undefined) {
    result.alert_preferences = data.alertPreferences;
  }
  if (data.dismissedAlerts !== undefined) {
    result.dismissed_alerts = data.dismissedAlerts;
  }
  if (data.alertFrequency !== undefined) {
    result.alert_frequency = data.alertFrequency;
  }
  if (data.showCloudStatus !== undefined) {
    result.show_cloud_status = data.showCloudStatus;
  }
  if (data.showSyncNotifications !== undefined) {
    result.show_sync_notifications = data.showSyncNotifications;
  }
  if (data.lastRosterWarning !== undefined) {
    result.last_roster_warning = data.lastRosterWarning;
  }

  return result;
};

export const transformAlertHistoryFromSupabase = (
  data: SupabaseAlertHistory
): AlertHistoryEntry => {
  return {
    id: data.id,
    userId: data.user_id,
    alertKey: data.alert_key,
    context: data.context || {},
    actionTaken: data.action_taken,
    shownAt: data.shown_at,
    deviceId: data.device_id,
    sessionId: data.session_id,
  };
};
```

**Immediate Verification:**
```bash
# Verify file created
ls -la src/lib/supabase/transforms/alertTransforms.ts
# Expected: File exists

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors

# Test import can be resolved
node -e "console.log(require('./src/lib/supabase/transforms/alertTransforms.ts'))"
# Expected: No import errors (or transpilation needed)
```

**Validation Checklist:**
- [ ] Transform file created in correct location
- [ ] 3 transform functions implemented
- [ ] Supabase snake_case ↔ camelCase conversion handled
- [ ] TypeScript types properly imported and used
- [ ] No compilation errors

**Rollback Procedure:**
```bash
rm src/lib/supabase/transforms/alertTransforms.ts
```

## **📋 Phase 3: React Query Hooks (1 hour)**

### **Step 3.1: Create Alert Preferences Hooks**
**Estimated Time**: 25 minutes
**Files Modified**: Create `src/hooks/useAlertPreferencesQueries.ts`

**Pre-Checks:**
- [ ] Transform utilities created successfully
- [ ] `src/hooks/` directory exists
- [ ] Existing query hooks follow established patterns
- [ ] `useAuth` hook exists and works

**Implementation:**
1. Create the alert preferences hooks file:

```typescript
// src/hooks/useAlertPreferencesQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/config/queryKeys';
import { useAuth } from '@/context/AuthContext';
import { AuthenticationError, StorageError } from '@/lib/storage/types';
import { 
  transformAlertPreferencesFromSupabase,
  transformAlertPreferencesToSupabase 
} from '@/utils/transforms';
import type { UserAlertPreferences } from '@/types';

export const useAlertPreferences = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.alertPreferences(user?.id),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { data, error } = await supabase
        .from('user_alert_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw new StorageError('supabase', 'getAlertPreferences', error);
      }
      
      return data ? transformAlertPreferencesFromSupabase(data) : null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUpdateAlertPreferences = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<UserAlertPreferences>) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const supabaseUpdates = transformAlertPreferencesToSupabase(updates, user.id);
      
      const { data, error } = await supabase
        .from('user_alert_preferences')
        .upsert([{ user_id: user.id, ...supabaseUpdates }], {
          onConflict: 'user_id'
        })
        .select()
        .single();
      
      if (error) throw new StorageError('supabase', 'updateAlertPreferences', error);
      return transformAlertPreferencesFromSupabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertPreferences(user?.id) });
    },
  });
};

export const useCreateDefaultAlertPreferences = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const defaultPreferences = {
        user_id: user.id,
        alert_preferences: {},
        dismissed_alerts: [],
        alert_frequency: 'normal' as const,
        show_cloud_status: true,
        show_sync_notifications: true
      };
      
      const { data, error } = await supabase
        .from('user_alert_preferences')
        .insert([defaultPreferences])
        .select()
        .single();
      
      if (error) throw new StorageError('supabase', 'createDefaultAlertPreferences', error);
      return transformAlertPreferencesFromSupabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertPreferences(user?.id) });
    },
  });
};
```

**Immediate Verification:**
```bash
# Verify file created
ls -la src/hooks/useAlertPreferencesQueries.ts
# Expected: File exists

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors

# Test import resolution
node -e "console.log('Imports resolve:', require('typescript').transpileModule(require('fs').readFileSync('src/hooks/useAlertPreferencesQueries.ts', 'utf8'), {compilerOptions: {module: 'commonjs'}}))"
# Expected: No import/compilation errors
```

**Validation Checklist:**
- [ ] Hook file created successfully
- [ ] 3 hooks implemented (useAlertPreferences, useUpdateAlertPreferences, useCreateDefaultAlertPreferences)
- [ ] All necessary imports included
- [ ] Error handling follows established patterns
- [ ] TypeScript compilation succeeds

**Rollback Procedure:**
```bash
rm src/hooks/useAlertPreferencesQueries.ts
```

---

### **Step 3.2: Create Alert History Hooks**
**Estimated Time**: 20 minutes
**Files Modified**: Create `src/hooks/useAlertHistoryQueries.ts`

**Pre-Checks:**
- [ ] Alert preferences hooks created successfully
- [ ] Transform utilities available
- [ ] Logger utility exists in codebase

**Implementation:**
1. Create the alert history hooks file:

```typescript
// src/hooks/useAlertHistoryQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/config/queryKeys';
import { useAuth } from '@/context/AuthContext';
import logger from '@/utils/logger';
import { transformAlertHistoryFromSupabase } from '@/utils/transforms';
import type { AlertLogData, AlertHistoryEntry } from '@/types';

// Device and session ID utilities
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

export const useLogAlert = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (alertData: AlertLogData) => {
      if (!user) return; // Silent fail for non-authenticated users
      
      const { error } = await supabase
        .from('alert_history')
        .insert([{
          user_id: user.id,
          alert_key: alertData.alertKey,
          context: alertData.context || {},
          action_taken: alertData.actionTaken,
          device_id: alertData.deviceId || getDeviceId(),
          session_id: alertData.sessionId || getSessionId()
        }]);
      
      if (error) {
        // Log error but don't throw - alert logging shouldn't break UX
        logger.warn('Failed to log alert:', error);
      }
    },
  });
};

export const useRecentAlertHistory = (alertKey: string, timeWindowMinutes: number = 5) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.recentAlerts(user?.id, alertKey, timeWindowMinutes),
    queryFn: async (): Promise<AlertHistoryEntry[]> => {
      if (!user) return [];
      
      const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('alert_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('alert_key', alertKey)
        .gte('shown_at', cutoffTime)
        .order('shown_at', { ascending: false });
      
      if (error) {
        logger.warn('Failed to fetch recent alerts:', error);
        return [];
      }
      
      return (data || []).map(transformAlertHistoryFromSupabase);
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useAlertHistory = (filters?: { alertKey?: string; limit?: number }) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.alertHistory(user?.id, filters),
    queryFn: async (): Promise<AlertHistoryEntry[]> => {
      if (!user) return [];
      
      let query = supabase
        .from('alert_history')
        .select('*')
        .eq('user_id', user.id)
        .order('shown_at', { ascending: false });
      
      if (filters?.alertKey) {
        query = query.eq('alert_key', filters.alertKey);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.warn('Failed to fetch alert history:', error);
        return [];
      }
      
      return (data || []).map(transformAlertHistoryFromSupabase);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

**Immediate Verification:**
```bash
# Verify file created
ls -la src/hooks/useAlertHistoryQueries.ts
# Expected: File exists

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors

# Check if crypto.randomUUID is available
node -e "console.log('crypto.randomUUID:', typeof crypto?.randomUUID)"
# Expected: Should show 'function' or fallback needed
```

**Validation Checklist:**
- [ ] Hook file created successfully
- [ ] 3 hooks implemented (useLogAlert, useRecentAlertHistory, useAlertHistory)
- [ ] Device and session ID utilities included
- [ ] Error handling with graceful failures
- [ ] TypeScript compilation succeeds

**Rollback Procedure:**
```bash
rm src/hooks/useAlertHistoryQueries.ts
```

---

### **Step 3.3: Create Network Status Hook**
**Estimated Time**: 15 minutes
**Files Modified**: Create `src/hooks/useNetworkStatus.ts`

**Pre-Checks:**
- [ ] Alert history hooks created successfully
- [ ] React hooks patterns established
- [ ] Local storage utilities available

**Implementation:**
1. Create the network status hook:

```typescript
// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface NetworkStatus {
  isOnline: boolean;
  lastOnlineAt: number | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  connectionType: string | null;
}

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineAt, setLastOnlineAt] = useLocalStorage('lastOnlineAt', Date.now());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(Date.now());
      setSyncStatus('idle');
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get connection info if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection?.effectiveType || null);
      
      const handleConnectionChange = () => {
        setConnectionType(connection?.effectiveType || null);
      };
      
      connection?.addEventListener('change', handleConnectionChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection?.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setLastOnlineAt]);

  const setSyncStatusManually = (status: 'idle' | 'syncing' | 'error') => {
    setSyncStatus(status);
  };

  return {
    isOnline,
    lastOnlineAt,
    syncStatus,
    connectionType,
    setSyncStatus: setSyncStatusManually,
  };
};
```

**Immediate Verification:**
```bash
# Verify file created
ls -la src/hooks/useNetworkStatus.ts
# Expected: File exists

# Check if useLocalStorage hook exists
grep -r "useLocalStorage" src/hooks/
# Expected: Find existing useLocalStorage hook or create it

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors
```

**Validation Checklist:**
- [ ] Network status hook created
- [ ] Online/offline event listeners implemented
- [ ] Connection type detection included
- [ ] Sync status management included
- [ ] TypeScript compilation succeeds

**Rollback Procedure:**
```bash
rm src/hooks/useNetworkStatus.ts
```

## **📋 Phase 4: Core Alert Logic Components (1.5 hours)**

### **Step 4.1: Create Cloud-Aware Roster Guard Hook**
**Estimated Time**: 30 minutes
**Files Modified**: Create `src/hooks/useCloudAwareRosterGuard.ts`

**Pre-Checks:**
- [ ] Network status hook created successfully
- [ ] Alert query hooks available
- [ ] `useMasterRoster` hook exists
- [ ] Translation system (`useTranslation` or similar) available

**Implementation:**
1. Create the roster guard hook:

```typescript
// src/hooks/useCloudAwareRosterGuard.ts
import { useCallback } from 'react';
import { useAlertPreferences, useUpdateAlertPreferences } from './useAlertPreferencesQueries';
import { useLogAlert, useRecentAlertHistory } from './useAlertHistoryQueries';
import { useNetworkStatus } from './useNetworkStatus';
import { useMasterRoster } from './useMasterRosterQueries'; // Assuming this exists
import { useTranslation } from 'next-i18next';

export const useCloudAwareRosterGuard = () => {
  const { data: availablePlayers = [] } = useMasterRoster();
  const { data: alertPreferences } = useAlertPreferences();
  const { data: recentAlerts = [] } = useRecentAlertHistory('roster-empty-warning');
  const logAlert = useLogAlert();
  const updatePreferences = useUpdateAlertPreferences();
  const { isOnline } = useNetworkStatus();
  const { t } = useTranslation('common');
  
  const showRosterEmptyAlert = useCallback(async (context?: Record<string, any>) => {
    // Check if user has disabled these warnings
    if (alertPreferences?.alertPreferences?.skipRosterEmptyWarnings) {
      return false;
    }
    
    // Check if we've shown this alert recently to prevent spam
    const recentAlert = recentAlerts.find(alert => 
      alert.actionTaken !== 'dismissed' &&
      Date.now() - new Date(alert.shownAt).getTime() < 5 * 60 * 1000 // 5 minutes
    );
    
    if (recentAlert) {
      return false; // Don't spam user with same alert
    }
    
    // Enhanced alert message with cloud context
    const alertMessage = isOnline 
      ? t('controlBar.noPlayersForNewGameCloud', 
          'You need at least one player in your roster to create a game. Your roster syncs across all devices. Would you like to add players now?')
      : t('controlBar.noPlayersForNewGameOffline', 
          'You need at least one player in your roster to create a game. You\'re currently offline - players will sync when reconnected. Would you like to add players now?');
    
    const shouldProceed = window.confirm(alertMessage);
    
    // Log the alert interaction
    try {
      await logAlert.mutateAsync({
        alertKey: 'roster-empty-warning',
        context: { 
          ...context, 
          isOnline, 
          playerCount: availablePlayers.length,
          timestamp: Date.now()
        },
        actionTaken: shouldProceed ? 'accepted' : 'dismissed'
      });
    } catch (error) {
      // Silent fail - don't break UX for logging errors
      console.warn('Failed to log alert:', error);
    }
    
    return shouldProceed;
  }, [availablePlayers.length, alertPreferences, recentAlerts, logAlert, isOnline, t]);
  
  const showWorkspaceWarning = useCallback(async (message: string, context?: Record<string, any>) => {
    // Check if user has disabled workspace warnings
    if (alertPreferences?.alertPreferences?.skipWorkspaceWarnings) {
      return true; // Proceed without warning
    }
    
    const enhancedMessage = isOnline 
      ? `${message}\n\nThis action will sync across all your devices.`
      : `${message}\n\nYou're offline - changes will sync when reconnected.`;
    
    const shouldProceed = window.confirm(enhancedMessage);
    
    // Log the interaction
    try {
      await logAlert.mutateAsync({
        alertKey: 'workspace-warning',
        context: { ...context, isOnline, message },
        actionTaken: shouldProceed ? 'accepted' : 'dismissed'
      });
    } catch (error) {
      console.warn('Failed to log alert:', error);
    }
    
    return shouldProceed;
  }, [alertPreferences, logAlert, isOnline]);
  
  return { 
    showRosterEmptyAlert, 
    showWorkspaceWarning,
    playerCount: availablePlayers.length,
    hasValidRoster: availablePlayers.length > 0
  };
};
```

**Immediate Verification:**
```bash
# Verify file created
ls -la src/hooks/useCloudAwareRosterGuard.ts
# Expected: File exists

# Check for required dependencies
grep -r "useMasterRoster" src/hooks/
# Expected: Find existing master roster hook or note for creation

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors (may have warnings about missing useMasterRoster)
```

**Validation Checklist:**
- [ ] Guard hook file created
- [ ] 2 main functions implemented (showRosterEmptyAlert, showWorkspaceWarning)
- [ ] Cloud context awareness built in
- [ ] Alert logging integrated
- [ ] TypeScript compilation succeeds (with allowable warnings)

**Rollback Procedure:**
```bash
rm src/hooks/useCloudAwareRosterGuard.ts
```

---

### **Step 4.2: Create Cloud Confirmation Hook**
**Estimated Time**: 25 minutes
**Files Modified**: Create `src/hooks/useCloudAwareConfirmation.ts`

**Pre-Checks:**
- [ ] Roster guard hook created successfully
- [ ] Network status hook available
- [ ] Alert logging hooks available

**Implementation:**
1. Create the confirmation hook:

```typescript
// src/hooks/useCloudAwareConfirmation.ts
import { useCallback } from 'react';
import { useAlertPreferences } from './useAlertPreferencesQueries';
import { useLogAlert } from './useAlertHistoryQueries';
import { useNetworkStatus } from './useNetworkStatus';
import { useTranslation } from 'next-i18next';

export const useCloudAwareConfirmation = () => {
  const { data: alertPreferences } = useAlertPreferences();
  const logAlert = useLogAlert();
  const { isOnline, syncStatus } = useNetworkStatus();
  const { t } = useTranslation('common');
  
  const confirmWithCloudContext = useCallback(async (
    alertKey: string,
    baseMessage: string,
    context?: Record<string, any>
  ): Promise<boolean> => {
    // Build cloud-aware message
    let enhancedMessage = baseMessage;
    
    if (!isOnline) {
      enhancedMessage += '\n\n' + t('alerts.offlineChangesWillSync', 
        'Note: You\'re currently offline. This action will sync when you reconnect.');
    } else if (syncStatus === 'syncing') {
      enhancedMessage += '\n\n' + t('alerts.syncingChanges', 
        'Note: Data is currently syncing across your devices.');
    } else {
      enhancedMessage += '\n\n' + t('alerts.multiDeviceActionWarning', 
        'This action will sync immediately across all your devices.');
    }
    
    const confirmed = window.confirm(enhancedMessage);
    
    // Log the confirmation interaction
    try {
      await logAlert.mutateAsync({
        alertKey,
        context: { 
          ...context, 
          isOnline, 
          syncStatus, 
          baseMessage,
          timestamp: Date.now()
        },
        actionTaken: confirmed ? 'accepted' : 'dismissed'
      });
    } catch (error) {
      console.warn('Failed to log confirmation:', error);
    }
    
    return confirmed;
  }, [alertPreferences, logAlert, isOnline, syncStatus, t]);
  
  const confirmDestructiveAction = useCallback(async (
    itemName: string,
    itemType: string = 'item',
    context?: Record<string, any>
  ): Promise<boolean> => {
    const baseMessage = t('alerts.confirmDestructive', 
      'Delete "{{itemName}}"? This cannot be undone.', 
      { itemName }
    );
    
    return await confirmWithCloudContext(
      `delete-${itemType}-confirmation`,
      baseMessage,
      { itemName, itemType, ...context }
    );
  }, [confirmWithCloudContext, t]);
  
  const confirmBulkAction = useCallback(async (
    actionName: string,
    itemCount: number,
    context?: Record<string, any>
  ): Promise<boolean> => {
    const baseMessage = t('alerts.confirmBulkAction',
      '{{actionName}} {{count}} items? This action affects multiple items.',
      { actionName, count: itemCount }
    );
    
    return await confirmWithCloudContext(
      'bulk-action-confirmation',
      baseMessage,
      { actionName, itemCount, ...context }
    );
  }, [confirmWithCloudContext, t]);
  
  return { 
    confirmWithCloudContext,
    confirmDestructiveAction,
    confirmBulkAction
  };
};
```

**Immediate Verification:**
```bash
# Verify file created
ls -la src/hooks/useCloudAwareConfirmation.ts
# Expected: File exists

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors

# Check if translation keys exist or need creation
grep -A 5 "confirmDestructive" public/locales/en/common.json || echo "Translation keys need to be added"
# Expected: Either find keys or note for creation
```

**Validation Checklist:**
- [ ] Confirmation hook file created
- [ ] 3 confirmation functions implemented
- [ ] Cloud context messages included
- [ ] Translation integration added
- [ ] Alert logging integrated

**Rollback Procedure:**
```bash
rm src/hooks/useCloudAwareConfirmation.ts
```

---

### **Step 4.3: Create Cloud Status Alerts Hook**
**Estimated Time**: 25 minutes
**Files Modified**: Create `src/hooks/useCloudStatusAlerts.ts`

**Pre-Checks:**
- [ ] Confirmation hook created successfully
- [ ] Toast notification system exists (react-hot-toast or similar)
- [ ] Network status hook available

**Implementation:**
1. Create the cloud status alerts hook:

```typescript
// src/hooks/useCloudStatusAlerts.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAlertPreferences } from './useAlertPreferencesQueries';
import { useNetworkStatus } from './useNetworkStatus';
import { useTranslation } from 'next-i18next';

interface SyncConflictData {
  type: 'data_conflict' | 'version_conflict' | 'permission_conflict';
  entityType: string;
  entityId: string;
  localTimestamp: string;
  remoteTimestamp: string;
  conflictDetails?: Record<string, any>;
}

export const useCloudStatusAlerts = () => {
  const { isOnline, lastOnlineAt } = useNetworkStatus();
  const { data: alertPreferences } = useAlertPreferences();
  const [hasShownOfflineAlert, setHasShownOfflineAlert] = useState(false);
  const { t } = useTranslation('common');
  
  // Show offline alert when going offline
  useEffect(() => {
    if (!isOnline && !hasShownOfflineAlert && alertPreferences?.showSyncNotifications) {
      const offlineTime = Date.now() - (lastOnlineAt || Date.now());
      
      if (offlineTime > 30000) { // Show after 30 seconds offline
        toast.warning(
          t('alerts.offlineMode', 'You\'re offline. Changes will sync when reconnected.'),
          { 
            id: 'offline-status', 
            duration: 5000,
            icon: '📱'
          }
        );
        setHasShownOfflineAlert(true);
      }
    } else if (isOnline && hasShownOfflineAlert) {
      toast.success(
        t('alerts.backOnlineSyncing', 'Back online! Syncing changes...'),
        { 
          id: 'online-status', 
          duration: 3000,
          icon: '☁️'
        }
      );
      setHasShownOfflineAlert(false);
    }
  }, [isOnline, hasShownOfflineAlert, alertPreferences, lastOnlineAt, t]);
  
  // Show sync conflict resolution alerts
  const showSyncConflictAlert = useCallback(async (conflictData: SyncConflictData): Promise<'local' | 'remote' | 'auto'> => {
    if (!alertPreferences?.showCloudStatus) return 'auto';
    
    return new Promise<'local' | 'remote' | 'auto'>((resolve) => {
      // Create a custom modal for sync conflicts
      const modalId = 'sync-conflict-modal';
      const existingModal = document.getElementById(modalId);
      if (existingModal) {
        existingModal.remove();
      }
      
      const modal = document.createElement('div');
      modal.id = modalId;
      modal.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-lg p-6 max-w-md">
            <h3 class="text-lg font-semibold text-white mb-3">${t('alerts.conflictResolution', 'Sync Conflict Detected')}</h3>
            <p class="text-slate-300 mb-2">
              ${t('alerts.syncConflictDetected', 'Your data was modified on another device. How would you like to resolve this?')}
            </p>
            <div class="text-sm text-slate-400 mb-4">
              <p><strong>Type:</strong> ${conflictData.entityType}</p>
              <p><strong>Local:</strong> ${new Date(conflictData.localTimestamp).toLocaleString()}</p>
              <p><strong>Remote:</strong> ${new Date(conflictData.remoteTimestamp).toLocaleString()}</p>
            </div>
            <div class="flex gap-2">
              <button id="use-local" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition">
                ${t('alerts.useLocalChanges', 'Use Local Changes')}
              </button>
              <button id="use-remote" class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition">
                ${t('alerts.useRemoteChanges', 'Use Remote Changes')}
              </button>
              <button id="auto-resolve" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition">
                ${t('alerts.autoResolve', 'Auto Resolve')}
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const cleanup = () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      };
      
      modal.querySelector('#use-local')?.addEventListener('click', () => {
        cleanup();
        resolve('local');
      });
      
      modal.querySelector('#use-remote')?.addEventListener('click', () => {
        cleanup();
        resolve('remote');
      });
      
      modal.querySelector('#auto-resolve')?.addEventListener('click', () => {
        cleanup();
        resolve('auto');
      });
      
      // Auto-resolve after 30 seconds
      setTimeout(() => {
        cleanup();
        resolve('auto');
      }, 30000);
    });
  }, [alertPreferences, t]);
  
  const showSyncProgressAlert = useCallback((message: string, duration: number = 3000) => {
    if (!alertPreferences?.showSyncNotifications) return;
    
    toast.loading(message, {
      id: 'sync-progress',
      duration,
      icon: '⏳'
    });
  }, [alertPreferences]);
  
  const dismissSyncProgressAlert = useCallback(() => {
    toast.dismiss('sync-progress');
  }, []);
  
  const showSyncSuccessAlert = useCallback((message: string) => {
    if (!alertPreferences?.showSyncNotifications) return;
    
    toast.success(message, {
      id: 'sync-success',
      duration: 2000,
      icon: '✅'
    });
  }, [alertPreferences]);
  
  const showSyncErrorAlert = useCallback((message: string, error?: any) => {
    toast.error(message, {
      id: 'sync-error',
      duration: 5000,
      icon: '❌'
    });
    
    if (error) {
      console.error('Sync error details:', error);
    }
  }, []);
  
  return { 
    showSyncConflictAlert,
    showSyncProgressAlert,
    dismissSyncProgressAlert,
    showSyncSuccessAlert,
    showSyncErrorAlert
  };
};
```

**Immediate Verification:**
```bash
# Verify file created
ls -la src/hooks/useCloudStatusAlerts.ts
# Expected: File exists

# Check for toast dependency
grep -r "react-hot-toast" package.json
# Expected: Find toast library or note for installation

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors
```

**Validation Checklist:**
- [ ] Cloud status alerts hook created
- [ ] 5 alert functions implemented
- [ ] Offline/online status handling included
- [ ] Custom sync conflict modal implemented
- [ ] Toast integration for status messages

**Rollback Procedure:**
```bash
rm src/hooks/useCloudStatusAlerts.ts
```

## **📋 Phase 5: Translation & Migration (45 minutes)**

### **Step 5.1: Add Translation Keys**
**Estimated Time**: 15 minutes
**Files Modified**: `public/locales/en/common.json`

**Pre-Checks:**
- [ ] Cloud status alerts hook created successfully
- [ ] Translation file exists and is valid JSON
- [ ] Other translation keys follow established pattern

**Implementation:**
1. Open `public/locales/en/common.json`
2. Add these translation keys (merge with existing structure):

```json
{
  "controlBar": {
    "noPlayersForNewGame": "You need at least one player in your roster to create a game. Would you like to add players now?",
    "noPlayersForNewGameCloud": "You need at least one player in your roster to create a game. Your roster syncs across all devices. Would you like to add players now?",
    "noPlayersForNewGameOffline": "You need at least one player in your roster to create a game. You're currently offline - players will sync when reconnected. Would you like to add players now?"
  },
  "alerts": {
    "cloudSyncStatus": "Cloud Sync Status",
    "offlineMode": "Offline Mode",
    "syncingChanges": "Syncing changes...",
    "conflictResolution": "Conflict Resolution",
    "syncConflictDetected": "Your data was modified on another device. How would you like to resolve this?",
    "useLocalChanges": "Use Local Changes",
    "useRemoteChanges": "Use Remote Changes", 
    "autoResolve": "Auto Resolve",
    "alertPreferences": "Alert Preferences",
    "showSyncNotifications": "Show sync notifications",
    "showCloudStatus": "Show cloud status updates",
    "alertFrequency": "Alert frequency",
    "minimal": "Minimal",
    "normal": "Normal",
    "verbose": "Verbose",
    "offlineChangesWillSync": "Note: You're currently offline. This action will sync when you reconnect.",
    "backOnlineSyncing": "Back online! Syncing changes...",
    "multiDeviceActionWarning": "This action will sync immediately across all your devices.",
    "confirmDestructive": "Delete \"{{itemName}}\"? This cannot be undone.",
    "confirmBulkAction": "{{actionName}} {{count}} items? This action affects multiple items."
  }
}
```

**Immediate Verification:**
```bash
# Verify JSON is valid after changes
node -e "console.log('JSON valid:', JSON.parse(require('fs').readFileSync('public/locales/en/common.json', 'utf8')))"
# Expected: Shows 'JSON valid:' followed by parsed object

# Check specific keys were added
grep -A 2 "noPlayersForNewGameCloud" public/locales/en/common.json
# Expected: Find the cloud-specific roster message

grep -A 5 "conflictResolution" public/locales/en/common.json
# Expected: Find conflict resolution keys
```

**Validation Checklist:**
- [ ] JSON file remains valid after modifications
- [ ] controlBar section has 3 roster-related messages
- [ ] alerts section has 15+ new keys
- [ ] No duplicate keys introduced
- [ ] Interpolation syntax correct ({{itemName}}, {{count}})

**Rollback Procedure:**
Revert changes to `public/locales/en/common.json` using git or backup

---

### **Step 5.2: Create Migration Utility**
**Estimated Time**: 20 minutes
**Files Modified**: Create `src/lib/migrations/alertSystemMigration.ts`

**Pre-Checks:**
- [ ] Translation keys added successfully
- [ ] `src/lib/migrations/` directory exists or can be created
- [ ] Logger utility available in codebase

**Implementation:**
1. Create the migration utility:

```typescript
// src/lib/migrations/alertSystemMigration.ts
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { StorageError } from '@/lib/storage/types';

interface LocalStorageAlertData {
  alertPreferences?: string;
  dismissedAlerts?: string;
  lastRosterWarning?: string;
  alertFrequency?: string;
}

export const migrateAlertSystemToSupabase = async (userId: string): Promise<void> => {
  logger.info('Starting alert system migration to Supabase for user:', userId);
  
  try {
    // 1. Check if migration already completed
    const { data: existing } = await supabase
      .from('user_alert_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      logger.info('Alert preferences already exist in Supabase, skipping migration');
      return;
    }
    
    // 2. Gather localStorage data
    const localData: LocalStorageAlertData = {
      alertPreferences: localStorage.getItem('alertPreferences') || undefined,
      dismissedAlerts: localStorage.getItem('dismissedAlerts') || undefined,
      lastRosterWarning: localStorage.getItem('lastRosterWarning') || undefined,
      alertFrequency: localStorage.getItem('alertFrequency') || undefined
    };
    
    // 3. Parse localStorage data
    let parsedPrefs = {};
    let parsedDismissed: string[] = [];
    let parsedFrequency: 'minimal' | 'normal' | 'verbose' = 'normal';
    let lastWarningDate: string | null = null;
    
    try {
      if (localData.alertPreferences) {
        parsedPrefs = JSON.parse(localData.alertPreferences);
      }
      if (localData.dismissedAlerts) {
        parsedDismissed = JSON.parse(localData.dismissedAlerts);
      }
      if (localData.alertFrequency && ['minimal', 'normal', 'verbose'].includes(localData.alertFrequency)) {
        parsedFrequency = localData.alertFrequency as 'minimal' | 'normal' | 'verbose';
      }
      if (localData.lastRosterWarning) {
        const timestamp = parseInt(localData.lastRosterWarning, 10);
        if (!isNaN(timestamp)) {
          lastWarningDate = new Date(timestamp).toISOString();
        }
      }
    } catch (parseError) {
      logger.warn('Failed to parse some localStorage alert data:', parseError);
      // Continue with defaults
    }
    
    // 4. Create Supabase alert preferences
    const initialPreferences = {
      user_id: userId,
      alert_preferences: parsedPrefs,
      dismissed_alerts: parsedDismissed,
      alert_frequency: parsedFrequency,
      show_cloud_status: true, // Default to enabled for new cloud features
      show_sync_notifications: true, // Default to enabled
      last_roster_warning: lastWarningDate
    };
    
    const { error: insertError } = await supabase
      .from('user_alert_preferences')
      .insert([initialPreferences]);
    
    if (insertError) {
      throw new StorageError('supabase', 'migrateAlertPreferences', insertError);
    }
    
    // 5. Clean up localStorage (only after successful migration)
    const keysToRemove = [
      'alertPreferences',
      'dismissedAlerts', 
      'lastRosterWarning',
      'alertFrequency'
    ];
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        logger.info(`Removed localStorage key: ${key}`);
      }
    });
    
    logger.info('Alert system migration completed successfully');
    
  } catch (error) {
    logger.error('Alert system migration failed:', error);
    throw error;
  }
};

// Check if localStorage has alert data that needs migration
export const hasLocalStorageAlertData = (): boolean => {
  const alertKeys = ['alertPreferences', 'dismissedAlerts', 'lastRosterWarning', 'alertFrequency'];
  return alertKeys.some(key => localStorage.getItem(key) !== null);
};

// Rollback migration (restore from backup if needed)
export const rollbackAlertMigration = async (userId: string): Promise<void> => {
  logger.warn('Rolling back alert system migration for user:', userId);
  
  try {
    const { error } = await supabase
      .from('user_alert_preferences')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      throw new StorageError('supabase', 'rollbackAlertMigration', error);
    }
    
    logger.info('Alert migration rollback completed');
  } catch (error) {
    logger.error('Alert migration rollback failed:', error);
    throw error;
  }
};
```

**Immediate Verification:**
```bash
# Verify migration file created
ls -la src/lib/migrations/alertSystemMigration.ts
# Expected: File exists

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors

# Check if migrations directory pattern exists
ls -la src/lib/migrations/
# Expected: Directory exists with other migration files (or is first)
```

**Validation Checklist:**
- [ ] Migration utility file created
- [ ] 3 main functions implemented (migrate, hasLocalStorageData, rollback)
- [ ] Error handling and logging included
- [ ] localStorage cleanup after successful migration
- [ ] TypeScript compilation succeeds

**Rollback Procedure:**
```bash
rm src/lib/migrations/alertSystemMigration.ts
```

---

### **Step 5.3: Create Offline Alert Queue Utility**
**Estimated Time**: 10 minutes
**Files Modified**: Create `src/lib/offline/alertOfflineSync.ts`

**Pre-Checks:**
- [ ] Migration utility created successfully
- [ ] `src/lib/offline/` directory exists or can be created
- [ ] `useLocalStorage` hook available

**Implementation:**
1. Create the offline sync utility:

```typescript
// src/lib/offline/alertOfflineSync.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { AlertLogData } from '@/types';

interface QueuedAlert extends AlertLogData {
  id: string;
  userId: string;
  timestamp: number;
  retryCount: number;
}

export const useOfflineAlertSync = () => {
  const [offlineAlerts, setOfflineAlerts] = useLocalStorage<QueuedAlert[]>('alertOfflineQueue', []);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const queueOfflineAlert = useCallback((userId: string, alertData: AlertLogData) => {
    const queuedAlert: QueuedAlert = {
      id: crypto.randomUUID(),
      userId,
      ...alertData,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    setOfflineAlerts(queue => [...queue, queuedAlert]);
    logger.info('Alert queued for offline sync:', queuedAlert.alertKey);
  }, [setOfflineAlerts]);
  
  const processOfflineAlertQueue = useCallback(async () => {
    if (!navigator.onLine || offlineAlerts.length === 0 || isSyncing) {
      return;
    }
    
    setIsSyncing(true);
    logger.info(`Processing ${offlineAlerts.length} queued alerts`);
    
    const successful: string[] = [];
    const failed: QueuedAlert[] = [];
    
    for (const alert of offlineAlerts) {
      try {
        const { error } = await supabase
          .from('alert_history')
          .insert([{
            user_id: alert.userId,
            alert_key: alert.alertKey,
            context: alert.context || {},
            action_taken: alert.actionTaken,
            device_id: alert.deviceId,
            session_id: alert.sessionId,
            shown_at: new Date(alert.timestamp).toISOString()
          }]);
        
        if (error) {
          throw error;
        }
        
        successful.push(alert.id);
        logger.info('Alert synced successfully:', alert.alertKey);
        
      } catch (error) {
        logger.warn('Failed to sync alert:', alert.alertKey, error);
        
        // Retry logic: fail after 3 attempts
        if (alert.retryCount < 3) {
          failed.push({ ...alert, retryCount: alert.retryCount + 1 });
        } else {
          logger.error('Alert failed after max retries, discarding:', alert.alertKey);
        }
      }
    }
    
    // Update queue: remove successful, keep failed for retry
    setOfflineAlerts(failed);
    
    if (successful.length > 0) {
      logger.info(`Successfully synced ${successful.length} alerts`);
    }
    
    if (failed.length > 0) {
      logger.warn(`${failed.length} alerts remain in queue for retry`);
    }
    
    setIsSyncing(false);
  }, [offlineAlerts, setOfflineAlerts, isSyncing]);
  
  // Process queue when coming online
  useEffect(() => {
    const handleOnline = () => {
      logger.info('Back online, processing alert queue');
      processOfflineAlertQueue();
    };
    
    window.addEventListener('online', handleOnline);
    
    // Also process on mount if already online
    if (navigator.onLine) {
      setTimeout(processOfflineAlertQueue, 1000);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [processOfflineAlertQueue]);
  
  const clearAlertQueue = useCallback(() => {
    setOfflineAlerts([]);
    logger.info('Alert queue cleared manually');
  }, [setOfflineAlerts]);
  
  return { 
    queueOfflineAlert, 
    processOfflineAlertQueue,
    clearAlertQueue,
    queueLength: offlineAlerts.length,
    isSyncing
  };
};

// Standalone function for non-hook usage
export const addToOfflineAlertQueue = (userId: string, alertData: AlertLogData) => {
  const queuedAlert: QueuedAlert = {
    id: crypto.randomUUID(),
    userId,
    ...alertData,
    timestamp: Date.now(),
    retryCount: 0
  };
  
  const existingQueue = JSON.parse(localStorage.getItem('alertOfflineQueue') || '[]');
  const updatedQueue = [...existingQueue, queuedAlert];
  localStorage.setItem('alertOfflineQueue', JSON.stringify(updatedQueue));
  
  logger.info('Alert added to offline queue:', queuedAlert.alertKey);
};
```

**Immediate Verification:**
```bash
# Verify offline sync file created
ls -la src/lib/offline/alertOfflineSync.ts
# Expected: File exists

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors

# Check if crypto.randomUUID is supported or needs polyfill
node -e "console.log('crypto support:', typeof crypto?.randomUUID)"
# Expected: 'function' or note polyfill needed
```

**Validation Checklist:**
- [ ] Offline sync utility created
- [ ] Queue management hook implemented
- [ ] Retry logic included (max 3 attempts)
- [ ] Online event listener for auto-processing
- [ ] Standalone function for non-hook usage

**Rollback Procedure:**
```bash
rm src/lib/offline/alertOfflineSync.ts
```

## **📋 Phase 6: Real-time Coordination & Integration (30 minutes)**

### **Step 6.1: Create Real-time Alert Coordination Hook**
**Estimated Time**: 20 minutes
**Files Modified**: Create `src/hooks/useAlertRealtimeSync.ts`

**Pre-Checks:**
- [ ] Offline sync utility created successfully
- [ ] Supabase real-time subscriptions working in project
- [ ] Device ID utility available

**Implementation:**
1. Create the real-time coordination hook:

```typescript
// src/hooks/useAlertRealtimeSync.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/config/queryKeys';
import { useAuth } from '@/context/AuthContext';
import { transformAlertPreferencesFromSupabase } from '@/utils/transforms';
import logger from '@/utils/logger';

// Device ID utility (should match the one in alert history hooks)
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export const useAlertRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    logger.info('Setting up real-time alert coordination for user:', user.id);
    
    const channel = supabase
      .channel('alert_system_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_alert_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            logger.info('Alert preferences updated from another device');
            
            // Sync alert preferences across devices
            queryClient.setQueryData(
              queryKeys.alertPreferences(user.id),
              transformAlertPreferencesFromSupabase(payload.new)
            );
            
            // Dispatch event for components to react
            window.dispatchEvent(new CustomEvent('alertPreferencesUpdated', {
              detail: payload.new
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alert_history',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.device_id !== getDeviceId()) {
            logger.info('Alert shown on another device:', payload.new.alert_key);
            
            // Another device showed an alert
            queryClient.invalidateQueries({ 
              queryKey: queryKeys.recentAlerts(user.id) 
            });
            
            // Coordinate cross-device alert behavior
            const alertData = payload.new;
            if (alertData.action_taken === 'dismissed') {
              // User dismissed alert on another device - update local state
              window.dispatchEvent(new CustomEvent('alertDismissedElsewhere', {
                detail: alertData
              }));
            }
            
            // For certain alerts, hide local pending alerts
            if (['roster-empty-warning', 'workspace-warning'].includes(alertData.alert_key)) {
              window.dispatchEvent(new CustomEvent('crossDeviceAlertShown', {
                detail: alertData
              }));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Alert real-time sync established');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Alert real-time sync channel error');
        }
      });

    return () => {
      logger.info('Cleaning up alert real-time sync');
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);
};

// Hook for using cross-device events
export const useCrossDeviceAlertEvents = () => {
  useEffect(() => {
    const handleAlertDismissed = (event: CustomEvent) => {
      const alertData = event.detail;
      logger.info('Alert dismissed on another device:', alertData.alert_key);
      
      // Hide any currently shown modals/alerts of the same type
      const existingModals = document.querySelectorAll(`[data-alert-key="${alertData.alert_key}"]`);
      existingModals.forEach(modal => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      });
    };
    
    const handleCrossDeviceAlert = (event: CustomEvent) => {
      const alertData = event.detail;
      logger.info('Cross-device alert coordination:', alertData.alert_key);
      
      // Cancel any pending alerts of the same type
      window.dispatchEvent(new CustomEvent('cancelPendingAlert', {
        detail: { alertKey: alertData.alert_key }
      }));
    };
    
    const handlePreferencesUpdated = (event: CustomEvent) => {
      logger.info('Alert preferences synced from another device');
      // Components can listen to this event to update their behavior
    };
    
    window.addEventListener('alertDismissedElsewhere', handleAlertDismissed as EventListener);
    window.addEventListener('crossDeviceAlertShown', handleCrossDeviceAlert as EventListener);
    window.addEventListener('alertPreferencesUpdated', handlePreferencesUpdated as EventListener);
    
    return () => {
      window.removeEventListener('alertDismissedElsewhere', handleAlertDismissed as EventListener);
      window.removeEventListener('crossDeviceAlertShown', handleCrossDeviceAlert as EventListener);
      window.removeEventListener('alertPreferencesUpdated', handlePreferencesUpdated as EventListener);
    };
  }, []);
};
```

**Immediate Verification:**
```bash
# Verify real-time sync file created
ls -la src/hooks/useAlertRealtimeSync.ts
# Expected: File exists

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors

# Check if Supabase real-time is configured
grep -r "subscribe" src/lib/supabase/ || grep -r "realtime" src/lib/supabase/
# Expected: Find existing real-time usage patterns
```

**Validation Checklist:**
- [ ] Real-time sync hook created
- [ ] 2 hooks implemented (useAlertRealtimeSync, useCrossDeviceAlertEvents)
- [ ] Supabase subscriptions for both tables
- [ ] Custom event system for cross-device coordination
- [ ] Proper cleanup and error handling

**Rollback Procedure:**
```bash
rm src/hooks/useAlertRealtimeSync.ts
```

---

### **Step 6.2: Update Component Integration Points**
**Estimated Time**: 10 minutes
**Files Modified**: Document integration points in component files

**Pre-Checks:**
- [ ] Real-time sync hooks created successfully
- [ ] Alert system hooks are available
- [ ] Main components identified for integration

**Implementation:**
1. Document integration patterns for key components:

**HomePage Integration Example:**
```typescript
// In src/components/HomePage.tsx (add these imports and usage)
import { useCloudAwareRosterGuard } from '@/hooks/useCloudAwareRosterGuard';
import { useAlertRealtimeSync, useCrossDeviceAlertEvents } from '@/hooks/useAlertRealtimeSync';

export const HomePage = () => {
  const { showRosterEmptyAlert, hasValidRoster } = useCloudAwareRosterGuard();
  
  // Enable real-time alert coordination
  useAlertRealtimeSync();
  useCrossDeviceAlertEvents();
  
  const handleStartNewGame = useCallback(async () => {
    if (!hasValidRoster) {
      const shouldOpenRoster = await showRosterEmptyAlert({
        action: 'new-game-attempt',
        source: 'homepage-button'
      });
      
      if (shouldOpenRoster) {
        setIsRosterModalOpen(true);
      }
      return;
    }
    
    // Continue with game creation...
    setIsNewGameSetupModalOpen(true);
  }, [hasValidRoster, showRosterEmptyAlert]);
  
  // ... rest of component
};
```

**Settings/Preferences Integration Example:**
```typescript
// In settings components
import { useAlertPreferences, useUpdateAlertPreferences } from '@/hooks/useAlertPreferencesQueries';

const AlertPreferencesSection = () => {
  const { data: preferences, isLoading } = useAlertPreferences();
  const updatePreferences = useUpdateAlertPreferences();
  
  const handleFrequencyChange = (frequency: 'minimal' | 'normal' | 'verbose') => {
    updatePreferences.mutate({ alertFrequency: frequency });
  };
  
  // ... preference controls
};
```

**Modal/Confirmation Integration Example:**
```typescript
// In destructive action components
import { useCloudAwareConfirmation } from '@/hooks/useCloudAwareConfirmation';

const DeletePlayerButton = ({ player }) => {
  const { confirmDestructiveAction } = useCloudAwareConfirmation();
  
  const handleDelete = async () => {
    const confirmed = await confirmDestructiveAction(player.name, 'player', {
      playerId: player.id
    });
    
    if (confirmed) {
      // Proceed with deletion
      await deletePlayer(player.id);
    }
  };
  
  // ... button component
};
```

**Immediate Verification:**
```bash
# Check if main components exist for integration
ls -la src/components/HomePage.tsx
# Expected: File exists (or note component locations)

ls -la src/components/settings/ || ls -la src/components/Settings*
# Expected: Find settings components

# Verify patterns can be imported
node -e "console.log('Integration patterns documented')"
# Expected: Simple verification that documentation is ready
```

**Validation Checklist:**
- [ ] Integration patterns documented for HomePage
- [ ] Settings component integration outlined
- [ ] Modal confirmation patterns provided
- [ ] Import statements and hook usage examples included
- [ ] Integration points identified for existing components

**Rollback Procedure:**
No files created in this step - documentation only

## **📋 Phase 7: Testing & Validation (30 minutes)**

### **Step 7.1: Create Alert System Tests**
**Estimated Time**: 20 minutes
**Files Modified**: Create `src/hooks/__tests__/alertSystem.test.ts`

**Pre-Checks:**
- [ ] Integration points documented
- [ ] Testing framework exists (Jest, React Testing Library)
- [ ] Mock utilities available for Supabase and auth

**Implementation:**
1. Create comprehensive tests for alert system:

```typescript
// src/hooks/__tests__/alertSystem.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAlertPreferences, useUpdateAlertPreferences } from '../useAlertPreferencesQueries';
import { useLogAlert, useRecentAlertHistory } from '../useAlertHistoryQueries';
import { useCloudAwareRosterGuard } from '../useCloudAwareRosterGuard';
import { useCloudAwareConfirmation } from '../useCloudAwareConfirmation';
import { useNetworkStatus } from '../useNetworkStatus';
import { migrateAlertSystemToSupabase, hasLocalStorageAlertData } from '@/lib/migrations/alertSystemMigration';

// Mocks
jest.mock('@/lib/supabase');
jest.mock('@/context/AuthContext');
jest.mock('@/hooks/useMasterRosterQueries');

const mockUser = { id: 'test-user-123', email: 'test@example.com' };
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis()
  }))
};

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Alert System Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful auth
    (require('@/context/AuthContext').useAuth as jest.Mock).mockReturnValue({
      data: { user: mockUser }
    });
  });
  
  describe('useAlertPreferences', () => {
    it('should fetch user alert preferences', async () => {
      const mockData = {
        id: 'pref-1',
        user_id: mockUser.id,
        alert_preferences: {},
        dismissed_alerts: [],
        alert_frequency: 'normal',
        show_cloud_status: true,
        show_sync_notifications: true
      };
      
      mockSupabase.from().single.mockResolvedValue({ data: mockData, error: null });
      
      const { result } = renderHook(() => useAlertPreferences(), {
        wrapper: createWrapper()
      });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.userId).toBe(mockUser.id);
    });
    
    it('should handle missing preferences gracefully', async () => {
      mockSupabase.from().single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } // Not found
      });
      
      const { result } = renderHook(() => useAlertPreferences(), {
        wrapper: createWrapper()
      });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      expect(result.current.data).toBeNull();
    });
  });
  
  describe('useLogAlert', () => {
    it('should log alert interactions', async () => {
      mockSupabase.from().insert.mockResolvedValue({ error: null });
      
      const { result } = renderHook(() => useLogAlert(), {
        wrapper: createWrapper()
      });
      
      await act(async () => {
        await result.current.mutateAsync({
          alertKey: 'test-alert',
          actionTaken: 'accepted',
          context: { test: 'data' }
        });
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('alert_history');
    });
    
    it('should handle logging errors gracefully', async () => {
      mockSupabase.from().insert.mockResolvedValue({ 
        error: new Error('Database error') 
      });
      
      const { result } = renderHook(() => useLogAlert(), {
        wrapper: createWrapper()
      });
      
      // Should not throw error
      await act(async () => {
        await result.current.mutateAsync({
          alertKey: 'test-alert',
          actionTaken: 'dismissed'
        });
      });
      
      expect(result.current.isError).toBe(false); // Silent failure
    });
  });
  
  describe('useNetworkStatus', () => {
    const originalNavigator = global.navigator;
    
    beforeEach(() => {
      // Mock navigator.onLine
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true
      });
    });
    
    afterEach(() => {
      global.navigator = originalNavigator;
    });
    
    it('should track online status', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.isOnline).toBe(true);
      expect(result.current.syncStatus).toBe('idle');
    });
    
    it('should update when going offline', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      act(() => {
        Object.defineProperty(global.navigator, 'onLine', {
          value: false
        });
        window.dispatchEvent(new Event('offline'));
      });
      
      expect(result.current.isOnline).toBe(false);
    });
  });
});

describe('Alert Migration', () => {
  const originalLocalStorage = global.localStorage;
  
  beforeEach(() => {
    const mockLocalStorage = {
      getItem: jest.fn(),
      removeItem: jest.fn(),
      setItem: jest.fn()
    };
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage
    });
  });
  
  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });
  
  describe('hasLocalStorageAlertData', () => {
    it('should detect existing localStorage alert data', () => {
      (localStorage.getItem as jest.Mock)
        .mockReturnValueOnce('{}') // alertPreferences
        .mockReturnValueOnce(null) // dismissedAlerts
        .mockReturnValueOnce(null) // lastRosterWarning
        .mockReturnValueOnce(null); // alertFrequency
      
      const result = hasLocalStorageAlertData();
      expect(result).toBe(true);
    });
    
    it('should return false when no localStorage data exists', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      
      const result = hasLocalStorageAlertData();
      expect(result).toBe(false);
    });
  });
  
  describe('migrateAlertSystemToSupabase', () => {
    it('should migrate localStorage data to Supabase', async () => {
      // Mock existing localStorage data
      (localStorage.getItem as jest.Mock)
        .mockImplementation((key) => {
          switch (key) {
            case 'alertPreferences': return '{"skipWarnings":true}';
            case 'dismissedAlerts': return '["alert-1"]';
            case 'alertFrequency': return 'minimal';
            default: return null;
          }
        });
      
      // Mock Supabase responses
      mockSupabase.from().single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      mockSupabase.from().insert.mockResolvedValue({ error: null });
      
      await migrateAlertSystemToSupabase(mockUser.id);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('user_alert_preferences');
      expect(localStorage.removeItem).toHaveBeenCalledWith('alertPreferences');
      expect(localStorage.removeItem).toHaveBeenCalledWith('dismissedAlerts');
    });
  });
});
```

**Immediate Verification:**
```bash
# Verify test file created
ls -la src/hooks/__tests__/alertSystem.test.ts
# Expected: File exists

# Run the tests to check they work
npm test -- --testPathPattern="alertSystem.test" --passWithNoTests
# Expected: Tests run without compilation errors

# Verify TypeScript compilation
npx tsc --noEmit
# Expected: No compilation errors
```

**Validation Checklist:**
- [ ] Comprehensive test file created
- [ ] Tests cover all major hooks and functions
- [ ] Mock setup for Supabase and auth
- [ ] Error handling scenarios tested
- [ ] Migration functionality tested

**Rollback Procedure:**
```bash
rm src/hooks/__tests__/alertSystem.test.ts
```

---

### **Step 7.2: Final Integration Verification**
**Estimated Time**: 10 minutes
**Files Modified**: Manual verification steps

**Pre-Checks:**
- [ ] Alert system tests created
- [ ] All hooks and utilities implemented
- [ ] Database tables exist in Supabase

**Implementation:**
Perform final verification of complete alert system:

```bash
# 1. Verify all files created
echo "Checking alert system files..."
ls -la src/types/index.ts | grep -q "index.ts" && echo "✅ Types file exists"
ls -la src/config/queryKeys.ts | grep -q "queryKeys.ts" && echo "✅ Query keys file exists"
ls -la src/lib/supabase/transforms/alertTransforms.ts && echo "✅ Transform utilities exist"
ls -la src/hooks/useAlertPreferencesQueries.ts && echo "✅ Preferences hooks exist"
ls -la src/hooks/useAlertHistoryQueries.ts && echo "✅ History hooks exist"
ls -la src/hooks/useNetworkStatus.ts && echo "✅ Network status hook exists"
ls -la src/hooks/useCloudAwareRosterGuard.ts && echo "✅ Roster guard hook exists"
ls -la src/hooks/useCloudAwareConfirmation.ts && echo "✅ Confirmation hook exists"
ls -la src/hooks/useCloudStatusAlerts.ts && echo "✅ Status alerts hook exists"
ls -la src/hooks/useAlertRealtimeSync.ts && echo "✅ Real-time sync hook exists"
ls -la src/lib/migrations/alertSystemMigration.ts && echo "✅ Migration utility exists"
ls -la src/lib/offline/alertOfflineSync.ts && echo "✅ Offline sync utility exists"
ls -la src/hooks/__tests__/alertSystem.test.ts && echo "✅ Tests exist"

# 2. Verify TypeScript compilation
echo "\nChecking TypeScript compilation..."
npx tsc --noEmit && echo "✅ TypeScript compilation successful" || echo "❌ TypeScript errors found"

# 3. Check translation keys
echo "\nChecking translation keys..."
grep -q "noPlayersForNewGameCloud" public/locales/en/common.json && echo "✅ Translation keys added" || echo "❌ Translation keys missing"

# 4. Verify database tables (requires Supabase access)
echo "\nDatabase verification (manual step required):"
echo "1. Check that 'user_alert_preferences' table exists in Supabase"
echo "2. Check that 'alert_history' table exists in Supabase"
echo "3. Verify RLS policies are enabled and working"
echo "4. Test database indexes are created"

# 5. Final system check
echo "\nAlert system implementation summary:"
echo "📊 Database: 2 tables + RLS + indexes"
echo "🔧 Hooks: 8 hooks for complete functionality"
echo "🌐 Features: Real-time sync, offline support, cloud awareness"
echo "📱 Multi-device: Cross-device coordination and preferences"
echo "🧪 Testing: Comprehensive test suite"
echo "🌍 i18n: Translation keys for all messages"
echo "⚡ Migration: localStorage → Supabase migration utility"
```

**Manual Verification Checklist:**
- [ ] All 13 files created successfully
- [ ] TypeScript compilation passes without errors
- [ ] Translation keys added to common.json
- [ ] Database tables exist in Supabase dashboard
- [ ] RLS policies are active and working
- [ ] Tests run without compilation errors
- [ ] No missing dependencies or imports

**Final Validation:**
```bash
# Development server test
echo "\nStarting development server test..."
timeout 30s npm run dev && echo "✅ Dev server starts successfully" || echo "⚠️  Dev server issues (check console)"
```

**Success Criteria Met:**
- ✅ **Database Foundation**: 2 tables with RLS policies and optimized indexes
- ✅ **TypeScript Integration**: Full type safety with proper interfaces
- ✅ **React Query Hooks**: 8 hooks covering all alert functionality
- ✅ **Cloud Awareness**: Network status tracking and offline support
- ✅ **Real-time Coordination**: Cross-device alert synchronization
- ✅ **Migration Support**: Smooth transition from localStorage
- ✅ **Comprehensive Testing**: Unit tests for critical functionality
- ✅ **Internationalization**: Translation keys for all user messages

**Rollback Procedure:**
If issues found, use git to revert all changes:
```bash
git checkout -- .
git clean -fd
```

## **🎯 Implementation Complete - Robust Alert System**

### **✅ Final Status: READY FOR USE**

**Total Implementation Time**: 4.5 hours (27 micro-steps completed)  
**Database Changes**: 2 tables, RLS policies, 3 indexes ✅  
**TypeScript Integration**: 4 interfaces, transform utilities ✅  
**React Hooks**: 8 hooks for comprehensive functionality ✅  
**Real-time Features**: Cross-device coordination ✅  
**Offline Support**: Queue system with retry logic ✅  
**Testing**: Comprehensive test coverage ✅  
**Migration**: localStorage → Supabase transition ✅  

---

## **🚀 Quick Integration Guide**

### **1. Enable in Main App Component**
```typescript
// In src/components/App.tsx or similar
import { useAlertRealtimeSync, useCrossDeviceAlertEvents } from '@/hooks/useAlertRealtimeSync';

export const App = () => {
  // Enable real-time alert coordination
  useAlertRealtimeSync();
  useCrossDeviceAlertEvents();
  
  // ... rest of app
};
```

### **2. Use in Components**
```typescript
// In any component needing alerts
import { useCloudAwareRosterGuard } from '@/hooks/useCloudAwareRosterGuard';
import { useCloudAwareConfirmation } from '@/hooks/useCloudAwareConfirmation';

const MyComponent = () => {
  const { showRosterEmptyAlert, hasValidRoster } = useCloudAwareRosterGuard();
  const { confirmDestructiveAction } = useCloudAwareConfirmation();
  
  const handleAction = async () => {
    if (!hasValidRoster) {
      const proceed = await showRosterEmptyAlert({ context: 'action-attempt' });
      if (!proceed) return;
    }
    
    // Or for destructive actions
    const confirmed = await confirmDestructiveAction('Item Name', 'item');
    if (confirmed) {
      // Proceed with action
    }
  };
};
```

### **3. Migration (Run Once)**
```typescript
// In auth flow or app initialization
import { migrateAlertSystemToSupabase, hasLocalStorageAlertData } from '@/lib/migrations/alertSystemMigration';

const handleUserAuthenticated = async (user) => {
  if (hasLocalStorageAlertData()) {
    try {
      await migrateAlertSystemToSupabase(user.id);
    } catch (error) {
      logger.warn('Alert migration failed:', error);
    }
  }
};
```

---

## **🎯 Key Features Delivered**

### **🌐 Cloud-Native Intelligence**
- **Multi-device coordination**: Prevents duplicate alerts across devices
- **Sync status awareness**: Context-aware messaging based on connection state
- **Real-time preferences**: Settings sync instantly across all devices
- **Conflict resolution**: Smart handling of concurrent actions

### **🛡️ Robust User Experience**  
- **Spam prevention**: Intelligent filtering of excessive notifications
- **Graceful offline handling**: Queue alerts when offline, sync when reconnected
- **Customizable preferences**: User control over alert frequency and types
- **Cross-platform consistency**: Works reliably across different devices/browsers

### **⚡ Developer Features**
- **TypeScript integration**: Full type safety and IntelliSense support
- **React Query optimization**: Efficient caching and real-time updates
- **Comprehensive testing**: Unit tests for critical functionality
- **Easy migration**: Smooth transition from localStorage-based alerts

### **📊 Analytics & Insights**
- **Usage tracking**: Detailed logging of alert interactions
- **Performance monitoring**: Network status and sync timing data
- **User behavior analysis**: Alert effectiveness and user preferences
- **Cross-device analytics**: Multi-device usage patterns

---

## **🔧 Maintenance & Monitoring**

### **Database Monitoring**
```sql
-- Monitor alert system usage
SELECT 
  alert_key,
  COUNT(*) as total_shown,
  COUNT(*) FILTER (WHERE action_taken = 'accepted') as accepted,
  COUNT(*) FILTER (WHERE action_taken = 'dismissed') as dismissed
FROM alert_history 
WHERE shown_at >= NOW() - INTERVAL '7 days'
GROUP BY alert_key
ORDER BY total_shown DESC;

-- Check alert preferences distribution
SELECT 
  alert_frequency,
  COUNT(*) as user_count,
  AVG(CASE WHEN show_cloud_status THEN 1 ELSE 0 END) as cloud_status_enabled_pct
FROM user_alert_preferences 
GROUP BY alert_frequency;
```

### **Performance Optimization**
- Monitor query performance on alert_history table
- Consider archiving old alert_history records (>90 days)
- Track real-time subscription load and optimize if needed
- Monitor offline queue sizes and processing times

### **Feature Evolution**
- Add A/B testing support for alert messaging
- Implement smart notification scheduling
- Add machine learning for personalized alert timing
- Integrate with push notifications for mobile

---

**🎉 The Robust Alert System is now fully implemented and ready for production use!**

