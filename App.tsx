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
import { SettingsScreen } from './src/screens/SettingsScreen';

function MainApp() {
  const { activeTab, setActiveTab } = useApp();

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
              ? 'Ghi chép giao dịch'
              : 'Cài đặt & Danh mục'}
          </Text>
        </View>
        <View style={styles.mvpBadge}>
          <Text style={styles.mvpBadgeText}>Giai đoạn 1 (MVP)</Text>
        </View>
      </View>

      {/* MÀN HÌNH NỘI DUNG */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'add' && <AddScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </View>

      {/* CUSTOM BOTTOM TAB BAR */}
      <View style={styles.bottomBarWrapper}>
        <View style={styles.bottomBar}>
          {/* TAB TỔNG QUAN */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'home' ? 'pie-chart' : 'pie-chart-outline'}
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

          {/* NÚT THÊM NỔI BẬT Ở GIỮA */}
          <View style={styles.centerButtonContainer}>
            <TouchableOpacity
              style={[
                styles.centerButton,
                activeTab === 'add' && styles.centerButtonActive,
              ]}
              onPress={() => setActiveTab('add')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text
              style={[
                styles.centerButtonText,
                activeTab === 'add' && styles.tabTextActive,
              ]}
            >
              Ghi chép
            </Text>
          </View>

          {/* TAB CÀI ĐẶT */}
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
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
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
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  centerButtonActive: {
    backgroundColor: '#1D4ED8',
    transform: [{ scale: 1.05 }],
  },
  centerButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
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
