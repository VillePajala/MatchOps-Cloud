// Supabase storage provider implementation with Phase 4 performance optimizations
import type { IStorageProvider } from './types';
import { StorageError, NetworkError, AuthenticationError } from './types';
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../../utils/appSettings';
import { supabase } from '../supabase';
import { toSupabase, fromSupabase } from '../../utils/transforms';
import type { DbSeason, DbTournament, DbPlayer, DbAppSettings, DbGame } from '../../utils/transforms';
import { compressionManager, FIELD_SELECTIONS } from './compressionUtils';

export class SupabaseProvider implements IStorageProvider {

  getProviderName(): string {
    return 'supabase';
  }

  async isOnline(): Promise<boolean> {
    try {
      const { error } = await supabase.from('players').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private async getCurrentUserId(): Promise<string> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        throw new AuthenticationError('supabase', 'getCurrentUserId', error || new Error('No user'));
      }
      return user.id;
    } catch (error) {
      // During sign out, auth calls might fail - that's expected
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('supabase', 'getCurrentUserId', error as Error);
    }
  }

  private async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch {
      return false;
    }
  }

  // Player management with Phase 4 optimizations
  async getPlayers(): Promise<Player[]> {
    try {
      // Use optimized field selection for better performance
      const data = await compressionManager.fetchOptimized<DbPlayer>(
        'players',
        {
          table: 'players',
          fields: [...FIELD_SELECTIONS.playersFull.fields] as string[]
        },
        {
          orderBy: 'name',
          ascending: true
        }
      );

      return data.map((player: DbPlayer) => fromSupabase.player(player));
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get players', 'supabase', 'getPlayers', error as Error);
    }
  }

  async savePlayer(player: Player): Promise<Player> {
    try {
      let userId: string;
      try {
        userId = await this.getCurrentUserId();
      } catch {
        // Transient auth gap after sign-in: retry once shortly
        await new Promise(res => setTimeout(res, 400));
        userId = await this.getCurrentUserId();
      }

      // For players with local IDs (e.g., player_123_abc), treat as new
      const isLocalId = player.id && player.id.startsWith('player_');
      const playerForSupabase = isLocalId ? { ...player, id: '' } : player;

      const supabasePlayer = toSupabase.player(playerForSupabase, userId);

      let result;
      if (playerForSupabase.id && !isLocalId) {
        // Update existing player
        const { id: _removed, ...updatePayload } = supabasePlayer;
        void _removed;
        const { data, error } = await supabase
          .from('players')
          .update(updatePayload)
          .eq('id', player.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'savePlayer', error);
        }
        result = data;
      } else {
        // Create new player
        const { data, error } = await supabase
          .from('players')
          .insert(supabasePlayer)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'savePlayer', error);
        }
        result = data;
      }

      return fromSupabase.player(result as DbPlayer);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save player', 'supabase', 'savePlayer', error as Error);
    }
  }

  async deletePlayer(playerId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (error) {
        throw new NetworkError('supabase', 'deletePlayer', error);
      }

      if (!data) {
        throw new StorageError('Player not found', 'supabase', 'deletePlayer');
      }
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError || error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('Failed to delete player', 'supabase', 'deletePlayer', error as Error);
    }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    try {
      const userId = await this.getCurrentUserId();
      const supabaseUpdates = toSupabase.playerUpdate(updates, userId);

      const { data, error } = await supabase
        .from('players')
        .update(supabaseUpdates)
        .eq('id', playerId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new NetworkError('supabase', 'updatePlayer', error);
      }

      return fromSupabase.player(data as DbPlayer);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to update player', 'supabase', 'updatePlayer', error as Error);
    }
  }

  // Season management
  async getSeasons(): Promise<Season[]> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) {
        throw new NetworkError('supabase', 'getSeasons', error);
      }

      return data.map((season: DbSeason) => fromSupabase.season(season));
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get seasons', 'supabase', 'getSeasons', error as Error);
    }
  }

  async saveSeason(season: Season): Promise<Season> {
    try {
      const userId = await this.getCurrentUserId();

      // For seasons with local IDs (e.g., season_123_abc), treat as new
      const isLocalId = season.id && season.id.startsWith('season_');
      const seasonForSupabase = isLocalId ? { ...season, id: '' } : season;

      const supabaseSeason = toSupabase.season(seasonForSupabase, userId);

      let result;
      if (seasonForSupabase.id && !isLocalId) {
        // Update existing season
        const { id: _removed, ...updatePayload } = supabaseSeason;
        void _removed;
        const { data, error } = await supabase
          .from('seasons')
          .update(updatePayload)
          .eq('id', season.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'saveSeason', error);
        }
        result = data;
      } else {
        // Create new season
        const { data, error } = await supabase
          .from('seasons')
          .insert(supabaseSeason)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'saveSeason', error);
        }
        result = data;
      }

      return fromSupabase.season(result as DbSeason);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save season', 'supabase', 'saveSeason', error as Error);
    }
  }

  async deleteSeason(seasonId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('seasons')
        .delete()
        .eq('id', seasonId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (error) {
        throw new NetworkError('supabase', 'deleteSeason', error);
      }

      if (!data) {
        throw new StorageError('Season not found', 'supabase', 'deleteSeason');
      }
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError || error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('Failed to delete season', 'supabase', 'deleteSeason', error as Error);
    }
  }

  async updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season> {
    try {
      const userId = await this.getCurrentUserId();
      const supabaseUpdates = toSupabase.seasonUpdate(updates, userId);

      const { data, error } = await supabase
        .from('seasons')
        .update(supabaseUpdates)
        .eq('id', seasonId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new NetworkError('supabase', 'updateSeason', error);
      }

      return fromSupabase.season(data as DbSeason);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to update season', 'supabase', 'updateSeason', error as Error);
    }
  }

  // Tournament management
  async getTournaments(): Promise<Tournament[]> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) {
        throw new NetworkError('supabase', 'getTournaments', error);
      }

      return data.map((tournament: DbTournament) => fromSupabase.tournament(tournament));
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get tournaments', 'supabase', 'getTournaments', error as Error);
    }
  }

  async saveTournament(tournament: Tournament): Promise<Tournament> {
    try {
      const userId = await this.getCurrentUserId();

      // For tournaments with local IDs (e.g., tournament_123_abc), treat as new
      const isLocalId = tournament.id && tournament.id.startsWith('tournament_');
      const tournamentForSupabase = isLocalId ? { ...tournament, id: '' } : tournament;

      const supabaseTournament = toSupabase.tournament(tournamentForSupabase, userId);

      let result;
      if (tournamentForSupabase.id && !isLocalId) {
        // Update existing tournament
        const { id: _removed, ...updatePayload } = supabaseTournament;
        void _removed;
        const { data, error } = await supabase
          .from('tournaments')
          .update(updatePayload)
          .eq('id', tournament.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'saveTournament', error);
        }
        result = data;
      } else {
        // Create new tournament
        const { data, error } = await supabase
          .from('tournaments')
          .insert(supabaseTournament)
          .select()
          .single();

        if (error) {
          console.error('[SupabaseProvider] Tournament save error:', {
            error,
            supabaseTournament,
            errorDetails: (error as { details?: string }).details,
            errorMessage: error.message,
            errorCode: (error as { code?: string }).code
          });
          throw new NetworkError('supabase', 'saveTournament', error);
        }
        result = data;
      }

      return fromSupabase.tournament(result as DbTournament);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save tournament', 'supabase', 'saveTournament', error as Error);
    }
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (error) {
        throw new NetworkError('supabase', 'deleteTournament', error);
      }

      if (!data) {
        throw new StorageError('Tournament not found', 'supabase', 'deleteTournament');
      }
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError || error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('Failed to delete tournament', 'supabase', 'deleteTournament', error as Error);
    }
  }

  async updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<Tournament> {
    try {
      const userId = await this.getCurrentUserId();
      const supabaseUpdates = toSupabase.tournamentUpdate(updates, userId);

      const { data, error } = await supabase
        .from('tournaments')
        .update(supabaseUpdates)
        .eq('id', tournamentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new NetworkError('supabase', 'updateTournament', error);
      }

      return fromSupabase.tournament(data as DbTournament);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to update tournament', 'supabase', 'updateTournament', error as Error);
    }
  }

  // App settings (simplified implementation for now)
  async getAppSettings(): Promise<AppSettings | null> {
    try {
      // 🔧 SIGN OUT FIX: Check authentication before trying to get user data
      if (!(await this.isAuthenticated())) {
        return null; // Return null instead of throwing error during sign out
      }

      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        const errorCode = (error as { code?: string }).code;
        if (errorCode === 'PGRST116') {
          // No settings found, return null
          return null;
        }
        throw new NetworkError('supabase', 'getAppSettings', error);
      }

      return fromSupabase.appSettings(data as DbAppSettings);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get app settings', 'supabase', 'getAppSettings', error as Error);
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<AppSettings> {
    try {
      const userId = await this.getCurrentUserId();
      const supabaseSettings = toSupabase.appSettings(settings, userId);

      const { data, error } = await supabase
        .from('app_settings')
        .upsert(supabaseSettings)
        .select()
        .single();

      if (error) {
        throw new NetworkError('supabase', 'saveAppSettings', error);
      }

      return fromSupabase.appSettings(data as DbAppSettings);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save app settings', 'supabase', 'saveAppSettings', error as Error);
    }
  }

  // Saved games - simplified version that works

  // PHASE 1.5: Load game events on-demand for better performance
  async loadGameEvents(gameId: string): Promise<unknown[]> {
    try {
      const { data: events, error } = await supabase
        .from('game_events')
        .select('*')
        .eq('game_id', gameId);

      if (error) {
        throw new NetworkError('supabase', 'loadGameEvents', error);
      }

      return events || [];
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to load game events', 'supabase', 'loadGameEvents', error as Error);
    }
  }

  async getSavedGames(): Promise<unknown> {
    try {
      const userId = await this.getCurrentUserId();

      // REVERT: Using full game data to fix critical bug where playersOnField, gameEvents, etc. were missing
      // TODO: Implement separate lightweight endpoint for list view vs full game loading
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50); // Keep pagination limit for performance

      if (gamesError) {
        throw new NetworkError('supabase', 'getSavedGames', gamesError);
      }

      // Convert array to object format expected by the app
      const gamesCollection: Record<string, unknown> = {};

      // Transform the full game data using the original approach
      for (const game of gamesData) {
        const transformedGame = fromSupabase.game(game as DbGame);
        gamesCollection[game.id] = transformedGame;
      }

      return gamesCollection;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get saved games', 'supabase', 'getSavedGames', error as Error);
    }
  }

  async saveSavedGame(gameData: unknown): Promise<unknown> {
    try {
      const userId = await this.getCurrentUserId();

      // Only log in development for performance
      if (process.env.NODE_ENV === 'development') {
        const gameState = gameData as Record<string, unknown>;
        const gameEvents = gameState?.gameEvents as Array<Record<string, unknown>> || [];
        const assistEvents = gameEvents.filter((event: Record<string, unknown>) => event.assisterId) || [];
        if (assistEvents.length > 0) {
          console.log(`[SUPABASE] Saving game with ${assistEvents.length} assist events`);
        }
      }

      const supabaseGame = toSupabase.game(gameData, userId) as Record<string, unknown> & { id?: string };
      // Removed verbose logging for performance

      let result;

      // If game has no ID, do an insert (not upsert)
      if (!supabaseGame.id) {
        console.log(`[SUPABASE] Inserting new game...`);
        const { data, error } = await supabase
          .from('games')
          .insert(supabaseGame)
          .select()
          .single();

        if (error) {
          console.error(`[SUPABASE] Insert error:`, error);
          throw new NetworkError('supabase', 'saveSavedGame', error);
        }
        result = data;
        console.log(`[SUPABASE] Game inserted successfully with ID: ${result.id}`);
      } else {
        console.log(`[SUPABASE] Upserting existing game: ${supabaseGame.id}`);
        const { data, error } = await supabase
          .from('games')
          .upsert(supabaseGame)
          .select()
          .single();

        if (error) {
          console.error(`[SUPABASE] Upsert error:`, error);
          throw new NetworkError('supabase', 'saveSavedGame', error);
        }
        result = data;
        console.log(`[SUPABASE] Game upserted successfully`);
      }

      console.log(`[SUPABASE] Converting result back to AppState format...`);
      const convertedResult = fromSupabase.game(result as DbGame);
      console.log(`[SUPABASE] Save completed successfully`);
      return convertedResult;
    } catch (error) {
      console.error(`[SUPABASE] saveSavedGame failed:`, error);
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save game', 'supabase', 'saveSavedGame', error as Error);
    }
  }

  async deleteSavedGame(gameId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId)
        .eq('user_id', userId);

      if (error) {
        throw new NetworkError('supabase', 'deleteSavedGame', error);
      }
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError || error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('Failed to delete saved game', 'supabase', 'deleteSavedGame', error as Error);
    }
  }

  // Backup/restore
  async exportAllData(): Promise<unknown> {
    try {
      // Fetch all data including games using the provider's methods
      const [players, seasons, tournaments, games, settings] = await Promise.all([
        this.getPlayers(),
        this.getSeasons(),
        this.getTournaments(),
        this.getSavedGames(), // Use the provider's getSavedGames method
        this.getAppSettings()
      ]);

      return {
        players,
        seasons,
        tournaments,
        savedGames: games,
        appSettings: settings,
        exportDate: new Date().toISOString(),
        version: '1.0',
        source: 'supabase'
      };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to export data', 'supabase', 'exportAllData', error as Error);
    }
  }

  async importAllData(data: unknown): Promise<void> {
    try {
      const importData = data as {
        players?: Player[];
        seasons?: Season[];
        tournaments?: Tournament[];
        savedGames?: Record<string, unknown>;
        appSettings?: AppSettings;
      };

      const errors: string[] = [];

      // Import players
      if (importData.players?.length) {
        for (const player of importData.players) {
          try {
            await this.savePlayer(player);
          } catch (error) {
            errors.push(`Failed to import player ${player.name}: ${error}`);
          }
        }
      }

      // Import seasons
      if (importData.seasons?.length) {
        for (const season of importData.seasons) {
          try {
            await this.saveSeason(season);
          } catch (error) {
            errors.push(`Failed to import season ${season.name}: ${error}`);
          }
        }
      }

      // Import tournaments
      if (importData.tournaments?.length) {
        for (const tournament of importData.tournaments) {
          try {
            await this.saveTournament(tournament);
          } catch (error) {
            errors.push(`Failed to import tournament ${tournament.name}: ${error}`);
          }
        }
      }

      // Import games
      if (importData.savedGames) {
        for (const [gameId, game] of Object.entries(importData.savedGames)) {
          try {
            await this.saveSavedGame(game);
          } catch (error) {
            errors.push(`Failed to import game ${gameId}: ${error}`);
          }
        }
      }

      // Import settings
      if (importData.appSettings) {
        try {
          await this.saveAppSettings(importData.appSettings);
        } catch (error) {
          errors.push(`Failed to import app settings: ${error}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Import completed with errors: ${errors.join('; ')}`);
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new StorageError('Failed to import data', 'supabase', 'importAllData', error as Error);
    }
  }
}