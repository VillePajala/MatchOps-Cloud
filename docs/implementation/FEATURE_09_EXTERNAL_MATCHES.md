# Feature 9: External Matches Implementation Plan

**Status**: Ready for Implementation  
**Priority**: Medium  
**Estimated Effort**: 5.5 days  
**Dependencies**: Database migration capabilities

## Overview
Complete implementation of external match stat adjustments system, allowing individual player statistics to be enhanced with games played outside the app.

## Current State Analysis
- ✅ Player statistics system exists (`src/utils/playerStats.ts`)
- ✅ Player management modal exists (`RosterSettingsModal.tsx`) with stats integration
- ✅ Database schema supports adding new tables
- ✅ Storage system architecture supports new entity types
- ❌ No external match functionality exists in codebase
- ❌ No `PlayerStatAdjustment` interface or related code
- ❌ No database table for adjustments
- ❌ Feature exists only in documentation, not in actual implementation
- ❌ `calculatePlayerStats` does not include adjustment parameters

## Implementation Checklist

### Phase 1: Database Schema Creation (Day 0.5)

#### 1.1 Create Player Stat Adjustments Table
- [ ] **File**: `supabase/migrations/[timestamp]_add_player_stat_adjustments.sql`
- [ ] **Adjustments Table**:
```sql
-- Player stat adjustments table
CREATE TABLE player_stat_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  
  -- Game context
  external_team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  game_date DATE,
  score_for INTEGER CHECK (score_for >= 0),
  score_against INTEGER CHECK (score_against >= 0),
  home_or_away TEXT CHECK (home_or_away IN ('home', 'away', 'neutral')),
  
  -- Integration settings
  include_in_season_tournament BOOLEAN DEFAULT FALSE,
  
  -- Stat adjustments
  games_played_delta INTEGER DEFAULT 0 CHECK (games_played_delta >= 0),
  goals_delta INTEGER DEFAULT 0 CHECK (goals_delta >= 0),
  assists_delta INTEGER DEFAULT 0 CHECK (assists_delta >= 0),
  
  -- Metadata
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_season_or_tournament CHECK (
    (season_id IS NOT NULL AND tournament_id IS NULL) OR
    (season_id IS NULL AND tournament_id IS NOT NULL) OR
    (season_id IS NULL AND tournament_id IS NULL)
  )
);

-- Enable RLS
ALTER TABLE player_stat_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can only access their own player adjustments" ON player_stat_adjustments
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX player_stat_adjustments_user_id_idx ON player_stat_adjustments(user_id);
CREATE INDEX player_stat_adjustments_player_id_idx ON player_stat_adjustments(player_id);
CREATE INDEX player_stat_adjustments_season_id_idx ON player_stat_adjustments(season_id);
CREATE INDEX player_stat_adjustments_tournament_id_idx ON player_stat_adjustments(tournament_id);
CREATE INDEX player_stat_adjustments_date_idx ON player_stat_adjustments(game_date);
```

### Phase 2: Type Definitions and Storage Integration (Day 1)

#### 2.1 Add Type Definitions
- [ ] **File**: `src/types/index.ts`
- [ ] **Add Adjustment Interfaces**:
```typescript
export interface PlayerStatAdjustment {
  id: string;
  playerId: string;
  seasonId?: string;
  tournamentId?: string;
  
  // Game context
  externalTeamName: string;
  opponentName: string;
  gameDate?: string;
  scoreFor?: number;
  scoreAgainst?: number;
  homeOrAway?: 'home' | 'away' | 'neutral';
  
  // Integration settings
  includeInSeasonTournament: boolean;
  
  // Stat deltas
  gamesPlayedDelta: number;
  goalsDelta: number;
  assistsDelta: number;
  
  // Metadata
  note?: string;
  createdAt: string;
}

export interface PlayerStatsWithAdjustments extends PlayerStatRow {
  adjustments: PlayerStatAdjustment[];
  adjustedStats: {
    games: number;
    goals: number;
    assists: number;
    totalScore: number;
  };
}
```

#### 2.2 Extend Storage Manager Interface
- [ ] **File**: `src/lib/storage/types.ts`
- [ ] **Add Adjustment Methods**:
```typescript
export interface IStorageProvider {
  // ... existing methods
  
  // Player stat adjustments
  getPlayerAdjustments(playerId?: string): Promise<PlayerStatAdjustment[]>;
  savePlayerAdjustment(adjustment: Omit<PlayerStatAdjustment, 'id' | 'createdAt'>): Promise<PlayerStatAdjustment>;
  updatePlayerAdjustment(adjustmentId: string, updates: Partial<Omit<PlayerStatAdjustment, 'id'>>): Promise<PlayerStatAdjustment | null>;
  deletePlayerAdjustment(adjustmentId: string): Promise<boolean>;
  getSeasonAdjustments(seasonId: string): Promise<PlayerStatAdjustment[]>;
  getTournamentAdjustments(tournamentId: string): Promise<PlayerStatAdjustment[]>;
}
```

#### 2.3 Implement Storage Providers
- [ ] **File**: `src/lib/storage/supabaseProvider.ts`
- [ ] **Add Supabase Implementation**:
```typescript
async getPlayerAdjustments(playerId?: string): Promise<PlayerStatAdjustment[]> {
  let query = this.supabase
    .from('player_stat_adjustments')
    .select('*')
    .order('game_date', { ascending: false });
    
  if (playerId) {
    query = query.eq('player_id', playerId);
  }
  
  const { data, error } = await query;
  
  if (error) throw new StorageError(`Failed to fetch adjustments: ${error.message}`);
  return data?.map(adj => this.fromSupabaseAdjustment(adj)) || [];
}

async savePlayerAdjustment(
  adjustmentData: Omit<PlayerStatAdjustment, 'id' | 'createdAt'>
): Promise<PlayerStatAdjustment> {
  const { data, error } = await this.supabase
    .from('player_stat_adjustments')
    .insert([{
      user_id: (await this.supabase.auth.getUser()).data.user?.id,
      player_id: adjustmentData.playerId,
      season_id: adjustmentData.seasonId || null,
      tournament_id: adjustmentData.tournamentId || null,
      external_team_name: adjustmentData.externalTeamName,
      opponent_name: adjustmentData.opponentName,
      game_date: adjustmentData.gameDate || null,
      score_for: adjustmentData.scoreFor || null,
      score_against: adjustmentData.scoreAgainst || null,
      home_or_away: adjustmentData.homeOrAway || null,
      include_in_season_tournament: adjustmentData.includeInSeasonTournament,
      games_played_delta: adjustmentData.gamesPlayedDelta,
      goals_delta: adjustmentData.goalsDelta,
      assists_delta: adjustmentData.assistsDelta,
      note: adjustmentData.note || null
    }])
    .select()
    .single();
    
  if (error) throw new StorageError(`Failed to save adjustment: ${error.message}`);
  return this.fromSupabaseAdjustment(data);
}

// Transform Supabase data to app format
private fromSupabaseAdjustment(data: any): PlayerStatAdjustment {
  return {
    id: data.id,
    playerId: data.player_id,
    seasonId: data.season_id,
    tournamentId: data.tournament_id,
    externalTeamName: data.external_team_name,
    opponentName: data.opponent_name,
    gameDate: data.game_date,
    scoreFor: data.score_for,
    scoreAgainst: data.score_against,
    homeOrAway: data.home_or_away,
    includeInSeasonTournament: data.include_in_season_tournament,
    gamesPlayedDelta: data.games_played_delta,
    goalsDelta: data.goals_delta,
    assistsDelta: data.assists_delta,
    note: data.note,
    createdAt: data.created_at
  };
}
```

- [ ] **File**: `src/lib/storage/localStorageProvider.ts`
- [ ] **Add LocalStorage Implementation**: Mirror Supabase functionality for offline use

#### 2.4 Create Adjustment Manager Utilities
- [ ] **File**: `src/utils/playerAdjustmentManager.ts`
- [ ] **Adjustment Management Functions**:
```typescript
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import type { PlayerStatAdjustment } from '@/types';
import logger from '@/utils/logger';

export const getPlayerAdjustments = async (playerId?: string): Promise<PlayerStatAdjustment[]> => {
  try {
    return await storageManager.getPlayerAdjustments(playerId);
  } catch (error) {
    logger.error('[playerAdjustmentManager] Error fetching adjustments:', error);
    return [];
  }
};

export const createPlayerAdjustment = async (
  adjustmentData: Omit<PlayerStatAdjustment, 'id' | 'createdAt'>
): Promise<PlayerStatAdjustment | null> => {
  try {
    // Validation
    if (!adjustmentData.playerId || !adjustmentData.externalTeamName || !adjustmentData.opponentName) {
      throw new Error('Required fields missing');
    }
    
    if (adjustmentData.gamesPlayedDelta < 0 || adjustmentData.goalsDelta < 0 || adjustmentData.assistsDelta < 0) {
      throw new Error('Stat deltas cannot be negative');
    }
    
    return await storageManager.savePlayerAdjustment(adjustmentData);
  } catch (error) {
    logger.error('[playerAdjustmentManager] Error creating adjustment:', error);
    return null;
  }
};

export const validateAdjustmentData = (data: Partial<PlayerStatAdjustment>): string[] => {
  const errors: string[] = [];
  
  if (!data.externalTeamName?.trim()) {
    errors.push('External team name is required');
  }
  
  if (!data.opponentName?.trim()) {
    errors.push('Opponent name is required');
  }
  
  if (data.gamesPlayedDelta && data.gamesPlayedDelta < 0) {
    errors.push('Games played cannot be negative');
  }
  
  if (data.goalsDelta && data.goalsDelta < 0) {
    errors.push('Goals cannot be negative');
  }
  
  if (data.assistsDelta && data.assistsDelta < 0) {
    errors.push('Assists cannot be negative');
  }
  
  if (data.scoreFor && data.scoreFor < 0) {
    errors.push('Score cannot be negative');
  }
  
  if (data.scoreAgainst && data.scoreAgainst < 0) {
    errors.push('Opponent score cannot be negative');
  }
  
  return errors;
};
```

### Phase 3: Player Statistics Integration (Day 1.5)

#### 3.1 Update Player Statistics Calculation
- [ ] **File**: `src/utils/playerStats.ts`
- [ ] **Current Function Analysis**: Review existing `calculatePlayerStats` function
- [ ] **Add Adjustment Integration**:
```typescript
import { getPlayerAdjustments } from './playerAdjustmentManager';

export const calculatePlayerStatsWithAdjustments = async (
  playerId: string,
  includeAdjustments: boolean = true
): Promise<PlayerStatsWithAdjustments> => {
  // Get base stats from existing function
  const baseStats = await calculatePlayerStats(playerId);
  
  if (!includeAdjustments) {
    return {
      ...baseStats,
      adjustments: [],
      adjustedStats: {
        games: baseStats.gamesPlayed,
        goals: baseStats.goals,
        assists: baseStats.assists,
        totalScore: baseStats.totalScore
      }
    };
  }
  
  // Get adjustments for player
  const adjustments = await getPlayerAdjustments(playerId);
  
  // Calculate adjusted totals
  const adjustedStats = adjustments.reduce(
    (totals, adjustment) => ({
      games: totals.games + adjustment.gamesPlayedDelta,
      goals: totals.goals + adjustment.goalsDelta,
      assists: totals.assists + adjustment.assistsDelta,
      totalScore: totals.totalScore + (adjustment.goalsDelta * 3) + (adjustment.assistsDelta * 2)
    }),
    {
      games: baseStats.gamesPlayed,
      goals: baseStats.goals,
      assists: baseStats.assists,
      totalScore: baseStats.totalScore
    }
  );
  
  // Recalculate average points
  const avgPoints = adjustedStats.games > 0 ? adjustedStats.totalScore / adjustedStats.games : 0;
  
  return {
    ...baseStats,
    gamesPlayed: adjustedStats.games,
    goals: adjustedStats.goals,
    assists: adjustedStats.assists,
    totalScore: adjustedStats.totalScore,
    avgPoints,
    adjustments,
    adjustedStats
  };
};

// Season/tournament specific calculations
export const calculateSeasonPlayerStats = async (
  playerId: string,
  seasonId?: string,
  tournamentId?: string
): Promise<PlayerStatsWithAdjustments> => {
  const baseStats = await calculatePlayerStats(playerId, seasonId, tournamentId);
  const allAdjustments = await getPlayerAdjustments(playerId);
  
  // Filter adjustments for specific season/tournament
  const relevantAdjustments = allAdjustments.filter(adj => {
    if (seasonId && adj.seasonId === seasonId && adj.includeInSeasonTournament) return true;
    if (tournamentId && adj.tournamentId === tournamentId && adj.includeInSeasonTournament) return true;
    return false;
  });
  
  // Apply same calculation logic as above with filtered adjustments
  // ... rest of calculation
};
```

#### 3.2 Update Player Statistics Display Components
- [ ] **Find Player Statistics Modal/Component**:
  - [ ] Locate component that displays player statistics
  - [ ] Review current statistics display format
  - [ ] Identify integration points for adjustments

- [ ] **Add Adjustment Display**:
```typescript
// Add adjustments section to player stats display
<div className="mt-4">
  <h4 className="text-lg font-semibold text-slate-200 mb-2">
    {t('playerStats.externalMatches', 'External Matches')}
  </h4>
  
  {adjustments.length > 0 ? (
    <div className="space-y-2">
      {adjustments.map(adjustment => (
        <div key={adjustment.id} className="bg-slate-700/50 p-3 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-medium text-slate-200">
                {adjustment.externalTeamName} vs {adjustment.opponentName}
              </div>
              {adjustment.gameDate && (
                <div className="text-xs text-slate-400">
                  {formatDate(adjustment.gameDate)}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingAdjustment(adjustment)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <HiOutlinePencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteAdjustment(adjustment.id)}
                className="p-1 text-slate-400 hover:text-red-400"
              >
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-4 text-xs text-slate-300 mt-2">
            {adjustment.gamesPlayedDelta > 0 && (
              <span>+{adjustment.gamesPlayedDelta} {t('playerStats.games', 'games')}</span>
            )}
            {adjustment.goalsDelta > 0 && (
              <span>+{adjustment.goalsDelta} {t('playerStats.goals', 'goals')}</span>
            )}
            {adjustment.assistsDelta > 0 && (
              <span>+{adjustment.assistsDelta} {t('playerStats.assists', 'assists')}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="text-sm text-slate-400">
      {t('playerStats.noExternalMatches', 'No external matches recorded')}
    </div>
  )}
  
  <button
    onClick={() => setShowAddAdjustment(true)}
    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm"
  >
    <HiOutlinePlus className="w-4 h-4 inline mr-1" />
    {t('playerStats.addExternalStats', 'Add External Stats')}
  </button>
</div>
```

### Phase 4: Adjustment Form Interface (Day 1.5)

#### 4.1 Create Adjustment Form Component
- [ ] **File**: `src/components/PlayerAdjustmentForm.tsx`
- [ ] **Form Component Structure**:
```typescript
interface PlayerAdjustmentFormProps {
  playerId: string;
  adjustment?: PlayerStatAdjustment; // For editing
  availableSeasons: Season[];
  availableTournaments: Tournament[];
  onSave: (adjustment: PlayerStatAdjustment) => void;
  onCancel: () => void;
}

const PlayerAdjustmentForm: React.FC<PlayerAdjustmentFormProps> = ({
  playerId,
  adjustment,
  availableSeasons,
  availableTournaments,
  onSave,
  onCancel
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<PlayerStatAdjustment>>({
    playerId,
    externalTeamName: '',
    opponentName: '',
    gameDate: '',
    gamesPlayedDelta: 1,
    goalsDelta: 0,
    assistsDelta: 0,
    includeInSeasonTournament: false,
    ...adjustment
  });
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  // ... component implementation
};
```

#### 4.2 Implement Form Layout
- [ ] **Responsive Grid Layout**:
```typescript
// Form layout with responsive columns
<form onSubmit={handleSubmit} className="space-y-4">
  {/* Row 1: Team Information */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.externalTeam', 'External Team')} *
      </label>
      <input
        type="text"
        value={formData.externalTeamName || ''}
        onChange={(e) => updateField('externalTeamName', e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
        placeholder={t('playerStats.externalTeamPlaceholder', 'e.g., Local FC')}
        required
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.opponent', 'Opponent')} *
      </label>
      <input
        type="text"
        value={formData.opponentName || ''}
        onChange={(e) => updateField('opponentName', e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
        placeholder={t('playerStats.opponentPlaceholder', 'e.g., City United')}
        required
      />
    </div>
  </div>
  
  {/* Row 2: Game Context */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.gameDate', 'Game Date')}
      </label>
      <input
        type="date"
        value={formData.gameDate || ''}
        onChange={(e) => updateField('gameDate', e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.homeAway', 'Home/Away')}
      </label>
      <select
        value={formData.homeOrAway || ''}
        onChange={(e) => updateField('homeOrAway', e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
      >
        <option value="">{t('playerStats.selectHomeAway', '-- Select --')}</option>
        <option value="home">{t('playerStats.home', 'Home')}</option>
        <option value="away">{t('playerStats.away', 'Away')}</option>
        <option value="neutral">{t('playerStats.neutral', 'Neutral')}</option>
      </select>
    </div>
  </div>
  
  {/* Row 3: Score (Optional) */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.scoreFor', 'Team Score')}
      </label>
      <input
        type="number"
        min="0"
        value={formData.scoreFor || ''}
        onChange={(e) => updateField('scoreFor', parseInt(e.target.value) || undefined)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.scoreAgainst', 'Opponent Score')}
      </label>
      <input
        type="number"
        min="0"
        value={formData.scoreAgainst || ''}
        onChange={(e) => updateField('scoreAgainst', parseInt(e.target.value) || undefined)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
      />
    </div>
  </div>
  
  {/* Row 4: Season/Tournament Association */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.season', 'Season')} ({t('playerStats.optional', 'optional')})
      </label>
      <select
        value={formData.seasonId || ''}
        onChange={(e) => handleSeasonTournamentChange('season', e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
      >
        <option value="">{t('playerStats.selectSeason', '-- Select Season --')}</option>
        {availableSeasons.map(season => (
          <option key={season.id} value={season.id}>{season.name}</option>
        ))}
      </select>
    </div>
    
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.tournament', 'Tournament')} ({t('playerStats.optional', 'optional')})
      </label>
      <select
        value={formData.tournamentId || ''}
        onChange={(e) => handleSeasonTournamentChange('tournament', e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
        disabled={!!formData.seasonId}
      >
        <option value="">{t('playerStats.selectTournament', '-- Select Tournament --')}</option>
        {availableTournaments.map(tournament => (
          <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
        ))}
      </select>
    </div>
  </div>
  
  {/* Row 5: Stat Adjustments */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.gamesPlayed', 'Games Played')} *
      </label>
      <input
        type="number"
        min="0"
        max="10"
        value={formData.gamesPlayedDelta || 1}
        onChange={(e) => updateField('gamesPlayedDelta', parseInt(e.target.value) || 1)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
        required
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.goals', 'Goals')}
      </label>
      <input
        type="number"
        min="0"
        max="20"
        value={formData.goalsDelta || 0}
        onChange={(e) => updateField('goalsDelta', parseInt(e.target.value) || 0)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {t('playerStats.assists', 'Assists')}
      </label>
      <input
        type="number"
        min="0"
        max="20"
        value={formData.assistsDelta || 0}
        onChange={(e) => updateField('assistsDelta', parseInt(e.target.value) || 0)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
      />
    </div>
  </div>
  
  {/* Include in Season/Tournament Stats */}
  {(formData.seasonId || formData.tournamentId) && (
    <div className="flex items-center">
      <input
        type="checkbox"
        id="includeInStats"
        checked={formData.includeInSeasonTournament}
        onChange={(e) => updateField('includeInSeasonTournament', e.target.checked)}
        className="mr-2"
      />
      <label htmlFor="includeInStats" className="text-sm text-slate-300">
        {t('playerStats.includeInSeasonStats', 'Include in season/tournament statistics')}
      </label>
    </div>
  )}
  
  {/* Notes */}
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1">
      {t('playerStats.notes', 'Notes')} ({t('playerStats.optional', 'optional')})
    </label>
    <textarea
      value={formData.note || ''}
      onChange={(e) => updateField('note', e.target.value)}
      rows={2}
      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100"
      placeholder={t('playerStats.notesPlaceholder', 'Additional notes about this match...')}
    />
  </div>
  
  {/* Validation Errors */}
  {validationErrors.length > 0 && (
    <div className="bg-red-900/50 border border-red-600 rounded-lg p-3">
      <h4 className="text-red-300 font-medium mb-2">
        {t('playerStats.validationErrors', 'Please fix the following errors:')}
      </h4>
      <ul className="list-disc list-inside text-sm text-red-200">
        {validationErrors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  )}
  
  {/* Form Actions */}
  <div className="flex justify-end gap-3 pt-4">
    <button
      type="button"
      onClick={onCancel}
      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
    >
      {t('common.cancel', 'Cancel')}
    </button>
    <button
      type="submit"
      disabled={validationErrors.length > 0}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg"
    >
      {adjustment ? t('common.update', 'Update') : t('common.save', 'Save')}
    </button>
  </div>
</form>
```

#### 4.3 Form Validation and Logic
- [ ] **Real-time Validation**:
```typescript
const validateForm = useCallback(() => {
  const errors = validateAdjustmentData(formData);
  setValidationErrors(errors);
  return errors.length === 0;
}, [formData]);

const updateField = (field: keyof PlayerStatAdjustment, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  // Validate after short delay
  setTimeout(validateForm, 300);
};

const handleSeasonTournamentChange = (type: 'season' | 'tournament', value: string) => {
  if (type === 'season') {
    setFormData(prev => ({ 
      ...prev, 
      seasonId: value || undefined, 
      tournamentId: undefined // Clear tournament when season selected
    }));
  } else {
    setFormData(prev => ({ 
      ...prev, 
      tournamentId: value || undefined, 
      seasonId: undefined // Clear season when tournament selected
    }));
  }
};
```

### Phase 5: UI Integration and Polish (Day 1)

#### 5.1 Integrate with Player Management
- [ ] **Update RosterSettingsModal Integration**:
  - [ ] Add adjustment management to player statistics access
  - [ ] Ensure modal state management handles adjustment forms
  - [ ] Integration with existing `onOpenPlayerStats` workflow

#### 5.2 Add to Player Statistics Modal
- [ ] **Find and Update Player Stats Modal**:
  - [ ] Add adjustment display section
  - [ ] Add "Add External Stats" button
  - [ ] Integrate adjustment form modal or inline form
  - [ ] Update statistics calculation to use adjusted values

#### 5.3 Add Translation Keys
- [ ] **File**: `public/locales/en/common.json`
- [ ] **Add External Match Keys**:
```json
{
  "playerStats": {
    "externalMatches": "External Matches",
    "addExternalStats": "Add External Stats",
    "noExternalMatches": "No external matches recorded",
    "externalTeam": "External Team",
    "externalTeamPlaceholder": "e.g., Local FC",
    "opponent": "Opponent",
    "opponentPlaceholder": "e.g., City United",
    "gameDate": "Game Date",
    "homeAway": "Home/Away",
    "selectHomeAway": "-- Select --",
    "home": "Home",
    "away": "Away", 
    "neutral": "Neutral",
    "scoreFor": "Team Score",
    "scoreAgainst": "Opponent Score",
    "season": "Season",
    "tournament": "Tournament",
    "selectSeason": "-- Select Season --",
    "selectTournament": "-- Select Tournament --",
    "gamesPlayed": "Games Played",
    "goals": "Goals",
    "assists": "Assists",
    "includeInSeasonStats": "Include in season/tournament statistics",
    "notes": "Notes",
    "notesPlaceholder": "Additional notes about this match...",
    "optional": "optional",
    "validationErrors": "Please fix the following errors:",
    "seasonRequired": "Please create a season first to organize external matches.",
    "adjustedStats": "Stats including external matches",
    "baseStats": "Stats from app games only",
    "confirmDeleteAdjustment": "Delete this external match record?"
  }
}
```

- [ ] **File**: `public/locales/fi/common.json`
- [ ] **Add Finnish Translations**

### Phase 6: Testing and Edge Cases (Day 0.5)

#### 6.1 Database Testing
- [ ] **Migration Testing**:
  - [ ] Run migration on test database
  - [ ] Verify table creation and constraints
  - [ ] Test RLS policies with different users
  - [ ] Test foreign key cascade behavior

#### 6.2 CRUD Operations Testing
- [ ] **Adjustment Management**:
  - [ ] Create adjustments with various data combinations
  - [ ] Update adjustments and verify changes persist
  - [ ] Delete adjustments and verify cascade behavior
  - [ ] Test with large numbers of adjustments per player

#### 6.3 Statistics Integration Testing
- [ ] **Calculation Accuracy**:
  - [ ] Verify base stats + adjustments = total stats
  - [ ] Test season/tournament filtering of adjustments
  - [ ] Test average calculations with adjusted totals
  - [ ] Verify statistics update when adjustments change

#### 6.4 Form Validation Testing
- [ ] **Edge Cases**:
  - [ ] Test with extreme values (very high goals/assists)
  - [ ] Test date validation (future dates, invalid formats)
  - [ ] Test required field validation
  - [ ] Test season/tournament mutual exclusion

#### 6.5 User Experience Testing
- [ ] **Complete Workflows**:
  - [ ] Add external match for player without seasons
  - [ ] Add external match associated with season
  - [ ] Edit existing adjustment
  - [ ] Delete adjustment and verify stats update
  - [ ] View adjusted vs base statistics

## File Dependencies
- `supabase/migrations/[timestamp]_add_player_stat_adjustments.sql` (new)
- `src/types/index.ts` (modify)
- `src/lib/storage/types.ts` (modify)
- `src/lib/storage/supabaseProvider.ts` (modify)
- `src/lib/storage/localStorageProvider.ts` (modify)
- `src/utils/playerAdjustmentManager.ts` (new)
- `src/utils/playerStats.ts` (modify)
- `src/components/PlayerAdjustmentForm.tsx` (new)
- Player statistics modal component (modify)
- `src/components/RosterSettingsModal.tsx` (potentially modify)
- `public/locales/en/common.json` (modify)
- `public/locales/fi/common.json` (modify)

## Success Criteria
- [ ] Players can add external match statistics with comprehensive form
- [ ] External stats integrate seamlessly with app-generated statistics
- [ ] Season and tournament associations work correctly
- [ ] Form validation prevents invalid data entry
- [ ] Statistics display shows both base and adjusted totals clearly
- [ ] All functionality works both online (Supabase) and offline (localStorage)
- [ ] Database operations are performant with large datasets
- [ ] All features are fully translated in English and Finnish
- [ ] Mobile responsiveness works across all device sizes
- [ ] Integration with existing player management is seamless

## Post-Implementation Notes
- Document any performance considerations with large adjustment datasets
- Note user feedback on form usability and validation
- Record any additional stat types users request (e.g., yellow cards, saves)
- Document any integration challenges with existing statistics system