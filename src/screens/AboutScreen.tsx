// src/screens/AboutScreen.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

type Props = { onClose?: () => void };

export default function AboutScreen({ onClose }: Props) {
  const { theme } = useTheme();

  const links = [
    { label: 'Privacy Policy', url: 'https://dayforge.co.uk/privacy.html' },
    { label: 'Terms of Service', url: 'https://dayforge.co.uk/terms.html' },
    { label: 'Support', url: 'https://dayforge.co.uk/support.html' },
    { label: 'DayForge Website', url: 'https://dayforge.co.uk' },
    { label: 'AbleWorks Digital', url: 'https://ableworksdigital.com' },
  ];

  return (
    <SafeAreaView style={[a.screen, { backgroundColor: theme.colors.background }]}>
      <View style={[a.header, { borderBottomColor: theme.colors.border }]}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={a.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[a.closeBtnText, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>✕</Text>
          </TouchableOpacity>
        )}
        <Text style={[a.title, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>About</Text>
        <View style={{ minWidth: 44 }} />
      </View>

      <ScrollView contentContainerStyle={a.scroll} showsVerticalScrollIndicator={false}>

        {/* App identity */}
        <View style={a.appHeader}>
          <Text style={[a.appIcon]}>⚒️</Text>
          <Text style={[a.appName, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>DayForge</Text>
          <Text style={[a.appVersion, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>Version 1.0.0</Text>
          <Text style={[a.appTagline, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
            Your day, intelligently forged.
          </Text>
        </View>

        {/* About */}
        <View style={[a.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[a.cardTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>About DayForge</Text>
          <Text style={[a.cardBody, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
            DayForge is a smart scheduling app that builds your daily schedule automatically. Add your tasks, set their priority, and DayForge handles the rest — placing fixed tasks at their exact times, fitting flexible tasks around them, and filling gaps with optional tasks.
          </Text>
          <Text style={[a.cardBody, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body, marginTop: 8 }]}>
            Built accessibility-first by AbleWorks Digital, with full screen reader support, Atkinson Hyperlegible font throughout, and WCAG 2.2 AA contrast on all themes.
          </Text>
        </View>

        {/* Developer */}
        <View style={[a.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[a.cardTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>AbleWorks Digital</Text>
          <Text style={[a.cardBody, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
            AbleWorks Digital builds accessible, purposeful technology for disability, education, and mobility contexts. We build products we'd want to use ourselves.
          </Text>
        </View>

        {/* Links */}
        <Text style={[a.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>LINKS</Text>
        <View style={[a.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: 0 }]}>
          {links.map((link, idx) => (
            <TouchableOpacity key={link.label}
              onPress={() => Linking.openURL(link.url)}
              style={[a.linkRow, {
                borderBottomWidth: idx < links.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.border,
              }]}
              accessibilityRole="link"
              accessibilityLabel={link.label}>
              <Text style={[a.linkLabel, { color: theme.colors.textPrimary, fontFamily: theme.fonts.body }]}>
                {link.label}
              </Text>
              <Text style={[a.linkArrow, { color: theme.colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[a.footer, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
          © 2026 AbleWorks Digital{'\n'}Built with ♥ and accessibility in mind.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const a = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  closeBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18 },
  title: { flex: 1, fontSize: 28, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  appHeader: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  appIcon: { fontSize: 52, marginBottom: 8 },
  appName: { fontSize: 28 },
  appVersion: { fontSize: 13, marginTop: 2 },
  appTagline: { fontSize: 15, marginTop: 4 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16, overflow: 'hidden' },
  cardTitle: { fontSize: 17, marginBottom: 8 },
  cardBody: { fontSize: 14, lineHeight: 22 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, minHeight: 52 },
  linkLabel: { fontSize: 15 },
  linkArrow: { fontSize: 20 },
  footer: { textAlign: 'center', fontSize: 12, lineHeight: 20, marginTop: 8, opacity: 0.7 },
});
