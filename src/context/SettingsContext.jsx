import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  CONFIGURABLE_CATEGORIES,
  SETTINGS_STORAGE_KEY,
  getCategoryDefaults,
  getDefaultMeta,
  getDefaultSettings,
  mergeSettingsWithDefaults,
} from '../data/settingsData';

const SettingsContext = createContext(null);

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(data) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable (private mode / locked-down browser). The
    // configuration still updates in memory for the current session.
  }
}

function initialData() {
  const stored = readStoredSettings();
  return {
    values: mergeSettingsWithDefaults(stored?.values),
    meta: { ...getDefaultMeta(), ...(stored?.meta || {}) },
  };
}

export function SettingsProvider({ children }) {
  const [data, setData] = useState(initialData);

  const saveCategory = useCallback((categoryKey, values) => {
    setData((previous) => {
      const next = {
        values: { ...previous.values, [categoryKey]: values },
        meta: {
          ...previous.meta,
          [categoryKey]: { updatedAt: new Date().toISOString(), updatedBy: 'Design Admin' },
        },
      };
      persist(next);
      return next;
    });
  }, []);

  const resetCategory = useCallback((categoryKey) => {
    setData((previous) => {
      const next = {
        values: {
          ...previous.values,
          [categoryKey]: getCategoryDefaults(categoryKey),
        },
        meta: {
          ...previous.meta,
          [categoryKey]: { updatedAt: new Date().toISOString(), updatedBy: 'Design Admin' },
        },
      };
      persist(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    const now = new Date().toISOString();
    const meta = Object.fromEntries(
      CONFIGURABLE_CATEGORIES.map((category) => [
        category.key,
        { updatedAt: now, updatedBy: 'Design Admin' },
      ]),
    );
    const next = { values: getDefaultSettings(), meta };
    persist(next);
    setData(next);
  }, []);

  const refresh = useCallback(() => {
    const stored = readStoredSettings();
    const next = {
      values: mergeSettingsWithDefaults(stored?.values),
      meta: { ...getDefaultMeta(), ...(stored?.meta || {}) },
    };
    setData(next);
  }, []);

  const value = useMemo(
    () => ({
      values: data.values,
      meta: data.meta,
      configurableCount: CONFIGURABLE_CATEGORIES.length,
      saveCategory,
      resetCategory,
      resetAll,
      refresh,
    }),
    [data, saveCategory, resetCategory, resetAll, refresh],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}
