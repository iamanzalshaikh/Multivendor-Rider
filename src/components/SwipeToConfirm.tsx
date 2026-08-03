import { useCallback, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const THUMB = 52;
const TRACK_H = 56;

type Props = {
  label: string;
  disabled?: boolean;
  busy?: boolean;
  onConfirm: () => void;
};

/** Swipe-to-confirm control for rider delivery steps. */
export function SwipeToConfirm({ label, disabled, busy, onConfirm }: Props) {
  const theme = useTheme();
  const width = useSharedValue(0);
  const dragX = useSharedValue(0);
  const confirmed = useSharedValue(false);

  const reset = useCallback(() => {
    dragX.value = withSpring(0, { damping: 18, stiffness: 180 });
    confirmed.value = false;
  }, [confirmed, dragX]);

  useEffect(() => {
    if (!busy) reset();
  }, [busy, reset]);

  const fireConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const pan = Gesture.Pan()
    .enabled(!disabled && !busy)
    .onUpdate((e) => {
      const max = Math.max(0, width.value - THUMB - 8);
      dragX.value = Math.min(Math.max(0, e.translationX), max);
    })
    .onEnd(() => {
      const max = Math.max(0, width.value - THUMB - 8);
      if (max > 0 && dragX.value >= max * 0.82 && !confirmed.value) {
        confirmed.value = true;
        dragX.value = withSpring(max, { damping: 16, stiffness: 200 });
        runOnJS(fireConfirm)();
      } else {
        dragX.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => {
    const max = Math.max(1, width.value - THUMB - 8);
    return {
      width: dragX.value + THUMB,
      opacity: interpolate(dragX.value, [0, max], [0.35, 1]),
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const max = Math.max(1, width.value - THUMB - 8);
    return {
      opacity: interpolate(dragX.value, [0, max * 0.55], [1, 0]),
    };
  });

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: theme.backgroundSelected,
          borderColor: theme.border,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width;
      }}>
      <Animated.View
        style={[styles.fill, { backgroundColor: theme.primary }, fillStyle]}
      />
      <Animated.View style={[styles.labelWrap, labelStyle]} pointerEvents="none">
        <ThemedText style={[styles.label, { color: theme.text }]} numberOfLines={1}>
          {busy ? 'Updating…' : `Swipe · ${label}`}
        </ThemedText>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: theme.primary },
            thumbStyle,
          ]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_H / 2,
  },
  labelWrap: {
    position: 'absolute',
    left: THUMB + 10,
    right: 12,
    top: 0,
    bottom: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.extraBold,
    textAlign: 'left',
  },
  thumb: {
    position: 'absolute',
    left: 4,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
