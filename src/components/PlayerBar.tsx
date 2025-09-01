'use client';

import React from 'react';
import PlayerDisk from './PlayerDisk'; // Import the PlayerDisk component
import type { Player } from '@/types'; // Import the Player type from central types
import Image from 'next/image'; // RE-ADD Import
import type { GameEvent } from '@/types'; // Correctly import GameEvent type
// REMOVED unused import
// import Image from 'next/image'; 

// Define props for PlayerBar
export interface PlayerBarProps {
  players: Player[];
  playersOnField: Player[];
  onPlayerDragStartFromBar?: (player: Player) => void;
  selectedPlayerIdFromBar?: string | null; 
  onBarBackgroundClick?: () => void;
  gameEvents: GameEvent[];
  onPlayerTapInBar?: (player: Player) => void;
  onToggleGoalie?: (playerId: string) => void;
}

// Placeholder data - this would eventually come from state/localStorage
// const availablePlayers = [
//   { id: 'p1', name: 'Player 1' },
//   { id: 'p2', name: 'Player 2' },
//   { id: 'p3', name: 'Player 3' },
//   { id: 'p4', name: 'Player 4' },
//   { id: 'p5', name: 'Player 5' },
//   { id: 'p6', name: 'Player 6' },
//   { id: 'p7', name: 'Player 7' },
//   { id: 'p8', name: 'Player 8' },
//   { id: 'p9', name: 'Player 9' },
//   { id: 'p10', name: 'Player 10' },
//   { id: 'p11', name: 'Player 11' },
// ];

const PlayerBar: React.FC<PlayerBarProps> = ({ players, playersOnField, onPlayerDragStartFromBar, selectedPlayerIdFromBar, onBarBackgroundClick, gameEvents, onPlayerTapInBar, onToggleGoalie }) => {
  return (
    <div 
      className="bg-gradient-to-b from-slate-800 to-slate-900/85 backdrop-blur-md pl-4 pr-2 py-0.5 flex items-center space-x-3 flex-shrink-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-700/80 scrollbar-track-slate-800/50 shadow-lg border-b border-slate-700/50"
      onClick={(e) => {
        // Check if the click target is the div itself (the background)
        if (e.target === e.currentTarget && onBarBackgroundClick) {
          onBarBackgroundClick();
        }
      }}
    >
      {/* Team Name Display/Edit */}
      <div 
        className="flex flex-col items-center flex-shrink-0 py-0.5"
        onClick={() => {
          // Also deselect player when clicking the logo/team name area
          if (onBarBackgroundClick) {
            onBarBackgroundClick();
          }
        }}
      >
        <div className="flex-shrink-0 mr-2">
          <Image
            className="h-16 w-16"
            src="/pepo-logo.png"
            alt="MatchOps Cloud Logo"
            width={64}
            height={64}
            // priority // Temporarily remove to silence test warning
          />
        </div>
      </div>

      {/* Separator */}
      <div className="border-l border-slate-600 h-16 self-center"></div>

      {/* Player Disks */}
      <div className="flex items-center space-x-1"> 
        {players.map(player => {
          // Get goalie status from field (authoritative) instead of roster
          const fieldPlayer = playersOnField.find(p => p.id === player.id);
          const isGoalie = fieldPlayer ? fieldPlayer.isGoalie : player.isGoalie;
          
          return (
            <PlayerDisk
              key={player.id}
              id={player.id}
              fullName={player.name}
              nickname={player.nickname}
              color={player.color}
              isGoalie={isGoalie}
              onPlayerDragStartFromBar={onPlayerDragStartFromBar}
              selectedPlayerIdFromBar={selectedPlayerIdFromBar}
              gameEvents={gameEvents}
              onPlayerTapInBar={onPlayerTapInBar}
              onToggleGoalie={onToggleGoalie}
            />
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(PlayerBar); 