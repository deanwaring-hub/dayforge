// src/screens/TodayScreen.tsx
// The heart of DayForge — shows the smart-built daily schedule
// Timeline view with task cards, checkboxes, score header

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import {
  useDayForgeStore,
  type ScheduledTask,
} from "../store/useDayForgeStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  pointsEarned,
  pointsPossible,
}: {
  score: number;
  pointsEarned: number;
  pointsPossible: number;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[s.scoreRing, { borderColor: theme.colors.accent }]}
      accessibilityLabel={`Daily score ${score} percent`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: score }}
    >
      <Text
        style={[
          s.scoreNumber,
          { color: theme.colors.accent, fontFamily: theme.fonts.mono },
        ]}
      >
        {score}
      </Text>
      <Text
        style={[
          s.scorePercent,
          { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
        ]}
      >
        %
      </Text>
      <Text
        style={[
          s.scorePoints,
          { color: theme.colors.textMuted, fontFamily: theme.fonts.mono },
        ]}
      >
        {pointsEarned}/{pointsPossible}
      </Text>
    </View>
  );
}

// ─── SCHEDULE SUMMARY ─────────────────────────────────────────────────────────

function ScheduleSummary({ schedule }: { schedule: ScheduledTask[] }) {
  const { theme } = useTheme();

  const fixed = schedule.filter((s) => s.task.priority === "fixed").length;
  const flexible = schedule.filter(
    (s) => s.task.priority === "flexible",
  ).length;
  const optional = schedule.filter(
    (s) => s.task.priority === "optional",
  ).length;
  const completed = schedule.filter(
    (s) => s.instance.status === "completed",
  ).length;

  return (
    <View style={s.summaryRow}>
      {fixed > 0 && (
        <View
          style={[
            s.summaryPill,
            { backgroundColor: theme.colors.fixedSurface },
          ]}
        >
          <View
            style={[s.summaryDot, { backgroundColor: theme.colors.fixed }]}
          />
          <Text
            style={[
              s.summaryText,
              { color: theme.colors.fixed, fontFamily: theme.fonts.body },
            ]}
          >
            {fixed} fixed
          </Text>
        </View>
      )}
      {flexible > 0 && (
        <View
          style={[
            s.summaryPill,
            { backgroundColor: theme.colors.flexibleSurface },
          ]}
        >
          <View
            style={[s.summaryDot, { backgroundColor: theme.colors.flexible }]}
          />
          <Text
            style={[
              s.summaryText,
              { color: theme.colors.flexible, fontFamily: theme.fonts.body },
            ]}
          >
            {flexible} flexible
          </Text>
        </View>
      )}
      {optional > 0 && (
        <View
          style={[
            s.summaryPill,
            { backgroundColor: theme.colors.optionalSurface },
          ]}
        >
          <View
            style={[s.summaryDot, { backgroundColor: theme.colors.optional }]}
          />
          <Text
            style={[
              s.summaryText,
              { color: theme.colors.optional, fontFamily: theme.fonts.body },
            ]}
          >
            {optional} optional
          </Text>
        </View>
      )}
      {schedule.length > 0 && (
        <View
          style={[
            s.summaryPill,
            { backgroundColor: theme.colors.successSurface },
          ]}
        >
          <Text
            style={[
              s.summaryText,
              { color: theme.colors.success, fontFamily: theme.fonts.body },
            ]}
          >
            {completed}/{schedule.length} done
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── TASK ACTION MENU ─────────────────────────────────────────────────────────

function TaskActionMenu({
  scheduledTask,
  visible,
  onClose,
  onComplete,
  onSkip,
  onSnooze,
}: {
  scheduledTask: ScheduledTask | null;
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onSnooze: () => void;
}) {
  const { theme } = useTheme();
  if (!scheduledTask) return null;

  const isDone = scheduledTask.instance.status !== "pending";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <TouchableOpacity
        style={s.menuBackdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      <View
        style={[
          s.menuSheet,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[s.menuHandle, { backgroundColor: theme.colors.border }]}
        />

        <Text
          style={[
            s.menuTitle,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.heading,
            },
          ]}
        >
          {scheduledTask.task.name}
        </Text>
        <Text
          style={[
            s.menuSub,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
          ]}
        >
          {formatTime(scheduledTask.instance.scheduledStart)} ·{" "}
          {scheduledTask.task.duration} min · {scheduledTask.category.label}
        </Text>

        {!isDone && (
          <>
            <MenuAction
              label="Mark as complete"
              color={theme.colors.success}
              bg={theme.colors.successSurface}
              onPress={onComplete}
            />
            <MenuAction
              label="Snooze — do it later"
              color={theme.colors.warning}
              bg={theme.colors.warningSurface}
              onPress={onSnooze}
            />
            <MenuAction
              label="Skip for today"
              color={theme.colors.textMuted}
              bg={theme.colors.surfaceAlt}
              onPress={onSkip}
            />
          </>
        )}

        {isDone && (
          <View
            style={[
              s.doneNotice,
              { backgroundColor: theme.colors.successSurface },
            ]}
          >
            <Text
              style={[
                s.doneNoticeText,
                { color: theme.colors.success, fontFamily: theme.fonts.body },
              ]}
            >
              This task is already {scheduledTask.instance.status}.
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onClose}
          style={[s.menuClose, { borderColor: theme.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        >
          <Text
            style={[
              s.menuCloseText,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function MenuAction({
  label,
  color,
  bg,
  onPress,
}: {
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.menuAction, { backgroundColor: bg, minHeight: 52 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[s.menuActionText, { color, fontFamily: theme.fonts.body }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────

function TaskCard({
  scheduledTask,
  onPress,
  onCheckbox,
}: {
  scheduledTask: ScheduledTask;
  onPress: () => void;
  onCheckbox: () => void;
}) {
  const { theme } = useTheme();
  const { task, instance, category } = scheduledTask;

  const status = instance.status;
  const isDone = status === "completed";
  const isSkipped = status === "skipped";
  const isSnoozed = status === "snoozed";
  const isInactive = isDone || isSkipped || isSnoozed;

  const priorityColor = {
    fixed: theme.colors.fixed,
    flexible: theme.colors.flexible,
    optional: theme.colors.optional,
  }[task.priority];

  const priorityBg = {
    fixed: theme.colors.fixedSurface,
    flexible: theme.colors.flexibleSurface,
    optional: theme.colors.optionalSurface,
  }[task.priority];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        s.taskCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderLeftColor: priorityColor,
          opacity: isInactive ? 0.6 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${task.name}, ${task.priority}, ${formatTime(instance.scheduledStart)}, ${status}`}
      accessibilityHint="Tap for options"
    >
      {/* Time column */}
      <View style={s.timeColumn}>
        <Text
          style={[
            s.taskTime,
            { color: theme.colors.textMuted, fontFamily: theme.fonts.mono },
          ]}
        >
          {formatTime(instance.scheduledStart)}
        </Text>
        <Text
          style={[
            s.taskDuration,
            { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
          ]}
        >
          {task.duration}m
        </Text>
      </View>

      {/* Content */}
      <View style={s.taskContent}>
        <View style={s.taskTitleRow}>
          <Text
            style={[
              s.taskName,
              {
                color: isInactive
                  ? theme.colors.textMuted
                  : theme.colors.textPrimary,
                fontFamily: theme.fonts.body,
                textDecorationLine: isDone ? "line-through" : "none",
              },
            ]}
            numberOfLines={1}
          >
            {task.name}
          </Text>
        </View>

        <View style={s.taskMeta}>
          {/* Category */}
          <View
            style={[
              s.categoryBadge,
              { backgroundColor: category.color + "22" },
            ]}
          >
            <View
              style={[s.categoryDot, { backgroundColor: category.color }]}
            />
            <Text
              style={[
                s.categoryText,
                { color: category.color, fontFamily: theme.fonts.body },
              ]}
            >
              {category.label}
            </Text>
          </View>

          {/* Priority badge */}
          <View style={[s.priorityBadge, { backgroundColor: priorityBg }]}>
            <Text
              style={[
                s.priorityText,
                { color: priorityColor, fontFamily: theme.fonts.body },
              ]}
            >
              {task.priority}
            </Text>
          </View>

          {/* Status badge if not pending */}
          {isSnoozed && (
            <View
              style={[
                s.statusBadge,
                { backgroundColor: theme.colors.warningSurface },
              ]}
            >
              <Text
                style={[
                  s.statusText,
                  { color: theme.colors.warning, fontFamily: theme.fonts.body },
                ]}
              >
                snoozed
              </Text>
            </View>
          )}
          {isSkipped && (
            <View
              style={[
                s.statusBadge,
                { backgroundColor: theme.colors.surfaceAlt },
              ]}
            >
              <Text
                style={[
                  s.statusText,
                  {
                    color: theme.colors.textMuted,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              >
                skipped
              </Text>
            </View>
          )}
        </View>

        {/* Travel time indicator */}
        {(task.travelTo > 0 || task.travelFrom > 0) && (
          <Text
            style={[
              s.travelText,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            🚗 {task.travelTo > 0 ? `${task.travelTo}m to` : ""}
            {task.travelTo > 0 && task.travelFrom > 0 ? " · " : ""}
            {task.travelFrom > 0 ? `${task.travelFrom}m back` : ""}
          </Text>
        )}
      </View>

      {/* Checkbox */}
      <TouchableOpacity
        onPress={onCheckbox}
        style={[
          s.checkbox,
          {
            borderColor: isDone ? theme.colors.success : theme.colors.border,
            backgroundColor: isDone ? theme.colors.success : "transparent",
          },
        ]}
        accessibilityRole="checkbox"
        accessibilityLabel={`Mark ${task.name} as complete`}
        accessibilityState={{ checked: isDone }}
      >
        {isDone && (
          <Text style={[s.checkmark, { color: theme.colors.textOnAccent }]}>
            ✓
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState() {
  const { theme } = useTheme();
  return (
    <View style={s.emptyState}>
      <Text style={[s.emptyEmoji]}>⚒️</Text>
      <Text
        style={[
          s.emptyTitle,
          { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading },
        ]}
      >
        No tasks today
      </Text>
      <Text
        style={[
          s.emptyBody,
          { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
        ]}
      >
        Tap the + button to add your first task. Set it to recurring and
        DayForge will build your day automatically.
      </Text>
    </View>
  );
}

// ─── TODAY SCREEN ─────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { theme } = useTheme();
  const {
    todayDate,
    todaySchedule,
    todayScore,
    isScheduleBuilt,
    buildTodaySchedule,
    completeTask,
    uncompleteTask,
    skipTask,
    snoozeTask,
  } = useDayForgeStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await buildTodaySchedule();
    setRefreshing(false);
  }, []);

  const handleCardPress = (st: ScheduledTask) => {
    setSelectedTask(st);
    setMenuVisible(true);
  };

  const handleCheckbox = (st: ScheduledTask) => {
    if (st.instance.status === "completed") {
      // Undo completion — set back to pending
      uncompleteTask(st.instance.id);
    } else if (st.instance.status === "pending") {
      completeTask(st.instance.id);
    } else {
      setSelectedTask(st);
      setMenuVisible(true);
    }
  };

  const handleComplete = async () => {
    if (selectedTask) {
      await completeTask(selectedTask.instance.id);
      setMenuVisible(false);
    }
  };

  const handleSkip = async () => {
    if (selectedTask) {
      await skipTask(selectedTask.instance.id);
      setMenuVisible(false);
    }
  };

  const handleSnooze = async () => {
    if (selectedTask) {
      // Default snooze to tomorrow for now
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      await snoozeTask(selectedTask.instance.id, tomorrowStr);
      setMenuVisible(false);
    }
  };

  const score = todayScore?.score ?? 0;
  const pointsEarned = todayScore?.pointsEarned ?? 0;
  const pointsPossible = todayScore?.pointsPossible ?? 0;

  return (
    <SafeAreaView
      style={[s.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text
              style={[
                s.greeting,
                { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
              ]}
            >
              {getGreeting()}
            </Text>
            <Text
              style={[
                s.dateText,
                {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.fonts.heading,
                },
              ]}
              accessibilityRole="header"
            >
              {formatDate(todayDate)}
            </Text>
          </View>
          <ScoreRing
            score={score}
            pointsEarned={pointsEarned}
            pointsPossible={pointsPossible}
          />
        </View>

        {/* Schedule summary */}
        {todaySchedule.length > 0 && (
          <ScheduleSummary schedule={todaySchedule} />
        )}

        {/* Timeline */}
        <View style={s.timeline}>
          {!isScheduleBuilt || todaySchedule.length === 0 ? (
            <EmptyState />
          ) : (
            todaySchedule.map((st, index) => (
              <View key={st.instance.id}>
                {/* Time gap indicator between tasks */}
                {index > 0 &&
                  (() => {
                    const prevEnd = st.instance.scheduledStart;
                    return null; // Gap indicators future enhancement
                  })()}
                <TaskCard
                  scheduledTask={st}
                  onPress={() => handleCardPress(st)}
                  onCheckbox={() => handleCheckbox(st)}
                />
              </View>
            ))
          )}
        </View>

        <View style={s.bottomPad} />
      </ScrollView>

      {/* Task action menu */}
      <TaskActionMenu
        scheduledTask={selectedTask}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onSnooze={handleSnooze}
      />
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 13,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 22,
    lineHeight: 28,
  },
  scoreRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontSize: 22,
    lineHeight: 26,
  },
  scorePercent: {
    fontSize: 11,
    lineHeight: 14,
  },
  scorePoints: {
    fontSize: 10,
    lineHeight: 13,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summaryText: {
    fontSize: 12,
  },
  timeline: {
    paddingHorizontal: 16,
    gap: 8,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    gap: 12,
    minHeight: 72,
  },
  timeColumn: {
    width: 44,
    alignItems: "center",
  },
  taskTime: {
    fontSize: 13,
    lineHeight: 17,
  },
  taskDuration: {
    fontSize: 11,
    lineHeight: 15,
  },
  taskContent: {
    flex: 1,
    gap: 6,
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskName: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  taskMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 11,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
  },
  travelText: {
    fontSize: 11,
    marginTop: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 44,
  },
  checkmark: {
    fontSize: 14,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  bottomPad: {
    height: 32,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menuSheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingTop: 12,
    gap: 10,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 13,
    marginBottom: 8,
  },
  menuAction: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  menuActionText: {
    fontSize: 15,
  },
  doneNotice: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  doneNoticeText: {
    fontSize: 15,
  },
  menuClose: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  menuCloseText: {
    fontSize: 15,
  },
});
