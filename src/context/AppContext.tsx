import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Setting } from '../types';
import { getSettings } from '../database/db';

export type AppTab = 'home' | 'add' | 'settings';

interface AppContextType {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  dataVersion: number;
  notifyDataChanged: () => void;
  settings: Setting;
  reloadSettings: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [settings, setSettings] = useState<Setting>({
    id: 1,
    initial_balance: 0,
    cycle_start_day: 1,
  });

  const reloadSettings = useCallback(() => {
    try {
      const s = getSettings();
      setSettings(s);
    } catch (e) {
      console.warn('Lỗi tải cài đặt:', e);
    }
  }, []);

  const notifyDataChanged = useCallback(() => {
    setDataVersion((v) => v + 1);
    reloadSettings();
  }, [reloadSettings]);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        dataVersion,
        notifyDataChanged,
        settings,
        reloadSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp phải được sử dụng bên trong AppProvider');
  }
  return context;
}
