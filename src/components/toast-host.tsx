import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeOutUp,
  SlideInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useToastStore, type ToastType } from '@/lib/toast';

import { useColorScheme } from '@/hooks/use-color-scheme';

const ICON: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
  warning: 'alert-circle',
};

const LIGHT_COLORS: Record<ToastType, { accent: string; iconBg: string }> = {
  success: { accent: '#00B86B', iconBg: '#E0F8EA' },
  error: { accent: '#FF453A', iconBg: '#FFEAE9' },
  info: { accent: '#0A7AFF', iconBg: '#EAF3FF' },
  warning: { accent: '#FF9F0A', iconBg: '#FFF5E5' },
};

const DARK_COLORS: Record<ToastType, { accent: string; iconBg: string }> = {
  success: { accent: '#34C759', iconBg: '#1A3320' },
  error: { accent: '#FF453A', iconBg: '#331A1A' },
  info: { accent: '#0A84FF', iconBg: '#1A2433' },
  warning: { accent: '#FF9F0A', iconBg: '#33261A' },
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  const activeScheme = useColorScheme();
  const isDark = activeScheme === 'dark';
  
  if (!current) return null;

  const palette = isDark ? DARK_COLORS[current.type] : LIGHT_COLORS[current.type];
  const bgColor = isDark ? '#1C1C22' : '#FFFFFF';
  const titleColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const msgColor = isDark ? '#A1A1AA' : '#6E6E73';
  const closeColor = isDark ? '#52525B' : '#C7C7CC';

  return (
    <Animated.View
      key={current.id}
      entering={SlideInDown.springify().damping(16).stiffness(200).mass(0.8)}
      exiting={FadeOutUp.duration(150)}
      style={[styles.host, { top: insets.top + 10 }]}
      pointerEvents="box-none"
    >
      <Pressable onPress={dismiss} style={[styles.card, { backgroundColor: bgColor }]}>
        <Animated.View entering={ZoomIn.delay(80).springify()} style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
          <Ionicons name={ICON[current.type]} size={22} color={palette.accent} />
        </Animated.View>
        <View style={styles.textWrap}>
          {!!current.title && <Text style={[styles.title, { color: titleColor }]}>{current.title}</Text>}
          <Text style={[styles.message, { color: msgColor }]} numberOfLines={3}>
            {current.message}
          </Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={closeColor} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10000,
    elevation: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 15,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 3 },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  message: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12.5,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  }
});
