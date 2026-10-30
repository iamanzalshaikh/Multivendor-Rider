import { useEffect, useState } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import {
  DEFAULT_ETA_MINUTES,
  ETA_MAX_MINUTES,
  ETA_MIN_MINUTES,
  ETA_STEP_MINUTES,
} from '@/constants/deliveryStatus';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  initialMinutes?: number;
  onConfirm: (minutes: number) => void;
  onCancel: () => void;
};

export function EtaPickerModal({
  visible,
  initialMinutes = DEFAULT_ETA_MINUTES,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const [minutes, setMinutes] = useState(initialMinutes);

  useEffect(() => {
    if (visible) {
      setMinutes(initialMinutes || DEFAULT_ETA_MINUTES);
    }
  }, [visible, initialMinutes]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCancel]);

  function bump(delta: number) {
    setMinutes((m) =>
      Math.min(ETA_MAX_MINUTES, Math.max(ETA_MIN_MINUTES, m + delta)),
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="time-outline" size={28} color={theme.primary} />
          </View>
          <ThemedText style={styles.title}>Arrival estimate</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            How many minutes until you reach the customer?
          </ThemedText>

          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => bump(-ETA_STEP_MINUTES)}
              disabled={minutes <= ETA_MIN_MINUTES}
              style={[
                styles.stepBtn,
                {
                  backgroundColor: theme.primarySoft,
                  borderColor: theme.primary,
                  opacity: minutes <= ETA_MIN_MINUTES ? 0.4 : 1,
                },
              ]}
              hitSlop={8}
            >
              <Ionicons name="remove" size={28} color={theme.primary} />
            </Pressable>

            <View style={styles.valueCol}>
              <ThemedText style={[styles.value, { color: theme.primary }]}>
                {minutes}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.unit}>
                minutes
              </ThemedText>
            </View>

            <Pressable
              onPress={() => bump(ETA_STEP_MINUTES)}
              disabled={minutes >= ETA_MAX_MINUTES}
              style={[
                styles.stepBtn,
                {
                  backgroundColor: theme.primarySoft,
                  borderColor: theme.primary,
                  opacity: minutes >= ETA_MAX_MINUTES ? 0.4 : 1,
                },
              ]}
              hitSlop={8}
            >
              <Ionicons name="add" size={28} color={theme.primary} />
            </Pressable>
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Adjust by {ETA_STEP_MINUTES} minutes · default {DEFAULT_ETA_MINUTES} mins
          </ThemedText>

          <Pressable
            onPress={() => onConfirm(minutes)}
            style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.confirmText}>Confirm · {minutes} mins</ThemedText>
          </Pressable>
          <Pressable onPress={onCancel} style={styles.cancelBtn}>
            <ThemedText type="small" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: Spacing.four,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    marginBottom: Spacing.one,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.two,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueCol: { alignItems: 'center', minWidth: 88 },
  value: {
    fontSize: 48,
    fontFamily: Fonts.extraBold,
    lineHeight: 56,
  },
  unit: {
    marginTop: -4,
    fontFamily: Fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hint: {
    marginBottom: Spacing.four,
    textAlign: 'center',
  },
  confirmBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
