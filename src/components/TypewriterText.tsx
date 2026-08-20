import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  text: string;
  style?: object;
  /** ms per character */
  charMs?: number;
  color: string;
  cursorColor?: string;
};

/**
 * Typewriter reveal for splash brand line.
 * Keeps a blinking caret while typing, then a short pause with caret still blinking.
 */
export function TypewriterText({
  text,
  style,
  charMs = 45,
  color,
  cursorColor = '#FF5A00',
}: Props) {
  const [visibleCount, setVisibleCount] = useState(0);
  const caretOpacity = useSharedValue(1);

  useEffect(() => {
    setVisibleCount(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= text.length) clearInterval(id);
    }, charMs);
    return () => clearInterval(id);
  }, [text, charMs]);

  useEffect(() => {
    caretOpacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 420 }), withTiming(1, { duration: 420 })),
      -1,
      false,
    );
  }, [caretOpacity]);

  const caretStyle = useAnimatedStyle(() => ({
    opacity: caretOpacity.value,
  }));

  const done = visibleCount >= text.length;

  return (
    <View style={styles.row}>
      <Text style={[style, { color }]}>{text.slice(0, visibleCount)}</Text>
      <Animated.View
        style={[
          styles.caret,
          { backgroundColor: cursorColor },
          caretStyle,
          done ? styles.caretDone : null,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '100%',
  },
  caret: {
    width: 2.5,
    height: 22,
    marginLeft: 2,
    borderRadius: 1,
  },
  caretDone: {
    // Keep caret briefly after typing finishes — splash hold covers dismiss
  },
});
