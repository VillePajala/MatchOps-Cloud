'use client';

import React from 'react';
import PlayerDisk from './PlayerDisk';
import { 
  useGameStore, 
  useGameSession,
  useFieldState 
} from '@/stores/gameStore';
import { useUIStore, useSelectionState } from '@/stores/uiStore';
import type { Player } from '@/types';
import Image from 'next/image';
import type { PlayerBarProps } from './PlayerBar';

/**
 * Migrated PlayerBar component that uses Zustand stores
 * Maintains same interface as legacy component but with centralized state
 */
export const MigratedPlayerBar: React.FC<PlayerBarProps> = ({
  // Props that will be overridden by store values
  players: propPlayers,
  gameEvents: propGameEvents,
  selectedPlayerIdFromBar: propSelectedPlayerId,
  
  // Props that are still used for compatibility
  onPlayerDragStartFromBar,
  onBarBackgroundClick,
  onPlayerTapInBar,
  onToggleGoalie,
}) => {
  // Get values from Zustand stores
  const gameSession = useGameSession();
  const field = useFieldState();
  const _gameStore = useGameStore();
  const uiStore = useUIStore();
  const { selectedPlayerIds } = useSelectionState();
  
  // Use store values instead of props where available
  const displayPlayers = field.availablePlayers.length > 0 ? field.availablePlayers : propPlayers;
  const displayGameEvents = gameSession.gameEvents.length > 0 ? gameSession.gameEvents : propGameEvents;
  const displaySelectedPlayerId = selectedPlayerIds.length > 0 ? selectedPlayerIds[0] : propSelectedPlayerId;
  
  // Enhanced handlers with store integration
  const handlePlayerDragStart = (player: Player) => {
    // Update selection state in store
    uiStore.setSelectedPlayerIds([player.id]);
    // Also call parent handler for compatibility
    if (onPlayerDragStartFromBar) {
      onPlayerDragStartFromBar(player);
    }
  };
  
  const handleBarBackgroundClick = () => {
    // Clear selection in store
    uiStore.clearSelectedPlayers();
    // Also call parent handler for compatibility
    if (onBarBackgroundClick) {
      onBarBackgroundClick();
    }
  };
  
  const handlePlayerTapInBar = (player: Player) => {
    // Update selection state in store
    if (selectedPlayerIds.includes(player.id)) {
      // If already selected, deselect
      uiStore.removeSelectedPlayerId(player.id);
    } else {
      // If not selected, select (clear others first for single selection)
      uiStore.setSelectedPlayerIds([player.id]);
    }
    
    // Also call parent handler for compatibility
    if (onPlayerTapInBar) {
      onPlayerTapInBar(player);
    }
  };
  
  const handleToggleGoalie = (playerId: string) => {
    // Delegate exclusively to the central handler to avoid double-toggles
    if (onToggleGoalie) {
      onToggleGoalie(playerId);
    }
  };
  
  return (
    <div 
      className="bg-gradient-to-b from-slate-800 to-slate-900/85 backdrop-blur-md pl-4 pr-2 py-0.5 flex items-center space-x-3 flex-shrink-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-700/80 scrollbar-track-slate-800/50 shadow-lg border-b border-slate-700/50"
      onClick={(e) => {
        // Check if the click target is the div itself (the background)
        if (e.target === e.currentTarget) {
          handleBarBackgroundClick();
        }
      }}
    >
      {/* Team Name Display/Edit */}
      <div 
        className="flex flex-col items-center flex-shrink-0 py-0.5"
        onClick={() => {
          // Also deselect player when clicking the logo/team name area
          handleBarBackgroundClick();
        }}
      >
        <div className="flex-shrink-0 mr-2">
          <Image
            className="h-16 w-16"
            src="/pepo-logo.png"
            alt="MatchOps Cloud Logo"
            width={64}
            height={64}
          />
        </div>
      </div>

      {/* Separator */}
      <div className="border-l border-slate-600 h-16 self-center"></div>

      {/* Player Disks */}
      <div className="flex items-center space-x-1"> 
        {displayPlayers.map(player => (
          <PlayerDisk
            key={player.id}
            id={player.id}
            fullName={player.name}
            nickname={player.nickname}
            color={player.color}
            isGoalie={player.isGoalie}
            onPlayerDragStartFromBar={handlePlayerDragStart}
            selectedPlayerIdFromBar={displaySelectedPlayerId}
            gameEvents={displayGameEvents}
            onPlayerTapInBar={handlePlayerTapInBar}
            onToggleGoalie={handleToggleGoalie}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(MigratedPlayerBar);