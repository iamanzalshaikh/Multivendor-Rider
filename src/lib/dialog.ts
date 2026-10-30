import { create } from 'zustand';

export type DialogVariant = 'info' | 'warning' | 'error' | 'success';

export type AlertDialogState = {
  kind: 'alert';
  title: string;
  message: string;
  buttonText: string;
  variant: DialogVariant;
  onClose?: () => void;
};

export type ConfirmDialogState = {
  kind: 'confirm';
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDestructive: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export type DialogState = AlertDialogState | ConfirmDialogState;

type Store = {
  current: DialogState | null;
  show: (d: DialogState) => void;
  dismiss: () => void;
};

export const useDialogStore = create<Store>((set) => ({
  current: null,
  show: (d) => set({ current: d }),
  dismiss: () => set({ current: null }),
}));

function inferVariant(title: string): DialogVariant {
  const t = title.toLowerCase();
  if (/error|fail|could not|invalid|denied|too late/.test(t)) return 'error';
  if (/success|done|welcome|confirmed|submitted|sent|updated|reminder/.test(t)) return 'success';
  if (/warning|sure|cancel|delete|logout|log out|release|confirm/.test(t)) return 'warning';
  return 'info';
}

/** Drop-in replacement for Alert.alert — uses custom InfoModal / ConfirmModal. */
export const dialog = {
  alert(
    title: string,
    message?: string,
    buttons?: Array<{ text?: string; onPress?: () => void; style?: string }>,
  ) {
    const cancel = buttons?.find((b) => b.style === 'cancel');
    const ok =
      buttons?.find((b) => b.style === 'destructive' || (b.style !== 'cancel' && b !== cancel)) ??
      buttons?.find((b) => b.style !== 'cancel') ??
      buttons?.[0];

    // Multi-button → confirm dialog
    if (buttons && buttons.length >= 2) {
      useDialogStore.getState().show({
        kind: 'confirm',
        title,
        message: message ?? '',
        confirmText: ok?.text ?? 'OK',
        cancelText: cancel?.text ?? 'Cancel',
        isDestructive: ok?.style === 'destructive',
        onConfirm: ok?.onPress,
        onCancel: cancel?.onPress,
      });
      return;
    }

    useDialogStore.getState().show({
      kind: 'alert',
      title,
      message: message ?? '',
      buttonText: ok?.text ?? 'OK',
      variant: inferVariant(title),
      onClose: ok?.onPress,
    });
  },

  confirm(
    title: string,
    message: string,
    opts?: {
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
      onConfirm?: () => void;
      onCancel?: () => void;
    },
  ) {
    useDialogStore.getState().show({
      kind: 'confirm',
      title,
      message,
      confirmText: opts?.confirmText ?? 'Confirm',
      cancelText: opts?.cancelText ?? 'Cancel',
      isDestructive: Boolean(opts?.destructive),
      onConfirm: opts?.onConfirm,
      onCancel: opts?.onCancel,
    });
  },

  error(message: string, title = 'Error') {
    useDialogStore.getState().show({
      kind: 'alert',
      title,
      message,
      buttonText: 'OK',
      variant: 'error',
    });
  },

  success(message: string, title = 'Done') {
    useDialogStore.getState().show({
      kind: 'alert',
      title,
      message,
      buttonText: 'OK',
      variant: 'success',
    });
  },
};
