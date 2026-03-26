// src/screens/ProfileScreen.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useDayForgeStore } from '../store/useDayForgeStore';
import TimePicker from '../components/TimePicker';
import { timeToMinutes } from '../database/db';

type Props = { onClose?: () => void };

export default function ProfileScreen({ onClose }: Props) {
  const { theme } = useTheme();
  const { user, updateUserSettings } = useDayForgeStore();

  const [dayStart, setDayStart] = useState(user?.dayStart ?? '06:00');
  const [dayEnd, setDayEnd] = useState(user?.dayEnd ?? '21:00');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (timeToMinutes(dayStart) >= timeToMinutes(dayEnd)) {
      Alert.alert('Invalid times', 'Day start must be before day end.');
      return;
    }
    setSaving(true);
    try {
      await updateUserSettings({ dayStart, dayEnd });
      Alert.alert('Saved', 'Your day settings have been updated.');
    } catch (e) {
      console.error('Save profile error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[p.screen, { backgroundColor: theme.colors.background }]}>
      <View style={[p.header, { borderBottomColor: theme.colors.border }]}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={p.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[p.closeBtnText, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>✕</Text>
          </TouchableOpacity>
        )}
        <Text style={[p.title, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>Profile</Text>
        <View style={{ minWidth: 44 }} />
      </View>

      <ScrollView contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[p.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
          YOUR DAY
        </Text>
        <View style={[p.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[p.cardSub, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
            Set the start and end of your active day. Tasks will only be scheduled within this window.
          </Text>
          <TimePicker
            value={dayStart}
            onChange={setDayStart}
            label="Day starts"
            startMins={0}
            endMins={timeToMinutes(dayEnd) - 30}
          />
          <TimePicker
            value={dayEnd}
            onChange={setDayEnd}
            label="Day ends"
            startMins={timeToMinutes(dayStart) + 30}
            endMins={23 * 60 + 59}
          />
          <TouchableOpacity onPress={handleSave} disabled={saving}
            style={[p.saveBtn, { backgroundColor: saving ? theme.colors.border : theme.colors.accent }]}
            accessibilityRole="button" accessibilityLabel="Save day settings">
            <Text style={[p.saveBtnText, { color: theme.colors.textOnAccent, fontFamily: theme.fonts.heading }]}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[p.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
          ACCOUNT
        </Text>
        <View style={[p.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[p.cardSub, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
            DayForge stores all your data locally on your device. No account required. Your tasks, settings, and history never leave your phone.
          </Text>
          <View style={[p.infoPill, { backgroundColor: theme.colors.successSurface, borderColor: theme.colors.success }]}>
            <Text style={[p.infoPillText, { color: theme.colors.success, fontFamily: theme.fonts.body }]}>
              ✓ All data stored on-device only
            </Text>
          </View>
        </View>

        <Text style={[p.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
          PREMIUM
        </Text>
        <View style={[p.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[p.cardTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>
            DayForge Premium
          </Text>
          <Text style={[p.cardSub, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
            Unlock optional tasks, unlimited categories, Electric and Forest themes, dashboard analytics and data export.
          </Text>
          <View style={[p.pricingRow, { gap: 8 }]}>
            {[
              { label: 'Monthly', price: '£2.59' },
              { label: 'Annual', price: '£17.99' },
              { label: 'Lifetime', price: '£34.99' },
            ].map(opt => (
              <TouchableOpacity key={opt.label}
                style={[p.pricingCard, { backgroundColor: theme.colors.accentSurface, borderColor: theme.colors.accent }]}
                accessibilityRole="button" accessibilityLabel={`${opt.label} plan ${opt.price}`}>
                <Text style={[p.pricingPrice, { color: theme.colors.accent, fontFamily: theme.fonts.heading }]}>{opt.price}</Text>
                <Text style={[p.pricingLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const p = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  closeBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18 },
  title: { flex: 1, fontSize: 28, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 17, marginBottom: 8 },
  cardSub: { fontSize: 13, lineHeight: 20, marginBottom: 16, opacity: 0.8 },
  infoPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  infoPillText: { fontSize: 13 },
  saveBtn: { borderRadius: 12, padding: 14, alignItems: 'center', minHeight: 48, marginTop: 8 },
  saveBtnText: { fontSize: 16 },
  pricingRow: { flexDirection: 'row' },
  pricingCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center' },
  pricingPrice: { fontSize: 18 },
  pricingLabel: { fontSize: 12, marginTop: 2 },
});
