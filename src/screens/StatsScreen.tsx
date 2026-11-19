import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useApp } from '../context/AppContext';
import {
  getCategoryBreakdown,
  getLast6CyclesSummary,
  getTransactions,
} from '../database/db';
import { calculateCycle, formatCurrency } from '../utils/dateCycle';
import { exportTransactionsToCSV } from '../utils/csvExporter';
import { CategoryBreakdown, CycleTrendItem, TransactionType } from '../types';

const screenWidth = Dimensions.get('window').width;

export const StatsScreen: React.FC = () => {
  const { dataVersion, settings } = useApp();

  const [offsetMonths, setOffsetMonths] = useState<number>(0);
  const [viewType, setViewType] = useState<TransactionType>('expense');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Tính chu kỳ đang chọn
  const cycle = useMemo(() => {
    return calculateCycle(settings.cycle_start_day, offsetMonths);
  }, [settings.cycle_start_day, offsetMonths]);

  // Dữ liệu phân bổ danh mục trong chu kỳ
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);

  // Dữ liệu xu hướng 6 chu kỳ gần nhất
  const [trendData, setTrendData] = useState<CycleTrendItem[]>([]);

  const loadStatsData = useCallback(() => {
    try {
      const bData = getCategoryBreakdown(cycle.startISO, cycle.endISO, viewType);
      setBreakdown(bData);

      const tData = getLast6CyclesSummary(settings.cycle_start_day);
      setTrendData(tData);
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu thống kê:', e);
    }
  }, [cycle.startISO, cycle.endISO, viewType, settings.cycle_start_day]);

  useEffect(() => {
    loadStatsData();
  }, [loadStatsData, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStatsData();
    setRefreshing(false);
  };

  // Tổng số tiền theo viewType trong chu kỳ này
  const totalAmount = useMemo(() => {
    return breakdown.reduce((sum, item) => sum + item.total_amount, 0);
  }, [breakdown]);

  // Dữ liệu cho PieChart
  const pieData = useMemo(() => {
    if (breakdown.length === 0 || totalAmount <= 0) {
      return [];
    }
    return breakdown.map((item) => ({
      value: item.total_amount,
      color: item.color,
      text: item.percentage >= 8 ? `${item.percentage}%` : '',
      textColor: '#FFFFFF',
      textSize: 11,
      fontWeight: 'bold' as const,
    }));
  }, [breakdown, totalAmount]);

  // Dữ liệu cho BarChart (ghép đôi từng tháng: Cột Thu màu xanh, Cột Chi màu đỏ)
  const barChartData = useMemo(() => {
    if (trendData.length === 0) return [];
    const items: any[] = [];

    // Tìm giá trị lớn nhất để chuẩn hóa tránh trường hợp tất cả = 0
    let maxVal = 0;
    trendData.forEach((t) => {
      if (t.totalIncome > maxVal) maxVal = t.totalIncome;
      if (t.totalExpense > maxVal) maxVal = t.totalExpense;
    });

    trendData.forEach((t) => {
      // Cột Thu
      items.push({
        value: t.totalIncome,
        label: t.shortLabel,
        spacing: 3,
        labelWidth: 34,
        labelTextStyle: { color: '#64748B', fontSize: 11, fontWeight: '600' },
        frontColor: '#10B981',
      });
      // Cột Chi
      items.push({
        value: t.totalExpense,
        frontColor: '#EF4444',
      });
    });

    return items;
  }, [trendData]);

  // Xử lý xuất báo cáo CSV
  const handleExportCSV = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const txList = getTransactions({
        startDate: cycle.startISO,
        endDate: cycle.endISO,
      });

      const res = await exportTransactionsToCSV(txList, cycle.label);
      if (!res.success && res.message) {
        Alert.alert('Thông báo', res.message);
      }
    } catch (err: any) {
      Alert.alert('Lỗi xuất tệp', err?.message || 'Không thể xuất tệp báo cáo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
    >
      {/* HEADER BỘ CHỌN CHU KỲ */}
      <View style={styles.cycleCard}>
        <View style={styles.cycleSelector}>
          <TouchableOpacity
            style={styles.cycleArrowBtn}
            onPress={() => setOffsetMonths((m) => m - 1)}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={20} color="#1E293B" />
            <Text style={styles.cycleArrowText}>Kỳ trước</Text>
          </TouchableOpacity>

          <View style={styles.cycleCenter}>
            <View style={styles.cycleLabelContainer}>
              <Ionicons name="calendar-outline" size={15} color="#2563EB" style={{ marginRight: 4 }} />
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
            <Ionicons name="chevron-forward" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* NÚT XUẤT CSV Ở ĐẦU TRANG */}
        <TouchableOpacity
          style={styles.exportTopButton}
          onPress={handleExportCSV}
          disabled={isExporting}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={17} color="#2563EB" style={{ marginRight: 6 }} />
          <Text style={styles.exportTopButtonText}>
            {isExporting ? 'Đang tạo báo cáo...' : 'Xuất báo cáo chu kỳ này (.CSV)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* CHUYỂN ĐỔI XEM KHOẢN CHI / KHOẢN THU */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            viewType === 'expense' && styles.segmentBtnExpenseActive,
          ]}
          onPress={() => setViewType('expense')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-up-circle"
            size={16}
            color={viewType === 'expense' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              viewType === 'expense' && styles.segmentTextActive,
            ]}
          >
            Tỷ trọng Chi tiêu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            viewType === 'income' && styles.segmentBtnIncomeActive,
          ]}
          onPress={() => setViewType('income')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-down-circle"
            size={16}
            color={viewType === 'income' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              viewType === 'income' && styles.segmentTextActive,
            ]}
          >
            Tỷ trọng Thu nhập
          </Text>
        </TouchableOpacity>
      </View>

      {/* BIỂU ĐỒ TRÒN (DONUT CHART) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons
            name="pie-chart-outline"
            size={20}
            color={viewType === 'expense' ? '#DC2626' : '#059669'}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.cardTitle}>
            Cơ cấu {viewType === 'expense' ? 'Khoản Chi' : 'Khoản Thu'} trong kỳ
          </Text>
        </View>

        {pieData.length === 0 ? (
          <View style={styles.emptyChartBox}>
            <Ionicons name="pie-chart" size={48} color="#E2E8F0" />
            <Text style={styles.emptyChartText}>
              Chưa có dữ liệu {viewType === 'expense' ? 'chi tiêu' : 'thu nhập'} trong chu kỳ này.
            </Text>
          </View>
        ) : (
          <View style={styles.chartWrapper}>
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                donut
                sectionAutoFocus
                radius={85}
                innerRadius={55}
                innerCircleColor={'#FFFFFF'}
                centerLabelComponent={() => {
                  return (
                    <View style={styles.pieCenterLabel}>
                      <Text style={styles.pieCenterSub}>Tổng cộng</Text>
                      <Text
                        style={[
                          styles.pieCenterAmount,
                          { color: viewType === 'expense' ? '#DC2626' : '#059669' },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {formatCurrency(totalAmount).replace(' đ', '')}
                      </Text>
                      <Text style={styles.pieCenterCurrency}>VNĐ</Text>
                    </View>
                  );
                }}
              />
            </View>

            {/* DANH SÁCH CHI TIẾT TỪNG DANH MỤC */}
            <View style={styles.breakdownList}>
              {breakdown.map((item) => {
                const iconName = (item.icon || 'pricetag') as any;

                return (
                  <View key={item.category_id} style={styles.breakdownItem}>
                    <View style={[styles.breakdownIconCircle, { backgroundColor: item.color }]}>
                      <Ionicons name={iconName} size={16} color="#FFFFFF" />
                    </View>

                    <View style={styles.breakdownInfo}>
                      <View style={styles.breakdownTopRow}>
                        <Text style={styles.breakdownName} numberOfLines={1}>
                          {item.category_name}
                        </Text>
                        <Text style={styles.breakdownAmount}>
                          {formatCurrency(item.total_amount)}
                        </Text>
                      </View>

                      {/* THANH PHẦN TRĂM */}
                      <View style={styles.breakdownBarTrack}>
                        <View
                          style={[
                            styles.breakdownBarFill,
                            { width: `${Math.min(100, item.percentage)}%`, backgroundColor: item.color },
                          ]}
                        />
                      </View>

                      <View style={styles.breakdownBottomRow}>
                        <Text style={styles.breakdownCountText}>
                          {item.count} giao dịch
                        </Text>
                        <Text style={[styles.breakdownPercentText, { color: item.color }]}>
                          {item.percentage}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* BIỂU ĐỒ CỘT SO SÁNH 6 THÁNG GẦN NHẤT */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bar-chart-outline" size={20} color="#2563EB" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Biến động Thu vs. Chi (6 chu kỳ gần nhất)</Text>
        </View>

        {/* CHÚ THÍCH CỘT */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Khoản Thu</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Khoản Chi</Text>
          </View>
        </View>

        <View style={styles.barChartContainer}>
          <BarChart
            data={barChartData}
            barWidth={14}
            initialSpacing={12}
            spacing={18}
            barBorderRadius={4}
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={'#E2E8F0'}
            yAxisTextStyle={{ color: '#94A3B8', fontSize: 10 }}
            formatYLabel={(label) => {
              const num = parseFloat(label) || 0;
              if (num >= 1000000) return `${(num / 1000000).toFixed(0)}Tr`;
              if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
              return label;
            }}
            width={screenWidth - 90}
            height={180}
            isAnimated
            roundedTop
          />
        </View>
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
  cycleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
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
    paddingBottom: 12,
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
  exportTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  exportTopButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentBtnExpenseActive: {
    backgroundColor: '#DC2626',
  },
  segmentBtnIncomeActive: {
    backgroundColor: '#059669',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyChartBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyChartText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  pieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  pieCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
  },
  pieCenterSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  pieCenterAmount: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  pieCenterCurrency: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },
  breakdownList: {
    width: '100%',
    marginTop: 14,
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  breakdownBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownCountText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  breakdownPercentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  barChartContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
