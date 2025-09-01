# Smart Roster Detection System - Supabase Version

## Overview
The Cloud-Enhanced Smart Roster Detection System prevents users from entering dead-end UI states by intelligently detecting empty rosters and proactively guiding them to roster management with real-time cloud awareness. Enhanced with multi-device coordination, predictive analytics, collaborative detection, and intelligent state management across all user devices and team contexts.

## Enhanced Architecture

### Cloud-Enhanced Detection Principles
1. **Multi-device State Awareness**: Detection considers user's roster state across all devices
2. **Collaborative Intelligence**: Smart detection in multi-user team environments
3. **Predictive Guidance**: AI-powered recommendations based on usage patterns
4. **Real-time Synchronization**: Instant state updates across all user sessions
5. **Context-aware Messaging**: Cloud-enhanced alerts with sync status and collaboration info

## Data Model (Supabase Tables)

### Enhanced User State Tracking
```sql
-- Comprehensive user state with cloud intelligence
CREATE TABLE user_state_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_players BOOLEAN DEFAULT FALSE,
  player_count INTEGER DEFAULT 0,
  has_saved_games BOOLEAN DEFAULT FALSE,
  saved_games_count INTEGER DEFAULT 0,
  has_teams BOOLEAN DEFAULT FALSE,
  teams_count INTEGER DEFAULT 0,
  has_seasons_tournaments BOOLEAN DEFAULT FALSE,
  seasons_count INTEGER DEFAULT 0,
  tournaments_count INTEGER DEFAULT 0,
  can_resume BOOLEAN DEFAULT FALSE,
  last_active_game_id UUID,
  is_first_time_user BOOLEAN DEFAULT TRUE,
  onboarding_progress JSONB DEFAULT '{}',
  device_contexts JSONB DEFAULT '{}', -- Track state per device
  team_collaborations JSONB DEFAULT '{}', -- Multi-user team contexts
  last_detection_run TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Detection events for analytics and pattern recognition
CREATE TABLE detection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'roster_empty_detected', 'guidance_shown', 'action_taken'
  detection_context JSONB DEFAULT '{}',
  user_action TEXT, -- 'accepted', 'dismissed', 'ignored'
  device_id TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaborative team detection state
CREATE TABLE team_detection_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_sufficient_players BOOLEAN DEFAULT FALSE,
  needs_roster_setup BOOLEAN DEFAULT TRUE,
  last_roster_warning TIMESTAMP WITH TIME ZONE,
  team_member_status JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(team_id, user_id)
);

-- Predictive insights for smart recommendations
CREATE TABLE detection_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'usage_pattern', 'recommendation', 'prediction'
  insight_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE user_state_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE detection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_detection_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE detection_insights ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own state cache" ON user_state_cache
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own detection events" ON detection_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view team detection state for their teams" ON team_detection_state
  FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM teams t 
      WHERE t.id = team_detection_state.team_id 
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own detection insights" ON detection_insights
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_state_cache_user_id ON user_state_cache(user_id);
CREATE INDEX idx_detection_events_user_type ON detection_events(user_id, event_type);
CREATE INDEX idx_team_detection_state_team ON team_detection_state(team_id);
CREATE INDEX idx_detection_insights_user_active ON detection_insights(user_id, is_active) WHERE is_active = TRUE;
```

## Enhanced Detection Logic

### Cloud-Intelligent State Detection
**File**: `src/hooks/useCloudStateDetection.ts`
```typescript
export interface CloudUserState {
  isFirstTimeUser: boolean;
  hasPlayers: boolean;
  playerCount: number;
  hasSavedGames: boolean;
  savedGamesCount: number;
  hasTeams: boolean;
  teamsCount: number;
  hasSeasonsTournaments: boolean;
  seasonsCount: number;
  tournamentsCount: number;
  canResume: boolean;
  lastActiveGameId?: string;
  onboardingProgress: any;
  deviceContexts: Record<string, any>;
  teamCollaborations: Record<string, any>;
  detectionInsights: DetectionInsight[];
  lastDetectionRun: string;
}

export interface DetectionInsight {
  id: string;
  type: 'usage_pattern' | 'recommendation' | 'prediction';
  data: any;
  confidenceScore: number;
  isActive: boolean;
  expiresAt?: string;
}

export const useCloudStateDetection = () => {
  const { data: { user } } = useAuth();
  const [deviceId] = useState(() => getDeviceId());
  const [sessionId] = useState(() => getSessionId());
  
  // Get cached state with real-time updates
  const { data: stateCache, isLoading } = useQuery({
    queryKey: queryKeys.userStateCache(user?.id),
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_state_cache')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new StorageError('supabase', 'getUserStateCache', error);
      }
      
      return data ? transformUserStateCacheFromSupabase(data) : null;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
  
  // Get detection insights
  const { data: insights = [] } = useQuery({
    queryKey: queryKeys.detectionInsights(user?.id),
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('detection_insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('confidence_score', { ascending: false });
      
      if (error) throw new StorageError('supabase', 'getDetectionInsights', error);
      return data.map(transformDetectionInsightFromSupabase);
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Force state refresh and intelligent detection
  const refreshState = useMutation({
    mutationFn: async () => {
      if (!user) throw new AuthenticationError('No authenticated user');
      
      // Get real-time counts from all relevant tables
      const [
        { count: playerCount },
        { count: gamesCount },
        { count: teamsCount },
        { count: seasonsCount },
        { count: tournamentsCount }
      ] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
        supabase.from('games').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('teams').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('archived', false),
        supabase.from('seasons').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('archived', false),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('archived', false)
      ]);
      
      // Get current game status
      const { data: currentGameSetting } = await supabase
        .from('user_preferences')
        .select('current_game_id')
        .eq('user_id', user.id)
        .single();
      
      // Check if current game is resumable
      let canResume = false;
      let lastActiveGameId = null;
      if (currentGameSetting?.current_game_id) {
        const { data: currentGame } = await supabase
          .from('games')
          .select('id')
          .eq('id', currentGameSetting.current_game_id)
          .eq('user_id', user.id)
          .single();
        
        if (currentGame) {
          canResume = true;
          lastActiveGameId = currentGame.id;
        }
      }
      
      // Calculate intelligent state
      const hasPlayers = (playerCount || 0) > 0;
      const hasSavedGames = (gamesCount || 0) > 0;
      const hasTeams = (teamsCount || 0) > 0;
      const hasSeasonsTournaments = (seasonsCount || 0) > 0 || (tournamentsCount || 0) > 0;
      
      // Advanced first-time user detection with cloud intelligence
      const isFirstTimeUser = !hasPlayers || (!hasSavedGames && (playerCount || 0) < 3);
      
      // Update device context
      const deviceContexts = stateCache?.deviceContexts || {};
      deviceContexts[deviceId] = {
        lastSeen: new Date().toISOString(),
        sessionId,
        userAgent: navigator.userAgent,
        hasPlayers,
        hasSavedGames
      };
      
      // Update state cache
      const updatedState = {
        user_id: user.id,
        has_players: hasPlayers,
        player_count: playerCount || 0,
        has_saved_games: hasSavedGames,
        saved_games_count: gamesCount || 0,
        has_teams: hasTeams,
        teams_count: teamsCount || 0,
        has_seasons_tournaments: hasSeasonsTournaments,
        seasons_count: seasonsCount || 0,
        tournaments_count: tournamentsCount || 0,
        can_resume: canResume,
        last_active_game_id: lastActiveGameId,
        is_first_time_user: isFirstTimeUser,
        device_contexts: deviceContexts,
        last_detection_run: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('user_state_cache')
        .upsert([updatedState], { onConflict: 'user_id' })
        .select()
        .single();
      
      if (error) throw new StorageError('supabase', 'updateUserStateCache', error);
      
      // Generate AI insights based on patterns
      await generateDetectionInsights(user.id, updatedState);
      
      return transformUserStateCacheFromSupabase(data);
    },
    onSuccess: (newState) => {
      // Update cached state
      queryClient.setQueryData(queryKeys.userStateCache(user?.id), newState);
      queryClient.invalidateQueries(queryKeys.detectionInsights(user?.id));
    }
  });
  
  // Auto-refresh state on app state changes
  useEffect(() => {
    if (user && !isLoading && !refreshState.isPending) {
      // Debounced refresh to avoid excessive calls
      const timer = setTimeout(() => {
        refreshState.mutate();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading]);
  
  return {
    cloudUserState: stateCache,
    detectionInsights: insights,
    refreshState: refreshState.mutate,
    isRefreshing: refreshState.isPending,
    isLoading
  };
};

// AI-powered insight generation
const generateDetectionInsights = async (userId: string, stateData: any) => {
  const insights: any[] = [];
  
  // Pattern: User has players but no games
  if (stateData.has_players && !stateData.has_saved_games && stateData.player_count >= 3) {
    insights.push({
      user_id: userId,
      insight_type: 'recommendation',
      insight_data: {
        type: 'create_first_game',
        message: 'You have a good roster setup. Ready to create your first game?',
        action: 'new-game',
        priority: 'high'
      },
      confidence_score: 0.85
    });
  }
  
  // Pattern: User has games but no team organization
  if (stateData.has_saved_games && !stateData.has_teams && stateData.saved_games_count >= 3) {
    insights.push({
      user_id: userId,
      insight_type: 'recommendation',
      insight_data: {
        type: 'organize_teams',
        message: 'Consider organizing your players into teams for better management',
        action: 'manage-teams',
        priority: 'medium'
      },
      confidence_score: 0.72
    });
  }
  
  // Pattern: Active user without seasonal organization
  if (stateData.has_teams && stateData.saved_games_count >= 5 && !stateData.has_seasons_tournaments) {
    insights.push({
      user_id: userId,
      insight_type: 'recommendation',
      insight_data: {
        type: 'create_season',
        message: 'Track your progress with seasons and tournaments',
        action: 'manage-seasons',
        priority: 'medium'
      },
      confidence_score: 0.68
    });
  }
  
  // Insert insights if any generated
  if (insights.length > 0) {
    await supabase
      .from('detection_insights')
      .insert(insights);
  }
};
```

### Enhanced Guard Implementation with Cloud Intelligence

#### Cloud-aware Roster Guard with Multi-device Coordination
**File**: `src/hooks/useCloudRosterGuard.ts`
```typescript
export const useCloudRosterGuard = () => {
  const { cloudUserState } = useCloudStateDetection();
  const { data: { user } } = useAuth();
  const trackDetectionEvent = useTrackDetectionEvent();
  const [deviceId] = useState(() => getDeviceId());
  const { isOnline } = useNetworkStatus();
  
  // Get recent detection events to prevent spam
  const { data: recentEvents = [] } = useQuery({
    queryKey: queryKeys.recentDetectionEvents(user?.id, 'roster_empty_detected'),
    queryFn: async () => {
      if (!user) return [];
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('detection_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_type', 'roster_empty_detected')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.warn('Failed to fetch recent detection events:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  
  const showCloudRosterEmptyAlert = useCallback(async (context?: any) => {
    if (!user || !cloudUserState) return false;
    
    // Skip if user has players
    if (cloudUserState.hasPlayers && cloudUserState.playerCount > 0) {
      return false;
    }
    
    // Check if we've shown this alert recently across all devices
    const recentAlert = recentEvents.find(event => 
      event.user_action !== 'dismissed' &&
      Date.now() - new Date(event.created_at).getTime() < 5 * 60 * 1000 // 5 minutes
    );
    
    if (recentAlert) {
      return false; // Don't spam user with same alert
    }
    
    // Check if alert was dismissed on another device recently
    const recentDismissal = recentEvents.find(event =>
      event.user_action === 'dismissed' &&
      event.device_id !== deviceId &&
      Date.now() - new Date(event.created_at).getTime() < 15 * 60 * 1000 // 15 minutes
    );
    
    if (recentDismissal) {
      return false; // Respect dismissal on other devices
    }
    
    // Enhanced alert message with cloud context and collaboration awareness
    let alertMessage = '';
    
    if (!isOnline) {
      alertMessage = t('controlBar.noPlayersForNewGameOfflineCloud', 
        'You need at least one player in your roster to create a game. You\'re currently offline - players will sync when reconnected. Would you like to add players now?');
    } else if (cloudUserState.teamCollaborations && Object.keys(cloudUserState.teamCollaborations).length > 0) {
      alertMessage = t('controlBar.noPlayersForNewGameTeamCloud',
        'You need at least one player in your roster to create a game. Your team roster syncs with all team members. Would you like to add players now?');
    } else {
      alertMessage = t('controlBar.noPlayersForNewGameCloud', 
        'You need at least one player in your roster to create a game. Your roster syncs across all your devices and team members. Would you like to add players now?');
    }
    
    // Add smart recommendations from insights
    const relevantInsights = cloudUserState.detectionInsights?.filter(
      insight => insight.type === 'recommendation' && insight.data?.type === 'setup_roster'
    );
    
    if (relevantInsights && relevantInsights.length > 0) {
      const topInsight = relevantInsights[0];
      alertMessage += `\n\n💡 Suggestion: ${topInsight.data.message}`;
    }
    
    const shouldProceed = window.confirm(alertMessage);
    
    // Track the alert interaction with enhanced context
    await trackDetectionEvent.mutateAsync({
      eventType: 'roster_empty_detected',
      context: {
        ...context,
        isOnline,
        playerCount: cloudUserState.playerCount,
        deviceId,
        hasTeamCollaborations: Object.keys(cloudUserState.teamCollaborations || {}).length > 0,
        insightsAvailable: relevantInsights?.length || 0
      },
      userAction: shouldProceed ? 'accepted' : 'dismissed',
      deviceId,
    });
    
    return shouldProceed;
  }, [user, cloudUserState, recentEvents, trackDetectionEvent, isOnline, deviceId, t]);
  
  return { 
    showCloudRosterEmptyAlert,
    cloudUserState,
    hasRecentDismissal: recentEvents.some(e => e.user_action === 'dismissed')
  };
};

export const useTrackDetectionEvent = () => {
  const { data: { user } } = useAuth();
  
  return useMutation({
    mutationFn: async (eventData: {
      eventType: string;
      context?: any;
      userAction: 'accepted' | 'dismissed' | 'ignored';
      deviceId: string;
    }) => {
      if (!user) return;
      
      const { error } = await supabase
        .from('detection_events')
        .insert([{
          user_id: user.id,
          event_type: eventData.eventType,
          detection_context: eventData.context || {},
          user_action: eventData.userAction,
          device_id: eventData.deviceId,
          session_id: getSessionId()
        }]);
      
      if (error) {
        logger.warn('Failed to track detection event:', error);
      }
    },
  });
};
```

## Real-time Multi-device Coordination

### Cross-device Detection Synchronization
**File**: `src/hooks/useDetectionRealtimeSync.ts`
```typescript
export const useDetectionRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { data: { user } } = useAuth();
  const [deviceId] = useState(() => getDeviceId());
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('detection_system_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_state_cache',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            // Update local state cache
            queryClient.setQueryData(
              queryKeys.userStateCache(user.id),
              transformUserStateCacheFromSupabase(payload.new)
            );
            
            // Dispatch event for components to react
            window.dispatchEvent(new CustomEvent('userStateUpdated', {
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
          table: 'detection_events',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.device_id !== deviceId) {
            // Another device had a detection event
            queryClient.invalidateQueries(queryKeys.recentDetectionEvents(user.id));
            
            // Handle cross-device coordination
            if (payload.new.user_action === 'dismissed' && 
                payload.new.event_type === 'roster_empty_detected') {
              // User dismissed roster warning on another device
              window.dispatchEvent(new CustomEvent('rosterWarningDismissedElsewhere', {
                detail: payload.new
              }));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'detection_insights',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update insights when they change
          queryClient.invalidateQueries(queryKeys.detectionInsights(user.id));
          
          if (payload.eventType === 'INSERT' && payload.new) {
            // Show new insight notification
            const insight = transformDetectionInsightFromSupabase(payload.new);
            if (insight.data?.priority === 'high') {
              toast.info(`💡 ${insight.data.message}`, {
                id: `insight-${insight.id}`,
                duration: 5000,
                action: insight.data.action ? {
                  label: 'Take Action',
                  onClick: () => {
                    window.dispatchEvent(new CustomEvent('insightActionRequested', {
                      detail: insight
                    }));
                  }
                } : undefined
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user, deviceId]);
};
```

## Enhanced UI Adaptive Behavior

### Cloud-Enhanced Start Screen Integration
**File**: `src/components/CloudEnhancedStartScreen.tsx` (Enhanced version)
```typescript
export const CloudEnhancedStartScreen = ({ ...props }) => {
  const { cloudUserState, detectionInsights, isLoading } = useCloudStateDetection();
  const { showCloudRosterEmptyAlert } = useCloudRosterGuard();
  const trackEvent = useTrackDetectionEvent();
  
  // Real-time sync
  useDetectionRealtimeSync();
  
  // Smart insights display
  const [showInsights, setShowInsights] = useState(true);
  const priorityInsights = detectionInsights?.filter(
    insight => insight.data?.priority === 'high' && insight.confidenceScore > 0.7
  ) || [];
  
  const handleAction = useCallback(async (action: string) => {
    // Track action with cloud context
    await trackEvent.mutateAsync({
      eventType: 'start_screen_action',
      context: {
        action,
        cloudUserState: {
          hasPlayers: cloudUserState?.hasPlayers,
          playerCount: cloudUserState?.playerCount,
          hasSavedGames: cloudUserState?.hasSavedGames,
          isFirstTimeUser: cloudUserState?.isFirstTimeUser
        },
        insightsShown: priorityInsights.length
      },
      userAction: 'accepted',
      deviceId: getDeviceId()
    });
  }, [cloudUserState, priorityInsights.length, trackEvent]);
  
  // Enhanced first-time user detection with cloud intelligence
  const isCloudFirstTimeUser = cloudUserState?.isFirstTimeUser ?? true;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading cloud state...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Enhanced visual effects */}
      <div className="absolute inset-0 bg-noise-texture opacity-5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Logo with cloud sync status */}
        <div className="text-center mb-12">
          <div className="relative mb-8">
            <h1 className="text-6xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">
              MatchOps
            </h1>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-2xl font-light text-slate-300">Cloud</h2>
              <HiOutlineCloud className="w-6 h-6 text-sky-400 animate-pulse" />
            </div>
            
            {/* Real-time state indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span>
                {cloudUserState?.deviceContexts && Object.keys(cloudUserState.deviceContexts).length > 1
                  ? `Synced across ${Object.keys(cloudUserState.deviceContexts).length} devices`
                  : 'Cloud synced'
                }
              </span>
            </div>
          </div>
        </div>
        
        {/* Priority AI Insights */}
        {showInsights && priorityInsights.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-4 border border-amber-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HiOutlineSparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-200">Smart Recommendations</h3>
              </div>
              <button
                onClick={() => setShowInsights(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {priorityInsights.slice(0, 2).map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 p-2 bg-slate-800/50 rounded-lg">
                  <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-200">{insight.data.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400">
                        {Math.round(insight.confidenceScore * 100)}% confident
                      </span>
                      {insight.data.action && (
                        <button
                          onClick={() => {
                            handleAction(insight.data.action);
                            // Trigger the appropriate action
                            if (insight.data.action === 'new-game') {
                              props.onGetStarted?.();
                            } else if (insight.data.action === 'manage-teams') {
                              props.onManageTeams?.();
                            }
                          }}
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded transition-colors"
                        >
                          {insight.data.action.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Adaptive interface based on cloud state */}
        {isCloudFirstTimeUser ? (
          /* FIRST-TIME USER: Simplified Interface with Cloud Context */
          <div className="space-y-4">
            <button
              onClick={async () => {
                await handleAction('get-started');
                
                // Check if roster setup is needed first
                if (!cloudUserState?.hasPlayers) {
                  const shouldSetupRoster = await showCloudRosterEmptyAlert({
                    source: 'start-screen-get-started',
                    isFirstTime: true
                  });
                  
                  if (shouldSetupRoster) {
                    props.onSetupRoster?.();
                    return;
                  }
                }
                
                props.onGetStarted?.();
              }}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-3">
                <HiOutlineRocketLaunch className="w-5 h-5" />
                {cloudUserState?.hasPlayers 
                  ? t('startScreen.getStartedWithPlayers', 'Start Your First Game')
                  : t('startScreen.getStartedSetupFirst', 'Get Started - Setup Roster')
                }
              </div>
            </button>
            
            <button
              onClick={async () => {
                await handleAction('how-it-works');
                props.onGetHelp?.();
              }}
              className="w-full px-4 py-3 rounded-lg text-base font-semibold text-slate-300 bg-slate-700/80 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-lg text-center leading-tight"
            >
              <div className="flex items-center justify-center gap-2">
                <HiOutlineQuestionMarkCircle className="w-5 h-5" />
                {t('startScreen.howItWorksCloud', 'How Cloud Features Work')}
              </div>
            </button>
          </div>
        ) : (
          /* EXPERIENCED USER: Full Interface with Cloud Intelligence */
          <div className="space-y-4">
            {/* Cloud-aware resume button */}
            <button
              onClick={async () => {
                await handleAction('resume-game');
                props.onResumeGame?.();
              }}
              disabled={!cloudUserState?.canResume}
              className={`w-full px-4 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                cloudUserState?.canResume
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                  : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{t('startScreen.resumeLastGame', 'Resume Last Game')}</span>
                <div className="flex items-center gap-1">
                  {cloudUserState?.canResume && <HiOutlineCloud className="w-4 h-4" />}
                  {cloudUserState?.deviceContexts && Object.keys(cloudUserState.deviceContexts).length > 1 && (
                    <span className="text-xs opacity-75">Multi-device</span>
                  )}
                </div>
              </div>
            </button>
            
            {/* Other buttons with cloud awareness */}
            <button
              onClick={async () => {
                await handleAction('load-game');
                props.onLoadGame?.();
              }}
              disabled={!cloudUserState?.hasSavedGames}
              className={`w-full px-4 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                cloudUserState?.hasSavedGames
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                  : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{t('startScreen.loadGame', 'Load Game')}</span>
                {cloudUserState?.savedGamesCount && (
                  <span className="text-xs opacity-75">{cloudUserState.savedGamesCount} games</span>
                )}
              </div>
            </button>
            
            {/* Management buttons with smart routing */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  await handleAction('manage-teams');
                  props.onManageTeams?.();
                }}
                className="px-3 py-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-600/50 hover:border-slate-500"
              >
                <div className="flex flex-col items-center gap-1">
                  <HiOutlineUsers className="w-4 h-4" />
                  <span>Teams</span>
                  {cloudUserState?.teamsCount && (
                    <span className="text-xs opacity-75">{cloudUserState.teamsCount}</span>
                  )}
                </div>
              </button>
              
              <button
                onClick={async () => {
                  await handleAction('manage-seasons');
                  props.onCreateSeason?.();
                }}
                className="px-3 py-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-600/50 hover:border-slate-500"
              >
                <div className="flex flex-col items-center gap-1">
                  <HiOutlineTrophy className="w-4 h-4" />
                  <span>Seasons</span>
                  {(cloudUserState?.seasonsCount || 0) + (cloudUserState?.tournamentsCount || 0) > 0 && (
                    <span className="text-xs opacity-75">
                      {(cloudUserState?.seasonsCount || 0) + (cloudUserState?.tournamentsCount || 0)}
                    </span>
                  )}
                </div>
              </button>
            </div>
            
            {/* Stats with cloud insights */}
            <button
              onClick={async () => {
                await handleAction('view-stats');
                props.onViewStats?.();
              }}
              disabled={!cloudUserState?.hasSavedGames}
              className={`w-full px-4 py-3 font-medium rounded-lg transition-colors ${
                cloudUserState?.hasSavedGames
                  ? 'bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600/50 hover:border-slate-500'
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/30'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <HiOutlineChartBar className="w-4 h-4" />
                {t('startScreen.viewStats', 'View Statistics')}
                {cloudUserState?.hasSavedGames && (
                  <span className="text-xs opacity-75">Cloud Analytics</span>
                )}
              </div>
            </button>
            
            {/* Roster setup if needed */}
            {!cloudUserState?.hasPlayers && (
              <button
                onClick={async () => {
                  await handleAction('setup-roster');
                  props.onSetupRoster?.();
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
              >
                <div className="flex items-center justify-center gap-2">
                  <HiOutlineUserPlus className="w-4 h-4" />
                  {t('startScreen.setupRoster', 'Setup Team Roster')}
                </div>
              </button>
            )}
          </div>
        )}
        
        {/* Cloud status indicator */}
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <div className="text-center space-y-2">
            {/* Multi-device status */}
            {cloudUserState?.deviceContexts && Object.keys(cloudUserState.deviceContexts).length > 1 && (
              <div className="text-xs text-slate-400 mb-2">
                Active on {Object.keys(cloudUserState.deviceContexts).length} devices
              </div>
            )}
            
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-emerald-400">
                  {cloudUserState?.playerCount || 0}
                </div>
                <div className="text-xs text-slate-400">Players</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-400">
                  {cloudUserState?.savedGamesCount || 0}
                </div>
                <div className="text-xs text-slate-400">Games</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-purple-400">
                  {(cloudUserState?.teamsCount || 0)}
                </div>
                <div className="text-xs text-slate-400">Teams</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Migration from localStorage Version

### Smart Detection Migration
**File**: `src/utils/migration/migrateDetectionToSupabase.ts`
```typescript
export const migrateSmartDetectionToSupabase = async (userId: string) => {
  // 1. Extract localStorage detection history
  const detectionHistory = localStorage.getItem('detectionHistory');
  const lastRosterWarning = localStorage.getItem('lastRosterWarning');
  const userOnboardingState = localStorage.getItem('userOnboardingState');
  
  let parsedHistory = [];
  let parsedOnboarding = {};
  
  try {
    if (detectionHistory) parsedHistory = JSON.parse(detectionHistory);
    if (userOnboardingState) parsedOnboarding = JSON.parse(userOnboardingState);
  } catch (error) {
    logger.warn('Failed to parse detection history:', error);
  }
  
  // 2. Create initial state cache
  const initialState = {
    user_id: userId,
    has_players: false, // Will be updated by detection refresh
    player_count: 0,
    has_saved_games: false,
    saved_games_count: 0,
    has_teams: false,
    teams_count: 0,
    has_seasons_tournaments: false,
    seasons_count: 0,
    tournaments_count: 0,
    can_resume: false,
    is_first_time_user: true,
    onboarding_progress: parsedOnboarding,
    device_contexts: {
      [getDeviceId()]: {
        migrated: true,
        timestamp: new Date().toISOString()
      }
    },
    team_collaborations: {},
    last_detection_run: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('user_state_cache')
    .upsert([initialState], {
      onConflict: 'user_id'
    });
  
  if (error) throw new StorageError('supabase', 'migrateDetectionState', error);
  
  // 3. Migrate detection events if any
  if (parsedHistory.length > 0) {
    const events = parsedHistory.map((event: any) => ({
      user_id: userId,
      event_type: event.type || 'roster_empty_detected',
      detection_context: event.context || {},
      user_action: event.action || 'ignored',
      device_id: getDeviceId(),
      created_at: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString()
    }));
    
    await supabase
      .from('detection_events')
      .insert(events.slice(0, 50)); // Limit to recent 50 events
  }
  
  // 4. Clean up localStorage
  localStorage.removeItem('detectionHistory');
  localStorage.removeItem('lastRosterWarning');
  localStorage.removeItem('userOnboardingState');
  
  logger.info('Smart detection system migrated to Supabase');
};
```

## Benefits of Supabase Migration

### Enhanced Intelligence & Coordination
- **Multi-device Awareness**: Detection considers user state across all devices
- **Collaborative Intelligence**: Smart detection in multi-user team environments
- **AI-powered Insights**: Machine learning recommendations based on usage patterns
- **Predictive Guidance**: Proactive suggestions before users encounter problems

### Improved User Experience
- **Cross-device Continuity**: Detection state syncs across all user devices
- **Smart Spam Prevention**: Intelligent alert suppression across sessions
- **Context-aware Messaging**: Alerts adapt based on user's cloud and collaboration context
- **Real-time Coordination**: Instant updates when team members make changes

### Advanced Analytics & Optimization
- **Usage Pattern Analysis**: Track detection effectiveness and user behavior
- **A/B Testing**: Cloud-based testing of different detection strategies
- **Performance Insights**: Identify bottlenecks and optimization opportunities
- **Predictive Analytics**: Forecast user needs and provide proactive guidance

## Developer Checklist

### Database Setup
- [ ] User state cache table with comprehensive cloud intelligence
- [ ] Detection events tracking for analytics and spam prevention
- [ ] Team detection state for collaborative environments
- [ ] Detection insights table for AI-powered recommendations
- [ ] Database indexes and constraints for optimal performance

### API Integration
- [ ] SupabaseProvider enhanced with detection operations
- [ ] React Query hooks for state cache and insights
- [ ] Real-time subscriptions for cross-device coordination
- [ ] AI insight generation with confidence scoring

### UI Components
- [ ] Cloud-enhanced start screen with intelligent detection
- [ ] Smart alert system with multi-device coordination
- [ ] AI insight display with actionable recommendations
- [ ] Real-time state indicators and sync status

### UX Features
- [ ] Multi-device detection state synchronization
- [ ] Intelligent spam prevention across sessions
- [ ] AI-powered usage recommendations
- [ ] Collaborative team detection in multi-user scenarios

### Testing
- [ ] Unit tests for cloud detection logic and AI insights
- [ ] Integration tests for multi-device coordination
- [ ] E2E tests for collaborative detection scenarios
- [ ] Migration testing with comprehensive state validation