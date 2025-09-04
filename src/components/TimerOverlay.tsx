'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaUndo } from 'react-icons/fa'; // Import icons
import { useTranslation } from 'react-i18next'; // Import translation hook
import { IntervalLog } from '@/types'; // Import the IntervalLog interface
import { formatTime } from '@/utils/time';
import logger from '@/utils/logger';


export interface TimerOverlayProps {
  timeElapsedInSeconds: number;
  subAlertLevel: 'none' | 'warning' | 'due';
  onSubstitutionMade: () => void;
  completedIntervalDurations: IntervalLog[];
  subIntervalMinutes: number;
  onSetSubInterval: (minutes: number) => void;
  isTimerRunning: boolean;
  onStartPauseTimer: () => void;
  onResetTimer: () => void;
  onToggleGoalLogModal?: () => void;
  onRecordOpponentGoal?: () => void;
  teamName: string;
  opponentName: string;
  homeScore: number;
  awayScore: number;
  homeOrAway: 'home' | 'away';
  // Game Structure props
  numberOfPeriods: 1 | 2;
  periodDurationMinutes: number;
  currentPeriod: number;
  gameStatus: 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  lastSubTime: number | null;
  onOpponentNameChange: (name: string) => void;
  onClose?: () => void;
  isLoaded?: boolean;
}

const TimerOverlay: React.FC<TimerOverlayProps> = ({
  timeElapsedInSeconds,
  subAlertLevel,
  onSubstitutionMade,
  completedIntervalDurations,
  subIntervalMinutes,
  onSetSubInterval,
  isTimerRunning,
  onStartPauseTimer,
  onResetTimer,
  onToggleGoalLogModal = () => { logger.warn('onToggleGoalLogModal handler not provided'); },
  onRecordOpponentGoal = () => { logger.warn('onRecordOpponentGoal handler not provided'); },
  teamName = "Team",
  opponentName = "Opponent",
  homeScore = 0,
  awayScore = 0,
  homeOrAway,
  // Game Structure props
  numberOfPeriods = 2,
  periodDurationMinutes = 10,
  currentPeriod = 1,
  gameStatus = 'notStarted',
  lastSubTime = null,
  onOpponentNameChange = () => { logger.warn('onOpponentNameChange handler not provided'); },
  onClose,
  isLoaded: _isLoaded,
}) => {
  const { t } = useTranslation(); // Initialize translation hook

  // --- State for Opponent Name Editing ---
  const [isEditingOpponentName, setIsEditingOpponentName] = useState(false);
  const [editedOpponentName, setEditedOpponentName] = useState(opponentName);
  const opponentInputRef = useRef<HTMLInputElement>(null);
  // --- End State ---

  // --- Effects for Opponent Name Editing ---
  useEffect(() => {
    setEditedOpponentName(opponentName);
    if (isEditingOpponentName) {
      // Logic here (currently commented out or placeholder)
    }
    // Add missing dependency
  }, [opponentName, isEditingOpponentName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingOpponentName) {
      opponentInputRef.current?.focus();
      opponentInputRef.current?.select();
    }
  }, [isEditingOpponentName]);
  // --- End Effects ---

  // Determine text color based on alert status directly from prop
  let textColor = 'text-slate-100'; // Base text color
  if (subAlertLevel === 'due') {
    textColor = 'text-red-400'; // Use a subtler red
  } else if (subAlertLevel === 'warning') {
    textColor = 'text-orange-300'; // Use a subtler orange
  }

  // Determine background color - REMOVE alert level logic
  const bgColor = 'bg-slate-900/85'; // Always use default background

  // Consistent button styles (simplified for overlay)
  const timerButtonStyle = "text-white font-semibold py-4 px-8 text-lg rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors duration-150 flex items-center justify-center space-x-3";
  const controlButtonStyle = "text-slate-100 font-bold py-1 px-3 rounded shadow bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg active:scale-95";
  const controlValueStyle = "text-slate-100 font-bold text-lg tabular-nums w-8 mx-2 text-center";
  const controlLabelStyle = "text-sm font-medium text-slate-300 mr-2";
  // Add action button styles for consistency
  const actionButtonBase = "text-slate-100 font-bold py-2.5 px-4 rounded-lg shadow-lg pointer-events-auto text-base transition-all duration-150 hover:shadow-md";
  const primaryActionStyle = `${actionButtonBase} bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 active:scale-[0.98] focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900`;
  const secondaryActionStyle = `${actionButtonBase} bg-teal-700 hover:bg-teal-600 active:bg-teal-800 active:scale-[0.98] focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900`;
  const dangerActionStyle = `${actionButtonBase} bg-red-700 hover:bg-red-600 active:bg-red-800 active:scale-[0.98] focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900`;

  const handleConfirmSubClick = () => {
    onSubstitutionMade();
  };

  // Open Goal Log without closing the timer overlay; z-index will ensure visibility
  const handleOpenGoalLog = () => {
    onToggleGoalLogModal();
  };

  // Calculate time since last substitution
  const timeSinceLastSub = lastSubTime === null ? timeElapsedInSeconds : timeElapsedInSeconds - lastSubTime;

  // Determine button text based on game status using translations
  let startPauseButtonText = t('timerOverlay.startButton', 'Start'); // Default to Start
  if (gameStatus === 'inProgress') {
    startPauseButtonText = isTimerRunning ? t('timerOverlay.pauseButton', 'Pause') : t('timerOverlay.resumeButton', 'Resume');
  } else if (gameStatus === 'periodEnd') {
    startPauseButtonText = currentPeriod < numberOfPeriods
      ? t('timerOverlay.startPeriodButton', 'Start Period {{period}}', { period: currentPeriod + 1 })
      : t('timerOverlay.gameOverButton', 'Game Over');
  } else if (gameStatus === 'gameEnd') {
    startPauseButtonText = t('timerOverlay.gameOverButton', 'Game Over');
  }

  // --- Handlers for Opponent Name Editing ---
  const handleStartEditingOpponent = () => {
    setEditedOpponentName(opponentName); // Reset to current prop value on edit start
    setIsEditingOpponentName(true);
  };

  const handleOpponentInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedOpponentName(event.target.value);
  };

  const handleSaveOpponentName = () => {
    const trimmedName = editedOpponentName.trim();
    if (trimmedName && trimmedName !== opponentName) {
      onOpponentNameChange(trimmedName);
    }
    setIsEditingOpponentName(false);
  };

  const handleCancelEditOpponent = () => {
    setIsEditingOpponentName(false);
    setEditedOpponentName(opponentName); // Reset to original prop value
  };

  const handleOpponentKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveOpponentName();
    } else if (event.key === 'Escape') {
      handleCancelEditOpponent();
    }
  };
  // --- End Handlers ---

  // Determine display names
  const displayHomeTeamName = homeOrAway === 'home' ? teamName : opponentName;
  const displayAwayTeamName = homeOrAway === 'home' ? opponentName : teamName;

  // Determine score colors based on homeOrAway status
  const userTeamColor = 'text-green-400';
  const opponentTeamColor = 'text-red-400';

  const homeScoreDisplayColor = homeOrAway === 'home' ? userTeamColor : opponentTeamColor;
  const awayScoreDisplayColor = homeOrAway === 'away' ? userTeamColor : opponentTeamColor;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center px-8 py-8 ${bgColor} backdrop-blur-lg`}>
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Game Score Header - aligned to column width, balanced layout */}
        <div className="bg-slate-800/70 px-6 py-4 rounded-xl mb-8 w-full">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="text-left text-slate-100 text-xl font-semibold whitespace-normal break-words leading-tight">
              {displayHomeTeamName}
            </div>
            <div className="text-center">
              <span className="inline-block bg-slate-700/70 px-3 py-1 rounded-md">
                <span className={`text-3xl font-bold ${homeScoreDisplayColor}`}>{homeScore}</span>
                <span className="text-slate-400 text-2xl mx-2">-</span>
                <span className={`text-3xl font-bold ${awayScoreDisplayColor}`}>{awayScore}</span>
              </span>
            </div>
            <div className="text-right whitespace-normal break-words leading-tight">
              {/* --- Opponent Name Display/Edit --- */}
              {isEditingOpponentName ? (
                <input
                  ref={opponentInputRef}
                  type="text"
                  value={editedOpponentName}
                  onChange={handleOpponentInputChange}
                  onBlur={handleSaveOpponentName} // Save on blur
                  onKeyDown={handleOpponentKeyDown}
                  className="bg-slate-700 text-slate-100 text-xl font-semibold outline-none rounded px-2 py-0.5 w-36 md:w-48"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-slate-100 cursor-pointer hover:text-slate-300"
                  onClick={handleStartEditingOpponent}
                  title={t('timerOverlay.editOpponentNameTitle', 'Click to edit opponent name') ?? undefined}
                >
                  {displayAwayTeamName}
                </span>
              )}
              {/* --- End Opponent Name --- */}
            </div>
          </div>
        </div>

        {/* Timer Display */}
        <div className="mt-2 mb-8">
          <span className={`text-9xl sm:text-[10rem] md:text-[12.5rem] lg:text-[14.5rem] font-bold tabular-nums ${textColor} leading-none`}>
            {formatTime(timeElapsedInSeconds)}
          </span>
        </div>

        {/* Time Since Last Substitution - SIMPLIFIED */}
        {(gameStatus !== 'notStarted') && (
          <div className="mb-4 text-center">
            <span className="text-sm font-medium text-slate-400">
              {t('timerOverlay.timeSinceLastSubCombined', 'Viim. vaihto:')} <span className="tabular-nums text-slate-300 font-semibold">{formatTime(timeSinceLastSub)}</span>
            </span>
          </div>
        )}

        {/* Game Status / Period Info */}
        <div className="mb-4 text-center">
          {gameStatus === 'notStarted' && (
            <span className="text-sm text-yellow-400 font-medium">
              {t('timerOverlay.gameNotStarted', 'Game not started')}
              {numberOfPeriods === 1 ?
                ` (${periodDurationMinutes} min)` :
                ` (2 x ${periodDurationMinutes} min)`}
            </span>
          )}
          {gameStatus === 'inProgress' && (
            <span className="text-sm text-green-400 font-medium">
              {numberOfPeriods === 1 ? (
                // For single period games, no text needed
                ''
              ) : (
                // Use t() interpolation directly
                t('timerOverlay.halfTimeInProgress', 'Half Time {{currentPeriod}}/2', { currentPeriod: currentPeriod })
              )}
            </span>
          )}
          {gameStatus === 'periodEnd' && currentPeriod < numberOfPeriods && (
            <span className="text-sm text-orange-400 font-medium">
              {numberOfPeriods === 1 ?
                t('timerOverlay.gameEnded', 'Game Ended') :
                // Use t() interpolation directly
                t('timerOverlay.halfTimeEnded', 'End of Half Time {{currentPeriod}}', { currentPeriod: currentPeriod })
              }
            </span>
          )}
          {gameStatus === 'gameEnd' && (
            <span className="text-sm text-red-500 font-medium">
              {t('timerOverlay.gameEnded', 'Game Ended')}
            </span>
          )}
        </div>

        {/* Timer Controls */}
        <div className="flex items-center justify-center space-x-4 mb-8 w-full max-w-md mx-auto">
          <button
            onClick={onStartPauseTimer}
            disabled={gameStatus === 'gameEnd'}
            className={`${timerButtonStyle} h-14 ${isTimerRunning ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-400' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'} ${gameStatus === 'gameEnd' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isTimerRunning ? <FaPause size={16} /> : <FaPlay size={16} />}
            <span>{startPauseButtonText}</span>
          </button>
          <button
            onClick={onResetTimer}
            className={`${timerButtonStyle} h-14 bg-slate-600 hover:bg-slate-700 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={timeElapsedInSeconds === 0 && gameStatus === 'notStarted'} // Only disable if truly at start
          >
            <FaUndo size={14} />
            <span>{t('timerOverlay.resetButton', 'Reset')}</span>
          </button>
        </div>

        {/* Game Setup & Interval Controls Section */}
        <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg w-full mb-4 space-y-4 max-w-md">
          {/* Substitution Interval Control (only when game not started) */}
          {gameStatus === 'notStarted' && (
            <div className="flex flex-col items-center gap-2">
              <span className={controlLabelStyle}>{t('timerOverlay.subIntervalLabel', 'Sub Interval:')}</span>
              <div className="flex items-center bg-slate-700 rounded-md overflow-hidden">
                <button
                  onClick={() => onSetSubInterval(subIntervalMinutes - 1)}
                  disabled={subIntervalMinutes <= 1}
                  className={`${controlButtonStyle} rounded-none`} aria-label="Decrease interval">
                  -
                </button>
                <span className={`${controlValueStyle} bg-slate-600`}>{subIntervalMinutes}</span>
                <button
                  onClick={() => onSetSubInterval(subIntervalMinutes + 1)}
                  className={`${controlButtonStyle} rounded-none`} aria-label="Increase interval">
                  +
                </button>
              </div>
            </div>
          )}

          {/* Main Action Buttons Section - Improved layout */}
          <div className="flex flex-col space-y-3">
            {/* Primary Action Button - Remove pulsingClass */}
            <div className="flex justify-center">
              <button
                onClick={handleConfirmSubClick}
                className={`${primaryActionStyle} w-full h-14`}
              >
                {t('timerOverlay.confirmSubButton', 'Vaihto tehty')}
              </button>
            </div>

            {/* Goal Buttons - Side by side layout */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleOpenGoalLog}
                className={`${secondaryActionStyle} flex-1 h-14`}
                title={`${displayHomeTeamName} ${t('timerOverlay.goalSuffix', 'goal')}`}
              >
                {t('timerOverlay.teamGoalButton', 'Kirjaa maali')}
              </button>
              <button
                onClick={onRecordOpponentGoal}
                className={`${dangerActionStyle} flex-1 h-14`}
                title={`${displayAwayTeamName} ${t('timerOverlay.goalSuffix', 'goal')}`}
              >
                {t('timerOverlay.opponentGoalButton', 'Vastustaja +1')}
              </button>
            </div>
          </div>
        </div>

        {/* Play Time History - only show if there are entries */}
        {completedIntervalDurations.length > 0 && (
          <div className="bg-slate-800/60 backdrop-blur-sm p-3 rounded-lg w-full max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
            <h3 className="text-sm font-semibold mb-1 text-center text-slate-300">{t('timerOverlay.historyTitle', 'Play Time History')}</h3>
            <ul className="list-none text-slate-400 text-sm text-center space-y-1">
              {completedIntervalDurations.map((log, index) => (
                <li key={`${log.timestamp}-${index}`}>
                  {t('timerOverlay.intervalLogFormat', 'P{{period}}: {{duration}}', {
                    period: log.period,
                    duration: formatTime(log.duration)
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Close button moved to bottom to match other modals */}
      {onClose && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-3 px-6 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500"
            aria-label={t('common.close', 'Close')}
          >
            {t('common.close', 'Sulje')}
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(TimerOverlay); 