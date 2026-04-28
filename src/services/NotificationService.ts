/* eslint-disable no-useless-assignment */
/**
 * NotificationService
 * Provides a unified interface for visual system notifications (toast/flash).
 */
import { toast } from 'sonner';

export const notification = {
  success: (message: string) => {
    toast.success(message);
  },
  error: (message: string) => {
    toast.error(message);
  },
  warning: (message: string) => {
    toast.warning(message);
  },
  info: (message: string) => {
    toast.info(message);
  },
  message: (message: string) => {
    toast(message);
  }
};
