import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

type NotificationType = 'booking_assigned' | 'booking_updated' | 'booking_cancelled' | 'schedule_change' | 'general';

interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string;
}

export async function createNotification({
  recipientId,
  type,
  title,
  message,
  bookingId,
}: CreateNotificationParams): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      recipientId,
      type,
      title,
      message,
      bookingId: bookingId || null,
      read: false,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function notifyBookingAssigned(
  employeeId: string,
  employeeName: string,
  clientName: string,
  serviceType: string,
  scheduledDate: string,
  scheduledTime: string,
  bookingId: string
) {
  return createNotification({
    recipientId: employeeId,
    type: 'booking_assigned',
    title: 'New Job Assigned',
    message: `You've been assigned a ${serviceType} detail for ${clientName} on ${scheduledDate} at ${scheduledTime}`,
    bookingId,
  });
}

export async function notifyBookingUpdated(
  employeeId: string,
  clientName: string,
  changeDescription: string,
  bookingId: string
) {
  return createNotification({
    recipientId: employeeId,
    type: 'booking_updated',
    title: 'Booking Updated',
    message: `${clientName}'s booking has been updated: ${changeDescription}`,
    bookingId,
  });
}

export async function notifyBookingCancelled(
  employeeId: string,
  clientName: string,
  scheduledDate: string,
  bookingId: string
) {
  return createNotification({
    recipientId: employeeId,
    type: 'booking_cancelled',
    title: 'Booking Cancelled',
    message: `${clientName}'s booking on ${scheduledDate} has been cancelled`,
    bookingId,
  });
}
