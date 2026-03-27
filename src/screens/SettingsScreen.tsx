// src/screens/SettingsScreen.tsx

import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { themes, freeThemes, type ThemeName } from "../theme/index";
import { useDayForgeStore } from "../store/useDayForgeStore";
import { getDatabase } from "../database/db";
import CategoriesScreen from "./CategoriesScreen";
import ProfileScreen from "./ProfileScreen";
import NotificationsScreen from "./NotificationsScreen";
import AboutScreen from "./AboutScreen";

type ModalType = "categories" | "profile" | "notifications" | "about" | null;

export default function SettingsScreen() {
  const { theme, themeName, setTheme } = useTheme();
  const { updateUserSettings, initialise } = useDayForgeStore();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const handleClearTasks = async () => {
    Alert.alert(
      "Clear All Tasks",
      "This will permanently delete all tasks and schedule data. Your settings and categories will be kept. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All Tasks",
          style: "destructive",
          onPress: async () => {
            const db = getDatabase();
            await db.runAsync(`DELETE FROM task_instances`);
            await db.runAsync(`DELETE FROM recurrence_exceptions`);
            await db.runAsync(`DELETE FROM recurrence_rules`);
            await db.runAsync(`DELETE FROM tasks`);
            await db.runAsync(`DELETE FROM daily_scores`);
            await db.runAsync(`DELETE FROM schema_migrations WHERE version = 4`);
            await initialise();
          },
        },
      ],
    );
  };

  const handleClearCategories = async () => {
    Alert.alert(
      "Clear All Categories",
      "This will permanently delete all categories and any tasks assigned to them. Default categories will be restored on next reload. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Categories",
          style: "destructive",
          onPress: async () => {
            const db = getDatabase();
            await db.runAsync(`DELETE FROM task_instances`);
            await db.runAsync(`DELETE FROM recurrence_exceptions`);
            await db.runAsync(`DELETE FROM recurrence_rules`);
            await db.runAsync(`DELETE FROM tasks`);
            await db.runAsync(`DELETE FROM daily_scores`);
            await db.runAsync(`DELETE FROM categories`);
            await db.runAsync(`DELETE FROM schema_migrations WHERE version IN (1, 4, 5)`);
            await initialise();
          },
        },
      ],
    );
  };

  const NAV_ITEMS: { key: ModalType; title: string; sub: string }[] = [
    { key: "profile",       title: "Profile",       sub: "Day start/end, premium subscription" },
    { key: "notifications", title: "Notifications", sub: "Manage reminders and alerts" },
    { key: "categories",    title: "Categories",    sub: "Add, edit and set task defaults" },
    { key: "about",         title: "About",         sub: "Version, privacy policy, links" },
  ];

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={[s.pageTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading, borderBottomColor: theme.colors.border }]}
          accessibilityRole="header">
          Settings
        </Text>

        {/* Appearance */}
        <Text style={[s.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
          APPEARANCE
        </Text>
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[s.cardTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>Theme</Text>
          <Text style={[s.cardSub, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
            Electric and Forest are premium themes.
          </Text>
          <View style={s.themeGrid}>
            {(Object.keys(themes) as ThemeName[]).map((key) => {
              const t = themes[key];
              const isSelected = themeName === key;
              const isFree = freeThemes.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTheme(key)}
                  style={[s.themeCard, {
                    backgroundColor: t.colors.background,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  }]}
                  accessibilityRole="radio"
                  accessibilityLabel={`${t.displayName} theme${isFree ? "" : ", premium"}`}
                  accessibilityState={{ checked: isSelected }}>
                  <View style={s.swatchRow}>
                    <View style={[s.swatch, { backgroundColor: t.colors.accent }]} />
                    <View style={[s.swatch, { backgroundColor: t.colors.accentSecondary }]} />
                    <View style={[s.swatch, { backgroundColor: t.colors.success }]} />
                  </View>
                  <Text style={[s.themeName, { color: t.colors.textPrimary, fontFamily: t.fonts.heading }]}>
                    {t.displayName}
                  </Text>
                  <View style={[s.badge, { backgroundColor: isFree ? t.colors.successSurface : t.colors.accentSurface }]}>
                    <Text style={[s.badgeText, { color: isFree ? t.colors.success : t.colors.accent, fontFamily: t.fonts.body }]}>
                      {isFree ? "Free" : "Premium"}
                    </Text>
                  </View>
                  {isSelected && <View style={[s.selectedDot, { backgroundColor: theme.colors.accent }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* App settings nav */}
        <Text style={[s.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
          APP
        </Text>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => setActiveModal(item.key)}
            style={[s.card, s.navCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={item.title}>
            <View style={s.navCardInner}>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading, marginBottom: 2 }]}>
                  {item.title}
                </Text>
                <Text style={[s.cardSub, { color: theme.colors.textMuted, fontFamily: theme.fonts.body, marginBottom: 0 }]}>
                  {item.sub}
                </Text>
              </View>
              <Text style={[s.navArrow, { color: theme.colors.textMuted }]}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Developer Tools */}
        <Text style={[s.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body, marginTop: 8 }]}>
          DEVELOPER TOOLS
        </Text>
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.danger }]}>
          <Text style={[s.cardTitle, { color: theme.colors.danger, fontFamily: theme.fonts.heading, marginBottom: 12 }]}>
            Danger Zone
          </Text>
          <TouchableOpacity
            onPress={() => updateUserSettings({ onboarded: false })}
            style={[s.devBtn, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.danger }]}
            accessibilityRole="button" accessibilityLabel="Reset onboarding">
            <Text style={{ color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.md }}>
              Reset Onboarding
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearTasks}
            style={[s.devBtn, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.danger }]}
            accessibilityRole="button" accessibilityLabel="Clear all tasks">
            <Text style={{ color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.md }}>
              Clear All Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearCategories}
            style={[s.devBtn, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.danger, marginBottom: 0 }]}
            accessibilityRole="button" accessibilityLabel="Clear all categories">
            <Text style={{ color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.md }}>
              Clear All Categories
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modals */}
      <Modal visible={activeModal === "categories"} animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <CategoriesScreen onClose={() => setActiveModal(null)} />
      </Modal>
      <Modal visible={activeModal === "profile"} animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <ProfileScreen onClose={() => setActiveModal(null)} />
      </Modal>
      <Modal visible={activeModal === "notifications"} animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <NotificationsScreen onClose={() => setActiveModal(null)} />
      </Modal>
      <Modal visible={activeModal === "about"} animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <AboutScreen onClose={() => setActiveModal(null)} />
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 34, marginBottom: 28, paddingBottom: 16, borderBottomWidth: 1 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  navCard: { padding: 16 },
  navCardInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  navArrow: { fontSize: 24 },
  cardTitle: { fontSize: 17, marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 16, opacity: 0.8 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeCard: { width: "47%", borderRadius: 10, padding: 12, minHeight: 44, position: "relative" },
  swatchRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  themeName: { fontSize: 15, marginBottom: 8 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  selectedDot: { position: "absolute", top: 10, right: 10, width: 10, height: 10, borderRadius: 5 },
  devBtn: { borderRadius: 10, borderWidth: 1, padding: 14, alignItems: "center", minHeight: 44, marginBottom: 8 },
});
