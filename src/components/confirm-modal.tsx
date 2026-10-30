import { useEffect, useState } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  useReducedMotion,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ENTER_MS = 280;
const EXIT_MS = 200;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.4, 0, 1, 1);

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const [contentVisible, setContentVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setContentVisible(true);
      return;
    }
    setContentVisible(false);
    const t = setTimeout(() => setMounted(false), EXIT_MS + 40);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCancel]);

  if (!mounted) return null;

  const enterDialog = reduceMotion
    ? FadeIn.duration(160)
    : ZoomIn.duration(ENTER_MS).easing(easeOut);
  const exitDialog = reduceMotion
    ? FadeOut.duration(140)
    : ZoomOut.duration(EXIT_MS).easing(easeIn);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root} pointerEvents={contentVisible ? 'auto' : 'none'}>
        {contentVisible ? (
          <Animated.View
            key="backdrop"
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(180)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable style={styles.backdrop} onPress={onCancel} accessibilityRole="button" />
          </Animated.View>
        ) : null}

        {contentVisible ? (
          <Animated.View
            key="dialog"
            entering={enterDialog}
            exiting={exitDialog}
            style={[styles.dialog, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: isDestructive ? theme.dangerSoft : theme.backgroundElement },
              ]}
            >
              <Ionicons
                name={isDestructive ? 'warning' : 'information-circle'}
                size={24}
                color={isDestructive ? theme.danger : theme.primary}
              />
            </View>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: theme.background, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={onCancel}
              >
                <ThemedText style={styles.cancelText} numberOfLines={2}>
                  {cancelText}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: isDestructive ? theme.danger : theme.primary,
                    borderColor: 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={onConfirm}
              >
                <ThemedText style={styles.confirmText} numberOfLines={2}>
                  {confirmText}
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dialog: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  btn: {
    flexGrow: 1,
    flexBasis: '40%',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    textAlign: 'center',
  },
  confirmText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
  },
});
