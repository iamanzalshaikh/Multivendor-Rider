import { Fragment, useEffect, useRef } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DELIVERY_FLOW_STEPS, stepIndexForStatus } from '@/constants/deliveryStatus';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  status: string;
  compact?: boolean;
};

const STEP_WIDTH = 72;
const CONNECTOR_WIDTH = 16;

export function DeliveryProgressBar({ status, compact }: Props) {
  const theme = useTheme();
  const current = stepIndexForStatus(status);
  const isPreview = status === 'READY_FOR_PICKUP';
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isPreview || current < 0) return;
    // Center the active step in the visible window.
    const x = Math.max(0, current * (STEP_WIDTH + CONNECTOR_WIDTH) - STEP_WIDTH);
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x, animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [current, isPreview]);

  if (isPreview) {
    return (
      <View style={[styles.previewBar, { backgroundColor: theme.primarySoft }]}>
        <ThemedText style={[styles.previewText, { color: theme.primary }]}>
          New delivery — accept to start
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}
      style={styles.wrap}
    >
      {DELIVERY_FLOW_STEPS.map((step, idx) => {
        const done = current > idx;
        const active = current === idx;
        const isLast = idx === DELIVERY_FLOW_STEPS.length - 1;
        return (
          <Fragment key={step.status}>
            <View style={[styles.dotCol, { width: STEP_WIDTH }]}>
              <View
                style={[
                  styles.dot,
                  active && styles.dotActive,
                  {
                    backgroundColor: done || active ? theme.primary : theme.backgroundElement,
                    borderColor: done || active ? theme.primary : theme.border,
                  },
                ]}
              />
              {!compact ? (
                <ThemedText
                  numberOfLines={2}
                  style={[
                    styles.label,
                    {
                      color: active ? theme.primary : done ? theme.text : theme.textSecondary,
                      fontFamily: active ? Fonts.bold : Fonts.medium,
                    },
                  ]}
                >
                  {step.shortLabel}
                </ThemedText>
              ) : null}
            </View>
            {!isLast ? (
              <View
                style={[
                  styles.connector,
                  {
                    width: CONNECTOR_WIDTH,
                    backgroundColor: done ? theme.primary : theme.border,
                  },
                ]}
              />
            ) : null}
          </Fragment>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  dotCol: {
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  dotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  connector: {
    height: 2,
    marginTop: 5,
    flexShrink: 0,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  previewBar: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
