import React from 'react';
import { Image, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { TypewriterText } from '@/components/TypewriterText';
import { SD_TEXT_WHITE, SD_TEXT_BLACK } from '@/constants/splashAssets';

export const SPLASH_TITLE = 'Scoots Delivery Services';
/** ~45ms per character for typewriter */
export const SPLASH_TYPE_MS = SPLASH_TITLE.length * 45;
/** Pause after the full line is visible */
export const SPLASH_HOLD_AFTER_MS = 900;
/** Minimum splash duration = reveal + hold */
export const SPLASH_MIN_MS = SPLASH_TYPE_MS + SPLASH_HOLD_AFTER_MS;

export default function SplashScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const titleColor = isDark ? '#FFFFFF' : '#111111';
  const muted = isDark ? '#A0A0A0' : '#666666';
  const care = isDark ? '#FFFFFF' : '#FF5A00';

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
            <TypewriterText
              text={SPLASH_TITLE}
              color={titleColor}
              charMs={45}
              style={styles.brandTitle}
            />

            <Text style={[styles.portalBadge, { color: '#FF5A00' }]}>Rider Portal</Text>

            <Text style={[styles.tagline, { color: muted }]}>
              Anything, Anytime, Delivered with{' '}
              <Text style={[styles.careHighlight, { color: care }]}>Care</Text>
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
  brandTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 30,
    marginBottom: 8,
  },
  portalBadge: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
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
