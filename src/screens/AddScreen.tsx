import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { addTransaction, getCategories } from '../database/db';
import { Category, TransactionType } from '../types';
import { formatCurrency, formatLocalDateOnly, formatLocalISODateTime } from '../utils/dateCycle';

export const AddScreen: React.FC = () => {
  const { dataVersion, notifyDataChanged, setActiveTab } = useApp();

  const [txType, setTxType] = useState<TransactionType>('expense');
  const [rawAmount, setRawAmount] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState<string>('');

  // Ngày giao dịch: 'today' | 'yesterday' | 'custom'
  const [dateOption, setDateOption] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(formatLocalDateOnly(new Date()));

  // Tải danh mục theo loại
  useEffect(() => {
    try {
      const cats = getCategories(txType);
      setCategories(cats);
      if (cats.length > 0) {
        // Tự động chọn danh mục đầu tiên nếu danh mục cũ không còn thuộc loại này
        setSelectedCategoryId(cats[0].id);
      } else {
        setSelectedCategoryId(null);
      }
    } catch (e) {
      console.error('Lỗi lấy danh mục:', e);
    }
  }, [txType, dataVersion]);

  // Số tiền dạng số
  const numericAmount = useMemo(() => {
    const clean = rawAmount.replace(/[^0-9]/g, '');
    return clean ? parseInt(clean, 10) : 0;
  }, [rawAmount]);

  // Xử lý nút cộng nhanh số tiền
  const handleAddAmount = (extra: number) => {
    const nextVal = numericAmount + extra;
    setRawAmount(nextVal.toString());
  };

  // Xử lý thay đổi input số tiền
  const handleAmountChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    setRawAmount(clean);
  };

  // Xác định ngày lưu giao dịch
  const resolvedTransactionDate = useMemo(() => {
    const now = new Date();
    if (dateOption === 'today') {
      return formatLocalISODateTime(now);
    }
    if (dateOption === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return formatLocalISODateTime(yesterday);
    }
    // Ngày tùy chỉnh: customDate (YYYY-MM-DD) ghép với giờ hiện tại
    const [y, m, d] = customDate.split('-').map(Number);
    const resolved = new Date(
      y || now.getFullYear(),
      (m ? m - 1 : now.getMonth()),
      d || now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
    return formatLocalISODateTime(resolved);
  }, [dateOption, customDate]);

  // Lưu giao dịch
  const handleSave = () => {
    if (numericAmount <= 0) {
      Alert.alert('Chưa nhập số tiền', 'Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Chưa chọn danh mục', 'Vui lòng chọn danh mục cho giao dịch.');
      return;
    }

    try {
      addTransaction(
        selectedCategoryId,
        numericAmount,
        txType,
        note,
        resolvedTransactionDate
      );

      // Reset form
      setRawAmount('');
      setNote('');
      setDateOption('today');

      // Thông báo cập nhật và chuyển về Trang chủ
      notifyDataChanged();
      setActiveTab('home');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu giao dịch. Vui lòng thử lại.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER CHUYỂN ĐỔI THU / CHI */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              txType === 'expense' && styles.segmentButtonExpenseActive,
            ]}
            onPress={() => setTxType('expense')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-up-circle"
              size={18}
              color={txType === 'expense' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                txType === 'expense' && styles.segmentTextActive,
              ]}
            >
              Khoản Chi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentButton,
              txType === 'income' && styles.segmentButtonIncomeActive,
            ]}
            onPress={() => setTxType('income')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-down-circle"
              size={18}
              color={txType === 'income' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                txType === 'income' && styles.segmentTextActive,
              ]}
            >
              Khoản Thu
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ô NHẬP TIỀN LỚN & RÕ RÀNG */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Số tiền giao dịch</Text>
          <View style={styles.amountInputRow}>
            <TextInput
              style={[
                styles.amountInput,
                { color: txType === 'expense' ? '#DC2626' : '#059669' },
              ]}
              value={numericAmount > 0 ? formatCurrency(numericAmount).replace(' đ', '') : ''}
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor="#CBD5E1"
              keyboardType="numeric"
              maxLength={15}
            />
            <Text
              style={[
                styles.currencySymbol,
                { color: txType === 'expense' ? '#DC2626' : '#059669' },
              ]}
            >
              đ
            </Text>
          </View>

          {/* GỢI Ý MỆNH GIÁ NHANH */}
          <View style={styles.quickAddRow}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleAddAmount(50000)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>+50k</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleAddAmount(100000)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>+100k</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleAddAmount(200000)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>+200k</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleAddAmount(500000)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>+500k</Text>
            </TouchableOpacity>

            {numericAmount > 0 && (
              <TouchableOpacity
                style={[styles.quickChip, styles.clearChip]}
                onPress={() => setRawAmount('')}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color="#DC2626" />
                <Text style={styles.clearChipText}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* LƯỚI CHỌN DANH MỤC */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionTitle}>
              Chọn danh mục {txType === 'expense' ? 'chi' : 'thu'}
            </Text>
            <TouchableOpacity onPress={() => setActiveTab('settings')}>
              <Text style={styles.manageCategoryLink}>+ Thêm danh mục</Text>
            </TouchableOpacity>
          </View>

          {categories.length === 0 ? (
            <Text style={styles.noCategoryText}>
              Chưa có danh mục nào. Hãy vào Cài đặt để thêm danh mục mới.
            </Text>
          ) : (
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const iconName = (cat.icon || 'folder-outline') as any;

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryGridItem,
                      isSelected && {
                        borderColor: cat.color,
                        backgroundColor: `${cat.color}15`,
                      },
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.catIconWrap,
                        { backgroundColor: cat.color },
                        isSelected && styles.catIconWrapSelected,
                      ]}
                    >
                      <Ionicons name={iconName} size={22} color="#FFFFFF" />
                    </View>
                    <Text
                      style={[
                        styles.categoryNameText,
                        isSelected && { color: '#0F172A', fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* CHỌN THỜI GIAN GIAO DỊCH */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thời gian giao dịch</Text>
          <View style={styles.dateSelectorRow}>
            <TouchableOpacity
              style={[
                styles.dateChip,
                dateOption === 'today' && styles.dateChipActive,
              ]}
              onPress={() => setDateOption('today')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="today-outline"
                size={16}
                color={dateOption === 'today' ? '#2563EB' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.dateChipText,
                  dateOption === 'today' && styles.dateChipTextActive,
                ]}
              >
                Hôm nay
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                dateOption === 'yesterday' && styles.dateChipActive,
              ]}
              onPress={() => setDateOption('yesterday')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={dateOption === 'yesterday' ? '#2563EB' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.dateChipText,
                  dateOption === 'yesterday' && styles.dateChipTextActive,
                ]}
              >
                Hôm qua
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                dateOption === 'custom' && styles.dateChipActive,
              ]}
              onPress={() => setDateOption('custom')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={dateOption === 'custom' ? '#2563EB' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.dateChipText,
                  dateOption === 'custom' && styles.dateChipTextActive,
                ]}
              >
                Khác
              </Text>
            </TouchableOpacity>
          </View>

          {/* Ô nhập ngày tùy chỉnh nếu chọn Khác */}
          {dateOption === 'custom' && (
            <View style={styles.customDateInputWrap}>
              <Text style={styles.customDateHint}>Nhập ngày (định dạng YYYY-MM-DD):</Text>
              <TextInput
                style={styles.customDateInput}
                value={customDate}
                onChangeText={setCustomDate}
                placeholder="2026-11-18"
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}
        </View>

        {/* Ô NHẬP GHI CHÚ */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ghi chú (tùy chọn)</Text>
          <View style={styles.noteInputRow}>
            <Ionicons
              name="create-outline"
              size={20}
              color="#94A3B8"
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <TextInput
              style={styles.noteInput}
              placeholder={
                txType === 'expense'
                  ? 'Ví dụ: Ăn trưa phở bò, Mua cà phê...'
                  : 'Ví dụ: Lương tháng, Thưởng dự án...'
              }
              placeholderTextColor="#94A3B8"
              value={note}
              onChangeText={setNote}
              maxLength={100}
            />
          </View>
        </View>

        {/* NÚT LƯU GIAO DỊCH */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: txType === 'expense' ? '#DC2626' : '#059669' },
          ]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>
            Lưu {txType === 'expense' ? 'Khoản Chi' : 'Khoản Thu'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentButtonExpenseActive: {
    backgroundColor: '#DC2626',
  },
  segmentButtonIncomeActive: {
    backgroundColor: '#059669',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  amountInput: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 120,
    padding: 0,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 6,
  },
  quickAddRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    gap: 4,
  },
  clearChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  manageCategoryLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  noCategoryText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryGridItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  catIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catIconWrapSelected: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  categoryNameText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  dateChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  customDateInputWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customDateHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  customDateInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
