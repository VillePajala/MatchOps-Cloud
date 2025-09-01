'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import GameLoadingSkeleton from './Skeleton';
import { DEFAULT_GAME_ID } from '@/config/constants';
import { useTranslation } from 'react-i18next';
import { SavedGamesCollection } from '@/types'; // Keep this if SavedGamesCollection is from here
import { Season, Tournament } from '@/types'; // Corrected import path
import logger from '@/utils/logger';
import {
  HiOutlineDocumentArrowDown,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineTableCells,
  HiOutlineClock,
  HiOutlineMapPin,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronDown,
  HiOutlineChevronUp
} from 'react-icons/hi2';
// REMOVE unused Fa icons and useGameState hook
// import { FaTimes, FaUpload, FaDownload, FaTrash, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
// import { useGameState } from '@/hooks/useGameState';
// Backup functionality moved to SettingsModal
// Import new utility functions
import { getSeasons as utilGetSeasons } from '@/utils/seasons';
import { getTournaments as utilGetTournaments } from '@/utils/tournaments';
import { useToast } from '@/contexts/ToastProvider';
import { LoadGameModalDebug } from './LoadGameModalDebug';

export interface LoadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedGames: SavedGamesCollection;
  onLoad: (gameId: string) => void;
  onDelete: (gameId: string) => void;
  onExportOneJson: (gameId: string) => void;
  onExportOneCsv: (gameId: string) => void;
  currentGameId?: string;

  isLoadingGamesList?: boolean;
  loadGamesListError?: string | null;
  isGameLoading?: boolean;
  gameLoadError?: string | null;
  isGameDeleting?: boolean;
  gameDeleteError?: string | null;
  isGamesImporting?: boolean;
  gameLoadingStates?: Record<string, { loading: boolean; error: string | null }>;
  hasTimedOut?: boolean;
  onRefetch?: () => void;
}


const LoadGameModal: React.FC<LoadGameModalProps> = ({
  isOpen,
  onClose,
  savedGames,
  onLoad,
  onDelete,
  onExportOneJson,
  onExportOneCsv,
  currentGameId,
  isLoadingGamesList = false,
  loadGamesListError = null,
  isGameLoading = false,
  gameLoadError = null,
  isGameDeleting = false,
  gameDeleteError = null,
  isGamesImporting = false,
  gameLoadingStates = {},
  hasTimedOut: _hasTimedOut = false,
  onRefetch: _onRefetch,
}) => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [filterType, setFilterType] = useState<'season' | 'tournament' | null>(null);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [showUnplayedOnly, setShowUnplayedOnly] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const menuRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Toast important errors non-blockingly
  useEffect(() => {
    if (loadGamesListError) {
      showToast(loadGamesListError, 'error');
    }
  }, [loadGamesListError, showToast]);


  // State for seasons and tournaments
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  // Load seasons and tournaments on open - fetch in parallel and cache per session to reduce latency
  const hasLoadedMetaRef = useRef(false);
  useEffect(() => {
    if (!isOpen || hasLoadedMetaRef.current) return;
    hasLoadedMetaRef.current = true;
    const fetchModalData = async () => {
      try {
        const [loadedSeasonsData, loadedTournamentsData] = await Promise.all([
          utilGetSeasons().catch((e) => { logger.error('Error loading seasons via utility:', e); return []; }),
          utilGetTournaments().catch((e) => { logger.error('Error loading tournaments via utility:', e); return []; }),
        ]);
        setSeasons(Array.isArray(loadedSeasonsData) ? loadedSeasonsData : []);
        setTournaments(Array.isArray(loadedTournamentsData) ? loadedTournamentsData : []);
      } catch {
        // Already handled per-call; keep UI responsive
      }
    };
    fetchModalData();
  }, [isOpen]);

  // Filter logic updated to only use searchText
  const lightweightList = useMemo(() => {
    // Build a lightweight list for filtering/sorting
    return Object.keys(savedGames)
      .filter(id => id !== DEFAULT_GAME_ID)
      .map(id => {
        const g = savedGames[id];
        return {
          id,
          teamName: (g?.teamName || '').toLowerCase(),
          opponentName: (g?.opponentName || '').toLowerCase(),
          gameDate: g?.gameDate || '',
          gameTime: g?.gameTime || '',
          seasonId: g?.seasonId || '',
          tournamentId: g?.tournamentId || '',
          isPlayed: g?.isPlayed,
        };
      });
  }, [savedGames]);

  const filteredGameIds = useMemo(() => {
    const initialIds = lightweightList.map(x => x.id);

    const filteredBySearch = initialIds.filter(id => {
      const gameData = lightweightList.find(x => x.id === id);
      if (!gameData) return false;
      if (!searchText) return true;
      const lowerSearchText = searchText.toLowerCase();
      const teamName = gameData.teamName;
      const opponentName = gameData.opponentName;
      const gameDate = (gameData.gameDate || '').toLowerCase();
      const seasonName = seasons.find(s => s.id === gameData.seasonId)?.name.toLowerCase() || '';
      const tournamentName = tournaments.find(tourn => tourn.id === gameData.tournamentId)?.name.toLowerCase() || '';
      return (
        teamName.includes(lowerSearchText) ||
        opponentName.includes(lowerSearchText) ||
        gameDate.includes(lowerSearchText) ||
        seasonName.includes(lowerSearchText) ||
        tournamentName.includes(lowerSearchText)
      );
    });

    const filteredByBadge = filteredBySearch.filter(id => {
      if (!filterType || !filterId) return true;
      const gameData = lightweightList.find(x => x.id === id);
      if (!gameData) return false;

      let match = false;
      if (filterType === 'season') {
        match = gameData.seasonId === filterId;
      }
      if (filterType === 'tournament') {
        match = gameData.tournamentId === filterId;
      }

      return match;
    });

    const filteredByPlayed = filteredByBadge.filter(id => {
      if (!showUnplayedOnly) return true;
      const gameData = lightweightList.find(x => x.id === id);
      if (!gameData) return false;
      return gameData.isPlayed === false;
    });

    const sortedIds = filteredByPlayed.sort((a, b) => {
      const gameA = lightweightList.find(x => x.id === a)!;
      const gameB = lightweightList.find(x => x.id === b)!;

      const aDateStr = `${gameA.gameDate || ''} ${gameA.gameTime || ''}`.trim();
      const bDateStr = `${gameB.gameDate || ''} ${gameB.gameTime || ''}`.trim();
      const dateA = Number.isFinite(Date.parse(aDateStr)) ? new Date(aDateStr).getTime() : (gameA.gameDate ? new Date(gameA.gameDate).getTime() : 0);
      const dateB = Number.isFinite(Date.parse(bDateStr)) ? new Date(bDateStr).getTime() : (gameB.gameDate ? new Date(gameB.gameDate).getTime() : 0);

      if (dateB !== dateA) {
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      }

      // Secondary: fallback to ID timestamp if present
      const timestampA = parseInt(a.split('_')[1] || '', 10);
      const timestampB = parseInt(b.split('_')[1] || '', 10);
      if (!isNaN(timestampA) && !isNaN(timestampB)) {
        return timestampB - timestampA;
      }
      return 0;
    });
    return sortedIds;
  }, [lightweightList, searchText, seasons, tournaments, filterType, filterId, showUnplayedOnly]);

  // Pagination
  const totalItems = filteredGameIds.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedIds = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGameIds.slice(start, start + pageSize);
  }, [filteredGameIds, currentPage, pageSize]);
  useEffect(() => { setPage(1); }, [searchText, filterType, filterId, showUnplayedOnly, pageSize]);

  const handleDeleteClick = (gameId: string, gameName: string) => {
    // Use a confirmation dialog
    if (window.confirm(t('loadGameModal.deleteConfirm', `Are you sure you want to delete the saved game "{gameName}"? This action cannot be undone.`)?.replace('{gameName}', gameName))) {
      onDelete(gameId);
      setOpenMenuId(null); // Close menu after delete
    }
  };

  // Effect to close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // --- Event Handlers ---
  const handleBadgeClick = (type: 'season' | 'tournament', id: string) => {
    if (filterType === type && filterId === id) {
      // Clicked the currently active filter badge, so clear it
      setFilterType(null);
      setFilterId(null);
    } else {
      // Set new filter
      setFilterType(type);
      setFilterId(id);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchText = e.target.value;
    setSearchText(newSearchText);
    // If search text is cleared, also clear badge filter
    if (!newSearchText) {
      setFilterType(null);
      setFilterId(null);
    }
  };

  // Backup/restore functionality moved to SettingsModal

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  // Add debug component to log saved games data
  const debugComponent = process.env.NODE_ENV === 'development' ? (
    <LoadGameModalDebug savedGames={savedGames} />
  ) : null;

  // Scrollable Content Area
  // Main content: List of saved games or loading/error message
  let mainContent;
  if (isLoadingGamesList) {
    logger.debug('[LoadGameModal] Games list is loading...');
    mainContent = (
      <div className="py-6">
        <GameLoadingSkeleton />
        <GameLoadingSkeleton />
        <GameLoadingSkeleton />
      </div>
    );
  } else if (loadGamesListError) {
    mainContent = (
      <div className="bg-red-700/20 border border-red-600 text-red-300 px-4 py-3 rounded-md text-sm my-4 mx-2" role="alert">
        <p className="font-semibold mb-1">{t('common.error', 'Error')}:</p>
        <p>{loadGamesListError}</p>
      </div>
    );
  } else if (filteredGameIds.length === 0) {
    const hasFilters = searchText || (filterType && filterId);
    mainContent = (
      <div className="text-center text-slate-500 py-10 italic">
        {hasFilters ?
          t('loadGameModal.noGamesMatchFilter', 'No saved games match your filter.') :
          t('loadGameModal.noGamesSaved', 'No games have been saved yet.')
        }
      </div>
    );
  } else {
    mainContent = (
      <ul className="scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-1 px-1">
        {/* Display general game load/delete errors here, above the list but inside scroll area if many games */}
        {gameLoadError && ( // Show if error is general, not for a specific item in loop
          <li className="px-3 py-2 bg-red-700/20 border-b border-red-600 text-red-300 text-xs" role="alert">
            {gameLoadError}
          </li>
        )}
        {gameDeleteError && (
          <li className="px-3 py-2 bg-red-700/20 border-b border-red-600 text-red-300 text-xs" role="alert">
            {gameDeleteError}
          </li>
        )}
        {paginatedIds.map((gameId, index) => {
          const game = savedGames[gameId];
          if (!game) return null;
          const isCurrent = gameId === currentGameId;

          // Find Season/Tournament Name
          const season = seasons.find(s => s.id === game.seasonId);
          const tournament = tournaments.find(tourn => tourn.id === game.tournamentId);
          const contextName = season?.name || tournament?.name;
          const contextType = season ? 'Season' : (tournament ? 'Tournament' : null);
          const contextId = season?.id || tournament?.id;

          // Determine display names based on the specific game's homeOrAway setting
          const displayHomeTeamName = game.homeOrAway === 'home' ? (game.teamName || 'Team') : (game.opponentName || 'Opponent');
          const displayAwayTeamName = game.homeOrAway === 'home' ? (game.opponentName || 'Opponent') : (game.teamName || 'Team');

          const gameLoadingState = gameLoadingStates[gameId] || { loading: false, error: null };
          const isLoadActionActive = gameLoadingState.loading;
          const disableActions = isGameLoading || isGameDeleting || isGamesImporting;

          const totalPlayers = game.selectedPlayerIds?.length || 0;
          const assessmentsDone = Object.keys(game.assessments || {}).length;
          const assessmentsComplete = totalPlayers > 0 && assessmentsDone >= totalPlayers;
          const isExpanded = expandedIds.has(gameId);

          return (
            <li
              key={gameId}
              className={`relative mb-5 last:mb-0 ${openMenuId === gameId ? 'z-10' : ''}`}
              data-testid={`game-item-${gameId}`}
            >
              {/* Clean Game Card */}
              <div className={`relative rounded-lg border shadow-lg transition-all duration-200 ${index % 2 === 0
                ? 'bg-slate-700/60 border-slate-600/60 hover:bg-slate-700/80 hover:border-slate-500/80'
                : 'bg-slate-700/40 border-slate-600/40 hover:bg-slate-700/60 hover:border-slate-500/60'
                } ${isCurrent ? 'ring-2 ring-indigo-500 border-indigo-500' : ''
                } hover:shadow-xl`}>

                {/* Main Card Content */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(gameId)}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? t('loadGameModal.collapseCard', 'Collapse details') : t('loadGameModal.expandCard', 'Expand details')}
                  className="w-full p-5 text-left hover:bg-slate-700/20 transition-colors rounded-lg"
                >
                  {/* Match Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Team Names */}
                      <div className="flex items-center gap-3 mb-2">
                        {/* Home Team - Bold if it's your team */}
                        <h3 className={`text-lg ${game.homeOrAway === 'home'
                          ? `font-semibold ${isCurrent ? 'text-indigo-400' : 'text-slate-100'}`
                          : `font-normal ${isCurrent ? 'text-indigo-300' : 'text-slate-300'}`
                          }`}>
                          {displayHomeTeamName}
                        </h3>
                        <span className="text-slate-400 font-medium">vs</span>
                        {/* Away Team - Bold if it's your team */}
                        <h3 className={`text-lg ${game.homeOrAway === 'away'
                          ? `font-semibold ${isCurrent ? 'text-indigo-400' : 'text-slate-100'}`
                          : `font-normal ${isCurrent ? 'text-indigo-300' : 'text-slate-300'}`
                          }`}>
                          {displayAwayTeamName}
                        </h3>
                      </div>

                      {/* Season/Tournament Badge */}
                      <div className="mb-3">
                        {contextName && contextType && contextId && (
                          <span
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBadgeClick(contextType.toLowerCase() as ('season' | 'tournament'), contextId);
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBadgeClick(contextType.toLowerCase() as ('season' | 'tournament'), contextId);
                            }}
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${contextType.toLowerCase() === 'tournament'
                              ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                              } ${filterType === contextType.toLowerCase() && filterId === contextId ? 'ring-2 ring-indigo-500' : ''
                              }`}
                            title={t('loadGameModal.filterByTooltip', 'Filter by {{name}}', { replace: { name: contextName } }) ?? `Filter by ${contextName}`}
                          >
                            {contextType.toLowerCase() === 'tournament' ? (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 2L3 7v11c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V7l-7-5zM8 8h4v2H8V8z" clipRule="evenodd" />
                                </svg>
                                {contextName}
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                {contextName}
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Date and Time Info */}
                      <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                        {game.gameDate && (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(game.gameDate).toLocaleDateString(i18n.language)}
                          </span>
                        )}
                        {game.gameTime && (
                          <span className="flex items-center gap-1.5">
                            <HiOutlineClock className="w-4 h-4" />
                            {game.gameTime}
                          </span>
                        )}
                        {game.gameLocation && (
                          <span className="flex items-center gap-1.5">
                            <HiOutlineMapPin className="w-4 h-4" />
                            {game.gameLocation}
                          </span>
                        )}
                      </div>

                      {/* Status Badges - Always Visible */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {game.isPlayed === false && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300">
                            {t('loadGameModal.unplayedBadge', 'Not Played')}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                            {t('loadGameModal.currentlyLoaded', 'Active')}
                          </span>
                        )}
                        {totalPlayers > 0 && !assessmentsComplete && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Assessments Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score Display with Colored Numbers */}
                    <div className="ml-6 flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${(() => {
                          const homeScore = game.homeScore ?? 0;
                          const awayScore = game.awayScore ?? 0;
                          const isWin = game.homeOrAway === 'home' ? homeScore > awayScore : awayScore > homeScore;
                          const isLoss = game.homeOrAway === 'home' ? homeScore < awayScore : awayScore < homeScore;
                          const isTie = homeScore === awayScore;

                          if (isTie) {
                            return 'text-gray-300';
                          } else if (isWin) {
                            return 'text-green-400';
                          } else if (isLoss) {
                            return 'text-red-400';
                          }
                          return 'text-slate-100';
                        })()}`}>
                          {game.homeScore ?? 0} - {game.awayScore ?? 0}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Final Score
                        </div>
                      </div>
                      <div className="text-slate-400 hover:text-slate-300 transition-colors">
                        {isExpanded ? (
                          <HiOutlineChevronUp className="w-5 h-5" />
                        ) : (
                          <HiOutlineChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-slate-600/40 bg-slate-700/40">
                    <div className="p-5 space-y-4">

                      {/* Game Notes */}
                      {game.gameNotes && (
                        <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/40">
                          <h4 className="text-sm font-medium text-slate-200 mb-2">Game Notes</h4>
                          <p className="text-slate-300 whitespace-pre-line leading-relaxed">{game.gameNotes}</p>
                        </div>
                      )}

                      {/* Assessment Progress - Condensed */}
                      {totalPlayers > 0 && (
                        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-200">Player Assessments</h4>
                            <span className="text-slate-400 text-xs">
                              {assessmentsDone}/{totalPlayers} ({Math.round((assessmentsDone / totalPlayers) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${(assessmentsDone / totalPlayers) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Action Buttons and Status Badges */}
                      <div className="flex items-center justify-between">
                        {/* Left Side: Load Button Only */}
                        <div className="flex items-center">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await onLoad(gameId);
                                onClose();
                              } catch (error) {
                                logger.error('[LoadGameModal] Failed to load game:', error);
                                // Keep modal open on error so user can see what happened
                              }
                            }}
                            className={`inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors ${isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            disabled={disableActions || isLoadActionActive}
                          >
                            {isLoadActionActive ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                              </>
                            ) : (
                              <>
                                <HiOutlineDocumentArrowDown className="h-4 w-4 mr-2" />
                                {t('loadGameModal.loadButton', 'Load Game')}
                              </>
                            )}
                          </button>
                        </div>

                        {/* Right Side: Secondary Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onExportOneJson(gameId); }}
                            className={`p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700/40 rounded-lg transition-colors ${isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            disabled={disableActions || isLoadActionActive}
                            title={t('loadGameModal.exportJsonMenuItem', 'Export as JSON')}
                          >
                            <HiOutlineDocumentText className="h-4 w-4" />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); onExportOneCsv(gameId); }}
                            className={`p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700/40 rounded-lg transition-colors ${isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            disabled={disableActions || isLoadActionActive}
                            title={t('loadGameModal.exportExcelMenuItem', 'Export as CSV')}
                          >
                            <HiOutlineTableCells className="h-4 w-4" />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(gameId, `${game.teamName || 'Team'} vs ${game.opponentName || 'Opponent'}`); }}
                            className={`p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors ${isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            disabled={disableActions || isLoadActionActive}
                            title={t('loadGameModal.deleteMenuItem', 'Delete Game')}
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Error Messages */}
                      {isLoadActionActive && gameLoadError && (
                        <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm">
                          <p className="font-medium">{gameLoadError}</p>
                        </div>
                      )}
                      {isLoadActionActive && gameDeleteError && (
                        <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm">
                          <p className="font-medium">{gameDeleteError}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      {debugComponent}
      <div className="bg-slate-800 flex flex-col h-full w-full bg-noise-texture relative">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light pointer-events-none" />
        <div className="flex justify-center items-center pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
          <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">{t('loadGameModal.title', 'Load Game')}</h2>
        </div>
        <div className="px-6 py-4 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
          <div className="relative">
            <input type="text" placeholder={t('loadGameModal.filterPlaceholder', 'Filter by name, date, etc...')} value={searchText} onChange={handleSearchChange} className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showUnplayedOnly}
              onChange={(e) => setShowUnplayedOnly(e.target.checked)}
              className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
            />
            {t('loadGameModal.showUnplayedOnly', 'Show only unplayed games')}
          </label>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          {mainContent}
        </div>
        <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-slate-300 text-sm">
              {t('pagination.showing', 'Showing')} {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalItems)} {t('pagination.of', 'of')} {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2 py-1 rounded bg-slate-700 text-slate-200 disabled:opacity-50">{t('pagination.prev', 'Prev')}</button>
              <span className="text-slate-300 text-sm">{currentPage}/{totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-2 py-1 rounded bg-slate-700 text-slate-200 disabled:opacity-50">{t('pagination.next', 'Next')}</button>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="ml-2 bg-slate-700 text-slate-200 rounded px-2 py-1 text-sm">
                {[10, 20, 50].map(sz => <option key={sz} value={sz}>{sz}/page</option>)}
              </select>
            </div>
          </div>
          <button onClick={onClose} className="w-full px-4 py-2 rounded-md font-semibold text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors">
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;
