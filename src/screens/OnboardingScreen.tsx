// src/screens/OnboardingScreen.tsx
// First-time setup flow — only shown once
// Steps: Welcome → Theme → Day Hours → Categories → Tutorial → Done

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useDayForgeStore } from "../store/useDayForgeStore";
import { themes, freeThemes, type ThemeName } from "../theme/index";
import { DEFAULT_CATEGORIES } from "../database/queries/categoryQueries";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── STEP INDICATOR ──────────────────────────────────────────────────────────

function StepIndicator({ total, current }: { total: number; current: number }) {
  const { theme } = useTheme();
  return (
    <View
      style={s.stepIndicator}
      accessibilityLabel={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            s.stepDot,
            {
              backgroundColor:
                i <= current ? theme.colors.accent : theme.colors.border,
              width: i === current ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── WELCOME STEP ─────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={s.step}>
      <View style={s.stepContent}>
        <View
          style={[
            s.logoContainer,
            { backgroundColor: theme.colors.accentSurface },
          ]}
        >
          <Text
            style={[
              s.logoText,
              { color: theme.colors.accent, fontFamily: theme.fonts.heading },
            ]}
          >
            DF
          </Text>
        </View>
        <Text
          style={[
            s.stepTitle,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.heading,
            },
          ]}
          accessibilityRole="header"
        >
          Welcome to DayForge
        </Text>
        <Text
          style={[
            s.stepSubtitle,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
          ]}
        >
          Your day, intelligently forged.
        </Text>
        <Text
          style={[
            s.stepBody,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
          ]}
        >
          DayForge builds your daily schedule automatically — placing what must
          happen first, fitting in what should happen, and filling gaps with
          everything else.
        </Text>
        <Text
          style={[
            s.stepBody,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
          ]}
        >
          Let's take two minutes to set things up.
        </Text>
      </View>
      <PrimaryButton label="Get Started" onPress={onNext} />
    </View>
  );
}

// ─── THEME STEP ───────────────────────────────────────────────────────────────

function ThemeStep({ onNext }: { onNext: () => void }) {
  const { theme, themeName, setTheme } = useTheme();

  return (
    <View style={s.step}>
      <View style={s.stepContent}>
        <Text
          style={[
            s.stepTitle,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.heading,
            },
          ]}
          accessibilityRole="header"
        >
          Choose your theme
        </Text>
        <Text
          style={[
            s.stepSubtitle,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
          ]}
        >
          Pick how DayForge looks. You can change this anytime in Settings.
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
                accessibilityLabel={`${t.displayName} theme${isFree ? ", free" : ", premium"}`}
                accessibilityState={{ checked: isSelected }}
              >
                <View style={s.swatchRow}>
                  {[
                    t.colors.accent,
                    t.colors.accentSecondary,
                    t.colors.success,
                  ].map((c, i) => (
                    <View key={i} style={[s.swatch, { backgroundColor: c }]} />
                  ))}
                </View>
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
      <PrimaryButton label="Continue" onPress={onNext} />
    </View>
  );
}

// ─── DAY HOURS STEP ───────────────────────────────────────────────────────────

function DayHoursStep({
  dayStart,
  dayEnd,
  setDayStart,
  setDayEnd,
  onNext,
}: {
  dayStart: string;
  dayEnd: string;
  setDayStart: (v: string) => void;
  setDayEnd: (v: string) => void;
  onNext: () => void;
}) {
  const { theme } = useTheme();

  const hours = Array.from(
    { length: 24 },
    (_, i) => `${String(i).padStart(2, "0")}:00`,
  );

  const startIndex =
    hours.indexOf(dayStart) !== -1 ? hours.indexOf(dayStart) : 6;
  const endIndex = hours.indexOf(dayEnd) !== -1 ? hours.indexOf(dayEnd) : 21;
  const dayLength = endIndex - startIndex;

  return (
    <View style={s.step}>
      <View style={s.stepContent}>
        <Text
          style={[
            s.stepTitle,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.heading,
            },
          ]}
          accessibilityRole="header"
        >
          Your day
        </Text>
        <Text
          style={[
            s.stepSubtitle,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
          ]}
        >
          When does your day start and end? DayForge will only schedule tasks
          within these hours.
        </Text>

        <View
          style={[
            s.timeCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <TimeSelector
            label="Day starts"
            value={dayStart}
            hours={hours}
            onChange={setDayStart}
          />
          <View
            style={[s.timeDivider, { backgroundColor: theme.colors.border }]}
          />
          <TimeSelector
            label="Day ends"
            value={dayEnd}
            hours={hours}
            onChange={setDayEnd}
          />
        </View>

        <View
          style={[
            s.summaryCard,
            {
              backgroundColor: theme.colors.accentSurface,
              borderColor: theme.colors.accent,
            },
          ]}
        >
          <Text
            style={[
              s.summaryText,
              { color: theme.colors.accent, fontFamily: theme.fonts.body },
            ]}
          >
            Active day: {dayStart} – {dayEnd} · {dayLength} hours
          </Text>
        </View>
      </View>
      <PrimaryButton
        label="Continue"
        onPress={onNext}
        disabled={startIndex >= endIndex}
      />
    </View>
  );
}

function TimeSelector({
  label,
  value,
  hours,
  onChange,
}: {
  label: string;
  value: string;
  hours: string[];
  onChange: (v: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={s.timeSelector}>
      <Text
        style={[
          s.timeSelectorLabel,
          { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
        ]}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.timeScroll}
        accessibilityLabel={`${label} time picker`}
      >
        {hours.map((h) => (
          <TouchableOpacity
            key={h}
            onPress={() => onChange(h)}
            style={[
              s.timeChip,
              {
                backgroundColor:
                  value === h ? theme.colors.accent : theme.colors.surfaceAlt,
                borderColor:
                  value === h ? theme.colors.accent : theme.colors.border,
              },
            ]}
            accessibilityRole="radio"
            accessibilityLabel={h}
            accessibilityState={{ checked: value === h }}
          >
            <Text
              style={[
                s.timeChipText,
                {
                  color:
                    value === h
                      ? theme.colors.textOnAccent
                      : theme.colors.textSecondary,
                  fontFamily: theme.fonts.mono,
                },
              ]}
            >
              {h}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── CATEGORIES STEP ──────────────────────────────────────────────────────────

function CategoriesStep({ onNext }: { onNext: () => void }) {
  const { theme } = useTheme();
  const { categories, addCategory, removeCategory } = useDayForgeStore();
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await addCategory({ label: newLabel.trim(), color: theme.colors.accent });
    setNewLabel("");
  };

  return (
    <View style={s.step}>
      <View style={[s.stepContent, { flex: 1 }]}>
        <Text
          style={[
            s.stepTitle,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.heading,
            },
          ]}
          accessibilityRole="header"
        >
          Your categories
        </Text>
        <Text
          style={[
            s.stepSubtitle,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
          ]}
        >
          These are your task types. We've added defaults — remove any you don't
          need or add your own.
        </Text>

        <ScrollView style={s.categoryList} showsVerticalScrollIndicator={false}>
          {categories.map((cat) => (
            <View
              key={cat.id}
              style={[
                s.categoryRow,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={[s.categoryDot, { backgroundColor: cat.color }]} />
              <Text
                style={[
                  s.categoryLabel,
                  {
                    color: theme.colors.textPrimary,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              >
                {cat.label}
              </Text>
              <TouchableOpacity
                onPress={() => removeCategory(cat.id)}
                style={s.removeBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${cat.label} category`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={[s.removeBtnText, { color: theme.colors.textMuted }]}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={[s.addCategoryRow, { borderColor: theme.colors.border }]}>
          <TextInput
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder="Add a category..."
            placeholderTextColor={theme.colors.textMuted}
            style={[
              s.categoryInput,
              {
                color: theme.colors.textPrimary,
                fontFamily: theme.fonts.body,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            accessibilityLabel="New category name"
          />
          <TouchableOpacity
            onPress={handleAdd}
            style={[
              s.addBtn,
              {
                backgroundColor: theme.colors.accent,
                minWidth: 44,
                minHeight: 44,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add category"
          >
            <Text
              style={[
                s.addBtnText,
                {
                  color: theme.colors.textOnAccent,
                  fontFamily: theme.fonts.body,
                },
              ]}
            >
              Add
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <PrimaryButton label="Continue" onPress={onNext} />
    </View>
  );
}

// ─── TUTORIAL STEP ────────────────────────────────────────────────────────────

const TUTORIAL_CARDS = [
  {
    emoji: "⚙️",
    title: "DayForge builds your day",
    body: "Fixed tasks go in at their exact time. Flexible tasks are fitted around them. Optional tasks fill the gaps. Your day is intelligently structured every morning.",
  },
  {
    emoji: "➕",
    title: "Adding tasks is quick",
    body: "Tap the + button to add a task. Just a name, category, and type is all you need. Expand for more options like preferred time, travel time, and recurrence.",
  },
  {
    emoji: "✓",
    title: "Check off your day",
    body: "Tap the checkbox when a task is done. Snooze it if now isn't right. Skip it if it isn't happening. Each action is tracked and scored.",
  },
  {
    emoji: "📊",
    title: "Track your progress",
    body: "Your daily score reflects how your day went. Fixed tasks count most, flexible next, optional least. Snoozing earns a point — it's a conscious decision, not a failure.",
  },
  {
    emoji: "🔁",
    title: "Set it once, done",
    body: "Recurring tasks appear automatically every day, week, or month. Set up your routine once and DayForge handles the rest.",
  },
];

function TutorialStep({ onFinish }: { onFinish: () => void }) {
  const { theme } = useTheme();
  const [cardIndex, setCardIndex] = useState(0);
  const card = TUTORIAL_CARDS[cardIndex];
  const isLast = cardIndex === TUTORIAL_CARDS.length - 1;

  return (
    <View style={s.step}>
      <View style={s.stepContent}>
        <Text
          style={[
            s.stepTitle,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.heading,
            },
          ]}
          accessibilityRole="header"
        >
          How it works
        </Text>

        <View
          style={[
            s.tutorialCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={s.tutorialEmoji}>{card.emoji}</Text>
          <Text
            style={[
              s.tutorialTitle,
              {
                color: theme.colors.textPrimary,
                fontFamily: theme.fonts.heading,
              },
            ]}
          >
            {card.title}
          </Text>
          <Text
            style={[
              s.tutorialBody,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            {card.body}
          </Text>
        </View>

        {/* Card navigation dots */}
        <View style={s.tutorialDots}>
          {TUTORIAL_CARDS.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setCardIndex(i)}
              accessibilityRole="button"
              accessibilityLabel={`Tutorial card ${i + 1}`}
              accessibilityState={{ selected: i === cardIndex }}
            >
              <View
                style={[
                  s.tutorialDot,
                  {
                    backgroundColor:
                      i === cardIndex
                        ? theme.colors.accent
                        : theme.colors.border,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.tutorialButtons}>
        {!isLast && (
          <TouchableOpacity
            onPress={onFinish}
            style={s.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip tutorial"
          >
            <Text
              style={[
                s.skipText,
                { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
              ]}
            >
              Skip
            </Text>
          </TouchableOpacity>
        )}
        <PrimaryButton
          label={isLast ? "Let's go →" : "Next"}
          onPress={isLast ? onFinish : () => setCardIndex((i) => i + 1)}
          style={{ flex: isLast ? 1 : 0.7 }}
        />
      </View>
    </View>
  );
}

// ─── PRIMARY BUTTON ───────────────────────────────────────────────────────────

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  style = {},
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: object;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        s.primaryBtn,
        {
          backgroundColor: disabled ? theme.colors.border : theme.colors.accent,
          minHeight: 52,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text
        style={[
          s.primaryBtnText,
          { color: theme.colors.textOnAccent, fontFamily: theme.fonts.heading },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── MAIN ONBOARDING SCREEN ───────────────────────────────────────────────────

const STEPS = ["welcome", "theme", "hours", "categories", "tutorial"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const { theme, themeName } = useTheme();
  const { finishOnboarding } = useDayForgeStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [dayStart, setDayStart] = useState("06:00");
  const [dayEnd, setDayEnd] = useState("21:00");

  const currentStep = STEPS[stepIndex];
  const showIndicator = currentStep !== "welcome" && currentStep !== "tutorial";

  const next = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    }
  };

  const finish = async () => {
    await finishOnboarding({
      dayStart,
      dayEnd,
      theme: themeName,
    });
  };

  return (
    <SafeAreaView
      style={[s.container, { backgroundColor: theme.colors.background }]}
    >
      {showIndicator && <StepIndicator total={3} current={stepIndex - 1} />}

      {currentStep === "welcome" && <WelcomeStep onNext={next} />}
      {currentStep === "theme" && <ThemeStep onNext={next} />}
      {currentStep === "hours" && (
        <DayHoursStep
          dayStart={dayStart}
          dayEnd={dayEnd}
          setDayStart={setDayStart}
          setDayEnd={setDayEnd}
          onNext={next}
        />
      )}
      {currentStep === "categories" && <CategoriesStep onNext={next} />}
      {currentStep === "tutorial" && <TutorialStep onFinish={finish} />}
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  step: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    paddingBottom: 32,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    alignSelf: "center",
  },
  logoText: {
    fontSize: 32,
  },
  stepTitle: {
    fontSize: 28,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  stepBody: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 12,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  themeCard: {
    width: "47%",
    borderRadius: 12,
    padding: 14,
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
  },
  selectedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timeCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  timeDivider: {
    height: 1,
  },
  timeSelector: {
    padding: 16,
  },
  timeSelectorLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  timeScroll: {
    gap: 8,
    paddingRight: 16,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipText: {
    fontSize: 14,
  },
  summaryCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
  },
  summaryText: {
    fontSize: 14,
  },
  categoryList: {
    flex: 1,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 44,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 15,
  },
  removeBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    fontSize: 22,
    lineHeight: 24,
  },
  addCategoryRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  categoryInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 44,
  },
  addBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    fontSize: 15,
  },
  tutorialCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  tutorialEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  tutorialTitle: {
    fontSize: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  tutorialBody: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  tutorialDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  tutorialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tutorialButtons: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  skipBtn: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 15,
  },
  primaryBtn: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: "100%",
  },
  primaryBtnText: {
    fontSize: 17,
  },
});
