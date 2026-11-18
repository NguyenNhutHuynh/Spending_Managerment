import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import {
  getCycleSummary,
  getOverallBalance,
  getTransactions,
  deleteTransaction,
} from '../database/db';
import { calculateCycle, formatCurrency, formatDateDisplay } from '../utils/dateCycle';
import { Transaction, TransactionType } from '../types';

export const HomeScreen: React.FC = () => {
  const { dataVersion, notifyDataChanged, settings, setActiveTab } = useApp();

  const [offsetMonths, setOffsetMonths] = useState<number>(0);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);

  // Tính chu kỳ hiện tại đang chọn
  const cycle = useMemo(() => {
    return calculateCycle(settings.cycle_start_day, offsetMonths);
  }, [settings.cycle_start_day, offsetMonths]);

  // Lấy dữ liệu
  const [overallBalance, setOverallBalance] = useState({
    initialBalance: 0,
    totalIncomeAllTime: 0,
    totalExpenseAllTime: 0,
    currentBalance: 0,
  });

  const [cycleSummary, setCycleSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadData = useCallback(() => {
    try {
      const balance = getOverallBalance();
      setOverallBalance(balance);

      const summary = getCycleSummary(cycle.startISO, cycle.endISO);
      setCycleSummary(summary);

      const txList = getTransactions({
        startDate: cycle.startISO,
        endDate: cycle.endISO,
        type: filterType === 'all' ? undefined : filterType,
        searchQuery: searchQuery,
      });
      setTransactions(txList);
    } catch (e) {
      console.error('Lỗi tải dữ liệu HomeScreen:', e);
    }
  }, [cycle.startISO, cycle.endISO, filterType, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const handleDelete = (id: number, note?: string) => {
    Alert.alert(
      'Xóa giao dịch',
      `Bạn có chắc chắn muốn xóa giao dịch ${note ? `"${note}"` : 'này'} không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            try {
              deleteTransaction(id);
              notifyDataChanged();
            } catch (e) {
              Alert.alert('Lỗi', 'Không thể xóa giao dịch.');
            }
          },
        },
      ]
    );
  };

  // Tính phần trăm chi tiêu so với thu nhập trong kỳ
  const expensePercentage = useMemo(() => {
    if (cycleSummary.totalIncome <= 0) {
      return cycleSummary.totalExpense > 0 ? 100 : 0;
    }
    const percent = Math.min(
      100,
      Math.round((cycleSummary.totalExpense / cycleSummary.totalIncome) * 100)
    );
    return percent;
  }, [cycleSummary.totalIncome, cycleSummary.totalExpense]);

  // Màu sắc thanh tiến độ
  const progressColor = useMemo(() => {
    if (cycleSummary.totalExpense > cycleSummary.totalIncome && cycleSummary.totalIncome > 0) {
      return '#EF5350'; // Đỏ: vượt ngân sách
    }
    if (expensePercentage >= 90) return '#EF5350'; // Đỏ
    if (expensePercentage >= 70) return '#FFA726'; // Vàng cam
    return '#4CAF50'; // Xanh lá an toàn
  }, [expensePercentage, cycleSummary.totalExpense, cycleSummary.totalIncome]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
    >
      {/* HEADER & TỔNG SỐ DƯ */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSubtitle}>Số dư hiện tại</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.headerBalance}>
                {isBalanceHidden ? '•••••••• đ' : formatCurrency(overallBalance.currentBalance)}
              </Text>
              <TouchableOpacity
                onPress={() => setIsBalanceHidden(!isBalanceHidden)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isBalanceHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#E8F5E9"
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.brandBadge}>
            <Ionicons name="wallet" size={24} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.initialBalanceRow}>
          <Text style={styles.initialBalanceText}>
            Số dư ban đầu: {formatCurrency(overallBalance.initialBalance)}
          </Text>
        </View>
      </View>

      {/* BỘ CHỌN CHU KỲ THÁNG */}
      <View style={styles.cycleCard}>
        <View style={styles.cycleSelector}>
          <TouchableOpacity
            style={styles.cycleArrowBtn}
            onPress={() => setOffsetMonths((m) => m - 1)}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
            <Text style={styles.cycleArrowText}>Kỳ trước</Text>
          </TouchableOpacity>

          <View style={styles.cycleCenter}>
            <View style={styles.cycleLabelContainer}>
              <Ionicons name="calendar-outline" size={16} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.cycleDateLabel}>{cycle.label}</Text>
            </View>
            {cycle.isCurrentCycle ? (
              <View style={styles.activeCycleBadge}>
                <Text style={styles.activeCycleBadgeText}>Chu kỳ hiện tại</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setOffsetMonths(0)}
                style={styles.returnCurrentBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.returnCurrentBtnText}>Về kỳ hiện tại</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.cycleArrowBtn}
            onPress={() => setOffsetMonths((m) => m + 1)}
            activeOpacity={0.6}
          >
            <Text style={styles.cycleArrowText}>Kỳ sau</Text>
            <Ionicons name="chevron-forward" size={22} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* THẺ TỔNG KẾT CHU KỲ */}
        <View style={styles.summaryStatsRow}>
          <View style={[styles.statBox, { borderLeftColor: '#10B981' }]}>
            <View style={styles.statHeader}>
              <Ionicons name="arrow-down-circle" size={16} color="#10B981" />
              <Text style={styles.statTitle}>Tổng Thu</Text>
            </View>
            <Text style={[styles.statValue, { color: '#047857' }]}>
              {formatCurrency(cycleSummary.totalIncome)}
            </Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: '#EF4444' }]}>
            <View style={styles.statHeader}>
              <Ionicons name="arrow-up-circle" size={16} color="#EF4444" />
              <Text style={styles.statTitle}>Tổng Chi</Text>
            </View>
            <Text style={[styles.statValue, { color: '#B91C1C' }]}>
              {formatCurrency(cycleSummary.totalExpense)}
            </Text>
          </View>
        </View>

        {/* CHÊNH LỆCH & THANH TIẾN ĐỘ */}
        <View style={styles.balanceDiffContainer}>
          <View style={styles.diffRow}>
            <Text style={styles.diffTitle}>Chênh lệch (Thu - Chi):</Text>
            <Text
              style={[
                styles.diffValue,
                { color: cycleSummary.netSavings >= 0 ? '#10B981' : '#EF4444' },
              ]}
            >
              {cycleSummary.netSavings > 0 ? '+' : ''}
              {formatCurrency(cycleSummary.netSavings)}
            </Text>
          </View>

          {/* PROGRESS BAR */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressHint}>
                {cycleSummary.totalIncome > 0
                  ? `Đã chi ${expensePercentage}% thu nhập kỳ này`
                  : cycleSummary.totalExpense > 0
                  ? 'Chi tiêu khi chưa có thu trong kỳ'
                  : 'Chưa có khoản thu/chi'}
              </Text>
              <Text style={[styles.progressPercentText, { color: progressColor }]}>
                {expensePercentage}%
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${expensePercentage}%`, backgroundColor: progressColor },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* DANH SÁCH GIAO DỊCH */}
      <View style={styles.listSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Giao dịch trong kỳ</Text>
          <Text style={styles.transactionCountBadge}>{transactions.length} giao dịch</Text>
        </View>

        {/* Ô TÌM KIẾM */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo ghi chú hoặc danh mục..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* FILTER TABS */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => setFilterType('all')}
          >
            <Text
              style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'expense' && styles.filterChipActive]}
            onPress={() => setFilterType('expense')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === 'expense' && styles.filterChipTextActive,
              ]}
            >
              Khoản Chi
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'income' && styles.filterChipActive]}
            onPress={() => setFilterType('income')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === 'income' && styles.filterChipTextActive,
              ]}
            >
              Khoản Thu
            </Text>
          </TouchableOpacity>
        </View>

        {/* DANH SÁCH ITEM */}
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={54} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>Chưa có giao dịch nào</Text>
            <Text style={styles.emptyStateSub}>
              {searchQuery
                ? 'Không tìm thấy giao dịch phù hợp với từ khóa.'
                : 'Bấm nút ghi chép bên dưới để thêm khoản thu hoặc chi tiêu mới.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setActiveTab('add')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.emptyAddBtnText}>Thêm giao dịch ngay</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.transactionList}>
            {transactions.map((item) => {
              const isIncome = item.type === 'income';
              const iconName = (item.category_icon || 'pricetag') as any;
              const catColor = item.category_color || (isIncome ? '#10B981' : '#EF4444');

              return (
                <View key={item.id} style={styles.transactionItem}>
                  <View style={[styles.categoryIconCircle, { backgroundColor: catColor }]}>
                    <Ionicons name={iconName} size={20} color="#FFFFFF" />
                  </View>

                  <View style={styles.txDetails}>
                    <Text style={styles.txCategoryName} numberOfLines={1}>
                      {item.category_name || (isIncome ? 'Thu nhập' : 'Chi tiêu')}
                    </Text>
                    {!!item.note && (
                      <Text style={styles.txNote} numberOfLines={1}>
                        {item.note}
                      </Text>
                    )}
                    <Text style={styles.txDate}>{formatDateDisplay(item.transaction_date)}</Text>
                  </View>

                  <View style={styles.txRightCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isIncome ? '#059669' : '#DC2626' },
                      ]}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(item.amount)}
                    </Text>

                    <TouchableOpacity
                      style={styles.txDeleteBtn}
                      onPress={() => handleDelete(item.id, item.note || item.category_name)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  headerCard: {
    backgroundColor: '#1E3A8A', // Xanh navy hiện đại sang trọng
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#93C5FD',
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBalance: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  eyeButton: {
    marginLeft: 10,
    padding: 4,
  },
  brandBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    padding: 10,
  },
  initialBalanceRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  initialBalanceText: {
    fontSize: 13,
    color: '#BFDBFE',
  },
  cycleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cycleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cycleArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cycleArrowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  cycleCenter: {
    alignItems: 'center',
  },
  cycleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cycleDateLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeCycleBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  activeCycleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  returnCurrentBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  returnCurrentBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  balanceDiffContainer: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  diffTitle: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  diffValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressBarWrapper: {
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressHint: {
    fontSize: 11,
    color: '#64748B',
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  listSection: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  transactionCountBadge: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  transactionList: {
    gap: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  txCategoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  txNote: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  txRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  txDeleteBtn: {
    padding: 2,
  },
});
