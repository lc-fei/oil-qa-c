import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

interface AppButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
}

export function AppButton({ children, variant = 'primary', disabled = false, loading = false, onPress }: AppButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.ghost,
        variant === 'danger' && styles.danger,
        (pressed || disabled || loading) && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator color={isPrimary ? '#ffffff' : colors.accent} /> : null}
      <Text style={[styles.text, isPrimary ? styles.primaryText : styles.ghostText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  danger: {
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
  },
  pressed: {
    opacity: 0.72,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryText: {
    color: '#ffffff',
  },
  ghostText: {
    color: colors.text,
  },
});
