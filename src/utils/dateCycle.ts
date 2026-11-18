import { MonthCycle } from '../types';

/**
 * Format số tiền sang định dạng tiền tệ VNĐ
 * Ví dụ: 1500000 -> "1.500.000 đ"
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '0 đ';
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted} đ`;
}

/**
 * Chuyển đổi Date thành chuỗi 'YYYY-MM-DDTHH:mm:ss' theo giờ địa phương
 */
export function formatLocalISODateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Lấy chuỗi 'YYYY-MM-DD' từ Date
 */
export function formatLocalDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format ngày hiển thị thân thiện tiếng Việt
 */
export function formatDateDisplay(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString.replace(' ', 'T'));
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const today = formatLocalDateOnly(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatLocalDateOnly(yesterdayDate);

  const targetDateOnly = formatLocalDateOnly(date);

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (targetDateOnly === today) {
    return `Hôm nay, ${timeStr}`;
  }
  if (targetDateOnly === yesterday) {
    return `Hôm qua, ${timeStr}`;
  }

  if (year === now.getFullYear()) {
    return `${day}/${month} Lúc ${timeStr}`;
  }

  return `${day}/${month}/${year} Lúc ${timeStr}`;
}

/**
 * Tính toán chu kỳ tháng dựa trên ngày bắt đầu chu kỳ và offset tháng
 * @param cycleStartDay Ngày bắt đầu chu kỳ (1 - 28)
 * @param offsetMonths Độ lệch tháng (0: hiện tại, -1: kỳ trước, 1: kỳ sau)
 * @param referenceDate Ngày mốc (mặc định là hiện tại)
 */
export function calculateCycle(
  cycleStartDay: number,
  offsetMonths: number = 0,
  referenceDate: Date = new Date()
): MonthCycle {
  // Đảm bảo cycleStartDay nằm trong khoảng 1 đến 28
  const validStartDay = Math.min(Math.max(1, Math.floor(cycleStartDay || 1)), 28);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  // Xác định tháng bắt đầu của chu kỳ cơ sở
  let baseStartYear = refYear;
  let baseStartMonth = refMonth;

  if (refDay < validStartDay) {
    // Nếu ngày hiện tại trước ngày bắt đầu chu kỳ -> chu kỳ hiện tại bắt đầu từ tháng trước
    baseStartMonth -= 1;
  }

  // Áp dụng offsetMonths
  const targetStartMonth = baseStartMonth + offsetMonths;

  // Ngày bắt đầu chu kỳ
  const startDate = new Date(baseStartYear, targetStartMonth, validStartDay, 0, 0, 0, 0);

  // Ngày kết thúc chu kỳ: Ngày trước ngày validStartDay của tháng tiếp theo
  // Nếu validStartDay = 1 thì validStartDay - 1 = 0 (ngày cuối cùng của tháng này)
  const endDate = new Date(
    baseStartYear,
    targetStartMonth + 1,
    validStartDay - 1,
    23,
    59,
    59,
    999
  );

  const startDayStr = String(startDate.getDate()).padStart(2, '0');
  const startMonthStr = String(startDate.getMonth() + 1).padStart(2, '0');
  const startYearStr = startDate.getFullYear();

  const endDayStr = String(endDate.getDate()).padStart(2, '0');
  const endMonthStr = String(endDate.getMonth() + 1).padStart(2, '0');
  const endYearStr = endDate.getFullYear();

  let label: string;
  if (startYearStr === endYearStr) {
    label = `${startDayStr}/${startMonthStr} - ${endDayStr}/${endMonthStr}/${endYearStr}`;
  } else {
    label = `${startDayStr}/${startMonthStr}/${startYearStr} - ${endDayStr}/${endMonthStr}/${endYearStr}`;
  }

  // Kiểm tra xem có phải chu kỳ hiện tại không
  const now = referenceDate.getTime();
  const isCurrentCycle = now >= startDate.getTime() && now <= endDate.getTime();

  return {
    startDate,
    endDate,
    startISO: formatLocalISODateTime(startDate),
    endISO: formatLocalISODateTime(endDate),
    label,
    isCurrentCycle,
  };
}
