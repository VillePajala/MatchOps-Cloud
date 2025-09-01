# Robust Alert System - Supabase Version

## Overview
The Enhanced Robust Alert System provides consistent, internationalized user guidance across all roster-related operations with cloud-aware intelligence. It prevents duplicate alerts, provides clear next-step guidance, uses native browser confirmations for reliable cross-platform behavior, and now includes real-time multi-device coordination and user preference synchronization.

## Enhanced Architecture

### Core Cloud Principles
1. **Unified Cloud Messaging**: Consistent alerts that account for cloud sync status
2. **Multi-device Coordination**: Prevent duplicate alerts across user's devices
3. **User Preference Sync**: Alert preferences synchronized across all devices
4. **Smart Context Awareness**: Cloud-enhanced validation before showing alerts
5. **Real-time State Coordination**: Cross-device state awareness for intelligent alerts

## Data Model (Supabase Tables)

### User Alert Preferences and History
```sql
-- User alert preferences and settings
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

-- Alert history for analytics and prevention of spam
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

-- Enable RLS
ALTER TABLE user_alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert preferences" ON user_alert_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own alert history" ON alert_history
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_alert_preferences_user_id ON user_alert_preferences(user_id);
CREATE INDEX idx_alert_history_user_alert ON alert_history(user_id, alert_key);
CREATE INDEX idx_alert_history_shown_at ON alert_history(user_id, shown_at DESC);
```

### Enhanced Alert Types with Cloud Intelligence

#### 1. Cloud-aware Roster Empty Alerts
**Purpose**: Prevent users from attempting game creation with no players, enhanced with cloud sync status
**Implementation**: Guard conditions with cloud state validation

#### 2. Multi-device Confirmation Alerts
**Purpose**: Prevent duplicate confirmations across devices and coordinate destructive actions
**Implementation**: Cloud-synchronized confirmation state

#### 3. Cloud Sync Status Alerts
**Purpose**: Inform users of cloud synchronization issues and offline states
**Implementation**: Real-time connection status with user-friendly messaging

#### 4. Collaborative Impact Warnings
**Purpose**: Enhanced impact warnings that consider multi-user scenarios
**Implementation**: Real-time conflict detection and resolution guidance

## Enhanced Data Operations

### User Alert Preferences Management
**File**: `src/hooks/useAlertPreferencesQueries.ts`
```typescript
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

export const useAlertPreferences = () => {
  const { data: { user } } = useAuth();
  
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
  const { data: { user } } = useAuth();
  
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
      queryClient.invalidateQueries(queryKeys.alertPreferences(user?.id));
    },
  });
};
```

### Alert History Tracking
**File**: `src/hooks/useAlertHistoryQueries.ts`
```typescript
export const useLogAlert = () => {
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (alertData: {
      alertKey: string;
      context?: any;
      actionTaken: 'accepted' | 'dismissed' | 'ignored';
      deviceId?: string;
      sessionId?: string;
    }) => {
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

// Check recent alert history to prevent spam
export const useRecentAlertHistory = (alertKey: string, timeWindowMinutes: number = 5) => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.recentAlerts(user?.id, alertKey, timeWindowMinutes),
    queryFn: async () => {
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
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
```

## Enhanced Implementation Patterns

### 1. Cloud-aware Guard Condition Pattern
**Usage**: Prevent invalid state transitions with cloud intelligence
```typescript
const useCloudAwareRosterGuard = () => {
  const { data: availablePlayers = [] } = useMasterRoster();
  const { data: alertPreferences } = useAlertPreferences();
  const { data: recentAlerts } = useRecentAlertHistory('roster-empty-warning');
  const logAlert = useLogAlert();
  const updatePreferences = useUpdateAlertPreferences();
  const { isOnline } = useNetworkStatus();
  
  const showRosterEmptyAlert = useCallback(async (context?: any) => {
    // Check if user has disabled these warnings
    if (alertPreferences?.alertPreferences?.skipRosterEmptyWarnings) {
      return false;
    }
    
    // Check if we've shown this alert recently to prevent spam
    const recentAlert = recentAlerts.find(alert => 
      alert.action_taken !== 'dismissed' &&
      Date.now() - new Date(alert.shown_at).getTime() < 5 * 60 * 1000 // 5 minutes
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
    await logAlert.mutateAsync({
      alertKey: 'roster-empty-warning',
      context: { ...context, isOnline, playerCount: availablePlayers.length },
      actionTaken: shouldProceed ? 'accepted' : 'dismissed'
    });
    
    return shouldProceed;
  }, [availablePlayers.length, alertPreferences, recentAlerts, logAlert, isOnline, t]);
  
  return { showRosterEmptyAlert };
};

// Usage in HomePage
const { showRosterEmptyAlert } = useCloudAwareRosterGuard();

const handleStartNewGame = useCallback(async () => {
  if (availablePlayers.length === 0) {
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
}, [availablePlayers.length, showRosterEmptyAlert]);
```

### 2. Multi-device Coordination Pattern
**Usage**: Coordinate alerts and confirmations across user's devices
```typescript
const useMultiDeviceCoordination = () => {
  const { data: { user } } = useAuth();
  const queryClient = useQueryClient();
  
  // Real-time coordination channel
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('alert_coordination')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alert_history',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Handle cross-device alert coordination
          if (payload.eventType === 'INSERT' && payload.new) {
            const alertData = payload.new;
            
            // If another device showed an alert, update our local state
            if (alertData.device_id !== getDeviceId()) {
              queryClient.invalidateQueries(queryKeys.recentAlerts(user.id));
              
              // For certain alerts, hide local pending alerts
              if (['roster-empty-warning', 'workspace-warning'].includes(alertData.alert_key)) {
                window.dispatchEvent(new CustomEvent('crossDeviceAlertShown', {
                  detail: alertData
                }));
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_alert_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Sync alert preferences across devices
          if (payload.new) {
            queryClient.setQueryData(
              queryKeys.alertPreferences(user.id), 
              transformAlertPreferencesFromSupabase(payload.new)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};
```

### 3. Cloud-enhanced Confirmation Pattern
**Usage**: Destructive actions with cloud sync awareness
```typescript
const useCloudAwareConfirmation = () => {
  const { data: alertPreferences } = useAlertPreferences();
  const logAlert = useLogAlert();
  const { isOnline, syncStatus } = useNetworkStatus();
  
  const confirmWithCloudContext = useCallback(async (
    alertKey: string,
    baseMessage: string,
    context?: any
  ): Promise<boolean> => {
    // Build cloud-aware message
    let enhancedMessage = baseMessage;
    
    if (!isOnline) {
      enhancedMessage += '\n\nNote: You\'re currently offline. This action will sync when you reconnect.';
    } else if (syncStatus === 'syncing') {
      enhancedMessage += '\n\nNote: Data is currently syncing across your devices.';
    } else {
      enhancedMessage += '\n\nThis action will sync immediately across all your devices.';
    }
    
    const confirmed = window.confirm(enhancedMessage);
    
    // Log the confirmation interaction
    await logAlert.mutateAsync({
      alertKey,
      context: { ...context, isOnline, syncStatus },
      actionTaken: confirmed ? 'accepted' : 'dismissed'
    });
    
    return confirmed;
  }, [alertPreferences, logAlert, isOnline, syncStatus]);
  
  return { confirmWithCloudContext };
};

// Usage example
const { confirmWithCloudContext } = useCloudAwareConfirmation();

const handleDeletePlayer = async (playerId: string, playerName: string) => {
  const confirmed = await confirmWithCloudContext(
    'delete-player-confirmation',
    `Delete "${playerName}"? This cannot be undone.`,
    { playerId, playerName }
  );
  
  if (!confirmed) return;
  
  try {
    await deletePlayerMutation.mutateAsync(playerId);
    toast.success(`${playerName} deleted and synced across devices`);
  } catch (error) {
    toast.error('Failed to delete player. Please try again.');
  }
};
```

### 4. Smart Cloud Status Alerts
**Usage**: Inform users about cloud sync status and issues
```typescript
const useCloudStatusAlerts = () => {
  const { isOnline, lastOnlineAt } = useNetworkStatus();
  const { data: alertPreferences } = useAlertPreferences();
  const [hasShownOfflineAlert, setHasShownOfflineAlert] = useState(false);
  
  // Show offline alert when going offline
  useEffect(() => {
    if (!isOnline && !hasShownOfflineAlert && alertPreferences?.showSyncNotifications) {
      const offlineTime = Date.now() - (lastOnlineAt || Date.now());
      
      if (offlineTime > 30000) { // Show after 30 seconds offline
        toast.warning(
          'You\'re offline. Changes will sync when reconnected.',
          { id: 'offline-status', duration: 5000 }
        );
        setHasShownOfflineAlert(true);
      }
    } else if (isOnline && hasShownOfflineAlert) {
      toast.success(
        'Back online! Syncing changes...',
        { id: 'online-status', duration: 3000 }
      );
      setHasShownOfflineAlert(false);
    }
  }, [isOnline, hasShownOfflineAlert, alertPreferences, lastOnlineAt]);
  
  // Show sync conflict resolution alerts
  const showSyncConflictAlert = useCallback(async (conflictData: any) => {
    if (!alertPreferences?.showCloudStatus) return 'auto';
    
    const action = await new Promise<'local' | 'remote' | 'auto'>((resolve) => {
      // Custom modal for sync conflicts
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-lg p-6 max-w-md">
            <h3 class="text-lg font-semibold text-white mb-3">Sync Conflict Detected</h3>
            <p class="text-slate-300 mb-4">
              Your data was modified on another device. How would you like to resolve this?
            </p>
            <div class="flex gap-2">
              <button id="use-local" class="px-4 py-2 bg-indigo-600 text-white rounded">Use Local Changes</button>
              <button id="use-remote" class="px-4 py-2 bg-slate-600 text-white rounded">Use Remote Changes</button>
              <button id="auto-resolve" class="px-4 py-2 bg-emerald-600 text-white rounded">Auto Resolve</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      modal.querySelector('#use-local')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve('local');
      });
      
      modal.querySelector('#use-remote')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve('remote');
      });
      
      modal.querySelector('#auto-resolve')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve('auto');
      });
    });
    
    return action;
  }, [alertPreferences]);
  
  return { showSyncConflictAlert };
};
```

## Real-time Alert Coordination

### Cross-device Alert Synchronization
**File**: `src/hooks/useAlertRealtimeSync.ts`
```typescript
export const useAlertRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
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
            // Another device showed an alert
            queryClient.invalidateQueries(queryKeys.recentAlerts(user.id));
            
            // Coordinate cross-device alert behavior
            const alertData = payload.new;
            if (alertData.action_taken === 'dismissed') {
              // User dismissed alert on another device - update local state
              window.dispatchEvent(new CustomEvent('alertDismissedElsewhere', {
                detail: alertData
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);
};
```

## Enhanced Translation System

### Cloud-aware Translation Keys
**File**: `public/locales/en/common.json`
```json
{
  "controlBar": {
    "noPlayersForNewGame": "You need at least one player in your roster to create a game. Would you like to add players now?",
    "noPlayersForNewGameCloud": "You need at least one player in your roster to create a game. Your roster syncs across all devices. Would you like to add players now?",
    "noPlayersForNewGameOffline": "You need at least one player in your roster to create a game. You're currently offline - players will sync when reconnected. Would you like to add players now?",
    "syncConflictDetected": "Data sync conflict detected. Your changes may conflict with updates from another device.",
    "offlineChangesWillSync": "You're offline. Changes will sync when reconnected.",
    "backOnlineSyncing": "Back online! Syncing changes...",
    "multiDeviceActionWarning": "This action will sync immediately across all your devices."
  },
  "alerts": {
    "cloudSyncStatus": "Cloud Sync Status",
    "offlineMode": "Offline Mode",
    "syncingChanges": "Syncing changes...",
    "conflictResolution": "Conflict Resolution",
    "useLocalChanges": "Use Local Changes",
    "useRemoteChanges": "Use Remote Changes", 
    "autoResolve": "Auto Resolve",
    "alertPreferences": "Alert Preferences",
    "showSyncNotifications": "Show sync notifications",
    "showCloudStatus": "Show cloud status updates",
    "alertFrequency": "Alert frequency",
    "minimal": "Minimal",
    "normal": "Normal",
    "verbose": "Verbose"
  }
}
```

## Migration from localStorage Version

### Alert System Migration
**File**: `src/utils/migration/migrateAlertSystemToSupabase.ts`
```typescript
export const migrateAlertSystemToSupabase = async (userId: string) => {
  // 1. Check existing localStorage alert preferences
  const alertPrefs = localStorage.getItem('alertPreferences');
  const dismissedAlerts = localStorage.getItem('dismissedAlerts');
  const lastRosterWarning = localStorage.getItem('lastRosterWarning');
  
  let parsedPrefs = {};
  let parsedDismissed: string[] = [];
  
  try {
    if (alertPrefs) parsedPrefs = JSON.parse(alertPrefs);
    if (dismissedAlerts) parsedDismissed = JSON.parse(dismissedAlerts);
  } catch (error) {
    logger.warn('Failed to parse alert preferences:', error);
  }
  
  // 2. Create initial Supabase alert preferences
  const initialPreferences = {
    user_id: userId,
    alert_preferences: parsedPrefs,
    dismissed_alerts: parsedDismissed,
    alert_frequency: 'normal',
    show_cloud_status: true,
    show_sync_notifications: true,
    last_roster_warning: lastRosterWarning ? new Date(lastRosterWarning).toISOString() : null
  };
  
  // 3. Save to Supabase
  const { error } = await supabase
    .from('user_alert_preferences')
    .upsert([initialPreferences], {
      onConflict: 'user_id'
    });
  
  if (error) throw new StorageError('supabase', 'migrateAlertPreferences', error);
  
  // 4. Clean up localStorage
  localStorage.removeItem('alertPreferences');
  localStorage.removeItem('dismissedAlerts');
  localStorage.removeItem('lastRosterWarning');
  
  logger.info('Alert system preferences migrated to Supabase');
};
```

## Offline Support

### Offline Alert Queue
**File**: `src/utils/offline/alertCache.ts`
```typescript
export const useOfflineAlertSync = () => {
  const [offlineAlerts, setOfflineAlerts] = useLocalStorage('alertOfflineQueue', []);
  
  const queueOfflineAlert = useCallback((alertData) => {
    setOfflineAlerts(queue => [...queue, {
      id: crypto.randomUUID(),
      ...alertData,
      timestamp: Date.now()
    }]);
  }, [setOfflineAlerts]);
  
  const processOfflineAlertQueue = useCallback(async () => {
    if (!navigator.onLine || offlineAlerts.length === 0) return;
    
    for (const alert of offlineAlerts) {
      try {
        await supabase
          .from('alert_history')
          .insert([{
            user_id: alert.userId,
            alert_key: alert.alertKey,
            context: alert.context,
            action_taken: alert.actionTaken,
            device_id: alert.deviceId,
            session_id: alert.sessionId,
            shown_at: new Date(alert.timestamp).toISOString()
          }]);
        
        // Remove successful alert from queue
        setOfflineAlerts(queue => queue.filter(q => q.id !== alert.id));
        
      } catch (error) {
        logger.warn('Failed to sync alert to cloud:', error);
        // Keep in queue for retry
      }
    }
  }, [offlineAlerts, setOfflineAlerts]);
  
  // Process queue when coming online
  useEffect(() => {
    const handleOnline = () => processOfflineAlertQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processOfflineAlertQueue]);
  
  return { queueOfflineAlert, processOfflineAlertQueue };
};
```

## Benefits of Supabase Migration

### Enhanced User Experience
- **Cross-device Coordination**: Prevents duplicate alerts across user's devices
- **Intelligent Spam Prevention**: Cloud-based alert history prevents excessive notifications
- **Personalized Preferences**: Alert preferences sync across all devices
- **Context-aware Messaging**: Alerts include cloud sync status and multi-device context

### Improved System Intelligence
- **Real-time State Awareness**: Alerts consider current cloud sync status
- **Multi-user Coordination**: Handle alerts in collaborative scenarios
- **Conflict Resolution**: Smart handling of concurrent actions across devices
- **Usage Analytics**: Track alert effectiveness and user preferences

### Developer Benefits
- **Centralized Configuration**: Cloud-based alert preferences management
- **Real-time Coordination**: WebSocket-based cross-device communication
- **Analytics Integration**: Built-in alert interaction tracking
- **A/B Testing Support**: Cloud-based alert content and behavior testing

## Developer Checklist

### Database Setup
- [ ] User alert preferences table with RLS policies
- [ ] Alert history table for analytics and spam prevention
- [ ] Database indexes for optimal query performance
- [ ] Migration script for localStorage alert preferences

### API Integration
- [ ] SupabaseProvider enhanced with alert system operations
- [ ] React Query hooks for alert preferences and history
- [ ] Real-time subscriptions for cross-device alert coordination
- [ ] Offline queue for alert interactions

### UI Components
- [ ] Cloud-aware alert components with sync status
- [ ] Multi-device coordination for duplicate alert prevention
- [ ] Smart confirmation dialogs with cloud context
- [ ] Alert preferences management interface

### UX Features
- [ ] Cross-device alert preference synchronization
- [ ] Real-time conflict resolution alerts
- [ ] Offline alert queuing with online sync
- [ ] Intelligent spam prevention across devices

### Testing
- [ ] Unit tests for alert hooks and cloud coordination
- [ ] Integration tests for multi-device alert scenarios
- [ ] E2E tests for cross-device alert preference sync
- [ ] Migration testing for localStorage → Supabase transition