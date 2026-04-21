import * as Notifications from 'expo-notifications';

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledFor: Date;
}

/**
 * Requests notification permissions from the OS.
 * Returns true if permissions were granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedules a local notification for an IATF protocol stage.
 * @returns The notification identifier string (use for cancellation).
 */
export async function scheduleIATFNotification(params: {
  etapaId: string;
  title: string;
  body: string;
  scheduledDate: Date;
}): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: { etapaId: params.etapaId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.scheduledDate,
    },
  });
  return identifier;
}

/**
 * Cancels a previously scheduled notification by its identifier.
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancels all pending scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
