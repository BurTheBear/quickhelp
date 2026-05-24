import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography, shadows } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  style,
  fullWidth = false,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const isDisabled = disabled || loading;
  const sizeStyle = sizes[size];
  const variantStyle = variants[variant];

  const content = (
    <View style={[styles.inner, sizeStyle.inner]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white}
        />
      ) : (
        <>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={[styles.label, sizeStyle.label, variantStyle.label]}>{label}</Text>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </>
      )}
    </View>
  );

  if (variant === 'primary' && !isDisabled) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.base, fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyle.container, shadows.colored(colors.primary)]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyle.container,
        variantStyle.container,
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  fullWidth: { alignSelf: 'stretch' },
  gradient: {
    borderRadius: radius.full,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.button,
    textAlign: 'center',
  },
  iconLeft: { marginRight: spacing.sm },
  iconRight: { marginLeft: spacing.sm },
  disabled: { opacity: 0.5 },
});

const sizes = {
  sm: {
    container: { borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    inner: {},
    label: { fontSize: 13 } as { fontSize: number },
  },
  md: {
    container: { borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: spacing.md + 2 },
    inner: {},
    label: {},
  },
  lg: {
    container: { borderRadius: radius.full, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg },
    inner: {},
    label: { fontSize: 17 } as { fontSize: number },
  },
};

const variants: Record<Variant, { container: ViewStyle; label: { color: string } }> = {
  primary: {
    container: { backgroundColor: colors.primary },
    label: { color: colors.white },
  },
  secondary: {
    container: { backgroundColor: colors.secondary },
    label: { color: colors.white },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    label: { color: colors.primary },
  },
  ghost: {
    container: { backgroundColor: colors.primary + '15' },
    label: { color: colors.primary },
  },
  danger: {
    container: { backgroundColor: colors.error },
    label: { color: colors.white },
  },
};
