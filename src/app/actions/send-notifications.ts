// src/app/actions/send-notifications.ts
'use server';

import { adminDb, adminMessaging } from '@/lib/firebase-admin';

type SendNotificationPayload = {
  title: string;
  message: string;
};

export async function sendNotificationsToAll(payload: SendNotificationPayload) {
  try {
    const usersSnapshot = await adminDb.collection('users').get();
    const tokens: string[] = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      // Ensure we only collect valid, non-empty tokens
      if (userData.notificationToken) {
        tokens.push(userData.notificationToken);
      }
    });

    if (tokens.length === 0) {
      console.log('No registered device tokens found. No notifications sent.');
      return { success: true, message: 'No registered devices to send notifications to.' };
    }

    // FCM's multicast messaging can send to up to 500 tokens at a time.
    // For larger audiences, you would need to batch these requests.
    const message = {
      notification: {
        title: payload.title,
        body: payload.message,
      },
      tokens: tokens,
    };

    const response = await adminMessaging.sendEachForMulticast(message);
    console.log(`Successfully sent message to ${response.successCount} devices.`);
    if (response.failureCount > 0) {
      console.log(`Failed to send to ${response.failureCount} devices.`);
      // You can log the detailed errors for debugging
      // response.responses.forEach(resp => {
      //   if (!resp.success) {
      //     console.error(resp.error);
      //   }
      // });
    }

    return { success: true, message: `Notification sent to ${response.successCount} of ${tokens.length} devices.` };
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return { success: false, message: 'Failed to send notifications.' };
  }
}
