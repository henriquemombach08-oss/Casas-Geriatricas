import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '@/theme';

type BadgeColor = 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple' | 'orange';

interface BadgeProps {
  label: string;
  color?: BadgeColor;
}

const colorMap: Record<BadgeColor, { bg: string; text: string }> = {
  blue: { bg: colors.primaryLight, text: colors.primary },
  green: { bg: colors.secondaryLight, text: colors.secondaryDark },
  red: { bg: colors.dangerLight, text: colors.dangerDark },
  yellow: { bg: colors.warningLight, text: colors.warningDark },
  gray: { bg: colors.gray100, text: colors.gray600 },
  purple: { bg: colors.purpleLight, text: colors.purple },
  orange: { bg: colors.orangeLight, text: colors.orange },
};

export function Badge({ label, color = 'gray' }: BadgeProps) {
  const scheme = colorMap[color];
  return (
    <View style={[styles.badge, { backgroundColor: scheme.bg }]}>
      <Text style={[styles.label, { color: scheme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
