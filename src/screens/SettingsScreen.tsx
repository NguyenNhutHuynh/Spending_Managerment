import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import {
  updateSettings,
  updateReminderSetting,
  getCategories,
  addCategory,
  deleteCategory,
} from '../database/db';
import { Category, TransactionType } from '../types';
import { formatCurrency } from '../utils/dateCycle';
import { scheduleDailyReminder, cancelDailyReminder } from '../utils/notifications';

// Danh sách biểu tượng phổ biến
const POPULAR_ICONS = [
  'fast-food',
  'cafe',
  'restaurant',
  'car',
  'bus',
  'airplane',
  'cart',
  'shirt',
  'medkit',
  'school',
  'fitness',
  'home',
  'receipt',
  'game-controller',
  'film',
  'gift',
  'wallet',
  'cash',
  'card',
  'trending-up',
  'briefcase',
  'heart',
  'construct',
  'paw',
];

// Bảng màu rực rỡ hiện đại
const PALETTE_COLORS = [
  '#FF7043', // Cam san hô
  '#42A5F5', // Xanh lam
  '#AB47BC', // Tím hoa cà
  '#FFA726', // Vàng cam
  '#66BB6A', // Xanh lá
  '#26A69A', // Xanh mòng két
  '#EC407A', // Hồng sen
  '#EF5350', // Đỏ tươi
  '#7E57C2', // Tím sẫm
  '#26C6DA', // Xanh cyan
  '#8D6E63', // Nâu đất
  '#78909C', // Xám xanh
];

export const SettingsScreen: React.FC = () => {
  const { settings, notifyDataChanged, dataVersion } = useApp();

  // Settings state
  const [initialBalanceInput, setInitialBalanceInput] = useState<string>(
    settings.initial_balance.toString()
  );
  const [cycleStartDay, setCycleStartDay] = useState<number>(settings.cycle_start_day);

  // Reminder notification state
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(
    Boolean(settings.reminder_enabled)
  );
  const [isReminderLoading, setIsReminderLoading] = useState<boolean>(false);

  // Categories state
  const [catTab, setCatTab] = useState<TransactionType>('expense');
  const [categories, setCategories] = useState<Category[]>([]);

  // New Category form state
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [selectedIcon, setSelectedIcon] = useState<string>(POPULAR_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE_COLORS[0]);

  useEffect(() => {
    setInitialBalanceInput(settings.initial_balance.toString());
    setCycleStartDay(settings.cycle_start_day);
    setReminderEnabled(Boolean(settings.reminder_enabled));
  }, [settings]);

  // Tải danh sách danh mục
  const loadCategories = () => {
    try {
      const list = getCategories(catTab);
      setCategories(list);
    } catch (e) {
      console.error('Lỗi tải danh mục:', e);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [catTab, dataVersion]);

  // Lưu cài đặt chung (Số dư & Chu kỳ)
  const handleSaveSettings = () => {
    const balanceNum = parseFloat(initialBalanceInput.replace(/[^0-9.-]/g, '')) || 0;
    const day = Math.min(Math.max(1, cycleStartDay), 28);

    try {
      updateSettings(balanceNum, day);
      notifyDataChanged();
      Alert.alert('Thành công', 'Đã lưu cấu hình cài đặt.');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu cài đặt.');
    }
  };

  // Xử lý bật/tắt nhắc nhở hàng ngày lúc 21:00 (chỉ trên Native)
  const handleToggleReminder = async (value: boolean) => {
    if (isReminderLoading) return;
    setIsReminderLoading(true);

    if (value) {
      // Yêu cầu quyền và đặt lịch thông báo hàng ngày lúc 21:00
      const success = await scheduleDailyReminder(21, 0);
      if (success) {
        updateReminderSetting(true);
        setReminderEnabled(true);
        notifyDataChanged();
        Alert.alert(
          'Đã bật nhắc nhở! 🔔',
          'Ứng dụng sẽ gửi thông báo nhắc bạn ghi chép chi tiêu vào lúc 21:00 mỗi tối.'
        );
      } else {
        setReminderEnabled(false);
        Alert.alert(
          'Không thể bật thông báo',
          'Vui lòng cấp quyền thông báo cho ứng dụng trong phần Cài đặt thiết bị để sử dụng tính năng này.'
        );
      }
    } else {
      // Hủy lịch nhắc nhở
      await cancelDailyReminder();
      updateReminderSetting(false);
      setReminderEnabled(false);
      notifyDataChanged();
      Alert.alert('Đã tắt nhắc nhở', 'Đã hủy lịch nhắc nhở ghi chép hàng ngày.');
    }

    setIsReminderLoading(false);
  };

  // Thêm danh mục mới
  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      Alert.alert('Chưa nhập tên', 'Vui lòng nhập tên cho danh mục mới.');
      return;
    }

    try {
      addCategory(newCatName.trim(), newCatType, selectedIcon, selectedColor);
      setNewCatName('');
      notifyDataChanged();
      Alert.alert('Thành công', `Đã thêm danh mục "${newCatName.trim()}".`);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tạo danh mục mới.');
    }
  };

  // Xóa danh mục
  const handleDeleteCategory = (cat: Category) => {
    Alert.alert(
      'Xóa danh mục',
      `Bạn có chắc chắn muốn xóa danh mục "${cat.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            try {
              deleteCategory(cat.id);
              notifyDataChanged();
            } catch (err: any) {
              Alert.alert(
                'Không thể xóa',
                err?.message || 'Danh mục này đã có giao dịch phát sinh, không thể xóa.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      keyboardShouldPersistTaps="handled"
    >
      {/* KHỐI CÀI ĐẶT CHUNG */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="options-outline" size={20} color="#2563EB" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Cài đặt hệ thống & Chu kỳ</Text>
        </View>

        {/* Số dư ban đầu */}
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Số dư ban đầu (VNĐ)</Text>
          <Text style={styles.settingSubLabel}>
            Số tiền bạn có trước khi bắt đầu ghi chép với app
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={initialBalanceInput}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9]/g, '');
                setInitialBalanceInput(clean);
              }}
              placeholder="0"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.currencyBadge}>
              {formatCurrency(parseFloat(initialBalanceInput) || 0)}
            </Text>
          </View>
        </View>

        {/* Ngày bắt đầu chu kỳ tháng */}
        <View style={styles.settingItem}>
          <View style={styles.cycleHeaderRow}>
            <Text style={styles.settingLabel}>Ngày bắt đầu chu kỳ tháng</Text>
            <View style={styles.selectedDayBadge}>
              <Text style={styles.selectedDayText}>Ngày {cycleStartDay}</Text>
            </View>
          </View>
          <Text style={styles.settingSubLabel}>
            Chu kỳ sẽ tính từ ngày {cycleStartDay} tháng này đến ngày{' '}
            {cycleStartDay === 1 ? 'cuối cùng' : cycleStartDay - 1} tháng sau.
          </Text>

          {/* Grid chọn ngày từ 1 đến 28 */}
          <View style={styles.dayGrid}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
              const isSelected = cycleStartDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                  onPress={() => setCycleStartDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveSettingsBtn}
          onPress={handleSaveSettings}
          activeOpacity={0.8}
        >
          <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.saveSettingsBtnText}>Lưu cài đặt</Text>
        </TouchableOpacity>
      </View>

      {/* KHỐI NHẮC NHỞ HÀNG NGÀY (ẨN TRÊN WEB ĐỂ TRÁNH LỖI TRÌNH DUYỆT) */}
      {Platform.OS !== 'web' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="notifications-outline" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Nhắc nhở hàng ngày</Text>
          </View>

          <View style={styles.reminderRow}>
            <View style={styles.reminderTextWrap}>
              <Text style={styles.reminderTitle}>Nhắc nhở ghi chép lúc 21:00</Text>
              <Text style={styles.reminderSubtitle}>
                Gửi thông báo mỗi tối để bạn không quên ghi chép các khoản thu chi trong ngày
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              disabled={isReminderLoading}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={reminderEnabled ? '#2563EB' : '#F1F5F9'}
            />
          </View>
        </View>
      )}

      {/* KHỐI QUẢN LÝ DANH MỤC */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="pricetags-outline" size={20} color="#2563EB" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Quản lý Danh mục Thu / Chi</Text>
        </View>

        {/* Tab xem Khoản Chi / Khoản Thu */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, catTab === 'expense' && styles.tabButtonActiveExpense]}
            onPress={() => {
              setCatTab('expense');
              setNewCatType('expense');
            }}
          >
            <Text
              style={[styles.tabButtonText, catTab === 'expense' && styles.tabButtonTextActive]}
            >
              Danh mục Chi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, catTab === 'income' && styles.tabButtonActiveIncome]}
            onPress={() => {
              setCatTab('income');
              setNewCatType('income');
            }}
          >
            <Text style={[styles.tabButtonText, catTab === 'income' && styles.tabButtonTextActive]}>
              Danh mục Thu
            </Text>
          </TouchableOpacity>
        </View>

        {/* FORM THÊM DANH MỤC MỚI */}
        <View style={styles.addCategoryBox}>
          <Text style={styles.formSectionTitle}>Tạo danh mục mới</Text>

          {/* Tên danh mục */}
          <TextInput
            style={styles.catNameInput}
            placeholder={`Nhập tên danh mục ${newCatType === 'expense' ? 'chi' : 'thu'} mới...`}
            placeholderTextColor="#94A3B8"
            value={newCatName}
            onChangeText={setNewCatName}
            maxLength={30}
          />

          {/* Chọn Icon */}
          <Text style={styles.pickerTitle}>Chọn biểu tượng:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconScrollRow}
          >
            {POPULAR_ICONS.map((icon) => {
              const isSelected = selectedIcon === icon;
              return (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconPickBtn,
                    isSelected && { backgroundColor: selectedColor, borderColor: selectedColor },
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={icon as any}
                    size={20}
                    color={isSelected ? '#FFFFFF' : '#475569'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Chọn Màu sắc */}
          <Text style={styles.pickerTitle}>Chọn màu sắc:</Text>
          <View style={styles.colorPaletteGrid}>
            {PALETTE_COLORS.map((color) => {
              const isSelected = selectedColor === color;
              return (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorCircle, { backgroundColor: color }]}
                  onPress={() => setSelectedColor(color)}
                  activeOpacity={0.8}
                >
                  {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Nút Thêm */}
          <TouchableOpacity
            style={[
              styles.addCatBtn,
              { backgroundColor: newCatType === 'expense' ? '#DC2626' : '#059669' },
            ]}
            onPress={handleAddCategory}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.addCatBtnText}>Thêm danh mục</Text>
          </TouchableOpacity>
        </View>

        {/* DANH SÁCH DANH MỤC HIỆN CÓ */}
        <Text style={[styles.formSectionTitle, { marginTop: 18, marginBottom: 8 }]}>
          Danh sách danh mục hiện có ({categories.length})
        </Text>

        <View style={styles.categoryList}>
          {categories.map((cat) => {
            const iconName = (cat.icon || 'folder-outline') as any;
            return (
              <View key={cat.id} style={styles.categoryRowItem}>
                <View style={[styles.catIconWrap, { backgroundColor: cat.color }]}>
                  <Ionicons name={iconName} size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.catRowName}>{cat.name}</Text>
                <TouchableOpacity
                  style={styles.catDeleteBtn}
                  onPress={() => handleDeleteCategory(cat)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    ...(Platform.OS === 'web'
      ? {
          height: '100%',
        }
      : {}),
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  card: {
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
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingItem: {
    marginBottom: 18,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  settingSubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    padding: 0,
  },
  currencyBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cycleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDayBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  dayButton: {
    width: '12%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  saveSettingsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTextWrap: {
    flex: 1,
    marginRight: 14,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  reminderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActiveExpense: {
    backgroundColor: '#DC2626',
  },
  tabButtonActiveIncome: {
    backgroundColor: '#059669',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  addCategoryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  catNameInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  iconScrollRow: {
    gap: 8,
    paddingBottom: 8,
  },
  iconPickBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
  },
  addCatBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryList: {
    gap: 8,
  },
  categoryRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  catIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catRowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  catDeleteBtn: {
    padding: 6,
  },
});
