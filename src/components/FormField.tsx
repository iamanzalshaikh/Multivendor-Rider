import { View, StyleSheet, TextInput, type KeyboardTypeOptions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: Props) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.two },
  label: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
});
