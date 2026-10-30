import { useCallback } from 'react';

import { ConfirmModal } from '@/components/confirm-modal';
import { InfoModal } from '@/components/info-modal';
import { useDialogStore } from '@/lib/dialog';

/** Global host for custom alert / confirm popups (replaces Alert.alert). */
export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  const dismiss = useDialogStore((s) => s.dismiss);

  const onAlertClose = useCallback(() => {
    const cb = current?.kind === 'alert' ? current.onClose : undefined;
    dismiss();
    cb?.();
  }, [current, dismiss]);

  const onConfirm = useCallback(() => {
    const cb = current?.kind === 'confirm' ? current.onConfirm : undefined;
    dismiss();
    cb?.();
  }, [current, dismiss]);

  const onCancel = useCallback(() => {
    const cb = current?.kind === 'confirm' ? current.onCancel : undefined;
    dismiss();
    cb?.();
  }, [current, dismiss]);

  if (!current) return null;

  if (current.kind === 'alert') {
    return (
      <InfoModal
        visible
        title={current.title}
        message={current.message}
        buttonText={current.buttonText}
        variant={current.variant}
        onClose={onAlertClose}
      />
    );
  }

  return (
    <ConfirmModal
      visible
      title={current.title}
      message={current.message}
      confirmText={current.confirmText}
      cancelText={current.cancelText}
      isDestructive={current.isDestructive}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
