import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Setting, Transaction } from '../types';
import { getSettings } from '../database/db';

export type AppTab = 'home' | 'add' | 'stats' | 'settings';

interface AppContextType {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  dataVersion: number;
  notifyDataChanged: () => void;
  settings: Setting;
  reloadSettings: () => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (transaction: Transaction | null) => void;
  startEditTransaction: (transaction: Transaction) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
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

  const startEditTransaction = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setActiveTab('add');
  }, []);

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
        editingTransaction,
        setEditingTransaction,
        startEditTransaction,
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
