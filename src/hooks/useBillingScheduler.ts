import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { BillingRunResult, runBillingEngine } from '../lib/billing';
import { settingsRepo, subscribeToDatabase } from '../lib/db';

export function useBillingScheduler() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<BillingRunResult | null>(null);
  const [settings, setSettings] = useState(() => settingsRepo.get());

  useEffect(() => {
    return subscribeToDatabase(() => {
      setSettings(settingsRepo.get());
    });
  }, []);

  const triggerRun = useCallback(
    (customDate?: string) => {
      setIsRunning(true);
      try {
        const res = runBillingEngine(customDate, user);
        setLastResult(res);
        return res;
      } catch (e) {
        console.error('Error during scheduled billing execution', e);
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [user]
  );

  // Run on mount once user/session is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerRun();
    }, 1200);

    // Periodic check every 60 seconds
    const interval = setInterval(() => {
      triggerRun();
    }, 60000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [triggerRun]);

  const setSimulatedDate = (newDate: string | null) => {
    const updated = settingsRepo.update({ simulatedDate: newDate });
    setSettings(updated);
    // When date changes, immediately evaluate billing engine
    triggerRun(newDate || undefined);
  };

  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  return {
    isRunning,
    lastResult,
    triggerRun,
    simulatedDate: settings.simulatedDate,
    effectiveToday,
    setSimulatedDate,
  };
}
