import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export default function CalendarScreen() {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.colors.background }]}>
      <Text style={[s.title, { color: theme.colors.accent, fontFamily: theme.fonts.heading }]}>
        Calendar
      </Text>
      <Text style={[s.sub, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
        Monthly view coming soon.
      </Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 34,
    marginBottom: 12,
  },
  sub: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.8,
  },
});