# Adaptive Start Screen (Cloud-Enhanced Dual-Mode) - Supabase Version

## Overview
Cloud-enhanced adaptive start screen that intelligently switches between a simplified first-time user interface and a full-featured interface for experienced users. Enhanced with user preference synchronization, real-time state updates, cross-device continuity, and personalized recommendations based on cloud data analysis.

## Enhanced Data Model (Supabase Tables)

### User State and Preferences
```sql
-- Enhanced user preferences with cloud sync
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_screen_mode TEXT DEFAULT 'auto' CHECK (start_screen_mode IN ('auto', 'simple', 'advanced')),
  preferred_language TEXT DEFAULT 'en',
  theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('light', 'dark', 'auto')),
  last_active_feature TEXT,
  feature_usage_stats JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  start_screen_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- User activity tracking for intelligent recommendations
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,
  device_info JSONB DEFAULT '{}'
);

-- Start screen analytics for optimization
CREATE TABLE start_screen_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  screen_mode TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  button_clicked TEXT,
  time_spent_seconds INTEGER,
  context JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE start_screen_analytics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own activity" ON user_activity
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics" ON start_screen_analytics
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_activity_user_timestamp ON user_activity(user_id, timestamp DESC);
CREATE INDEX idx_start_screen_analytics_user ON start_screen_analytics(user_id, timestamp DESC);
```

### Enhanced Detection Logic with Cloud Intelligence

#### Cloud-aware User Classification
**File**: `src/hooks/useCloudUserState.ts`
```typescript
export interface CloudUserState {
  isFirstTimeUser: boolean;
  hasPlayers: boolean;
  hasSavedGames: boolean;
  hasTeams: boolean;
  hasSeasonsTournaments: boolean;
  canResume: boolean;
  userPreferences: UserPreferences;
  activitySummary: {
    totalGames: number;
    totalPlayers: number;
    lastActivity: string;
    favoriteFeatures: string[];
    completionRate: number;
  };
  recommendedActions: RecommendedAction[];
}

export interface UserPreferences {
  id: string;
  userId: string;
  startScreenMode: 'auto' | 'simple' | 'advanced';
  preferredLanguage: string;
  themePreference: 'light' | 'dark' | 'auto';
  lastActiveFeature?: string;
  featureUsageStats: Record<string, number>;
  onboardingCompleted: boolean;
  startScreenPreferences: {
    hideCompletedActions?: boolean;
    showQuickStats?: boolean;
    preferredButtonOrder?: string[];
    showCloudStatus?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface RecommendedAction {
  id: string;
  type: 'setup' | 'feature' | 'improvement';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  completed: boolean;
  estimatedTime?: string;
}

export const useCloudUserState = () => {
  const { data: { user } } = useAuth();
  const { data: players = [] } = useMasterRoster();
  const { data: games = {} } = useSavedGames();
  const { data: teams = [] } = useTeams();
  const { data: seasons = [] } = useSeasons();
  const { data: tournaments = [] } = useTournaments();
  const { data: userPreferences } = useUserPreferences();
  const { data: activitySummary } = useUserActivitySummary();
  
  const cloudUserState: CloudUserState = useMemo(() => {
    const hasPlayers = players.length > 0;
    const hasSavedGames = Object.keys(games).length > 0;
    const hasTeams = teams.length > 0;
    const hasSeasonsTournaments = seasons.length > 0 || tournaments.length > 0;
    
    // Enhanced first-time user detection with cloud intelligence
    const isFirstTimeUser = userPreferences?.startScreenMode === 'auto' 
      ? (!hasPlayers || !hasSavedGames) && !userPreferences?.onboardingCompleted
      : userPreferences?.startScreenMode === 'simple';
    
    // Check resume capability
    const canResume = userPreferences?.lastActiveFeature === 'game' && hasSavedGames;
    
    // Generate intelligent recommendations
    const recommendedActions = generateRecommendedActions({
      hasPlayers,
      hasSavedGames,
      hasTeams,
      hasSeasonsTournaments,
      userPreferences,
      activitySummary
    });
    
    return {
      isFirstTimeUser,
      hasPlayers,
      hasSavedGames,
      hasTeams,
      hasSeasonsTournaments,
      canResume,
      userPreferences: userPreferences || getDefaultPreferences(user?.id),
      activitySummary: activitySummary || getDefaultActivitySummary(),
      recommendedActions
    };
  }, [players, games, teams, seasons, tournaments, userPreferences, activitySummary, user]);
  
  return cloudUserState;
};
```

### Enhanced Data Operations

#### User Preferences Management
**File**: `src/hooks/useUserPreferencesQueries.ts`
```typescript
export const useUserPreferences = () => {
  const { data: { user } } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.userPreferences(user?.id),
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw new StorageError('supabase', 'getUserPreferences', error);
      }
      
      return data ? transformUserPreferencesFromSupabase(data) : null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      const supabaseUpdates = transformUserPreferencesToSupabase(updates, user.id);
      
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert([{ 
          user_id: user.id, 
          ...supabaseUpdates,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'user_id'
        })
        .select()
        .single();
      
      if (error) throw new StorageError('supabase', 'updateUserPreferences', error);
      return transformUserPreferencesFromSupabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.userPreferences(user?.id));
    },
    // Optimistic update for immediate UI response
    onMutate: async (newPrefs) => {
      if (!user) return;
      
      await queryClient.cancelQueries(queryKeys.userPreferences(user.id));
      const previousPrefs = queryClient.getQueryData(queryKeys.userPreferences(user.id));
      
      queryClient.setQueryData(queryKeys.userPreferences(user.id), (old: UserPreferences | null) => 
        old ? { ...old, ...newPrefs, updatedAt: new Date().toISOString() } : null
      );
      
      return { previousPrefs };
    },
    onError: (err, variables, context) => {
      if (context?.previousPrefs && user) {
        queryClient.setQueryData(queryKeys.userPreferences(user.id), context.previousPrefs);
      }
    },
  });
};
```

#### Activity Tracking
**File**: `src/hooks/useActivityTracking.ts`
```typescript
export const useTrackActivity = () => {
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (activityData: {
      type: string;
      data?: any;
      sessionId?: string;
      deviceInfo?: any;
    }) => {
      if (!user) return; // Silent fail for non-authenticated users
      
      const { error } = await supabase
        .from('user_activity')
        .insert([{
          user_id: user.id,
          activity_type: activityData.type,
          activity_data: activityData.data || {},
          session_id: activityData.sessionId || getSessionId(),
          device_info: activityData.deviceInfo || getDeviceInfo()
        }]);
      
      if (error) {
        // Log error but don't throw - activity tracking shouldn't break UX
        logger.warn('Failed to track user activity:', error);
      }
    },
  });
};

export const useStartScreenAnalytics = () => {
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (analyticsData: {
      screenMode: string;
      actionTaken: string;
      buttonClicked?: string;
      timeSpentSeconds?: number;
      context?: any;
    }) => {
      if (!user) return;
      
      const { error } = await supabase
        .from('start_screen_analytics')
        .insert([{
          user_id: user.id,
          screen_mode: analyticsData.screenMode,
          action_taken: analyticsData.actionTaken,
          button_clicked: analyticsData.buttonClicked,
          time_spent_seconds: analyticsData.timeSpentSeconds,
          context: analyticsData.context || {}
        }]);
      
      if (error) {
        logger.warn('Failed to track start screen analytics:', error);
      }
    },
  });
};
```

### Smart Recommendation Engine
**File**: `src/utils/recommendationEngine.ts`
```typescript
export const generateRecommendedActions = (state: {
  hasPlayers: boolean;
  hasSavedGames: boolean;
  hasTeams: boolean;
  hasSeasonsTournaments: boolean;
  userPreferences?: UserPreferences;
  activitySummary?: any;
}): RecommendedAction[] => {
  const recommendations: RecommendedAction[] = [];
  
  // Priority 1: Essential setup
  if (!state.hasPlayers) {
    recommendations.push({
      id: 'setup-roster',
      type: 'setup',
      priority: 'high',
      title: 'Set up your team roster',
      description: 'Add players to start tracking games. Your roster syncs across all devices.',
      action: 'setup-roster',
      completed: false,
      estimatedTime: '5 minutes'
    });
  }
  
  // Priority 2: First game
  if (state.hasPlayers && !state.hasSavedGames) {
    recommendations.push({
      id: 'create-first-game',
      type: 'setup',
      priority: 'high',
      title: 'Create your first game',
      description: 'Start tracking player positions and game statistics.',
      action: 'new-game',
      completed: false,
      estimatedTime: '2 minutes'
    });
  }
  
  // Priority 3: Organization features
  if (state.hasPlayers && !state.hasTeams) {
    recommendations.push({
      id: 'create-teams',
      type: 'feature',
      priority: 'medium',
      title: 'Organize with teams',
      description: 'Create teams for different squads or age groups.',
      action: 'manage-teams',
      completed: false,
      estimatedTime: '3 minutes'
    });
  }
  
  if (state.hasTeams && !state.hasSeasonsTournaments) {
    recommendations.push({
      id: 'create-season',
      type: 'feature',
      priority: 'medium',
      title: 'Set up seasons and tournaments',
      description: 'Organize your games by seasons and track tournament progress.',
      action: 'manage-seasons',
      completed: false,
      estimatedTime: '4 minutes'
    });
  }
  
  // Priority 4: Advanced features
  if (state.hasSavedGames && state.activitySummary?.totalGames > 3) {
    recommendations.push({
      id: 'view-statistics',
      type: 'improvement',
      priority: 'low',
      title: 'Explore player statistics',
      description: 'Analyze player performance and team statistics.',
      action: 'view-stats',
      completed: false,
      estimatedTime: '2 minutes'
    });
  }
  
  // Cloud-specific recommendations
  if (state.userPreferences && !state.userPreferences.startScreenPreferences.showCloudStatus) {
    recommendations.push({
      id: 'enable-cloud-features',
      type: 'improvement',
      priority: 'low',
      title: 'Explore cloud features',
      description: 'Enable real-time sync notifications and cloud status indicators.',
      action: 'cloud-settings',
      completed: false,
      estimatedTime: '1 minute'
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};
```

## Enhanced UI Implementation

### Cloud-Enhanced Adaptive Start Screen
**File**: `src/components/CloudAdaptiveStartScreen.tsx`
```typescript
export const CloudAdaptiveStartScreen: React.FC<StartScreenProps> = ({
  onGetStarted,
  onSetupRoster,
  onResumeGame,
  onLoadGame,
  onManageTeams,
  onCreateSeason,
  onViewStats,
  onGetHelp,
}) => {
  const { t } = useTranslation();
  const cloudUserState = useCloudUserState();
  const updatePreferences = useUpdateUserPreferences();
  const trackActivity = useTrackActivity();
  const trackAnalytics = useStartScreenAnalytics();
  
  // Real-time preference sync
  useUserPreferencesRealtimeSync();
  
  const [startTime] = useState(Date.now());
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showCloudFeatures, setShowCloudFeatures] = useState(true);
  
  // Track screen view
  useEffect(() => {
    const screenMode = cloudUserState.isFirstTimeUser ? 'simple' : 'advanced';
    trackAnalytics.mutate({
      screenMode,
      actionTaken: 'screen_viewed',
      context: {
        hasPlayers: cloudUserState.hasPlayers,
        hasSavedGames: cloudUserState.hasSavedGames,
        recommendationsCount: cloudUserState.recommendedActions.length
      }
    });
    
    trackActivity.mutate({
      type: 'start_screen_viewed',
      data: { screenMode, timestamp: Date.now() }
    });
  }, [cloudUserState.isFirstTimeUser]);
  
  // Track time spent and actions
  const handleAction = useCallback(async (action: string, buttonName?: string) => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const screenMode = cloudUserState.isFirstTimeUser ? 'simple' : 'advanced';
    
    // Track analytics
    await trackAnalytics.mutateAsync({
      screenMode,
      actionTaken: action,
      buttonClicked: buttonName,
      timeSpentSeconds: timeSpent,
      context: {
        recommendationsVisible: showRecommendations,
        cloudFeaturesVisible: showCloudFeatures
      }
    });
    
    // Update last active feature
    if (['new-game', 'resume-game', 'load-game'].includes(action)) {
      await updatePreferences.mutateAsync({
        lastActiveFeature: 'game'
      });
    } else if (['manage-teams', 'manage-seasons', 'setup-roster'].includes(action)) {
      await updatePreferences.mutateAsync({
        lastActiveFeature: 'management'
      });
    }
    
    // Track detailed activity
    await trackActivity.mutateAsync({
      type: 'start_screen_action',
      data: { action, buttonName, timeSpent, screenMode }
    });
  }, [startTime, cloudUserState.isFirstTimeUser, showRecommendations, showCloudFeatures]);
  
  // Enhanced button handlers with analytics
  const createActionHandler = (action: string, handler?: () => void) => async () => {
    await handleAction(action, action.replace('-', '_'));
    handler?.();
  };
  
  // Smart recommendations panel
  const RecommendationsPanel = () => {
    if (!showRecommendations || cloudUserState.recommendedActions.length === 0) return null;
    
    return (
      <div className="mb-8 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl p-6 border border-indigo-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <HiOutlineSparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Recommended for You</h3>
          </div>
          <button
            onClick={() => setShowRecommendations(false)}
            className="text-slate-400 hover:text-slate-300"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {cloudUserState.recommendedActions.slice(0, 3).map((rec) => (
            <div key={rec.id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
              <div className={`w-3 h-3 rounded-full mt-1.5 ${
                rec.priority === 'high' ? 'bg-red-400' : 
                rec.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
              }`} />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white">{rec.title}</h4>
                <p className="text-xs text-slate-300 mt-1">{rec.description}</p>
                {rec.estimatedTime && (
                  <span className="text-xs text-slate-400 mt-1">
                    ~{rec.estimatedTime}
                  </span>
                )}
              </div>
              <button
                onClick={createActionHandler(rec.action)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-full transition-colors"
              >
                Start
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Cloud features highlight
  const CloudFeaturesPanel = () => {
    if (!showCloudFeatures) return null;
    
    return (
      <div className="mb-6 bg-gradient-to-r from-sky-900/30 to-cyan-900/30 rounded-lg p-4 border border-sky-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HiOutlineCloud className="w-5 h-5 text-sky-400" />
            <h4 className="text-sm font-semibold text-sky-200">Cloud-Powered Features</h4>
          </div>
          <button
            onClick={() => setShowCloudFeatures(false)}
            className="text-slate-400 hover:text-slate-300"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <HiOutlineDevicePhoneMobile className="w-4 h-4 text-emerald-400" />
            <span>Multi-device sync</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <HiOutlineBolt className="w-4 h-4 text-yellow-400" />
            <span>Real-time updates</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <HiOutlineShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Automatic backup</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <HiOutlineChartBar className="w-4 h-4 text-purple-400" />
            <span>Advanced analytics</span>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Enhanced visual effects */}
      <div className="absolute inset-0 bg-noise-texture opacity-5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Enhanced animated logo */}
        <div className="text-center mb-12">
          <div className="relative mb-8">
            <h1 className="text-6xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">
              MatchOps
            </h1>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-2xl font-light text-slate-300">Cloud</h2>
              <HiOutlineCloud className="w-6 h-6 text-sky-400 animate-pulse" />
            </div>
            
            {/* Real-time sync indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span>Synced across devices</span>
            </div>
          </div>
        </div>
        
        {/* Cloud features highlight */}
        <CloudFeaturesPanel />
        
        {/* Smart recommendations */}
        <RecommendationsPanel />
        
        {/* Adaptive interface */}
        {cloudUserState.isFirstTimeUser ? (
          /* FIRST-TIME USER: Simplified Cloud Interface */
          <div className="space-y-4">
            <button
              onClick={createActionHandler('get-started', onGetStarted)}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-3">
                <HiOutlineRocketLaunch className="w-5 h-5" />
                {t('startScreen.getStartedCloud', 'Get Started with Cloud')}
              </div>
            </button>
            
            <button
              onClick={createActionHandler('how-it-works', onGetHelp)}
              className="w-full px-4 py-3 rounded-lg text-base font-semibold text-slate-300 bg-slate-700/80 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-lg text-center leading-tight"
            >
              <div className="flex items-center justify-center gap-2">
                <HiOutlineQuestionMarkCircle className="w-5 h-5" />
                {t('startScreen.howItWorksCloud', 'How Cloud Features Work')}
              </div>
            </button>
          </div>
        ) : (
          /* EXPERIENCED USER: Full Cloud-Enhanced Interface */
          <div className="space-y-4">
            {/* Priority actions based on recommendations */}
            {cloudUserState.recommendedActions[0]?.priority === 'high' && (
              <button
                onClick={createActionHandler(cloudUserState.recommendedActions[0].action)}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
              >
                {cloudUserState.recommendedActions[0].title}
              </button>
            )}
            
            {/* Resume/Load section with cloud status */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={createActionHandler('resume-game', onResumeGame)}
                disabled={!cloudUserState.canResume}
                className={`px-4 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                  cloudUserState.canResume
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                    : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{t('startScreen.resumeGameCloud', 'Resume Last Game')}</span>
                  {cloudUserState.canResume && <HiOutlineCloud className="w-4 h-4" />}
                </div>
              </button>
              
              <button
                onClick={createActionHandler('load-game', onLoadGame)}
                disabled={!cloudUserState.hasSavedGames}
                className={`px-4 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                  cloudUserState.hasSavedGames
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                    : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{t('startScreen.loadGameCloud', 'Load Cloud Game')}</span>
                  {cloudUserState.hasSavedGames && <HiOutlineFolder className="w-4 h-4" />}
                </div>
              </button>
            </div>
            
            {/* Management section */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={createActionHandler('manage-teams', onManageTeams)}
                className="px-3 py-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-600/50 hover:border-slate-500"
              >
                <div className="flex items-center justify-center gap-2">
                  <HiOutlineUsers className="w-4 h-4" />
                  <span>{t('startScreen.teamsCloud', 'Cloud Teams')}</span>
                </div>
              </button>
              
              <button
                onClick={createActionHandler('manage-seasons', onCreateSeason)}
                className="px-3 py-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-600/50 hover:border-slate-500"
              >
                <div className="flex items-center justify-center gap-2">
                  <HiOutlineTrophy className="w-4 h-4" />
                  <span>{cloudUserState.hasSeasonsTournaments ? 
                    t('startScreen.seasonsCloud', 'Seasons') : 
                    t('startScreen.createSeasonCloud', 'Create Season')
                  }</span>
                </div>
              </button>
            </div>
            
            <button
              onClick={createActionHandler('view-stats', onViewStats)}
              disabled={!cloudUserState.hasSavedGames}
              className={`w-full px-4 py-3 font-medium rounded-lg transition-colors ${
                cloudUserState.hasSavedGames
                  ? 'bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600/50 hover:border-slate-500'
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/30'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <HiOutlineChartBar className="w-4 h-4" />
                {t('startScreen.statsCloud', 'Cloud Statistics')}
              </div>
            </button>
            
            {/* Quick setup for missing features */}
            {!cloudUserState.hasPlayers && (
              <button
                onClick={createActionHandler('setup-roster', onSetupRoster)}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
              >
                <div className="flex items-center justify-center gap-2">
                  <HiOutlineUserPlus className="w-4 h-4" />
                  {t('startScreen.setupCloudRoster', 'Setup Cloud Roster')}
                </div>
              </button>
            )}
            
            {/* Help access */}
            <button
              onClick={createActionHandler('how-it-works', onGetHelp)}
              className="w-full px-4 py-2 text-slate-400 hover:text-slate-300 text-sm transition-colors"
            >
              {t('startScreen.howItWorksCloud', 'How Cloud Features Work')}
            </button>
          </div>
        )}
        
        {/* Activity summary for experienced users */}
        {!cloudUserState.isFirstTimeUser && cloudUserState.activitySummary.totalGames > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <div className="text-center space-y-2">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-emerald-400">
                    {cloudUserState.activitySummary.totalGames}
                  </div>
                  <div className="text-xs text-slate-400">Games</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-400">
                    {cloudUserState.activitySummary.totalPlayers}
                  </div>
                  <div className="text-xs text-slate-400">Players</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-purple-400">
                    {Math.round(cloudUserState.activitySummary.completionRate * 100)}%
                  </div>
                  <div className="text-xs text-slate-400">Complete</div>
                </div>
              </div>
              
              {cloudUserState.activitySummary.lastActivity && (
                <div className="text-xs text-slate-400">
                  Last activity: {formatRelativeTime(cloudUserState.activitySummary.lastActivity)}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Device sync status */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span>Synced • {getDeviceName()} • {cloudUserState.hasSavedGames ? 'Cloud Ready' : 'Local Mode'}</span>
        </div>
      </div>
    </div>
  );
};
```

## Real-time Synchronization

### User Preferences Real-time Sync
**File**: `src/hooks/useUserPreferencesRealtimeSync.ts`
```typescript
export const useUserPreferencesRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('user_preferences_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            // Update preferences cache
            queryClient.setQueryData(
              queryKeys.userPreferences(user.id),
              transformUserPreferencesFromSupabase(payload.new)
            );
            
            // Dispatch event for components to react
            window.dispatchEvent(new CustomEvent('userPreferencesUpdated', {
              detail: payload.new
            }));
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

## Migration from localStorage Version

### Start Screen Preferences Migration
**File**: `src/utils/migration/migrateStartScreenToSupabase.ts`
```typescript
export const migrateStartScreenToSupabase = async (userId: string) => {
  // 1. Extract localStorage preferences
  const startScreenMode = localStorage.getItem('startScreenMode');
  const themePreference = localStorage.getItem('themePreference');
  const language = localStorage.getItem('i18nextLng');
  const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
  
  // 2. Create initial Supabase preferences
  const initialPreferences = {
    user_id: userId,
    start_screen_mode: startScreenMode || 'auto',
    preferred_language: language || 'en',
    theme_preference: themePreference || 'dark',
    onboarding_completed: onboardingCompleted,
    start_screen_preferences: {
      showQuickStats: true,
      showCloudStatus: true,
      hideCompletedActions: false
    },
    feature_usage_stats: {}
  };
  
  // 3. Save to Supabase
  const { error } = await supabase
    .from('user_preferences')
    .upsert([initialPreferences], {
      onConflict: 'user_id'
    });
  
  if (error) throw new StorageError('supabase', 'migrateStartScreenPreferences', error);
  
  // 4. Clean up localStorage
  localStorage.removeItem('startScreenMode');
  localStorage.removeItem('themePreference');
  // Keep i18nextLng as it's used by i18next
  localStorage.removeItem('onboardingCompleted');
  
  logger.info('Start screen preferences migrated to Supabase');
};
```

## Enhanced Translation System

### Cloud-Enhanced Translation Keys
```json
{
  "startScreen": {
    "getStartedCloud": "Get Started with Cloud",
    "howItWorksCloud": "How Cloud Features Work",
    "resumeGameCloud": "Resume Last Game",
    "loadGameCloud": "Load Cloud Game",
    "teamsCloud": "Cloud Teams",
    "seasonsCloud": "Seasons",
    "createSeasonCloud": "Create Season",
    "statsCloud": "Cloud Statistics",
    "setupCloudRoster": "Setup Cloud Roster",
    "cloudFeatures": "Cloud-Powered Features",
    "multiDeviceSync": "Multi-device sync",
    "realTimeUpdates": "Real-time updates",
    "automaticBackup": "Automatic backup",
    "advancedAnalytics": "Advanced analytics",
    "syncedAcrossDevices": "Synced across devices",
    "cloudReady": "Cloud Ready",
    "localMode": "Local Mode"
  },
  "recommendations": {
    "recommendedForYou": "Recommended for You",
    "highPriority": "High Priority",
    "mediumPriority": "Medium Priority",
    "lowPriority": "Low Priority",
    "estimatedTime": "Estimated time",
    "startAction": "Start"
  }
}
```

## Benefits of Supabase Migration

### Enhanced User Experience
- **Intelligent Recommendations**: AI-powered suggestions based on usage patterns
- **Cross-device Continuity**: Start screen adapts based on activity from any device
- **Personalized Interface**: User preferences sync across all devices
- **Smart State Detection**: Cloud-aware detection with real-time updates

### Improved Analytics & Insights
- **User Behavior Tracking**: Detailed analytics on start screen usage
- **Feature Adoption**: Track which features users engage with most
- **Performance Optimization**: Data-driven improvements to user flows
- **A/B Testing**: Cloud-based testing of different start screen layouts

### Advanced Cloud Features
- **Real-time Synchronization**: Preferences and state sync instantly
- **Recommendation Engine**: Smart suggestions for next actions
- **Activity Analytics**: Comprehensive tracking of user interactions
- **Multi-device Intelligence**: Awareness of user's device ecosystem

## Developer Checklist

### Database Setup
- [ ] User preferences table with comprehensive settings
- [ ] User activity tracking for analytics
- [ ] Start screen analytics for optimization
- [ ] Migration script for localStorage preferences

### API Integration
- [ ] SupabaseProvider enhanced with user preferences
- [ ] React Query hooks for preferences and activity
- [ ] Real-time subscriptions for preference sync
- [ ] Activity tracking with analytics integration

### UI Components
- [ ] Cloud-enhanced adaptive start screen
- [ ] Smart recommendations panel
- [ ] Cloud features highlighting
- [ ] Real-time preference updates

### UX Features
- [ ] Intelligent user state detection
- [ ] Cross-device preference synchronization
- [ ] Smart recommendation engine
- [ ] Advanced analytics tracking

### Testing
- [ ] Unit tests for recommendation engine
- [ ] Integration tests for preference sync
- [ ] E2E tests for cross-device continuity
- [ ] Migration testing for localStorage → Supabase