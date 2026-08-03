import { memo, useEffect, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Layout } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export const SkeletonBlock = memo(function SkeletonBlock({
  width = '100%',
  height = 16,
  radius = 12,
  style,
}: Props) {
  const theme = useTheme();
  const [blockWidth, setBlockWidth] = useState(typeof width === 'number' ? width : 0);
  const sweep = useSharedValue(-1);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [sweep]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.value * blockWidth }],
  }));

  return (
    <View
      style={[
        {
          backgroundColor: theme.backgroundSelected,
          width: width as number | `${number}%`,
          height,
          borderRadius: radius,
          overflow: 'hidden',
        },
        style,
      ]}
      onLayout={(e) => setBlockWidth(e.nativeEvent.layout.width)}
    >
      {blockWidth > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, anim]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
});

export function RiderHomeSkeleton() {
  return (
    <View style={styles.pad}>
      <SkeletonBlock width="100%" height={88} radius={16} />
      <SkeletonBlock width="100%" height={140} radius={18} style={{ marginTop: Spacing.three }} />
      <View style={styles.statGrid}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} width="48%" height={92} radius={14} />
        ))}
      </View>
      <SkeletonBlock width="40%" height={16} style={{ marginTop: Spacing.four }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.row}>
          <SkeletonBlock width={40} height={40} radius={12} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock width="55%" height={13} />
            <SkeletonBlock width="35%" height={11} />
          </View>
          <SkeletonBlock width={56} height={14} />
        </View>
      ))}
    </View>
  );
}

export function RiderJobsSkeleton() {
  return (
    <View style={styles.pad}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.jobCard}>
          <View style={styles.row}>
            <SkeletonBlock width={48} height={48} radius={12} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBlock width="60%" height={14} />
              <SkeletonBlock width="40%" height={12} />
            </View>
            <SkeletonBlock width={64} height={18} />
          </View>
          <SkeletonBlock width="100%" height={44} radius={12} style={{ marginTop: 14 }} />
        </View>
      ))}
    </View>
  );
}

export function RiderTripSkeleton() {
  return (
    <View style={styles.pad}>
      <SkeletonBlock width="100%" height={180} radius={18} />
      <SkeletonBlock width="100%" height={72} radius={14} style={{ marginTop: Spacing.three }} />
      <SkeletonBlock width="100%" height={52} radius={14} style={{ marginTop: Spacing.two }} />
      <SkeletonBlock width="100%" height={52} radius={14} style={{ marginTop: Spacing.two }} />
    </View>
  );
}

export function RiderEarningsSkeleton() {
  return (
    <View style={styles.pad}>
      <SkeletonBlock width="100%" height={150} radius={18} />
      <View style={styles.statGrid}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} width="48%" height={88} radius={14} />
        ))}
      </View>
      <SkeletonBlock width="45%" height={16} style={{ marginTop: Spacing.four }} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.row}>
          <SkeletonBlock width={40} height={40} radius={12} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock width="50%" height={13} />
            <SkeletonBlock width="30%" height={11} />
          </View>
          <SkeletonBlock width={52} height={14} />
        </View>
      ))}
    </View>
  );
}

export function RiderProfileSkeleton() {
  return (
    <View style={styles.pad}>
      <View style={{ alignItems: 'center', gap: 10, marginBottom: Spacing.four }}>
        <SkeletonBlock width={84} height={84} radius={42} />
        <SkeletonBlock width="40%" height={16} />
        <SkeletonBlock width="28%" height={12} />
      </View>
      {[0, 1, 2, 3, 4].map((i) => (
        <SkeletonBlock key={i} width="100%" height={56} radius={14} style={{ marginTop: 10 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing.three,
  },
  jobCard: {
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
  },
});
