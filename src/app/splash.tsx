import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SD_TEXT_WHITE, SD_TEXT_BLACK } from '@/constants/splashAssets';

export const SPLASH_TITLE = 'Scoots Delivery Services';
/** Smooth left-to-right reveal for the brand line */
export const SPLASH_TYPE_MS = 1200;
/** Pause after the full line is visible */
export const SPLASH_HOLD_AFTER_MS = 500;
/** Minimum splash duration = reveal + hold */
export const SPLASH_MIN_MS = SPLASH_TYPE_MS + SPLASH_HOLD_AFTER_MS;

export default function SplashScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [lineWidth, setLineWidth] = useState(0);
  const revealWidth = useSharedValue(0);
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (lineWidth <= 0) return;
    revealWidth.value = 0;
    revealWidth.value = withTiming(lineWidth, {
      duration: SPLASH_TYPE_MS,
      easing: Easing.out(Easing.cubic),
    });
    cursorOpacity.value = withRepeat(
      withTiming(0.2, { duration: 450, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [cursorOpacity, lineWidth, revealWidth]);

  const clipStyle = useAnimatedStyle(() => ({
    width: Math.max(revealWidth.value, 0),
  }));

  const cursorStyle = useAnimatedStyle(() => {
    const done = lineWidth > 0 && revealWidth.value >= lineWidth - 0.5;
    return {
      opacity: done ? 0 : cursorOpacity.value,
      left: revealWidth.value,
    };
  });

  const titleColor = isDark ? '#FFFFFF' : '#111111';

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
      <SafeAreaView style={styles.safe}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.topHeader}>
          <Animated.View entering={ZoomIn.delay(60).duration(380)} style={styles.logoWrap}>
            <Image
              source={isDark ? SD_TEXT_WHITE : SD_TEXT_BLACK}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View entering={FadeIn.delay(100).duration(360)} style={styles.glowStreak} />

          <Animated.View entering={FadeInDown.delay(140).duration(360)} style={styles.textWrap}>
            {lineWidth <= 0 ? (
              <Text
                style={[styles.brandTitle, styles.measure, { color: titleColor }]}
                onLayout={(e) => setLineWidth(Math.ceil(e.nativeEvent.layout.width))}
              >
                {SPLASH_TITLE}
              </Text>
            ) : (
              <View style={[styles.revealBox, { width: lineWidth }]}>
                <Animated.View style={[styles.clip, clipStyle]}>
                  <Text style={[styles.brandTitle, { color: titleColor, width: lineWidth }]}>
                    {SPLASH_TITLE}
                  </Text>
                </Animated.View>
                <Animated.Text style={[styles.cursor, cursorStyle]}>|</Animated.Text>
              </View>
            )}

            <Text style={[styles.portalBadge, { color: isDark ? '#FF5A00' : '#FF5A00' }]}>
              Rider Portal
            </Text>

            <Text style={[styles.tagline, { color: isDark ? '#A0A0A0' : '#666666' }]}>
              Anything, Anytime, Delivered with{' '}
              <Text style={[styles.careHighlight, { color: isDark ? '#FFFFFF' : '#FF5A00' }]}>
                Care
              </Text>
            </Text>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  topHeader: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  logoWrap: {
    width: 240,
    height: 120,
    marginBottom: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  glowStreak: {
    width: 180,
    height: 3,
    backgroundColor: '#FF5A00',
    borderRadius: 2,
    shadowColor: '#FF5A00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 20,
  },
  textWrap: {
    alignItems: 'center',
    width: '100%',
  },
  measure: {
    marginBottom: 8,
    opacity: 0,
  },
  revealBox: {
    height: 32,
    marginBottom: 8,
    overflow: 'visible',
    position: 'relative',
  },
  clip: {
    height: 32,
    overflow: 'hidden',
  },
  brandTitle: {
    fontSize: 23,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'left',
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  cursor: {
    position: 'absolute',
    top: 0,
    color: '#FF5A00',
    fontSize: 23,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    lineHeight: 32,
  },
  portalBadge: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  careHighlight: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
});
