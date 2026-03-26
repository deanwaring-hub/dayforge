// src/screens/NotificationsScreen.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

type Props = { onClose?: () => void };

export default function NotificationsScreen({ onClose }: Props) {
  const { theme } = useTheme();
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [fixedEnabled, setFixedEnabled] = useState(true);
  const [flexibleEnabled, setFlexibleEnabled] = useState(true);
  const [optionalEnabled, setOptionalEnabled] = useState(false);
  const [dailySummary, setDailySummary] = useState(true);

  return (
    <SafeAreaView style={[n.screen, { backgroundColor: theme.colors.background }]}>
      <View style={[n.header, { borderBottomColor: theme.colors.border }]}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={n.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[n.closeBtnText, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>✕</Text>
          </TouchableOpacity>
        )}
        <Text style={[n.title, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>Notifications</Text>
        <View style={{ minWidth: 44 }} />
      </View>

      <ScrollView contentContainerStyle={n.scroll} showsVerticalScrollIndicator={false}>
        <View style={[n.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={n.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[n.switchLabel, { color: theme.colors.textPrimary, fontFamily: theme.fonts.body }]}>
                Enable notifications
              </Text>
              <Text style={[n.switchSub, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
                Master toggle for all DayForge notifications
              </Text>
            </View>
            <Switch value={globalEnabled} onValueChange={setGlobalEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={theme.colors.textOnAccent} />
          </View>
        </View>

        <Text style={[n.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
          TASK TYPES
        </Text>

        {[
          { label: 'Fixed tasks', sub: 'Reminders for locked appointments', value: fixedEnabled, onChange: setFixedEnabled },
          { label: 'Flexible tasks', sub: 'Reminders for flexible schedule items', value: flexibleEnabled, onChange: setFlexibleEnabled },
          { label: 'Optional tasks', sub: 'Reminders for gap-filling tasks', value: optionalEnabled, onChange: setOptionalEnabled },
        ].map(item => (
          <View key={item.label} style={[n.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={n.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[n.switchLabel, { color: globalEnabled ? theme.colors.textPrimary : theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
                  {item.label}
                </Text>
                <Text style={[n.switchSub, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
                  {item.sub}
                </Text>
              </View>
              <Switch value={item.value && globalEnabled} onValueChange={item.onChange} disabled={!globalEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                thumbColor={theme.colors.textOnAccent} />
            </View>
          </View>
        ))}

        <Text style={[n.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
          DAILY SUMMARY
        </Text>
        <View style={[n.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={n.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[n.switchLabel, { color: theme.colors.textPrimary, fontFamily: theme.fonts.body }]}>
                Morning briefing
              </Text>
              <Text style={[n.switchSub, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
                Daily summary of your schedule at your day start time
              </Text>
            </View>
            <Switch value={dailySummary && globalEnabled} onValueChange={setDailySummary} disabled={!globalEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={theme.colors.textOnAccent} />
          </View>
        </View>

        <View style={[n.infoCard, { backgroundColor: theme.colors.accentSurface, borderColor: theme.colors.accent }]}>
          <Text style={[n.infoText, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>
            ℹ️ Full notification delivery requires the app to be installed from the App Store or Google Play. Notification settings per-category can be configured in Settings → Categories.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const n = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  closeBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18 },
  title: { flex: 1, fontSize: 28, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, marginBottom: 10, marginLeft: 4, marginTop: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 15, marginBottom: 2 },
  switchSub: { fontSize: 12 },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 8 },
  infoText: { fontSize: 13, lineHeight: 20 },
});
