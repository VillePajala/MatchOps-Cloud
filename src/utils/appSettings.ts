import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';
/**
 * Interface for application settings
 */
export interface AppSettings {
  currentGameId: string | null;
  lastHomeTeamName?: string;
  language?: string;
  hasSeenAppGuide?: boolean;
  autoBackupEnabled?: boolean;
  autoBackupIntervalHours?: number;
  lastBackupTime?: string;
  backupEmail?: string;
  useDemandCorrection?: boolean;
  // PWA settings
  installPromptCount?: number;
  installPromptLastDismissed?: number | null;
  appUsageCount?: number;
  installPromptDismissed?: number | null;
  // Session/Security settings
  deviceFingerprint?: string;
  sessionActivity?: Record<string, unknown>;
  // Onboarding settings - three-phase system
  firstGameOnboardingPhase1Completed?: boolean;
  firstGameOnboardingPhase2Completed?: boolean;
  firstGameTutorialCompleted?: boolean;
}

/**
 * Default application settings
 */
const DEFAULT_APP_SETTINGS: AppSettings = {
  currentGameId: null,
  lastHomeTeamName: '',
  language: 'fi',
  hasSeenAppGuide: false,
  autoBackupEnabled: false,
  autoBackupIntervalHours: 24,
  lastBackupTime: undefined,
  backupEmail: '',
  useDemandCorrection: false,
  // PWA settings defaults
  installPromptCount: 0,
  installPromptLastDismissed: null,
  appUsageCount: 0,
  installPromptDismissed: null,
  // Session/Security defaults
  deviceFingerprint: undefined,
  sessionActivity: {},
  // Onboarding defaults - three-phase system
  firstGameOnboardingPhase1Completed: false,
  firstGameOnboardingPhase2Completed: false,
  firstGameTutorialCompleted: false,
};

/**
 * Gets the application settings using the storage abstraction layer
 * @returns A promise that resolves to the application settings
 */
export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const settings = await storageManager.getAppSettings();
    if (!settings) {
      return DEFAULT_APP_SETTINGS;
    }
    return { ...DEFAULT_APP_SETTINGS, ...settings };
  } catch (error) {
    logger.error('Error getting app settings:', error);
    return DEFAULT_APP_SETTINGS; // Fallback to default on error
  }
};

/**
 * Saves the application settings using the storage abstraction layer
 * @param settings - The settings to save
 * @returns A promise that resolves to the saved settings
 */
export const saveAppSettings = async (settings: AppSettings): Promise<AppSettings> => {
  try {
    return await storageManager.saveAppSettings(settings);
  } catch (error) {
    logger.error('Error saving app settings:', error);
    throw error;
  }
};

/**
 * Updates specific application settings while preserving others
 * @param settingsUpdate - Partial settings to update
 * @returns A promise that resolves to the updated settings
 */
export const updateAppSettings = async (settingsUpdate: Partial<AppSettings>): Promise<AppSettings> => {
  try {
    // Get current settings. If this fails, the error will propagate.
    const currentSettings = await getAppSettings();
    
    // Check if any values actually changed
    let hasChanges = false;
    for (const [key, value] of Object.entries(settingsUpdate)) {
      if (currentSettings[key as keyof AppSettings] !== value) {
        hasChanges = true;
        break;
      }
    }
    
    // If no changes, return current settings without saving
    if (!hasChanges) {
      return currentSettings;
    }
    
    const updatedSettings = { ...currentSettings, ...settingsUpdate };
    // Save the updated settings and return the result
    return await saveAppSettings(updatedSettings);
  } catch (error) {
    logger.error('Error updating app settings:', error);
    throw error;
  }
};

/**
 * Gets the current game ID
 * @returns A promise that resolves to the current game ID, or null if not set
 */
export const getCurrentGameIdSetting = async (): Promise<string | null> => {
  // Wait for getAppSettings to resolve
  const settings = await getAppSettings();
  return settings.currentGameId;
};

/**
 * Saves the current game ID setting
 * @param gameId - The game ID to save
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const saveCurrentGameIdSetting = async (gameId: string | null): Promise<boolean> => {
  try {
    // Wait for updateAppSettings to resolve
    await updateAppSettings({ currentGameId: gameId });
    return true;
  } catch {
    // updateAppSettings already logs errors. We indicate failure here.
    return false;
  }
};

/**
 * Gets the last used home team name
 * @returns A promise that resolves to the last home team name, or empty string if not set
 */
export const getLastHomeTeamName = async (): Promise<string> => {
  try {
    const settings = await getAppSettings();
    return settings.lastHomeTeamName || '';
  } catch (error) {
    logger.error('Error getting last home team name:', error);
    return '';
  }
};

/**
 * Saves the last used home team name
 * @param teamName - The team name to save
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const saveLastHomeTeamName = async (teamName: string): Promise<boolean> => {
  try {
    await updateAppSettings({ lastHomeTeamName: teamName });
    return true;
  } catch (error) {
    logger.error('Error saving last home team name:', error);
    return false;
  }
};

/**
 * Gets whether the user has seen the app guide
 * @returns A promise that resolves to true if seen, false otherwise
 */
export const getHasSeenAppGuide = async (): Promise<boolean> => {
  const settings = await getAppSettings();
  return settings.hasSeenAppGuide ?? false;
};

/**
 * Saves the hasSeenAppGuide flag
 * @param value - Whether the guide has been viewed
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const saveHasSeenAppGuide = async (value: boolean): Promise<boolean> => {
  try {
    await updateAppSettings({ hasSeenAppGuide: value });
    return true;
  } catch {
    return false;
  }
};

/**
 * Clears all application settings, resetting to defaults
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const resetAppSettings = async (): Promise<boolean> => {
  try {
    await saveAppSettings(DEFAULT_APP_SETTINGS);
    return true;
  } catch (error) {
    logger.error('Error resetting app settings:', error);
    return false;
  }
};
