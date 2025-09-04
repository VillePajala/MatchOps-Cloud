import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { loadLanguage } from '../i18n';
import {
  saveHasSeenAppGuide,
  saveLastHomeTeamName as utilSaveLastHomeTeamName,
  updateAppSettings as utilUpdateAppSettings,
} from '@/utils/appSettings';
import { exportFullBackup } from '@/utils/fullBackup';
import logger from '@/utils/logger';
import { useToast } from '@/contexts/ToastProvider';
import { hardResetAllUserData } from '@/utils/hardResetApp';

interface UseAppSettingsManagerProps {
  setIsSettingsModalOpen: (open: boolean) => void;
  setIsInstructionsModalOpen: (open: boolean) => void;
}

/**
 * Custom hook that manages all application settings and related functionality.
 * Handles language switching, backup settings, app guide, and hard reset functionality.
 */
export const useAppSettingsManager = ({
  setIsSettingsModalOpen,
  setIsInstructionsModalOpen,
}: UseAppSettingsManagerProps) => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  // --- Settings State ---
  const [appLanguage, setAppLanguage] = useState<string>(i18n.language);
  const [defaultTeamNameSetting, setDefaultTeamNameSetting] = useState<string>('');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(false);
  const [backupIntervalHours, setBackupIntervalHours] = useState<number>(24);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [backupEmail, setBackupEmail] = useState<string>('');

  // --- Language Management ---
  useEffect(() => {
    // Only update if language actually changed
    if (i18n.language !== appLanguage) {
      loadLanguage(appLanguage).then(() => {
        utilUpdateAppSettings({ language: appLanguage }).catch(() => {});
      }).catch(error => {
        logger.warn('[useAppSettingsManager] Failed to change language:', error);
      });
    }
  }, [appLanguage]);

  // --- App Guide Handler ---
  const handleShowAppGuide = useCallback(() => {
    saveHasSeenAppGuide(false);
    setIsSettingsModalOpen(false);
    setIsInstructionsModalOpen(true);
  }, [setIsSettingsModalOpen, setIsInstructionsModalOpen]);

  // --- Hard Reset Handler ---
  const handleHardResetApp = useCallback(async () => {
    if (window.confirm(t('controlBar.hardResetConfirmation', 'Are you sure you want to completely reset the application? All saved data (players, stats, positions) will be permanently lost.'))) {
      try {
        logger.log('[HardReset] Starting full user data wipe...');
        const res = await hardResetAllUserData();
        logger.log('[HardReset] Completed', res);
        showToast(t('settingsModal.resetSuccess', 'All data erased successfully. Reloading...'), 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (error) {
        logger.error('[HardReset] Error during hard reset:', error);
        showToast(t('settingsModal.resetFailed', 'Failed to reset application data.'), 'error');
      }
    }
  }, [t, showToast]);

  // --- Backup Handlers ---
  const handleCreateAndSendBackup = useCallback(async () => {
    try {
      const json = await exportFullBackup();
      // Always download backup as a file (email functionality removed)
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soccer-app-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(t('settingsModal.backupDownloaded', 'Backup downloaded successfully.'), 'success');
    } catch (error) {
      logger.error("Error creating backup:", error);
      showToast(t('settingsModal.backupError', 'Failed to create backup.'), 'error');
    }
  }, [t, showToast]);

  // --- Settings Change Handlers ---
  const handleLanguageChange = useCallback((lang: string) => {
    setAppLanguage(lang);
  }, []);

  const handleDefaultTeamNameChange = useCallback((name: string) => {
    setDefaultTeamNameSetting(name);
    utilSaveLastHomeTeamName(name);
  }, []);

  const handleAutoBackupEnabledChange = useCallback((enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    utilUpdateAppSettings({ autoBackupEnabled: enabled }).catch(() => {});
  }, []);

  const handleBackupIntervalChange = useCallback((hours: number) => {
    const val = Math.max(1, hours);
    setBackupIntervalHours(val);
    utilUpdateAppSettings({ autoBackupIntervalHours: val }).catch(() => {});
  }, []);

  const handleLastBackupTimeChange = useCallback((time: string) => {
    setLastBackupTime(time);
    utilUpdateAppSettings({ lastBackupTime: time }).catch(() => {});
  }, []);

  const handleBackupEmailChange = useCallback((email: string) => {
    setBackupEmail(email);
    utilUpdateAppSettings({ backupEmail: email }).catch(() => {});
  }, []);

  return {
    // State
    appLanguage,
    defaultTeamNameSetting,
    autoBackupEnabled,
    backupIntervalHours,
    lastBackupTime,
    backupEmail,
    
    // Settings setters (for initial load)
    setAppLanguage,
    setDefaultTeamNameSetting,
    setAutoBackupEnabled,
    setBackupIntervalHours,
    setLastBackupTime,
    setBackupEmail,
    
    // Handlers
    handleShowAppGuide,
    handleHardResetApp,
    handleCreateAndSendBackup,
    handleLanguageChange,
    handleDefaultTeamNameChange,
    handleAutoBackupEnabledChange,
    handleBackupIntervalChange,
    handleLastBackupTimeChange,
    handleBackupEmailChange,
  };
};

export default useAppSettingsManager;