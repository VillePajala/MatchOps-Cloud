'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/contexts/ToastProvider';
import { Player, Season, Tournament } from '@/types';
import { normalizeRosterIds } from '@/utils/idUtils';
import { HiPlusCircle } from 'react-icons/hi';
import logger from '@/utils/logger';
import { saveLastHomeTeamName as utilSaveLastHomeTeamName } from '@/utils/appSettings';
import { UseMutationResult } from '@tanstack/react-query';
import AssessmentSlider from './AssessmentSlider';
import PlayerSelectionSection from './PlayerSelectionSection';
import TeamOpponentInputs from './TeamOpponentInputs';
import { AGE_GROUPS, LEVELS } from '@/config/gameOptions';
import type { TranslationKey } from '@/i18n-types';
import { useModalStability } from '@/hooks/useModalStability';

// Skeleton component for dropdowns (unused but kept for potential future use)
const _DropdownSkeleton: React.FC<{ label: string }> = ({ label }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-300 mb-1">
      {label}
    </label>
    <div className="flex items-center gap-2">
      <div className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md">
        <div className="h-5 bg-slate-600 rounded animate-pulse"></div>
      </div>
      <div className="p-2">
        <div className="w-6 h-6 bg-slate-600 rounded animate-pulse"></div>
      </div>
    </div>
  </div>
);

interface NewGameSetupModalProps {
  isOpen: boolean;
  initialPlayerSelection: string[] | null;
  availablePlayers: Player[];
  demandFactor: number;
  onDemandFactorChange: (factor: number) => void;
  onStart: (
    initialSelectedPlayerIds: string[],
    homeTeamName: string,
    opponentName: string,
    gameDate: string,
    gameLocation: string,
    gameTime: string,
    seasonId: string | null,
    tournamentId: string | null,
    numPeriods: 1 | 2,
    periodDuration: number,
    homeOrAway: 'home' | 'away',
    demandFactor: number,
    ageGroup: string,
    tournamentLevel: string,
    isPlayed: boolean
  ) => Promise<void>;
  onCancel: () => void;
  addSeasonMutation: UseMutationResult<Season | null, Error, Partial<Season> & { name: string }, unknown>;
  addTournamentMutation: UseMutationResult<Tournament | null, Error, Partial<Tournament> & { name: string }, unknown>;
  isAddingSeason: boolean;
  isAddingTournament: boolean;
  // New props for cached data
  seasons?: Season[];
  tournaments?: Tournament[];
  lastHomeTeamName?: string;
  isLoadingCachedData?: boolean;
  hasTimedOut?: boolean;
  onRefetch?: () => void;
}

const NewGameSetupModal: React.FC<NewGameSetupModalProps> = ({
  isOpen,
  initialPlayerSelection,
  availablePlayers,
  demandFactor,
  onDemandFactorChange,
  onStart,
  onCancel,
  addSeasonMutation,
  addTournamentMutation,
  isAddingSeason,
  isAddingTournament,
  // Cached data props
  seasons: cachedSeasons,
  tournaments: cachedTournaments,
  lastHomeTeamName: cachedLastHomeTeamName,
  isLoadingCachedData = false,
  hasTimedOut = false,
  onRefetch,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [homeTeamName, setHomeTeamName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [homeTeamNameError, setHomeTeamNameError] = useState('');
  const [opponentNameError, setOpponentNameError] = useState('');
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [gameLocation, setGameLocation] = useState('');
  const [gameHour, setGameHour] = useState<string>('');
  const [gameMinute, setGameMinute] = useState<string>('');
  const [ageGroup, setAgeGroup] = useState('');
  const [tournamentLevel, setTournamentLevel] = useState('');
  // Track fields user has manually edited; avoid overwriting them with Season/Tournament auto-prefill
  const dirtyFieldsRef = useRef<{ [K in 'gameLocation' | 'ageGroup' | 'tournamentLevel' | 'numPeriods' | 'periodDurationMinutes' | 'selectedPlayerIds' | 'gameDate']?: boolean }>({});

  const _markDirty = (key: keyof typeof dirtyFieldsRef.current) => {
    dirtyFieldsRef.current[key] = true;
  };

  const homeTeamInputRef = useRef<HTMLInputElement>(null);
  const opponentInputRef = useRef<HTMLInputElement>(null);

  // Use modal stability hook for better focus management
  const { getStableInputProps } = useModalStability({
    isOpen,
    primaryInputRef: homeTeamInputRef,
    delayMs: 200,
    preventRepeatedFocus: true,
  });

  // Use cached data with fallback to local state for background updates
  const [seasons, setSeasons] = useState<Season[]>(cachedSeasons || []);
  const [tournaments, setTournaments] = useState<Tournament[]>(cachedTournaments || []);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  // State for creating new season/tournament
  const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const newSeasonInputRef = useRef<HTMLInputElement>(null);
  const [showNewTournamentInput, setShowNewTournamentInput] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const newTournamentInputRef = useRef<HTMLInputElement>(null);

  // state for periods and duration
  const [localNumPeriods, setLocalNumPeriods] = useState<1 | 2>(2);
  const [localPeriodDurationString, setLocalPeriodDurationString] = useState<string>('10');

  // <<< Step 4a: State for Home/Away >>>
  const [localHomeOrAway, setLocalHomeOrAway] = useState<'home' | 'away'>('home');
  const [isPlayed, setIsPlayed] = useState<boolean>(true);

  // MOVED state declarations for selectedPlayerIds here
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialPlayerSelection || []);

  // Performance tracking (for future monitoring integration)
  const [_modalOpenTime] = useState(() => performance.now());
  const [_isInteractive, setIsInteractive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Background reconciliation effect for cached data
  useEffect(() => {
    if (cachedSeasons && cachedSeasons.length > 0) {
      setSeasons(cachedSeasons);
    }
  }, [cachedSeasons]);

  useEffect(() => {
    if (cachedTournaments && cachedTournaments.length > 0) {
      setTournaments(cachedTournaments);
    }
  }, [cachedTournaments]);

  useEffect(() => {
    if (isOpen) {
      // Performance mark for modal open
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('new-game-modal-open');
      }

      // Form reset logic - instant UI
      setOpponentName('');
      setGameDate(new Date().toISOString().split('T')[0]);
      setGameLocation('');
      setGameHour('');
      setGameMinute('');
      setSelectedSeasonId(null);
      setSelectedTournamentId(null);
      setShowNewSeasonInput(false);
      setNewSeasonName('');
      setShowNewTournamentInput(false);
      setNewTournamentName('');
      setLocalNumPeriods(2);
      setLocalPeriodDurationString('10');
      setLocalHomeOrAway('home');

      // Set player selection
      if (initialPlayerSelection && initialPlayerSelection.length > 0) {
        setSelectedPlayerIds(initialPlayerSelection);
      } else if (availablePlayers && availablePlayers.length > 0) {
        setSelectedPlayerIds(availablePlayers.map(p => p.id));
      }

      // Set home team name from cache or default
      setHomeTeamName(cachedLastHomeTeamName || t('newGameSetupModal.defaultTeamName', 'My Team'));

      // Mark as interactive immediately after form setup
      setIsInteractive(true);
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('new-game-modal-interactive');

        try {
          performance.measure(
            'new-game-modal-interactive-time',
            'new-game-modal-open',
            'new-game-modal-interactive'
          );
        } catch {
          // Ignore measurement errors
        }
      }
    }
  }, [isOpen, initialPlayerSelection, availablePlayers, cachedLastHomeTeamName, t]);

  // Validation handlers
  const handleTeamNameBlur = () => {
    if (!homeTeamName.trim()) {
      setHomeTeamNameError(t('newGameSetupModal.homeTeamNameRequired', 'Home Team Name is required.'));
    } else {
      setHomeTeamNameError('');
    }
  };

  const handleOpponentNameBlur = () => {
    if (!opponentName.trim()) {
      setOpponentNameError(t('newGameSetupModal.opponentNameRequired', 'Opponent Name is required.'));
    } else {
      setOpponentNameError('');
    }
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedSeasonId(value);
      setSelectedTournamentId(null);
      setShowNewSeasonInput(false); // Hide create input if selecting existing
      setNewSeasonName('');
    } else {
      setSelectedSeasonId(null);
    }
  };

  useEffect(() => {
    if (selectedSeasonId) {
      const s = seasons.find(se => se.id === selectedSeasonId);
      if (s) {
        if (!dirtyFieldsRef.current.gameLocation) setGameLocation(s.location || '');
        if (!dirtyFieldsRef.current.ageGroup) setAgeGroup(s.ageGroup || '');
        if (!dirtyFieldsRef.current.numPeriods) setLocalNumPeriods((s.periodCount as 1 | 2) || 2);
        if (!dirtyFieldsRef.current.periodDurationMinutes) setLocalPeriodDurationString(s.periodDuration ? String(s.periodDuration) : '10');
        if (s.defaultRoster && s.defaultRoster.length > 0 && !dirtyFieldsRef.current.selectedPlayerIds) {
          setSelectedPlayerIds(normalizeRosterIds(s.defaultRoster));
        }
      }
    }
  }, [selectedSeasonId, seasons, availablePlayers]);

  const handleTournamentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedTournamentId(value);
      setSelectedSeasonId(null);
      setShowNewTournamentInput(false); // Hide create input if selecting existing
      setNewTournamentName('');
    } else {
      setSelectedTournamentId(null);
    }
  };

  useEffect(() => {
    if (selectedTournamentId) {
      const t = tournaments.find(tt => tt.id === selectedTournamentId);
      if (t) {
        if (!dirtyFieldsRef.current.gameLocation) setGameLocation(t.location || '');
        if (!dirtyFieldsRef.current.ageGroup) setAgeGroup(t.ageGroup || '');
        if (!dirtyFieldsRef.current.tournamentLevel) setTournamentLevel(t.level || '');
        if (!dirtyFieldsRef.current.numPeriods) setLocalNumPeriods((t.periodCount as 1 | 2) || 2);
        if (!dirtyFieldsRef.current.periodDurationMinutes) setLocalPeriodDurationString(t.periodDuration ? String(t.periodDuration) : '10');
        if (t.defaultRoster && t.defaultRoster.length > 0 && !dirtyFieldsRef.current.selectedPlayerIds) {
          setSelectedPlayerIds(normalizeRosterIds(t.defaultRoster));
        }
        // NEW: If tournament has a start date and user hasn't edited game date, set game date from tournament start
        if (t.startDate && !dirtyFieldsRef.current.gameDate) {
          setGameDate(t.startDate);
        }
      }
    }
  }, [selectedTournamentId, tournaments, availablePlayers]);

  // --- Handlers for Create New Buttons ---
  const handleShowCreateSeason = () => {
    setShowNewSeasonInput(true);
    setSelectedSeasonId(null); // Deselect any existing season
    setSelectedTournamentId(null); // Ensure tournament is also deselected
  };

  const handleShowCreateTournament = () => {
    setShowNewTournamentInput(true);
    setSelectedTournamentId(null); // Deselect any existing tournament
    setSelectedSeasonId(null); // Ensure season is also deselected
  };

  // Implement Add New Season logic
  const handleAddNewSeason = async () => {
    const trimmedName = newSeasonName.trim();
    if (!trimmedName) {
      showToast(t('newGameSetupModal.newSeasonNameRequired', 'Please enter a name for the new season.'), 'error');
      newSeasonInputRef.current?.focus();
      return;
    }

    try {
      // Use the mutation
      const newSeason = await addSeasonMutation.mutateAsync({ name: trimmedName });

      if (newSeason) {
        // onSuccess in page.tsx will invalidate and refetch seasons.
        // The local 'seasons' state in this modal will be updated by the useEffect 
        // that fetches seasons when the modal opens, or if we explicitly refetch here.
        // For now, we'll update the selection and UI, relying on eventual consistency.
        setSeasons(prevSeasons => [...prevSeasons, newSeason].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedSeasonId(newSeason.id);
        setSelectedTournamentId(null);
        setNewSeasonName('');
        setShowNewSeasonInput(false);
        logger.log("Add season mutation initiated for:", newSeason.name);
        // No need to manually update 'seasons' state here if page.tsx invalidates
      } else {
        // This block might be reached if mutateAsync resolves but utilAddSeason returned null (e.g., duplicate)
        // The mutation's onSuccess/onError in page.tsx would have more context.
        logger.warn("addSeasonMutation.mutateAsync completed, but newSeason is null. Check mutation's onSuccess/onError for details.");
        // alert for duplicate is better handled by the mutation's error/success reporting if it returns a specific error or null for it
      }
    } catch (error) {
      // This catch is for errors from mutateAsync itself, if not handled by mutation's onError
      logger.error("Error calling addSeasonMutation.mutateAsync:", error);
      // alert(t('newGameSetupModal.errorAddingSeasonGeneric', 'Error initiating add season. See console.'));
      // The actual user-facing error for mutation failure should come from the mutation's onError handler in page.tsx
      newSeasonInputRef.current?.focus();
    }
  };

  // Implement Add New Tournament logic
  const handleAddNewTournament = async () => {
    const trimmedName = newTournamentName.trim();
    if (!trimmedName) {
      showToast(t('newGameSetupModal.newTournamentNameRequired', 'Please enter a name for the new tournament.'), 'error');
      newTournamentInputRef.current?.focus();
      return;
    }

    try {
      // Use the mutation
      const newTournament = await addTournamentMutation.mutateAsync({ name: trimmedName });

      if (newTournament) {
        setTournaments(prevTournaments => [...prevTournaments, newTournament].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedTournamentId(newTournament.id);
        setSelectedSeasonId(null);
        setNewTournamentName('');
        setShowNewTournamentInput(false);
        logger.log("Add tournament mutation initiated for:", newTournament.name);
        // No need to manually update 'tournaments' state here
      } else {
        logger.warn("addTournamentMutation.mutateAsync completed, but newTournament is null.");
      }
    } catch (error) {
      logger.error("Error calling addTournamentMutation.mutateAsync:", error);
      // alert(t('newGameSetupModal.errorAddingTournamentGeneric', 'Error initiating add tournament. See console.'));
      newTournamentInputRef.current?.focus();
    }
  };
  // --- End Handlers for Create New ---


  const handleStartClick = async () => {
    const trimmedHomeTeamName = homeTeamName.trim();
    const trimmedOpponentName = opponentName.trim();

    if (!trimmedHomeTeamName) {
      showToast(t('newGameSetupModal.homeTeamNameRequired', 'Home Team Name is required.') || 'Home Team Name is required.', 'error');
      homeTeamInputRef.current?.focus();
      return;
    }

    if (!trimmedOpponentName) {
      showToast(t('newGameSetupModal.opponentNameRequired', 'Opponent Name is required.') || 'Opponent Name is required.', 'error');
      opponentInputRef.current?.focus();
      return;
    }

    // Handle case where user is trying to submit while create input is open but empty
    if (showNewSeasonInput && !newSeasonName.trim()) {
      showToast(t('newGameSetupModal.newSeasonNameRequired', 'Please enter a name for the new season or select an existing one.'), 'error');
      newSeasonInputRef.current?.focus();
      return;
    }
    if (showNewTournamentInput && !newTournamentName.trim()) {
      showToast(t('newGameSetupModal.newTournamentNameRequired', 'Please enter a name for the new tournament or select an existing one.'), 'error');
      newTournamentInputRef.current?.focus();
      return;
    }

    if (selectedPlayerIds.length === 0) {
      showToast(t('newGameSetupModal.noPlayersSelected', 'Please select at least one player.') || 'Please select at least one player.', 'error');
      return;
    }

    // Format game time properly
    const formattedHour = gameHour.padStart(2, '0');
    const formattedMinute = gameMinute.padStart(2, '0');
    const gameTime = (gameHour && gameMinute) ? `${formattedHour}:${formattedMinute}` : '';

    // Validate period duration
    const duration = parseInt(localPeriodDurationString, 10);
    if (isNaN(duration) || duration <= 0) {
      showToast(t('newGameSetupModal.invalidPeriodDuration', 'Period duration must be a positive number.') || 'Period duration must be a positive number.', 'error');
      return;
    }

    // --- Save last used home team name using utility function ---
    try {
      await utilSaveLastHomeTeamName(trimmedHomeTeamName);
    } catch (error) {
      logger.error("Failed to save last home team name:", error);
      // Continue without blocking, as this is not critical for starting the game
    }
    // --- End Save ---

    // Call the onStart callback from props using the modal's internal selectedPlayerIds state
    try {
      setIsSubmitting(true);
      await onStart(
        selectedPlayerIds, // MODIFIED: Use the modal's current selection state
        trimmedHomeTeamName,
        trimmedOpponentName,
        gameDate,
        gameLocation.trim(),
        gameTime,
        selectedSeasonId,
        selectedTournamentId,
        localNumPeriods,
        duration, // use validated duration
        localHomeOrAway, // <<< Step 4a: Pass Home/Away >>>
        demandFactor,
        ageGroup,
        tournamentLevel,
        isPlayed
      );
    } catch (error) {
      logger.error('[NewGameSetupModal] Failed to start new game:', error);
      throw error; // Re-throw to let parent handle the error and modal state
    } finally {
      setIsSubmitting(false);
    }

    // Modal will be closed by parent component after successful onStart
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Allow Enter to submit only from main text inputs, not the create new inputs yet
    if (event.key === 'Enter' && !showNewSeasonInput && !showNewTournamentInput) {
      const target = event.target as HTMLElement;
      // Avoid submitting if focus is on dropdowns or buttons that might have their own Enter behavior
      if (target.tagName !== 'SELECT' && target.tagName !== 'BUTTON') {
        handleStartClick();
      }
    } else if (event.key === 'Escape') {
      onCancel();
    }
  };

  // Separate KeyDown handlers for the create new inputs
  const handleNewSeasonKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddNewSeason();
    } else if (event.key === 'Escape') {
      setShowNewSeasonInput(false);
      setNewSeasonName('');
    }
  };

  const handleNewTournamentKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddNewTournament();
    } else if (event.key === 'Escape') {
      setShowNewTournamentInput(false);
      setNewTournamentName('');
    }
  };

  // ... handleHourChange and handleMinuteChange functions ...
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 2) {
      setGameHour(value);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 2) {
      setGameMinute(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 rounded-none shadow-xl flex flex-col border-0 overflow-hidden h-full w-full bg-noise-texture relative">
        {/* Background effects */}
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
        <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />

        {/* Content wrapper */}
        <div className="relative z-10 flex flex-col min-h-0">
          {/* Fixed Header */}
          <div className="flex justify-center items-center pt-10 pb-4 backdrop-blur-sm bg-slate-900/20">
            <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">
              {t('newGameSetupModal.title', 'New Game Setup')}
            </h2>
          </div>

          {/* Fixed Controls Section */}
          <div className="px-6 pt-3 pb-4 backdrop-blur-sm bg-slate-900/20">
            <TeamOpponentInputs
              teamName={homeTeamName}
              opponentName={opponentName}
              onTeamNameChange={(value) => {
                setHomeTeamName(value);
                if (homeTeamNameError) setHomeTeamNameError('');
              }}
              onOpponentNameChange={(value) => {
                setOpponentName(value);
                if (opponentNameError) setOpponentNameError('');
              }}
              teamLabel={t('newGameSetupModal.homeTeamName', 'Your Team Name') + ' *'}
              teamPlaceholder={t('newGameSetupModal.homeTeamPlaceholder', 'e.g., Galaxy U10')}
              opponentLabel={t('newGameSetupModal.opponentNameLabel', 'Opponent Name') + ' *'}
              opponentPlaceholder={t('newGameSetupModal.opponentPlaceholder', 'Enter opponent name')}
              teamInputRef={homeTeamInputRef}
              opponentInputRef={opponentInputRef}
              teamNameError={homeTeamNameError}
              opponentNameError={opponentNameError}
              onTeamNameBlur={handleTeamNameBlur}
              onOpponentNameBlur={handleOpponentNameBlur}
              onKeyDown={handleKeyDown}
              disabled={false}
              stableInputProps={getStableInputProps()}
            />
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">

            {/* Season & Tournament Section */}
            <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-200">
                  {t('newGameSetupModal.gameTypeLabel', 'Game Type')}
                </h3>
                {hasTimedOut && onRefetch && (
                  <button
                    onClick={onRefetch}
                    className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded-md shadow-sm"
                  >
                    {t('common.refresh', 'Refresh')}
                  </button>
                )}
              </div>

              {/* Season Selection */}
              <div className="mb-4">
                <label htmlFor="seasonSelect" className="block text-sm font-medium text-slate-300 mb-1">
                  {t('newGameSetupModal.seasonLabel', 'Season')}
                </label>
                <div className="flex items-center gap-2">
                  {isLoadingCachedData && (!seasons || seasons.length === 0) ? (
                    <div className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md">
                      <div className="h-5 bg-slate-600 rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <select
                      id="seasonSelect"
                      value={selectedSeasonId || ''}
                      onChange={handleSeasonChange}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    >
                      <option value="">{t('newGameSetupModal.selectSeason', '-- Select Season --')}</option>
                      {seasons.map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={handleShowCreateSeason}
                    className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                    title={showNewSeasonInput ? t('newGameSetupModal.cancelCreate', 'Cancel creation') : t('newGameSetupModal.createSeason', 'Create new season')}
                    disabled={isAddingSeason || isAddingTournament}
                  >
                    <HiPlusCircle className={`w-6 h-6 transition-transform ${showNewSeasonInput ? 'rotate-45' : ''}`} />
                  </button>
                </div>
              </div>
              {showNewSeasonInput && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={newSeasonInputRef}
                    type="text"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                    onKeyDown={handleNewSeasonKeyDown}
                    placeholder={t('newGameSetupModal.newSeasonPlaceholder', 'Enter new season name...')}
                    className="flex-1 min-w-[200px] px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    disabled={isAddingSeason}
                  />
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleAddNewSeason}
                      disabled={isAddingSeason || !newSeasonName.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      {isAddingSeason ? t('newGameSetupModal.creating', 'Creating...') : t('newGameSetupModal.addButton', 'Add')}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewSeasonInput(false);
                        setNewSeasonName('');
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm whitespace-nowrap"
                    >
                      {t('common.cancelButton', 'Cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Tournament Selection (moved inside the same section container) */}
              <div>
                <label htmlFor="tournamentSelect" className="block text-sm font-medium text-slate-300 mb-1">
                  {t('newGameSetupModal.tournamentLabel', 'Tournament')}
                </label>
                <div className="flex items-center gap-2">
                  {isLoadingCachedData && (!tournaments || tournaments.length === 0) ? (
                    <div className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md">
                      <div className="h-5 bg-slate-600 rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <select
                      id="tournamentSelect"
                      value={selectedTournamentId || ''}
                      onChange={handleTournamentChange}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    >
                      <option value="">{t('newGameSetupModal.selectTournament', '-- Select Tournament --')}</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={handleShowCreateTournament}
                    className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                    title={showNewTournamentInput ? t('newGameSetupModal.cancelCreate', 'Cancel creation') : t('newGameSetupModal.createTournament', 'Create new tournament')}
                    disabled={isAddingSeason || isAddingTournament}
                  >
                    <HiPlusCircle className={`w-6 h-6 transition-transform ${showNewTournamentInput ? 'rotate-45' : ''}`} />
                  </button>
                </div>
                {selectedTournamentId && (
                  <div className="mt-2">
                    <label htmlFor="tournamentLevelInput" className="block text-sm font-medium text-slate-300 mb-1">
                      {t('newGameSetupModal.levelLabel', 'Level')}
                    </label>
                    <select
                      id="tournamentLevelInput"
                      value={tournamentLevel}
                      onChange={(e) => setTournamentLevel(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      disabled={false}
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
                {showNewTournamentInput && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      ref={newTournamentInputRef}
                      type="text"
                      value={newTournamentName}
                      onChange={(e) => setNewTournamentName(e.target.value)}
                      onKeyDown={handleNewTournamentKeyDown}
                      placeholder={t('newGameSetupModal.newTournamentPlaceholder', 'Enter new tournament name...')}
                      className="flex-1 min-w-[200px] px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      disabled={isAddingTournament}
                    />
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={handleAddNewTournament}
                        disabled={isAddingTournament || !newTournamentName.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50 whitespace-nowrap"
                      >
                        {isAddingTournament ? t('newGameSetupModal.creating', 'Creating...') : t('newGameSetupModal.addButton', 'Add')}
                      </button>
                      <button
                        onClick={() => {
                          setShowNewTournamentInput(false);
                          setNewTournamentName('');
                        }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm whitespace-nowrap"
                      >
                        {t('common.cancelButton', 'Cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Age Group */}
            <div className="mb-4">
              <label htmlFor="ageGroupSelect" className="block text-sm font-medium text-slate-300 mb-1">
                {t('newGameSetupModal.ageGroupLabel', 'Age Group (Optional)')}
              </label>
              <select
                id="ageGroupSelect"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                disabled={false}
              >
                <option value="">{t('common.none', 'None')}</option>
                {AGE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>


            {/* Game Date */}
            <div className="mb-4">
              <label htmlFor="gameDateInput" className="block text-sm font-medium text-slate-300 mb-1">
                {t('newGameSetupModal.gameDateLabel', 'Game Date')}
              </label>
              <input
                type="date"
                id="gameDateInput"
                value={gameDate}
                onChange={(e) => { setGameDate(e.target.value); dirtyFieldsRef.current.gameDate = true; }}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                disabled={false}
              />
            </div>

            {/* Game Location */}
            <div className="mb-4">
              <label htmlFor="gameLocationInput" className="block text-sm font-medium text-slate-300 mb-1">
                {t('newGameSetupModal.gameLocationLabel', 'Location (Optional)')}
              </label>
              <input
                type="text"
                id="gameLocationInput"
                value={gameLocation}
                onChange={(e) => setGameLocation(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('newGameSetupModal.locationPlaceholder', 'e.g., Central Park Field 2')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                disabled={false}
              />
            </div>

            {/* Game Time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('newGameSetupModal.gameTimeLabel', 'Time (Optional)')}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={gameHour}
                  onChange={handleHourChange}
                  onKeyDown={handleKeyDown}
                  placeholder={t('newGameSetupModal.hourPlaceholder', 'HH')}
                  className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  min="0"
                  max="23"
                  disabled={false}
                />
                <span className="text-slate-400">:</span>
                <input
                  type="number"
                  value={gameMinute}
                  onChange={handleMinuteChange}
                  onKeyDown={handleKeyDown}
                  placeholder={t('newGameSetupModal.minutePlaceholder', 'MM')}
                  className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  min="0"
                  max="59"
                  disabled={false}
                />
              </div>
            </div>


            {/* Player Selection Section */}
            <PlayerSelectionSection
              availablePlayers={availablePlayers}
              selectedPlayerIds={selectedPlayerIds}
              onSelectedPlayersChange={setSelectedPlayerIds}
              title={t('newGameSetupModal.selectPlayers', 'Select Players')}
              playersSelectedText={t('newGameSetupModal.playersSelected', 'selected')}
              selectAllText={t('newGameSetupModal.selectAll', 'Select All')}
              noPlayersText={t('newGameSetupModal.noPlayersInRoster', 'No players in roster. Add players in Roster Settings.')}
              disabled={false}
            />

            {/* Game Settings Section */}
            <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">
                {t('newGameSetupModal.periodsLabel', 'Game Settings')}
              </h3>

              {/* Number of Periods */}
              <div className="mb-4">
                <label htmlFor="numPeriodsSelect" className="block text-sm font-medium text-slate-300 mb-1">
                  {t('newGameSetupModal.numPeriodsLabel', 'Number of Periods')}
                </label>
                <select
                  id="numPeriodsSelect"
                  value={localNumPeriods}
                  onChange={(e) => setLocalNumPeriods(parseInt(e.target.value) as 1 | 2)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              {/* Period Duration */}
              <div className="mb-4">
                <label htmlFor="periodDurationInput" className="block text-sm font-medium text-slate-300 mb-1">
                  {t('newGameSetupModal.periodDurationLabel', 'Period Duration (minutes)')}
                </label>
                <input
                  type="number"
                  id="periodDurationInput"
                  value={localPeriodDurationString}
                  onChange={(e) => setLocalPeriodDurationString(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  min="1"
                />
              </div>

              {/* Demand Factor Slider */}
              <div className="mb-4">
                <AssessmentSlider
                  label={t('newGameSetupModal.demandFactorLabel', 'Game Demand Level')}
                  value={demandFactor}
                  onChange={onDemandFactorChange}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  reverseColor
                />
              </div>

              {/* Home/Away Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('newGameSetupModal.homeOrAwayLabel', 'Your Team is')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocalHomeOrAway('home')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${localHomeOrAway === 'home'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                  >
                    {t('common.home', 'Home')}
                  </button>
                  <button
                    onClick={() => setLocalHomeOrAway('away')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${localHomeOrAway === 'away'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                  >
                    {t('common.away', 'Away')}
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="inline-flex items-center text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={!isPlayed}
                    onChange={(e) => setIsPlayed(!e.target.checked)}
                    className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
                  />
                  <span className="ml-2">{t('newGameSetupModal.unplayedToggle', 'Not played yet')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20">
            <div className="flex justify-end gap-3 px-6">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm"
              >
                {t('common.cancelButton', 'Cancel')}
              </button>
              <button
                onClick={handleStartClick}
                disabled={isAddingSeason || isAddingTournament || isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? t('newGameSetupModal.creating', 'Creating...') : t('newGameSetupModal.confirmAndStart', 'Confirm & Start Game')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewGameSetupModal;
