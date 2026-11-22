import { Platform } from 'react-native';

const REMINDER_CHANNEL_ID = 'daily-spending-reminder';

// Thiết lập cách hiển thị thông báo khi ứng dụng đang mở (chỉ gọi trên Native)
if (Platform.OS !== 'web') {
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('Lỗi cấu hình notification handler:', e);
  }
}

/**
 * Đảm bảo Notification Channel tồn tại trên Android
 */
async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const Notifications = require('expo-notifications');
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Nhắc nhở ghi chép chi tiêu',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
      });
    } catch (e) {
      console.warn('Lỗi tạo notification channel:', e);
    }
  }
}

/**
 * Xin quyền thông báo từ người dùng
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }

  try {
    const Notifications = require('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Lỗi khi xin quyền thông báo:', error);
    return false;
  }
}

/**
 * Đặt lịch thông báo nhắc nhở ghi chép lúc 21:00 hàng ngày
 */
export async function scheduleDailyReminder(
  hour: number = 21,
  minute: number = 0
): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Trên Web PWA, lưu trạng thái kích hoạt
    const hasPermission = await requestNotificationPermission();
    return hasPermission;
  }

  try {
    const Notifications = require('expo-notifications');
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return false;
    }

    await ensureNotificationChannel();

    // Hủy các thông báo nhắc nhở cũ trước khi lên lịch mới để tránh trùng lặp
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Lên lịch lặp lại hàng ngày vào lúc 21:00
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Đã đến giờ ghi chép chi tiêu! 📝',
        body: 'Dành 1 phút ghi lại các khoản chi tiêu hôm nay để kiểm soát tài chính tốt hơn nhé!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: REMINDER_CHANNEL_ID,
      },
    });

    return true;
  } catch (error) {
    console.error('Lỗi khi đặt lịch thông báo hàng ngày:', error);
    return false;
  }
}

/**
 * Hủy tất cả thông báo nhắc nhở đã đặt lịch
 */
export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Lỗi khi hủy thông báo:', error);
  }
}
