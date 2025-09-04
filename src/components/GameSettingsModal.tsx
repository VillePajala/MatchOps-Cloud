'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import { HiPlusCircle } from 'react-icons/hi2';
import { Season, Tournament, Player, GameEvent } from '@/types';
import { AppState } from '@/types';
import { UseMutationResult } from '@tanstack/react-query';
import { TFunction } from 'i18next';
import AssessmentSlider from './AssessmentSlider';
import PlayerSelectionSection from './PlayerSelectionSection';
import TeamOpponentInputs from './TeamOpponentInputs';
import { AGE_GROUPS, LEVELS } from '@/config/gameOptions';
import type { TranslationKey } from '@/i18n-types';
import { useEventManagement } from '@/hooks/useEventManagement';
import { useInlineEditing } from '@/hooks/useInlineEditing';
import { useSeasonTournamentManagement } from '@/hooks/useSeasonTournamentManagement';
import { useModalStability } from '@/hooks/useModalStability';
import { formatTime } from '@/utils/time';

export interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // --- Data for the current game ---
  currentGameId: string | null;
  teamName: string;
  opponentName: string;
  gameDate: string;
  gameLocation?: string;
  gameTime?: string;
  gameNotes?: string;
  ageGroup?: string;
  tournamentLevel?: string;
  seasonId?: string | null;
  tournamentId?: string | null;
  gameEvents: GameEvent[];
  availablePlayers: Player[];
  numPeriods: number;
  periodDurationMinutes: number;
  demandFactor?: number;
  selectedPlayerIds: string[];
  onSelectedPlayersChange: (playerIds: string[]) => void;
  // --- Handlers for updating game data ---
  onTeamNameChange: (name: string) => void;
  onOpponentNameChange: (name: string) => void;
  onGameDateChange: (date: string) => void;
  onGameLocationChange: (location: string) => void;
  onGameTimeChange: (time: string) => void;
  onAgeGroupChange: (age: string) => void;
  onTournamentLevelChange: (level: string) => void;
  onUpdateGameEvent: (updatedEvent: GameEvent) => void;
  onDeleteGameEvent?: (goalId: string) => void;
  onAwardFairPlayCard: (playerId: string | null, time: number) => void;
  onNumPeriodsChange: (num: number) => void;
  onPeriodDurationChange: (minutes: number) => void;
  onDemandFactorChange: (factor: number) => void;
  onSeasonIdChange: (seasonId: string | undefined) => void;
  onTournamentIdChange: (tournamentId: string | undefined) => void;
  homeOrAway: 'home' | 'away';
  onSetHomeOrAway: (status: 'home' | 'away') => void;
  isPlayed: boolean;
  onIsPlayedChange: (played: boolean) => void;
  // Add mutation props for creating seasons and tournaments
  addSeasonMutation: UseMutationResult<Season | null, Error, Partial<Season> & { name: string }, unknown>;
  addTournamentMutation: UseMutationResult<Tournament | null, Error, Partial<Tournament> & { name: string }, unknown>;
  isAddingSeason: boolean;
  isAddingTournament: boolean;
  // Add current time for fair play card
  timeElapsedInSeconds?: number;
  updateGameDetailsMutation: UseMutationResult<AppState | null, Error, { gameId: string; updates: Partial<AppState> }, unknown>;
}

// Handler functions now provided by custom hooks (useEventManagement, useInlineEditing, useSeasonTournamentManagement)

// Helper to get event description
const getEventDescription = (event: GameEvent, players: Player[], t: TFunction): string => {
  switch (event.type) {
    case 'goal': {
      const scorer = players.find(p => p.id === event.scorerId)?.name || t('gameSettingsModal.unknownPlayer', 'Unknown Player');
      let description = scorer;
      if (event.assisterId) {
        const assister = players.find(p => p.id === event.assisterId)?.name;
        if (assister) {
          description += ` (${t('common.assist', 'Assist')}: ${assister})`;
        }
      }
      return description;
    }
    case 'opponentGoal':
      return t('gameSettingsModal.logTypeOpponentGoal', 'Opponent Goal');
    case 'periodEnd':
      return t('gameSettingsModal.logTypePeriodEnd', 'End of Period');
    case 'gameEnd':
      return t('gameSettingsModal.logTypeGameEnd', 'End of Game');
    default:
      return t('gameSettingsModal.logTypeUnknown', 'Unknown Event');
  }
};

const GameSettingsModal: React.FC<GameSettingsModalProps> = ({
  isOpen,
  onClose,
  currentGameId,
  teamName,
  opponentName,
  gameDate,
  gameLocation = '',
  gameTime = '',
  gameNotes = '',
  ageGroup = '',
  tournamentLevel = '',
  onTeamNameChange,
  onOpponentNameChange,
  onGameDateChange,
  onGameLocationChange,
  onGameTimeChange,
  onAgeGroupChange,
  onTournamentLevelChange,
  onUpdateGameEvent,
  onDeleteGameEvent,
  onAwardFairPlayCard,
  gameEvents,
  availablePlayers,
  selectedPlayerIds,
  onSelectedPlayersChange,
  seasonId,
  tournamentId,
  numPeriods,
  periodDurationMinutes,
  demandFactor = 1,
  onNumPeriodsChange,
  onPeriodDurationChange,
  onDemandFactorChange,
  onSeasonIdChange,
  onTournamentIdChange,
  homeOrAway,
  onSetHomeOrAway,
  isPlayed,
  onIsPlayedChange,
  addSeasonMutation,
  addTournamentMutation,
  isAddingSeason,
  isAddingTournament,
  timeElapsedInSeconds,
  updateGameDetailsMutation,
}) => {
  // logger.log('[GameSettingsModal Render] Props received:', { seasonId, tournamentId, currentGameId });
  const { t } = useTranslation();

  // Refs for modal stability
  const teamInputRef = useRef<HTMLInputElement>(null);
  const opponentInputRef = useRef<HTMLInputElement>(null);

  // Use modal stability hook for better focus management
  const { getStableInputProps } = useModalStability({
    isOpen,
    primaryInputRef: teamInputRef,
    delayMs: 200,
    preventRepeatedFocus: true,
  });

  // Use custom hooks for complex state management
  const eventManagement = useEventManagement({
    gameEvents,
    currentGameId,
    onUpdateGameEvent,
    onDeleteGameEvent,
    t: (key: string, fallback?: string) => t(key, fallback || key),
  });

  const inlineEditing = useInlineEditing({
    currentGameId,
    teamName,
    opponentName,
    gameDate,
    gameLocation,
    gameTime,
    periodDurationMinutes,
    gameNotes,
    updateGameDetailsMutation: updateGameDetailsMutation as unknown as UseMutationResult<unknown, Error, Record<string, unknown>, unknown>,
    t: (key: string, fallback?: string) => t(key, fallback || key),
  });

  const seasonTournament = useSeasonTournamentManagement({
    isOpen,
    seasonId: seasonId || undefined,
    tournamentId: tournamentId || undefined,
    onSeasonIdChange,
    onTournamentIdChange,
    addSeasonMutation: addSeasonMutation as unknown as UseMutationResult<Season, Error, { name: string }, unknown>,
    addTournamentMutation: addTournamentMutation as unknown as UseMutationResult<Tournament, Error, { name: string }, unknown>,
    t: (key: string, fallback?: string) => t(key, fallback || key),
  });

  // State for game time
  const [gameHour, setGameHour] = useState<string>('');
  const [gameMinute, setGameMinute] = useState<string>('');

  // Initialize game time state from prop
  useEffect(() => {
    if (gameTime) {
      const [hour, minute] = gameTime.split(':');
      setGameHour(hour || '');
      setGameMinute(minute || '');
    } else {
      setGameHour('');
      setGameMinute('');
    }
  }, [gameTime]);

  // Handle time changes
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure we're storing a string, not a number that could become NaN
    setGameHour(value === '' ? '' : value);
    
    if (value === '') {
      // If hour is empty, update the time string accordingly
      onGameTimeChange(gameMinute ? `:${gameMinute.padStart(2, '0')}` : '');
    } else {
      const formattedHour = value.padStart(2, '0');
      const formattedMinute = gameMinute.padStart(2, '0');
      onGameTimeChange(`${formattedHour}:${formattedMinute}`);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure we're storing a string, not a number that could become NaN
    setGameMinute(value === '' ? '' : value);
    
    if (value === '') {
      // If minute is empty, update the time string accordingly
      onGameTimeChange(gameHour ? `${gameHour.padStart(2, '0')}:` : '');
    } else {
      const formattedHour = gameHour.padStart(2, '0');
      const formattedMinute = value.padStart(2, '0');
      onGameTimeChange(`${formattedHour}:${formattedMinute}`);
    }
  };

  // --- Effects ---

  // Tab synchronization now handled by custom hooks

  // Data loading now handled by custom hooks

  // Event synchronization now handled by custom hooks

  // Focus effects now handled by custom hooks

  // Season prefill logic now handled by custom hooks

  // Tournament prefill logic now handled by custom hooks


  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newSeasonId = value || undefined;
    onSeasonIdChange(newSeasonId);
    onTournamentIdChange(undefined); // Setting a season clears the tournament
    if (currentGameId) {
      updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { seasonId: newSeasonId, tournamentId: undefined } });
    }
    seasonTournament.setShowNewSeasonInput(false);
    seasonTournament.setNewSeasonName('');
  };

  const handleTournamentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newTournamentId = value || undefined;
    onTournamentIdChange(newTournamentId);
    onSeasonIdChange(undefined); // Setting a tournament clears the season
    if (currentGameId) {
      updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { tournamentId: newTournamentId, seasonId: undefined } });
    }
    seasonTournament.setShowNewTournamentInput(false);
    seasonTournament.setNewTournamentName('');
  };




  // Sorted events now handled by custom hooks




  // Add this section to handle fair play cards
  const handleFairPlayCardClick = (playerId: string | null) => {
    // If the player already has a fair play card, this will toggle it off
    // If not, it will award the card to this player (removing it from any other player)
    if (playerId) {
      const playerHasCard = availablePlayers.find(p => p.id === playerId)?.receivedFairPlayCard;
      onAwardFairPlayCard(playerHasCard ? null : playerId, timeElapsedInSeconds || 0);
    } else {
      // If playerId is null, clear the fair play card
      onAwardFairPlayCard(null, timeElapsedInSeconds || 0);
    }
  };

  // Conditional return MUST come AFTER all hook calls
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div role="dialog" className="bg-slate-800 rounded-none shadow-xl flex flex-col border-0 overflow-hidden h-full w-full bg-noise-texture relative">
        {/* Background effects */}
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
        <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />

        {/* Content wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Fixed Header */}
          <div className="flex justify-center items-center pt-10 pb-4 backdrop-blur-sm bg-slate-900/20">
            <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">
              {t('gameSettingsModal.title', 'Game Settings')}
            </h2>
          </div>

          {/* Fixed Controls Section */}
          <div className="px-6 pt-3 pb-4 backdrop-blur-sm bg-slate-900/20">
            <TeamOpponentInputs
              teamName={teamName}
              opponentName={opponentName}
              onTeamNameChange={onTeamNameChange}
              onOpponentNameChange={onOpponentNameChange}
              teamLabel={t('gameSettingsModal.teamName', 'Your Team Name') + ' *'}
              teamPlaceholder={t('gameSettingsModal.teamNamePlaceholder', 'Enter team name')}
              opponentLabel={t('gameSettingsModal.opponentName', 'Opponent Name') + ' *'}
              opponentPlaceholder={t('gameSettingsModal.opponentNamePlaceholder', 'Enter opponent name')}
              teamInputRef={teamInputRef}
              opponentInputRef={opponentInputRef}
              stableInputProps={getStableInputProps()}
            />
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
            {/* Linkitä Section */}
            <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">
                {t('gameSettingsModal.linkita', 'Link')}
              </h3>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => seasonTournament.handleTabChange('none')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    seasonTournament.activeTab === 'none'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {t('gameSettingsModal.eiMitaan', 'None')}
                </button>
                <button
                  onClick={() => seasonTournament.handleTabChange('season')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    seasonTournament.activeTab === 'season'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {t('gameSettingsModal.kausi', 'Season')}
                </button>
                <button
                  onClick={() => seasonTournament.handleTabChange('tournament')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    seasonTournament.activeTab === 'tournament'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {t('gameSettingsModal.turnaus', 'Tournament')}
                </button>
              </div>

              {/* Season Selection */}
              {seasonTournament.activeTab === 'season' && (
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <select
                      id="seasonSelect"
                      value={seasonId || ''}
                      onChange={handleSeasonChange}
                      aria-label={t('gameSettingsModal.selectSeason', '-- Select Season --')}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    >
                      <option value="">{t('gameSettingsModal.selectSeason', '-- Select Season --')}</option>
                      {seasonTournament.seasons.map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={seasonTournament.handleShowCreateSeason}
                      className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                      title={seasonTournament.showNewSeasonInput ? t('gameSettingsModal.cancelCreate', 'Cancel creation') : t('gameSettingsModal.createSeason', 'Create new season')}
                      disabled={isAddingSeason || isAddingTournament}
                    >
                      <HiPlusCircle className={`w-6 h-6 transition-transform ${seasonTournament.showNewSeasonInput ? 'rotate-45' : ''}`} />
                    </button>
                  </div>
                  {seasonTournament.showNewSeasonInput && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        ref={seasonTournament.newSeasonInputRef}
                        type="text"
                        value={seasonTournament.newSeasonName}
                        onChange={(e) => seasonTournament.setNewSeasonName(e.target.value)}
                        onKeyDown={seasonTournament.handleNewSeasonKeyDown}
                        placeholder={t('gameSettingsModal.newSeasonPlaceholder', 'Enter new season name...')}
                        className="flex-1 min-w-[200px] px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        disabled={isAddingSeason}
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={seasonTournament.handleAddNewSeason}
                          disabled={isAddingSeason || !seasonTournament.newSeasonName.trim()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50 whitespace-nowrap"
                        >
                          {isAddingSeason ? t('gameSettingsModal.creating', 'Creating...') : t('gameSettingsModal.addButton', 'Add')}
                        </button>
                        <button
                          onClick={() => {
                            seasonTournament.setShowNewSeasonInput(false);
                            seasonTournament.setNewSeasonName('');
                          }}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm whitespace-nowrap"
                        >
                          {t('common.cancelButton', 'Cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tournament Selection */}
              {seasonTournament.activeTab === 'tournament' && (
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <select
                      id="tournamentSelect"
                      value={tournamentId || ''}
                      onChange={handleTournamentChange}
                      aria-label={t('gameSettingsModal.selectTournament', '-- Select Tournament --')}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    >
                      <option value="">{t('gameSettingsModal.selectTournament', '-- Select Tournament --')}</option>
                      {seasonTournament.tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={seasonTournament.handleShowCreateTournament}
                      className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                      title={seasonTournament.showNewTournamentInput ? t('gameSettingsModal.cancelCreate', 'Cancel creation') : t('gameSettingsModal.createTournament', 'Create new tournament')}
                      disabled={isAddingSeason || isAddingTournament}
                    >
                      <HiPlusCircle className={`w-6 h-6 transition-transform ${seasonTournament.showNewTournamentInput ? 'rotate-45' : ''}`} />
                    </button>
                  </div>
                  {seasonTournament.showNewTournamentInput && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        ref={seasonTournament.newTournamentInputRef}
                        type="text"
                        value={seasonTournament.newTournamentName}
                        onChange={(e) => seasonTournament.setNewTournamentName(e.target.value)}
                        onKeyDown={seasonTournament.handleNewTournamentKeyDown}
                        placeholder={t('gameSettingsModal.newTournamentPlaceholder', 'Enter new tournament name...')}
                        className="flex-1 min-w-[200px] px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        disabled={isAddingTournament}
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={seasonTournament.handleAddNewTournament}
                          disabled={isAddingTournament || !seasonTournament.newTournamentName.trim()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50 whitespace-nowrap"
                        >
                          {isAddingTournament ? t('gameSettingsModal.creating', 'Creating...') : t('gameSettingsModal.addButton', 'Add')}
                        </button>
                        <button
                          onClick={() => {
                            seasonTournament.setShowNewTournamentInput(false);
                            seasonTournament.setNewTournamentName('');
                          }}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm whitespace-nowrap"
                        >
                          {t('common.cancelButton', 'Cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Age Group */}
            <div className="mb-4">
              <label htmlFor="ageGroupSelect" className="block text-sm font-medium text-slate-300 mb-1">
                {t('gameSettingsModal.ageGroupLabel', 'Age Group (Optional)')}
              </label>
              <select
                id="ageGroupSelect"
                value={ageGroup}
                onChange={(e) => {
                  onAgeGroupChange(e.target.value);
                  if (currentGameId) {
                    updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { ageGroup: e.target.value } });
                  }
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              >
                <option value="">{t('common.none', 'None')}</option>
                {AGE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {/* Game Info Section */}
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                {t('gameSettingsModal.gameInfo', 'Game Info')}
              </h3>
              <div className="space-y-4">
                {/* Game Date */}
                <div className="mb-4">
                  <label htmlFor="gameDateInput" className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.gameDateLabel', 'Game Date')}
                  </label>
                  <input
                    type="date"
                    id="gameDateInput"
                    value={gameDate}
                    onChange={(e) => onGameDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  />
                </div>

                {/* Game Time */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.gameTimeLabel', 'Time (Optional)')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={gameHour}
                      onChange={handleHourChange}
                      placeholder={t('gameSettingsModal.hourPlaceholder', 'HH')}
                      aria-label={t('gameSettingsModal.gameHourLabel', 'Game hour')}
                      className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      maxLength={2}
                    />
                    <span className="text-slate-400">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={gameMinute}
                      onChange={handleMinuteChange}
                      placeholder={t('gameSettingsModal.minutePlaceholder', 'MM')}
                      aria-label={t('gameSettingsModal.gameMinuteLabel', 'Game minute')}
                      className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      maxLength={2}
                    />
                  </div>
                </div>

                {/* Game Location */}
                <div className="mb-4">
                  <label htmlFor="gameLocationInput" className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.locationLabel', 'Location (Optional)')}
                  </label>
                  <input
                    type="text"
                    id="gameLocationInput"
                    value={gameLocation}
                    onChange={(e) => onGameLocationChange(e.target.value)}
                    placeholder={t('gameSettingsModal.locationPlaceholder', 'e.g., Central Park Field 2')}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  />
                </div>

                {tournamentId && (
                <div className="mb-4">
                  <label htmlFor="levelInput" className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.levelLabel', 'Level')}
                  </label>
                  <select
                    id="levelInput"
                    value={tournamentLevel}
                    onChange={(e) => {
                      onTournamentLevelChange(e.target.value);
                      if (currentGameId) {
                        updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { tournamentLevel: e.target.value } });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  >
                    <option value="">{t('common.none', 'None')}</option>
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {t(`common.level${lvl}` as TranslationKey, lvl)}
                      </option>
                    ))}
                  </select>
                </div>
                )}

                {/* Home/Away Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.homeOrAwayLabel', 'Home / Away')}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSetHomeOrAway('home')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors w-full ${
                        homeOrAway === 'home'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {t('gameSettingsModal.home', 'Home')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetHomeOrAway('away')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors w-full ${
                        homeOrAway === 'away'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {t('gameSettingsModal.away', 'Away')}
                    </button>
                  </div>
                </div>

                {/* Game Structure */}
                <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                  <h3 className="text-lg font-semibold text-slate-200 mb-3">
                    {t('gameSettingsModal.periodsLabel', 'Periods')}
                  </h3>

                  {/* Number of Periods */}
                  <div className="mb-4">
                    <label htmlFor="numPeriodsSelect" className="block text-sm font-medium text-slate-300 mb-1">
                      {t('gameSettingsModal.numPeriodsLabel', 'Number of Periods')}
                    </label>
                    <select
                      id="numPeriodsSelect"
                      value={numPeriods}
                      onChange={(e) => onNumPeriodsChange(parseInt(e.target.value) as 1 | 2)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>

                  {/* Period Duration */}
                  <div className="mb-4">
                    <label htmlFor="periodDurationInput" className="block text-sm font-medium text-slate-300 mb-1">
                      {t('gameSettingsModal.periodDurationLabel', 'Period Duration (minutes)')}
                    </label>
                    <input
                      type="number"
                      id="periodDurationInput"
                      value={periodDurationMinutes}
                      onChange={(e) => onPeriodDurationChange(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      min="1"
                    />
                  </div>

                  {/* Demand Factor Slider */}
                  <div className="mb-4">
                    <AssessmentSlider
                      label={t('gameSettingsModal.demandFactorLabel', 'Game Demand Level')}
                      value={demandFactor}
                      onChange={(v) => {
                        onDemandFactorChange(v);
                        if (currentGameId) {
                          updateGameDetailsMutation.mutate({
                            gameId: currentGameId,
                            updates: { demandFactor: v },
                          });
                        }
                      }}
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      reverseColor
                    />
                  </div>
                  <div className="mb-4">
                    <label className="inline-flex items-center text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={!isPlayed}
                        onChange={(e) => {
                          const newValue = !e.target.checked;
                          onIsPlayedChange(newValue);
                          if (currentGameId) {
                            updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { isPlayed: newValue } });
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
                      />
                      <span className="ml-2">{t('gameSettingsModal.unplayedToggle', 'Not played yet')}</span>
                    </label>
                  </div>
                </div>


                {/* Fair Play Card Section */}
                <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">
                    {t('gameSettingsModal.fairPlayCardTitle', 'Fair Play Card')}
                  </h3>
                  <div className="space-y-3">
                    <p className="text-slate-300 text-sm">
                      {t('gameSettingsModal.fairPlayCardDescription', 'Select a player to award the Fair Play Card, or clear the current selection.')}
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <select
                        value={availablePlayers.find(p => p.receivedFairPlayCard)?.id || ''}
                        onChange={(e) => handleFairPlayCardClick(e.target.value || null)}
                        aria-label={t('gameSettingsModal.fairPlayCardPlayerSelect', 'Select player for Fair Play Card')}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      >
                        <option value="">{t('gameSettingsModal.selectPlayerForFairPlay', '-- Select Player --')}</option>
                        {availablePlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                            {player.receivedFairPlayCard ? ` (${t('gameSettingsModal.currentFairPlayHolder', 'Current')})` : ''}
                          </option>
                        ))}
                      </select>
                      
                      {availablePlayers.some(p => p.receivedFairPlayCard) && (
                        <button
                          onClick={() => handleFairPlayCardClick(null)}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm font-medium transition-colors shadow-sm"
                          title={t('gameSettingsModal.clearFairPlayCard', 'Clear Fair Play Card')}
                        >
                          {t('common.clear', 'Clear')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player Selection Section */}
                <PlayerSelectionSection
                  availablePlayers={availablePlayers}
                  selectedPlayerIds={selectedPlayerIds}
                  onSelectedPlayersChange={onSelectedPlayersChange}
                  title={t('gameSettingsModal.selectPlayers', 'Select Players')}
                  playersSelectedText={t('gameSettingsModal.playersSelected', 'selected')}
                  selectAllText={t('gameSettingsModal.selectAll', 'Select All')}
                  noPlayersText={t('gameSettingsModal.noPlayersInRoster', 'No players in roster. Add players in Roster Settings.')}
                  disabled={eventManagement.isProcessing || inlineEditing.isProcessing || seasonTournament.isProcessing}
                />
              </div>
            </div>

            {/* Game Events Section */}
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                {t('gameSettingsModal.eventLogTitle', 'Event Log')}
              </h3>
              <div className="space-y-2">
                {eventManagement.localGameEvents.map(event => (
                  <div 
                    key={event.id}
                    className={`p-3 rounded-md border ${
                      eventManagement.editingGoalId === event.id
                        ? 'bg-slate-700/75 border-indigo-500'
                        : 'bg-slate-800/40 border-slate-700/50'
                    }`}
                  >
                    {eventManagement.editingGoalId === event.id ? (
                      <div className="space-y-3">
                        <input
                          ref={eventManagement.goalTimeInputRef}
                          type="text"
                          value={eventManagement.editGoalTime}
                          onChange={(e) => eventManagement.setEditGoalTime(e.target.value)}
                          placeholder={t('gameSettingsModal.timeFormatPlaceholder', 'MM:SS')}
                          aria-label={t('gameSettingsModal.editGoalTimeLabel', 'Edit goal time')}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        />
                        {event.type === 'goal' && (
                          <>
                            <select
                              value={eventManagement.editGoalScorerId}
                              onChange={(e) => eventManagement.setEditGoalScorerId(e.target.value)}
                              aria-label={t('gameSettingsModal.selectScorer', 'Select Scorer...')}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm appearance-none"
                            >
                              <option value="">{t('gameSettingsModal.selectScorer', 'Select Scorer...')}</option>
                              {availablePlayers.map(player => (
                                <option key={player.id} value={player.id}>{player.name}</option>
                              ))}
                            </select>
                            <select
                              value={eventManagement.editGoalAssisterId}
                              onChange={(e) => eventManagement.setEditGoalAssisterId(e.target.value || undefined)}
                              aria-label={t('gameSettingsModal.selectAssister', 'Select Assister (Optional)...')}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm appearance-none"
                            >
                              <option value="">{t('gameSettingsModal.selectAssister', 'Select Assister (Optional)...')}</option>
                              {availablePlayers.map(player => (
                                <option key={player.id} value={player.id}>{player.name}</option>
                              ))}
                            </select>
                          </>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={eventManagement.handleCancelEditGoal}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
                            disabled={eventManagement.isProcessing}
                          >
                            {t('common.cancel', 'Cancel')}
                          </button>
                          <button
                            onClick={() => eventManagement.handleSaveGoal(event.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
                            disabled={eventManagement.isProcessing}
                          >
                            {t('common.save', 'Save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-300">{formatTime(event.time)}</span>
                          <span className="text-slate-100">
                            {getEventDescription(event, availablePlayers, t)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => eventManagement.handleEditGoal(event)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-400 transition-colors"
                            title={t('common.edit', 'Edit')}
                            disabled={eventManagement.isProcessing}
                          >
                            <FaEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => eventManagement.handleDeleteGoal(event.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 transition-colors"
                            title={t('common.delete', 'Delete')}
                            disabled={eventManagement.isProcessing}
                          >
                            <FaTrashAlt className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {eventManagement.localGameEvents.length === 0 && (
                  <div className="text-slate-400 text-center py-4">
                    {t('gameSettingsModal.noGoalsLogged', 'No goals logged yet.')}
                  </div>
                )}
              </div>
            </div>

            {/* Game Notes Section */}
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                {t('gameSettingsModal.notesTitle', 'Game Notes')}
              </h3>
              {inlineEditing.inlineEditingField === 'notes' ? (
                <div className="space-y-3">
                  <textarea
                    ref={inlineEditing.notesTextareaRef}
                    value={inlineEditing.inlineEditValue}
                    onChange={(e) => inlineEditing.setInlineEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        inlineEditing.handleConfirmInlineEdit();
                      } else if (e.key === 'Escape') {
                        inlineEditing.handleCancelInlineEdit();
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm h-32 resize-none"
                    placeholder={t('gameSettingsModal.notesPlaceholder', 'Write notes...')}
                    disabled={inlineEditing.isProcessing}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={inlineEditing.handleCancelInlineEdit}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
                      disabled={inlineEditing.isProcessing}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={inlineEditing.handleConfirmInlineEdit}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
                      disabled={inlineEditing.isProcessing}
                    >
                      {t('common.save', 'Save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer hover:text-yellow-400 transition-colors min-h-[8rem] p-3 rounded-md border border-slate-700/50 bg-slate-700/50"
                  onClick={() => inlineEditing.handleStartInlineEdit('notes')}
                >
                  {gameNotes || t('gameSettingsModal.noNotes', 'No notes yet. Click to add.')}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20">
            <div className="flex justify-end px-4">
              {(eventManagement.error || inlineEditing.error || seasonTournament.error) && (
                <div className="text-red-400 text-sm mr-auto">{eventManagement.error || inlineEditing.error || seasonTournament.error}</div>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSettingsModal;
