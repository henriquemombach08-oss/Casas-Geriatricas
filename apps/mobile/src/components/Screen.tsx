import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StatusBar,
} from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  title?: string;
}

export function Screen({ children, style, title }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
