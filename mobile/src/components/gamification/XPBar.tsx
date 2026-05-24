import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';

interface Props {
  level: number;
  levelName: string;
  currentXp: number;
  nextLevelXp: number;
  totalXp: number;
  compact?: boolean;
}

export const XPBar: React.FC<Props> = ({
  level,
  levelName,
  currentXp,
  nextLevelXp,
  totalXp,
  compact = false,
}) => {
  const progress = Math.min(currentXp / Math.max(nextLevelXp, 1), 1);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: progress,
      useNativeDriver: false,
      tension: 60,
      friction: 8,
    }).start();
  }, [progress]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactLevelBadge}>
          <Text style={styles.compactLevel}>{level}</Text>
        </View>
        <View style={styles.compactBarContainer}>
          <View style={styles.compactBar}>
            <Animated.View
              style={[
                styles.compactFill,
                {
                  width: animatedWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.compactXP}>{currentXp}/{nextLevelXp} XP</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelSection}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>{level}</Text>
          </View>
          <View>
            <Text style={styles.levelName}>{levelName}</Text>
            <Text style={styles.totalXP}>{totalXp.toLocaleString()} total XP</Text>
          </View>
        </View>
        <Text style={styles.xpProgress}>
          {currentXp} / {nextLevelXp} XP
        </Text>
      </View>

      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
        {/* Shimmer overlay */}
        <View style={styles.barShimmer} />
      </View>

      <Text style={styles.nextLevel}>
        {nextLevelXp - currentXp} XP until next level
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  levelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  levelName: {
    ...typography.label,
    color: colors.gray800,
  },
  totalXP: {
    ...typography.caption,
    color: colors.gray400,
    marginTop: 2,
  },
  xpProgress: {
    ...typography.label,
    color: colors.primary,
  },
  barTrack: {
    height: 12,
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  barShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  nextLevel: {
    ...typography.caption,
    color: colors.gray400,
    textAlign: 'right',
  },

  // Compact
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactLevelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactLevel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  compactBarContainer: {
    flex: 1,
    gap: spacing.xxs,
  },
  compactBar: {
    height: 6,
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  compactFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  compactXP: {
    ...typography.caption,
    color: colors.gray400,
  },
});
