import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Transaction } from '../types';

/**
 * Xuất danh sách giao dịch của chu kỳ ra file CSV và kích hoạt chia sẻ
 */
export async function exportTransactionsToCSV(
  transactions: Transaction[],
  cycleLabel: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!transactions || transactions.length === 0) {
      return { success: false, message: 'Chu kỳ này chưa có giao dịch nào để xuất báo cáo.' };
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, message: 'Thiết bị không hỗ trợ tính năng chia sẻ tệp.' };
    }

    // BOM UTF-8 (\uFEFF) giúp Excel trên Windows và Mac đọc chuẩn dấu tiếng Việt
    const BOM = '\uFEFF';
    const header = ['Ngày giao dịch', 'Loại', 'Danh mục', 'Số tiền (VNĐ)', 'Ghi chú'];

    const rows = transactions.map((t) => {
      const dateStr = t.transaction_date.replace('T', ' ');
      const typeStr = t.type === 'income' ? 'Khoản Thu' : 'Khoản Chi';
      const catStr = `"${(t.category_name || 'Khác').replace(/"/g, '""')}"`;
      const amountStr = t.amount.toString();
      const noteStr = `"${(t.note || '').replace(/"/g, '""')}"`;

      return [dateStr, typeStr, catStr, amountStr, noteStr].join(',');
    });

    const csvContent = BOM + [header.join(','), ...rows].join('\r\n');

    // Tạo tên file an toàn không chứa ký tự cấm
    const safeCycleName = cycleLabel.replace(/[\/\\?%*:|"<> ]/g, '_');
    const fileName = `Bao_cao_chi_tieu_${safeCycleName}.csv`;

    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!baseDir) {
      return { success: false, message: 'Không thể truy cập thư mục lưu tệp cục bộ.' };
    }

    const fileUri = `${baseDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: `Xuất báo cáo chi tiêu (${cycleLabel})`,
      UTI: 'public.comma-separated-values-text',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi xuất file CSV:', error);
    return {
      success: false,
      message: error?.message || 'Đã xảy ra lỗi trong quá trình xuất tệp CSV.',
    };
  }
}
