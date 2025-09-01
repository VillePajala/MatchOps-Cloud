# First Game Onboarding - Supabase Version

## Overview
Comprehensive cloud-aware onboarding system with three interconnected layers designed to guide users from initial app setup through their first real game experience. Enhanced with user preferences sync, cross-device onboarding state, and real-time guidance updates.

1. **Center Overlay** - Initial setup guidance with cloud sync awareness
2. **Top Warning Banner** - Temporary workspace alerts with cloud state validation
3. **First Game Interface Guide** - Tutorial overlay with user progress tracking in Supabase

The system provides dynamic feedback based on existing teams, seasons/tournaments, and user preferences stored in the cloud, ensuring contextual guidance across all devices.

## Data Model (Supabase Tables)

### User Preferences and Progress Tracking
```sql
-- User onboarding progress and preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_seen_first_game_guide BOOLEAN DEFAULT FALSE,
  has_completed_initial_setup BOOLEAN DEFAULT FALSE,
  preferred_language TEXT DEFAULT 'en',
  onboarding_progress JSONB DEFAULT '{}',
  workspace_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS for user isolation
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Onboarding help content (for dynamic help system)
CREATE TABLE onboarding_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(content_key, language)
);

-- RLS policy for content (read-only for users)
ALTER TABLE onboarding_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read onboarding content" ON onboarding_content
  FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_onboarding_content_key_lang ON onboarding_content(content_key, language);
```

## Enhanced Architecture Changes

### Core Constants (Cloud-aware)
**File**: `src/config/constants.ts`
```typescript
export const DEFAULT_GAME_ID = 'unsaved_game';
export const ONBOARDING_VERSION = '2.0'; // Cloud version tracking
```

### User Preferences Integration
**File**: `src/types/index.ts`
```typescript
export interface UserOnboardingProgress {
  id: string;
  userId: string;
  hasSeenFirstGameGuide: boolean;
  hasCompletedInitialSetup: boolean;
  preferredLanguage: string;
  onboardingProgress: {
    centerOverlayShown?: boolean;
    warningBannerSeen?: boolean;
    guideStepsCompleted?: number[];
    lastActiveStep?: number;
  };
  workspacePreferences: {
    skipWorkspaceWarning?: boolean;
    defaultGameSettings?: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OnboardingContent {
  id: string;
  contentKey: string;
  language: string;
  title: string;
  description?: string;
  content: {
    steps: OnboardingStep[];
    resources: any[];
  };
  version: number;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  completed?: boolean;
}
```

## Enhanced Data Operations

### User Progress Tracking
**File**: `src/hooks/useOnboardingQueries.ts`
```typescript
export const useOnboardingProgress = () => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.onboardingProgress(user?.id),
    queryFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Not found error is OK
        throw new StorageError('supabase', 'getOnboardingProgress', error);
      }
      
      return data ? transformOnboardingProgressFromSupabase(data) : null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateOnboardingProgress = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<UserOnboardingProgress>) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const supabaseUpdates = transformOnboardingProgressToSupabase(updates, user.id);
      
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert([{ user_id: user.id, ...supabaseUpdates }], {
          onConflict: 'user_id'
        })
        .select()
        .single();
      
      if (error) throw new StorageError('supabase', 'updateOnboardingProgress', error);
      return transformOnboardingProgressFromSupabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.onboardingProgress(user?.id));
    },
    // Optimistic update for immediate UI feedback
    onMutate: async (newProgress) => {
      if (!user) return;
      
      await queryClient.cancelQueries(queryKeys.onboardingProgress(user.id));
      const previousProgress = queryClient.getQueryData(queryKeys.onboardingProgress(user.id));
      
      queryClient.setQueryData(queryKeys.onboardingProgress(user.id), (old: UserOnboardingProgress | null) => 
        old ? { ...old, ...newProgress, updatedAt: new Date().toISOString() } : null
      );
      
      return { previousProgress };
    },
    onError: (err, variables, context) => {
      if (context?.previousProgress && user) {
        queryClient.setQueryData(queryKeys.onboardingProgress(user.id), context.previousProgress);
      }
    },
  });
};
```

### Dynamic Content Loading
**File**: `src/hooks/useOnboardingContent.ts`
```typescript
export const useOnboardingContent = (contentKey: string) => {
  const { i18n } = useTranslation();
  
  return useQuery({
    queryKey: queryKeys.onboardingContent(contentKey, i18n.language),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_content')
        .select('*')
        .eq('content_key', contentKey)
        .eq('language', i18n.language)
        .single();
      
      if (error) {
        // Fallback to English if content not available in user's language
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('onboarding_content')
          .select('*')
          .eq('content_key', contentKey)
          .eq('language', 'en')
          .single();
        
        if (fallbackError) throw new StorageError('supabase', 'getOnboardingContent', fallbackError);
        return transformOnboardingContentFromSupabase(fallbackData);
      }
      
      return transformOnboardingContentFromSupabase(data);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (content doesn't change often)
  });
};
```

## Real-time Synchronization

### Cross-device Onboarding Sync
**File**: `src/hooks/useOnboardingRealtimeSync.ts`
```typescript
export const useOnboardingRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('onboarding_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update onboarding progress cache
          queryClient.invalidateQueries(queryKeys.onboardingProgress(user.id));
          
          // Handle specific onboarding state changes
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newProgress = transformOnboardingProgressFromSupabase(payload.new);
            
            // Sync guide state across tabs
            if (newProgress.hasSeenFirstGameGuide) {
              // Close guide on other tabs if completed on one
              window.dispatchEvent(new CustomEvent('onboardingGuideCompleted', {
                detail: newProgress
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

## Enhanced Layer 1: Cloud-aware Center Overlay

### Display Conditions with Cloud State
**File**: `src/components/HomePage.tsx`

```typescript
// Enhanced with cloud state awareness
const { data: onboardingProgress } = useOnboardingProgress();
const { data: user } = useAuth();

// Cloud-aware detection
const showCenterOverlay = useMemo(() => {
  return currentGameId === DEFAULT_GAME_ID && 
         playersOnField.length === 0 && 
         drawings.length === 0 &&
         user && // Ensure authenticated
         (!onboardingProgress?.hasCompletedInitialSetup);
}, [currentGameId, playersOnField.length, drawings.length, user, onboardingProgress]);

{showCenterOverlay && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
    <div className="bg-slate-800/95 border border-indigo-500/50 rounded-xl p-10 max-w-lg mx-4 pointer-events-auto shadow-2xl backdrop-blur-sm">
      <CloudAwareOnboardingContent />
    </div>
  </div>
)}
```

### Enhanced Content with Cloud Benefits
```typescript
const CloudAwareOnboardingContent = () => {
  const { data: teams = [] } = useTeams();
  const { data: seasons = [] } = useSeasons();
  const { data: tournaments = [] } = useTournaments();
  const updateProgress = useUpdateOnboardingProgress();
  
  const hasSeasonsTournaments = seasons.length > 0 || tournaments.length > 0;
  
  const handleCompleteSetup = async () => {
    await updateProgress.mutateAsync({
      hasCompletedInitialSetup: true,
      onboardingProgress: {
        centerOverlayShown: true
      }
    });
  };
  
  return (
    <>
      <div className="text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
          <HiOutlineCloud className="w-8 h-8 text-white" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-white mb-3">
            {availablePlayers.length === 0 
              ? t('firstGame.titleNoPlayersCloud', 'Welcome to MatchOps Cloud!') 
              : t('firstGame.titleCloud', 'Ready to track your first cloud game?')}
          </h2>
          <p className="text-slate-300 leading-relaxed">
            {availablePlayers.length === 0 
              ? t('firstGame.descNoPlayersCloud', 'Your data syncs across all devices. Start by setting up your team roster to access cloud features.') 
              : t('firstGame.descCloud', 'Create a game and your data will sync across all your devices in real-time.')}
          </p>
        </div>
        
        {/* Cloud benefits callout */}
        <div className="bg-indigo-900/30 rounded-lg p-4 text-left">
          <h4 className="text-indigo-200 font-semibold mb-2">Cloud Benefits:</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>✓ Sync across all your devices</li>
            <li>✓ Real-time collaboration</li>
            <li>✓ Automatic backup and recovery</li>
            <li>✓ Advanced statistics and analytics</li>
          </ul>
        </div>
        
        {/* Enhanced dynamic buttons with cloud context */}
        <div className="space-y-3">
          {availablePlayers.length === 0 ? (
            <>
              <button
                onClick={() => setIsRosterModalOpen(true)}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                {t('firstGame.setupCloudRoster', 'Set up Cloud Roster')}
              </button>
              <button
                onClick={() => setIsInstructionsModalOpen(true)}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg border border-slate-600 transition-colors duration-200"
              >
                {t('firstGame.howItWorksCloud', 'How Cloud Features Work')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsNewGameSetupModalOpen(true)}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                {t('firstGame.createFirstCloudGame', 'Create First Cloud Game')}
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsTeamManagerModalOpen(true)}
                  className={teams.length > 0 
                    ? "px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors" 
                    : "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  }
                >
                  {teams.length > 0 
                    ? t('firstGame.manageTeamsCloud', 'Cloud Teams') 
                    : t('firstGame.createTeamCloud', 'Create Cloud Team')
                  }
                </button>
                
                <button
                  onClick={() => setIsSeasonTournamentModalOpen(true)}
                  className={hasSeasonsTournaments 
                    ? "px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors" 
                    : "px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                  }
                >
                  {hasSeasonsTournaments 
                    ? t('firstGame.manageSeasonsCloud', 'Cloud Seasons') 
                    : t('firstGame.createSeasonCloud', 'Create Season')
                  }
                </button>
              </div>
            </>
          )}
        </div>
        
        <button
          onClick={handleCompleteSetup}
          className="w-full text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          {t('firstGame.skipOnboarding', 'Skip setup (I\'ll explore on my own)')}
        </button>
      </div>
    </>
  );
};
```

## Enhanced Layer 2: Cloud-aware Warning Banner

### Enhanced Display Conditions
```typescript
const { data: onboardingProgress } = useOnboardingProgress();

const showWorkspaceWarning = useMemo(() => {
  return currentGameId === DEFAULT_GAME_ID && 
         (playersOnField.length > 0 || drawings.length > 0) &&
         !onboardingProgress?.workspacePreferences?.skipWorkspaceWarning;
}, [currentGameId, playersOnField.length, drawings.length, onboardingProgress]);

{showWorkspaceWarning && (
  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
    <div className="bg-amber-600/95 border border-amber-500/50 rounded-lg px-6 py-3 shadow-xl backdrop-blur-sm max-w-md">
      <div className="flex items-center gap-3">
        <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-200 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-amber-100 text-sm font-medium leading-tight">
            {t('firstGame.workspaceWarningCloud', 'This is a temporary workspace. Create a cloud game to save your progress and sync across devices.')}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreateCloudGame}
              className="text-xs bg-amber-700 hover:bg-amber-800 text-amber-100 px-2 py-1 rounded transition-colors"
            >
              {t('firstGame.createCloudGame', 'Create Cloud Game')}
            </button>
            <button
              onClick={handleDismissWarning}
              className="text-xs text-amber-300 hover:text-amber-200 transition-colors"
            >
              {t('firstGame.dontShowAgain', "Don't show again")}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```

## Enhanced Layer 3: Cloud-synchronized Interface Guide

### Enhanced Trigger Logic with Cloud Tracking
```typescript
const { data: onboardingProgress } = useOnboardingProgress();
const updateProgress = useUpdateOnboardingProgress();

// Real-time sync listener
useOnboardingRealtimeSync();

const [showFirstGameGuide, setShowFirstGameGuide] = useState<boolean>(false);
const [firstGameGuideStep, setFirstGameGuideStep] = useState<number>(0);

// Enhanced guide display logic
useEffect(() => {
  const shouldShowGuide = !onboardingProgress?.hasSeenFirstGameGuide && 
                         currentGameId && 
                         currentGameId !== DEFAULT_GAME_ID &&
                         playersOnField.length === 0 &&
                         initialLoadComplete;
  
  if (shouldShowGuide) {
    const timer = setTimeout(() => {
      setShowFirstGameGuide(true);
      setFirstGameGuideStep(onboardingProgress?.onboardingProgress?.lastActiveStep || 0);
    }, 1500);
    
    return () => clearTimeout(timer);
  }
}, [onboardingProgress, currentGameId, playersOnField.length, initialLoadComplete]);

// Enhanced close handler with cloud sync
const handleCloseGuide = async () => {
  setShowFirstGameGuide(false);
  
  // Save progress to cloud
  await updateProgress.mutateAsync({
    hasSeenFirstGameGuide: true,
    onboardingProgress: {
      ...onboardingProgress?.onboardingProgress,
      guideStepsCompleted: Array.from({ length: 7 }, (_, i) => i),
      lastActiveStep: 7
    }
  });
};

// Step navigation with cloud sync
const handleNextOrClose = async () => {
  if (firstGameGuideStep === 6) {
    await handleCloseGuide();
  } else {
    const nextStep = firstGameGuideStep + 1;
    setFirstGameGuideStep(nextStep);
    
    // Save step progress
    await updateProgress.mutateAsync({
      onboardingProgress: {
        ...onboardingProgress?.onboardingProgress,
        lastActiveStep: nextStep,
        guideStepsCompleted: [
          ...(onboardingProgress?.onboardingProgress?.guideStepsCompleted || []),
          firstGameGuideStep
        ]
      }
    });
  }
};
```

### Cloud-Enhanced Guide Content
```typescript
const CloudEnhancedGuideStep = ({ step, currentStep }: { step: number; currentStep: number }) => {
  if (step !== currentStep) return null;
  
  const getStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-indigo-200 text-base flex items-center gap-2">
              <HiOutlineCloud className="w-5 h-5" />
              {t('firstGameGuide.playerSelectionCloud', 'Cloud Player Selection (Synced)')}
            </h3>
            <ul className="text-sm text-slate-300 space-y-2 list-disc pl-4 marker:text-slate-400">
              <li>{t('firstGameGuide.tapToSelectCloud', 'Tap player disc to select (syncs across devices)')}</li>
              <li>{t('firstGameGuide.goalieInstructionsCloud', 'Goalkeeper status syncs to all your devices')}</li>
              <li>{t('firstGameGuide.tapFieldPlaceCloud', 'Player positions sync in real-time')}</li>
            </ul>
            <div className="bg-indigo-900/30 rounded-lg p-3 mt-3">
              <p className="text-xs text-indigo-200 font-medium">Cloud Feature:</p>
              <p className="text-xs text-slate-300">Your player selections sync instantly across all logged-in devices.</p>
            </div>
          </div>
        );
      
      case 1:
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-indigo-200 text-base flex items-center gap-2">
              <HiOutlineGlobeAlt className="w-5 h-5" />
              {t('firstGameGuide.theFieldCloud', 'The Field (Real-time Sync)')}
            </h3>
            <ul className="text-sm text-slate-300 space-y-2 list-disc pl-4 marker:text-slate-400">
              <li>
                <span className="text-slate-200">{t('firstGameGuide.placeAllTipCloud', 'Place all players (syncs to team):')}</span>
                <HiOutlineSquares2X2 aria-hidden className="inline-block align-[-2px] ml-2 text-purple-300" size={18} />
              </li>
              <li>
                <span className="text-slate-200">{t('firstGameGuide.addOpponentTipCloud', 'Add opponents (shared view):')}</span>
                <HiOutlinePlusCircle aria-hidden className="inline-block align-[-2px] ml-2 text-red-300" size={18} />
              </li>
              <li>{t('firstGameGuide.dragToAdjustCloud', 'Drag players - changes sync in real-time')}</li>
              <li>{t('firstGameGuide.doubleTapRemoveCloud', 'Double-tap to remove (syncs removal)')}</li>
            </ul>
            <div className="bg-emerald-900/30 rounded-lg p-3 mt-3">
              <p className="text-xs text-emerald-200 font-medium">Multi-device Support:</p>
              <p className="text-xs text-slate-300">Field changes appear instantly on all connected devices.</p>
            </div>
          </div>
        );
      
      // Additional enhanced steps with cloud features...
      default:
        return null;
    }
  };
  
  return getStepContent();
};
```

## Migration from localStorage Version

### Data Migration Strategy
**File**: `src/utils/migration/migrateOnboardingToSupabase.ts`
```typescript
export const migrateOnboardingToSupabase = async (userId: string) => {
  // 1. Check existing localStorage onboarding state
  const hasSeenGuide = localStorage.getItem('hasSeenFirstGameGuide') === 'true';
  const workspacePrefs = localStorage.getItem('workspacePreferences');
  
  let parsedWorkspacePrefs = {};
  try {
    parsedWorkspacePrefs = workspacePrefs ? JSON.parse(workspacePrefs) : {};
  } catch (error) {
    logger.warn('Failed to parse workspace preferences:', error);
  }
  
  // 2. Create initial Supabase user preferences
  const initialPreferences: Partial<UserOnboardingProgress> = {
    userId,
    hasSeenFirstGameGuide: hasSeenGuide,
    hasCompletedInitialSetup: hasSeenGuide, // Assume completed if guide was seen
    onboardingProgress: {
      centerOverlayShown: hasSeenGuide,
      warningBannerSeen: true,
      guideStepsCompleted: hasSeenGuide ? [0, 1, 2, 3, 4, 5, 6] : [],
      lastActiveStep: hasSeenGuide ? 7 : 0
    },
    workspacePreferences: parsedWorkspacePrefs
  };
  
  // 3. Save to Supabase
  const { error } = await supabase
    .from('user_preferences')
    .upsert([transformOnboardingProgressToSupabase(initialPreferences, userId)], {
      onConflict: 'user_id'
    });
  
  if (error) throw new StorageError('supabase', 'migrateOnboardingPreferences', error);
  
  // 4. Clean up localStorage (optional)
  localStorage.removeItem('hasSeenFirstGameGuide');
  localStorage.removeItem('workspacePreferences');
};
```

## Offline Support

### Offline Onboarding Cache
**File**: `src/utils/offline/onboardingCache.ts`
```typescript
export const useOfflineOnboardingSync = () => {
  const [offlineProgress, setOfflineProgress] = useLocalStorage(
    'onboardingOfflineQueue', 
    []
  );
  
  const addToOfflineQueue = useCallback((operation) => {
    setOfflineProgress(queue => [...queue, {
      id: crypto.randomUUID(),
      type: 'UPDATE_ONBOARDING_PROGRESS',
      data: operation.data,
      timestamp: Date.now(),
      retries: 0
    }]);
  }, [setOfflineProgress]);
  
  const processOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || offlineProgress.length === 0) return;
    
    for (const operation of offlineProgress) {
      try {
        await supabase
          .from('user_preferences')
          .upsert([operation.data], { onConflict: 'user_id' });
        
        // Remove successful operation
        setOfflineProgress(queue => queue.filter(op => op.id !== operation.id));
        
      } catch (error) {
        // Handle retry logic
        if (operation.retries < 3) {
          setOfflineProgress(queue => queue.map(op => 
            op.id === operation.id 
              ? { ...op, retries: op.retries + 1 }
              : op
          ));
        } else {
          // Max retries exceeded
          setOfflineProgress(queue => queue.filter(op => op.id !== operation.id));
        }
      }
    }
  }, [offlineProgress, setOfflineProgress]);
  
  // Process queue when coming online
  useEffect(() => {
    const handleOnline = () => processOfflineQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processOfflineQueue]);
  
  return { addToOfflineQueue, processOfflineQueue };
};
```

## Enhanced Translation System

### Cloud-specific Translation Keys
```json
{
  "firstGame": {
    "titleNoPlayersCloud": "Welcome to MatchOps Cloud!",
    "titleCloud": "Ready to track your first cloud game?",
    "descNoPlayersCloud": "Your data syncs across all devices. Start by setting up your team roster to access cloud features.",
    "descCloud": "Create a game and your data will sync across all your devices in real-time.",
    "setupCloudRoster": "Set up Cloud Roster",
    "howItWorksCloud": "How Cloud Features Work",
    "createFirstCloudGame": "Create First Cloud Game",
    "manageTeamsCloud": "Cloud Teams",
    "createTeamCloud": "Create Cloud Team",
    "manageSeasonsCloud": "Cloud Seasons",
    "createSeasonCloud": "Create Season",
    "workspaceWarningCloud": "This is a temporary workspace. Create a cloud game to save your progress and sync across devices.",
    "createCloudGame": "Create Cloud Game",
    "dontShowAgain": "Don't show again",
    "skipOnboarding": "Skip setup (I'll explore on my own)"
  },
  "firstGameGuide": {
    "playerSelectionCloud": "Cloud Player Selection (Synced)",
    "tapToSelectCloud": "Tap player disc to select (syncs across devices)",
    "goalieInstructionsCloud": "Goalkeeper status syncs to all your devices",
    "tapFieldPlaceCloud": "Player positions sync in real-time",
    "theFieldCloud": "The Field (Real-time Sync)",
    "placeAllTipCloud": "Place all players (syncs to team):",
    "addOpponentTipCloud": "Add opponents (shared view):",
    "dragToAdjustCloud": "Drag players - changes sync in real-time",
    "doubleTapRemoveCloud": "Double-tap to remove (syncs removal)"
  }
}
```

## Performance Optimizations

### Onboarding Content Caching
```sql
-- Materialized view for frequently accessed onboarding content
CREATE MATERIALIZED VIEW onboarding_content_cache AS
SELECT 
  content_key,
  language,
  title,
  content,
  version
FROM onboarding_content
WHERE version = (
  SELECT MAX(version) 
  FROM onboarding_content oc2 
  WHERE oc2.content_key = onboarding_content.content_key 
    AND oc2.language = onboarding_content.language
);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_onboarding_content_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY onboarding_content_cache;
END;
$$ LANGUAGE plpgsql;
```

## Benefits of Supabase Migration

### Enhanced User Experience
- **Cross-device Continuity**: Onboarding state syncs across all devices
- **Personalized Content**: Dynamic onboarding based on user progress
- **Real-time Guidance**: Live updates of onboarding steps across sessions
- **Progressive Enhancement**: Cloud features highlighted during onboarding

### Improved Data Management
- **User Isolation**: RLS ensures private onboarding experiences
- **Progress Tracking**: Detailed analytics on onboarding completion
- **Content Versioning**: Ability to update onboarding content dynamically
- **Offline Support**: Onboarding works offline with sync on reconnection

## Developer Checklist

### Database Setup
- [ ] User preferences table created with RLS policies
- [ ] Onboarding content table with versioning support
- [ ] Database indexes for optimal query performance
- [ ] Migration script from localStorage to Supabase

### API Integration
- [ ] SupabaseProvider enhanced with onboarding operations
- [ ] React Query hooks for onboarding progress and content
- [ ] Real-time subscriptions for cross-device sync
- [ ] Offline sync queue for onboarding operations

### UI Components
- [ ] Cloud-aware center overlay with sync benefits
- [ ] Enhanced warning banner with cloud context
- [ ] Multi-device synchronized interface guide
- [ ] Progress tracking and step persistence

### UX Features
- [ ] Cross-device onboarding state synchronization
- [ ] Real-time guide progress updates
- [ ] Offline onboarding with sync queue
- [ ] Dynamic content loading based on user language

### Testing
- [ ] Unit tests for onboarding hooks and transforms
- [ ] Integration tests for real-time sync scenarios
- [ ] E2E tests for cross-device onboarding flows
- [ ] Migration testing for localStorage → Supabase transition