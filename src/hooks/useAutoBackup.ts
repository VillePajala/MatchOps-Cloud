import { useEffect } from 'react';
import { getAppSettings, updateAppSettings } from '@/utils/appSettings';
import { exportFullBackup } from '@/utils/fullBackup';
import logger from '@/utils/logger';

const useAutoBackup = (): void => {
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    let cancelled = false;

    const schedule = async () => {
      const settings = await getAppSettings();
      const enabled = settings.autoBackupEnabled ?? false;
      if (!enabled) return;

      const intervalHours = settings.autoBackupIntervalHours ?? 24;
      const intervalMs = intervalHours * 60 * 60 * 1000;
      const last = settings.lastBackupTime ? Date.parse(settings.lastBackupTime) : 0;
      const now = Date.now();
      const delay = Math.max(0, intervalMs - (now - last));

      const run = async () => {
        try {
          const json = await exportFullBackup();
          // Auto-backup creates the JSON but doesn't email it anymore
          // Users can manually export and save the backup file
          logger.debug('Auto-backup created:', json.length, 'bytes');
          await updateAppSettings({ lastBackupTime: new Date().toISOString() });
        } catch (err) {
          logger.error('Automatic backup failed:', err);
        }
        if (!cancelled) schedule();
      };

      // PHASE 4: Use requestIdleCallback for background persistence
      // This ensures backup operations don't interfere with user interactions
      const scheduleBackup = () => {
        if (typeof window !== 'undefined' && window.requestIdleCallback && delay === 0) {
          // Use requestIdleCallback only for immediate execution (better performance)
          window.requestIdleCallback(() => {
            if (!cancelled) run();
          });
        } else {
          // Use setTimeout for delayed execution or fallback
          timeout = setTimeout(run, delay);
        }
      };

      scheduleBackup();
    };

    schedule();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, []);
};

export default useAutoBackup;
