/**
 * Player Stats Tests - Comprehensive Coverage
 * 
 * Tests for player statistics calculation utilities.
 */

import { calculatePlayerStats } from '../playerStats';
import type { Player, Season, Tournament, AppState } from '@/types';

describe('Player Stats Utilities', () => {
  const mockPlayer: Player = {
    id: 'player-1',
    name: 'John Doe',
    number: 10,
    position: { x: 50, y: 50 },
    isActive: true,
    stats: {},
  };

  const mockSeasons: Season[] = [
    {
      id: 'season-1',
      name: 'Spring 2025',
      location: 'Home Stadium',
      periodCount: 2,
      periodDuration: 45,
      archived: false,
      defaultRoster: [],
    },
    {
      id: 'season-2',
      name: 'Fall 2025',
      location: 'Away Stadium',
      periodCount: 2,
      periodDuration: 45,
      archived: false,
      defaultRoster: [],
    },
  ];

  const mockTournaments: Tournament[] = [
    {
      id: 'tournament-1',
      name: 'Championship Cup',
      location: 'Central Arena',
      periodCount: 2,
      periodDuration: 45,
      archived: false,
      defaultRoster: [],
    },
  ];

  const createMockGame = (overrides?: Partial<AppState>): AppState => ({
    gameId: 'game-1',
    teamName: 'Test Team',
    opponentName: 'Test Opponent',
    gameDate: '2025-01-15',
    gameLocation: 'Test Stadium',
    gameStatus: 'completed',
    isPlayed: true,
    homeScore: 2,
    awayScore: 1,
    timeElapsedInSeconds: 5400,
    currentPeriod: 2,
    playersOnField: [],
    opponents: [],
    availablePlayers: [],
    gameEvents: [],
    drawings: [],
    tacticalDrawings: [],
    tacticalDiscs: [],
    tacticalBallPosition: null,
    showPlayerNames: true,
    selectedPlayerIds: ['player-1'],
    homeOrAway: 'home',
    numberOfPeriods: 2,
    periodDurationMinutes: 45,
    subIntervalMinutes: 15,
    completedIntervalDurations: [],
    lastSubConfirmationTimeSeconds: 0,
    gameNotes: '',
    ageGroup: 'U16',
    tournamentLevel: 'Regional',
    demandFactor: 1.0,
    seasonId: 'season-1',
    tournamentId: 'tournament-1',
    isTimerRunning: false,
    ...overrides,
  });

  describe('calculatePlayerStats', () => {
    it('should calculate basic stats for player with no games', () => {
      const savedGames = {};
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.totalGames).toBe(0);
      expect(stats.totalGoals).toBe(0);
      expect(stats.totalAssists).toBe(0);
      expect(stats.avgGoalsPerGame).toBe(0);
      expect(stats.avgAssistsPerGame).toBe(0);
      expect(stats.gameByGameStats).toHaveLength(0);
      expect(Object.keys(stats.performanceBySeason)).toHaveLength(0);
      expect(Object.keys(stats.performanceByTournament)).toHaveLength(0);
    });

    it('should exclude unplayed games from stats', () => {
      const savedGames = {
        'game-1': createMockGame({ isPlayed: false }),
        'game-2': createMockGame({ isPlayed: true }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.totalGames).toBe(1); // Only the played game
      expect(stats.gameByGameStats).toHaveLength(1);
    });

    it('should calculate stats for player with goals and assists', () => {
      const savedGames = {
        'game-1': createMockGame({
          gameEvents: [
            {
              id: 'event-1',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-1',
              assisterId: undefined,
              description: 'Goal by John Doe',
            },
            {
              id: 'event-2',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-2',
              assisterId: 'player-1',
              description: 'Goal assisted by John Doe',
            },
            {
              id: 'event-3',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-1',
              assisterId: undefined,
              description: 'Another goal by John Doe',
            },
          ],
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.totalGames).toBe(1);
      expect(stats.totalGoals).toBe(2);
      expect(stats.totalAssists).toBe(1);
      expect(stats.avgGoalsPerGame).toBe(2);
      expect(stats.avgAssistsPerGame).toBe(1);
      expect(stats.gameByGameStats[0].goals).toBe(2);
      expect(stats.gameByGameStats[0].assists).toBe(1);
      expect(stats.gameByGameStats[0].points).toBe(3); // 2 goals + 1 assist
    });

    it('should include player who was not selected but has events', () => {
      const savedGames = {
        'game-1': createMockGame({
          selectedPlayerIds: ['player-2'], // Player not selected
          gameEvents: [
            {
              id: 'event-1',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-1', // But player scored (substitute)
              assisterId: undefined,
              description: 'Goal by substitute',
            },
          ],
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.totalGames).toBe(1);
      expect(stats.totalGoals).toBe(1);
    });

    it('should calculate game result correctly', () => {
      const savedGames = {
        'win': createMockGame({
          gameId: 'win',
          homeScore: 3,
          awayScore: 1,
          homeOrAway: 'home',
        }),
        'loss': createMockGame({
          gameId: 'loss',
          homeScore: 1,
          awayScore: 3,
          homeOrAway: 'home',
        }),
        'draw': createMockGame({
          gameId: 'draw',
          homeScore: 2,
          awayScore: 2,
          homeOrAway: 'home',
        }),
        'away-win': createMockGame({
          gameId: 'away-win',
          homeScore: 1,
          awayScore: 3,
          homeOrAway: 'away',
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.gameByGameStats).toHaveLength(4);
      
      const winGame = stats.gameByGameStats.find(g => g.gameId === 'win');
      const lossGame = stats.gameByGameStats.find(g => g.gameId === 'loss');
      const drawGame = stats.gameByGameStats.find(g => g.gameId === 'draw');
      const awayWinGame = stats.gameByGameStats.find(g => g.gameId === 'away-win');
      
      expect(winGame?.result).toBe('W');
      expect(lossGame?.result).toBe('L');
      expect(drawGame?.result).toBe('D');
      expect(awayWinGame?.result).toBe('W');
    });

    it('should group stats by season', () => {
      const savedGames = {
        'game-1': createMockGame({
          seasonId: 'season-1',
          gameEvents: [
            {
              id: 'event-1',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-1',
              assisterId: undefined,
              description: 'Goal in season 1',
            },
          ],
        }),
        'game-2': createMockGame({
          gameId: 'game-2',
          seasonId: 'season-1',
          gameEvents: [
            {
              id: 'event-2',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-2',
              assisterId: 'player-1',
              description: 'Assist in season 1',
            },
          ],
        }),
        'game-3': createMockGame({
          gameId: 'game-3',
          seasonId: 'season-2',
          gameEvents: [
            {
              id: 'event-3',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-1',
              assisterId: undefined,
              description: 'Goal in season 2',
            },
          ],
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(Object.keys(stats.performanceBySeason)).toHaveLength(2);
      expect(stats.performanceBySeason['season-1'].name).toBe('Spring 2025');
      expect(stats.performanceBySeason['season-1'].gamesPlayed).toBe(2);
      expect(stats.performanceBySeason['season-1'].goals).toBe(1);
      expect(stats.performanceBySeason['season-1'].assists).toBe(1);
      expect(stats.performanceBySeason['season-1'].points).toBe(2);
      
      expect(stats.performanceBySeason['season-2'].name).toBe('Fall 2025');
      expect(stats.performanceBySeason['season-2'].gamesPlayed).toBe(1);
      expect(stats.performanceBySeason['season-2'].goals).toBe(1);
      expect(stats.performanceBySeason['season-2'].assists).toBe(0);
      expect(stats.performanceBySeason['season-2'].points).toBe(1);
    });

    it('should group stats by tournament', () => {
      const savedGames = {
        'game-1': createMockGame({
          tournamentId: 'tournament-1',
          gameEvents: [
            {
              id: 'event-1',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-1',
              assisterId: undefined,
              description: 'Goal in tournament',
            },
            {
              id: 'event-2',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-2',
              assisterId: 'player-1',
              description: 'Assist in tournament',
            },
          ],
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(Object.keys(stats.performanceByTournament)).toHaveLength(1);
      expect(stats.performanceByTournament['tournament-1'].name).toBe('Championship Cup');
      expect(stats.performanceByTournament['tournament-1'].gamesPlayed).toBe(1);
      expect(stats.performanceByTournament['tournament-1'].goals).toBe(1);
      expect(stats.performanceByTournament['tournament-1'].assists).toBe(1);
      expect(stats.performanceByTournament['tournament-1'].points).toBe(2);
    });

    it('should handle games without events', () => {
      const savedGames = {
        'game-1': createMockGame({
          gameEvents: [], // No events
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.totalGames).toBe(1);
      expect(stats.totalGoals).toBe(0);
      expect(stats.totalAssists).toBe(0);
      expect(stats.gameByGameStats[0].goals).toBe(0);
      expect(stats.gameByGameStats[0].assists).toBe(0);
      expect(stats.gameByGameStats[0].points).toBe(0);
    });

    it('should handle games without seasonId or tournamentId', () => {
      const savedGames = {
        'game-1': createMockGame({
          seasonId: null,
          tournamentId: null,
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.totalGames).toBe(1);
      expect(Object.keys(stats.performanceBySeason)).toHaveLength(0);
      expect(Object.keys(stats.performanceByTournament)).toHaveLength(0);
    });

    it('should handle missing seasons or tournaments in collections', () => {
      const savedGames = {
        'game-1': createMockGame({
          seasonId: 'non-existent-season',
          tournamentId: 'non-existent-tournament',
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.totalGames).toBe(1);
      expect(stats.performanceBySeason['non-existent-season'].name).toBe('Unknown Season');
      expect(stats.performanceByTournament['non-existent-tournament'].name).toBe('Unknown Tournament');
    });

    it('should calculate averages correctly with multiple games', () => {
      const savedGames = {
        'game-1': createMockGame({
          gameEvents: [
            {
              id: 'event-1',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-1',
              assisterId: undefined,
              description: 'Goal 1',
            },
            {
              id: 'event-2',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-1',
              assisterId: undefined,
              description: 'Goal 2',
            },
          ],
        }),
        'game-2': createMockGame({
          gameId: 'game-2',
          gameEvents: [
            {
              id: 'event-3',
              type: 'goal',
              timestamp: Date.now(),
              scorerId: 'player-2',
              assisterId: 'player-1',
              description: 'Assist',
            },
          ],
        }),
        'game-3': createMockGame({
          gameId: 'game-3',
          gameEvents: [], // No events
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.totalGames).toBe(3);
      expect(stats.totalGoals).toBe(2);
      expect(stats.totalAssists).toBe(1);
      expect(stats.avgGoalsPerGame).toBeCloseTo(2/3, 2);
      expect(stats.avgAssistsPerGame).toBeCloseTo(1/3, 2);
    });

    it('should handle edge cases with null or undefined values', () => {
      const savedGames = {
        'game-1': createMockGame({
          gameEvents: undefined,
          selectedPlayerIds: undefined,
        }),
      };
      
      const stats = calculatePlayerStats(mockPlayer, savedGames, mockSeasons, mockTournaments);
      
      expect(stats.totalGames).toBe(0); // Player not participated (no selectedPlayerIds, no events)
      expect(stats.totalGoals).toBe(0);
      expect(stats.totalAssists).toBe(0);
    });
  });
});