import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  children: ReactNode;
  height?: number;
  fullScreen?: boolean;
};

type State = { hasError: boolean };

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={[
            styles.fallback,
            this.props.fullScreen ? styles.fullScreen : this.props.height ? { height: this.props.height } : undefined,
          ]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
            Map unavailable. Rebuild with npx expo run:android for Google Maps.
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={this.props.fullScreen ? styles.fullScreen : this.props.height ? { height: this.props.height } : styles.embedded}>
        {this.props.children}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, width: '100%' },
  embedded: { width: '100%', minHeight: 200 },
  fallback: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,90,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    minHeight: 200,
  },
  text: { textAlign: 'center', lineHeight: 18 },
});
