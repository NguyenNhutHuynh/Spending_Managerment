import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase } from './src/database/db';
import { AppProvider, useApp } from './src/context/AppContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { AddScreen } from './src/screens/AddScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

function MainApp() {
  const { activeTab, setActiveTab, editingTransaction } = useApp();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* TOP APP BAR */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Ionicons name="sparkles" size={20} color="#2563EB" style={{ marginRight: 6 }} />
          <Text style={styles.appTitle}>
            {activeTab === 'home'
              ? 'Tổng quan chi tiêu'
              : activeTab === 'add'
              ? editingTransaction
                ? 'Sửa giao dịch'
                : 'Ghi chép giao dịch'
              : activeTab === 'stats'
              ? 'Thống kê & Báo cáo'
              : 'Cài đặt & Danh mục'}
          </Text>
        </View>
        <View style={styles.mvpBadge}>
          <Text style={styles.mvpBadgeText}>Giai đoạn 2</Text>
        </View>
      </View>

      {/* MÀN HÌNH NỘI DUNG */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'add' && <AddScreen />}
        {activeTab === 'stats' && <StatsScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </View>

      {/* CUSTOM BOTTOM TAB BAR - 4 TABS */}
      <View style={styles.bottomBarWrapper}>
        <View style={styles.bottomBar}>
          {/* TAB 1: TỔNG QUAN */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'home' ? 'wallet' : 'wallet-outline'}
              size={22}
              color={activeTab === 'home' ? '#2563EB' : '#94A3B8'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'home' && styles.tabTextActive,
              ]}
            >
              Tổng quan
            </Text>
          </TouchableOpacity>

          {/* TAB 2: THỐNG KÊ & BÁO CÁO */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('stats')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'stats' ? 'pie-chart' : 'pie-chart-outline'}
              size={22}
              color={activeTab === 'stats' ? '#2563EB' : '#94A3B8'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'stats' && styles.tabTextActive,
              ]}
            >
              Thống kê
            </Text>
          </TouchableOpacity>

          {/* TAB 3: GHI CHÉP (+) NỔI BẬT */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('add')}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.addIconBadge,
                activeTab === 'add' && styles.addIconBadgeActive,
              ]}
            >
              <Ionicons
                name={editingTransaction ? 'pencil' : 'add'}
                size={22}
                color="#FFFFFF"
              />
            </View>
            <Text
              style={[
                styles.tabText,
                activeTab === 'add' && styles.tabTextActive,
              ]}
            >
              {editingTransaction ? 'Sửa' : 'Ghi chép'}
            </Text>
          </TouchableOpacity>

          {/* TAB 4: CÀI ĐẶT */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
              size={22}
              color={activeTab === 'settings' ? '#2563EB' : '#94A3B8'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'settings' && styles.tabTextActive,
              ]}
            >
              Cài đặt
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      initDatabase();
      setDbReady(true);
    } catch (err: any) {
      console.error('Lỗi khởi tạo SQLite:', err);
      setErrorMsg(err?.message || 'Không thể khởi tạo cơ sở dữ liệu SQLite.');
    }
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={48} color="#DC2626" />
            <Text style={styles.errorTitle}>Lỗi khởi động ứng dụng</Text>
            <Text style={styles.errorSub}>{errorMsg}</Text>
          </View>
        ) : (
          <>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Đang khởi tạo cơ sở dữ liệu SQLite...</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  mvpBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  mvpBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bottomBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 3,
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  addIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addIconBadgeActive: {
    backgroundColor: '#1D4ED8',
    transform: [{ scale: 1.1 }],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  errorBox: {
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 12,
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});
