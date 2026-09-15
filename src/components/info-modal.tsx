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

interface InfoModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'info' | 'warning' | 'error' | 'success';
  onClose: () => void;
}

const ENTER_MS = 280;
const EXIT_MS = 200;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.4, 0, 1, 1);

export function InfoModal({
  visible,
  title,
  message,
  buttonText = 'OK',
  variant = 'info',
  onClose,
}: InfoModalProps) {
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
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted) return null;

  const iconName =
    variant === 'error'
      ? 'close-circle'
      : variant === 'warning'
        ? 'warning'
        : variant === 'success'
          ? 'checkmark-circle'
          : 'information-circle';
  const iconColor =
    variant === 'error'
      ? theme.danger
      : variant === 'warning'
        ? theme.primary
        : variant === 'success'
          ? theme.partner
          : theme.primary;
  const iconBg =
    variant === 'error'
      ? theme.dangerSoft
      : variant === 'warning'
        ? theme.primarySoft
        : variant === 'success'
          ? theme.partnerSoft
          : theme.backgroundElement;

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
      onRequestClose={onClose}
    >
      <View style={styles.root} pointerEvents={contentVisible ? 'auto' : 'none'}>
        {contentVisible ? (
          <Animated.View
            key="backdrop"
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(180)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
          </Animated.View>
        ) : null}

        {contentVisible ? (
          <Animated.View
            key="dialog"
            entering={enterDialog}
            exiting={exitDialog}
            style={[styles.dialog, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name={iconName} size={24} color={iconColor} />
            </View>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={onClose}
            >
              <ThemedText style={styles.buttonText}>{buttonText}</ThemedText>
            </Pressable>
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
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
