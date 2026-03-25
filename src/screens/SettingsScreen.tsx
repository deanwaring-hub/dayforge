// src/screens/SettingsScreen.tsx
// Settings screen with working theme switcher
// Shows free/premium badge on each theme

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { themes, freeThemes, type ThemeName } from "../theme/index";
import { useDayForgeStore } from "../store/useDayForgeStore";
import { getDatabase } from "../database/db";

export default function SettingsScreen() {
  const { theme, themeName, setTheme } = useTheme();
  const { updateUserSettings, initialise } = useDayForgeStore();

  const handleClearData = async () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all tasks and schedule data. Your settings and categories will be kept. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All Tasks",
          style: "destructive",
          onPress: async () => {
            const db = getDatabase();
            await db.execAsync(`
            DELETE FROM task_instances;
            DELETE FROM recurrence_exceptions;
            DELETE FROM recurrence_rules;
            DELETE FROM tasks;
            DELETE FROM daily_scores;
          `);
            await initialise();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[s.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text
          style={[
            s.pageTitle,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.heading,
              borderBottomColor: theme.colors.border,
            },
          ]}
          accessibilityRole="header"
        >
          Settings
        </Text>

        {/* Theme section */}
        <Text
          style={[
            s.sectionLabel,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.fonts.body,
            },
          ]}
        >
          APPEARANCE
        </Text>

        <View
          style={[
            s.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              s.cardTitle,
              {
                color: theme.colors.textPrimary,
                fontFamily: theme.fonts.heading,
              },
            ]}
          >
            Theme
          </Text>
          <Text
            style={[
              s.cardSub,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            Electric and Forest are premium themes.
          </Text>

          {/* Theme options */}
          <View style={s.themeGrid}>
            {(Object.keys(themes) as ThemeName[]).map((key) => {
              const t = themes[key];
              const isSelected = themeName === key;
              const isFree = freeThemes.includes(key);

              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTheme(key)}
                  style={[
                    s.themeCard,
                    {
                      backgroundColor: t.colors.background,
                      borderColor: isSelected
                        ? theme.colors.accent
                        : theme.colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={`${t.displayName} theme${isFree ? "" : ", premium"}`}
                  accessibilityState={{ checked: isSelected }}
                  accessibilityHint={`Switch to ${t.displayName} theme`}
                >
                  {/* Mini preview swatches */}
                  <View style={s.swatchRow}>
                    <View
                      style={[s.swatch, { backgroundColor: t.colors.accent }]}
                    />
                    <View
                      style={[
                        s.swatch,
                        { backgroundColor: t.colors.accentSecondary },
                      ]}
                    />
                    <View
                      style={[s.swatch, { backgroundColor: t.colors.success }]}
                    />
                  </View>

                  {/* Theme name */}
                  <Text
                    style={[
                      s.themeName,
                      {
                        color: t.colors.textPrimary,
                        fontFamily: t.fonts.heading,
                      },
                    ]}
                  >
                    {t.displayName}
                  </Text>

                  {/* Free / Premium badge */}
                  <View
                    style={[
                      s.badge,
                      {
                        backgroundColor: isFree
                          ? t.colors.successSurface
                          : t.colors.accentSurface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.badgeText,
                        {
                          color: isFree ? t.colors.success : t.colors.accent,
                          fontFamily: t.fonts.body,
                        },
                      ]}
                    >
                      {isFree ? "Free" : "Premium"}
                    </Text>
                  </View>

                  {/* Selected indicator */}
                  {isSelected && (
                    <View
                      style={[
                        s.selectedDot,
                        { backgroundColor: theme.colors.accent },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Dev tools — remove before submission */}
        <View
          style={[
            s.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.danger,
            },
          ]}
        >
          <Text
            style={[
              s.cardTitle,
              {
                color: theme.colors.danger,
                fontFamily: theme.fonts.heading,
              },
            ]}
          >
            Developer Tools
          </Text>
          <TouchableOpacity
            onPress={() => updateUserSettings({ onboarded: false })}
            style={[
              s.card,
              {
                backgroundColor: theme.colors.dangerSurface,
                borderColor: theme.colors.danger,
                marginBottom: 0,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Reset onboarding"
          >
            <Text
              style={{
                color: theme.colors.danger,
                fontFamily: theme.fonts.body,
                fontSize: theme.fontSizes.md,
              }}
            >
              Reset Onboarding
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClearData}
            style={[
              s.card,
              {
                backgroundColor: theme.colors.dangerSurface,
                borderColor: theme.colors.danger,
                marginBottom: 0,
                marginTop: 8,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Clear all task data"
          >
            <Text
              style={{
                color: theme.colors.danger,
                fontFamily: theme.fonts.body,
                fontSize: theme.fontSizes.md,
              }}
            >
              Clear All Tasks
            </Text>
          </TouchableOpacity>
        </View>

        {/* Placeholder sections */}
        {["Profile", "Notifications", "Categories", "About"].map((section) => (
          <View
            key={section}
            style={[
              s.card,
              s.placeholderCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                s.cardTitle,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.heading,
                },
              ]}
            >
              {section}
            </Text>
            <Text
              style={[
                s.cardSub,
                {
                  color: theme.colors.textMuted,
                  fontFamily: theme.fonts.body,
                },
              ]}
            >
              Coming soon
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 34,
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  placeholderCard: {
    opacity: 0.6,
  },
  cardTitle: {
    fontSize: 17,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    marginBottom: 16,
    opacity: 0.8,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeCard: {
    width: "47%",
    borderRadius: 10,
    padding: 12,
    minHeight: 44,
    position: "relative",
  },
  swatchRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themeName: {
    fontSize: 15,
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  selectedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
