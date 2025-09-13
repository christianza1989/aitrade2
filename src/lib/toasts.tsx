import toast from 'react-hot-toast';
import { CustomToast } from '@/components/ui/CustomToast';
import { USER_MESSAGES, getUserMessage } from './messages';

export function showSuccessToast(messageKey: keyof typeof USER_MESSAGES) {
  const message = getUserMessage(messageKey);
  toast.custom(
    <CustomToast
      variant="success"
      title="Sėkmė!"
      description={message}
    />,
    { duration: 4000 }
  );
}

export function showErrorToast(messageOrKey: keyof typeof USER_MESSAGES | string) {
  const message = typeof messageOrKey === 'string' && messageOrKey in USER_MESSAGES
    ? getUserMessage(messageOrKey as keyof typeof USER_MESSAGES)
    : messageOrKey;
  toast.custom(
    <CustomToast
      variant="destructive"
      title="Klaida"
      description={message}
    />,
    { duration: 5000 }
  );
}

export function showWarningToast(messageKey: keyof typeof USER_MESSAGES) {
  const message = getUserMessage(messageKey);
  toast.custom(
    <CustomToast
      variant="warning"
      title="Dėmesio"
      description={message}
    />,
    { duration: 4500 }
  );
}

export function showInfoToast(messageKey: keyof typeof USER_MESSAGES) {
  const message = getUserMessage(messageKey);
  toast.custom(
    <CustomToast
      variant="info"
      title="Informacija"
      description={message}
    />,
    { duration: 4000 }
  );
}

export function showLoadingToast(message: string) {
  return toast.loading(message);
}

// Helper function to dismiss loading toast
export function dismissToast(toastId: string) {
  toast.dismiss(toastId);
}
