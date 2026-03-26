// src/screens/TodayScreen.tsx

import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, Dimensions, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useDayForgeStore, type ScheduledTask } from "../store/useDayForgeStore";
import { openEditTaskModal } from "../navigation/TabNavigator";
import { getInstancesForDate } from "../database/queries/instanceQueries";
import { getRecurrenceRule, taskOccursOn } from "../database/queries/recurrenceQueries";
import { getScoreForDate } from "../database/queries/scoreQueries";
import { todayString, timeToMinutes } from "../database/db";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function formatTime(time: string): string { return time.slice(0, 5); }

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getCurrentTimeMins(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getDateLabel(dateStr: string): string {
  const today = todayString();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';
  return formatDate(dateStr);
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────

function ScoreRing({ score, pointsEarned, pointsPossible }: {
  score: number; pointsEarned: number; pointsPossible: number;
}) {
  const { theme } = useTheme();
  return (
    <View style={[s.scoreRing, { borderColor: theme.colors.accent }]}
      accessibilityLabel={`Daily score ${score} percent`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: score }}>
      <Text style={[s.scoreNumber, { color: theme.colors.accent, fontFamily: theme.fonts.mono }]}>{score}</Text>
      <Text style={[s.scorePercent, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>%</Text>
      <Text style={[s.scorePoints, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>{pointsEarned}/{pointsPossible}</Text>
    </View>
  );
}

// ─── SCHEDULE SUMMARY ─────────────────────────────────────────────────────────

function ScheduleSummary({ schedule }: { schedule: ScheduledTask[] }) {
  const { theme } = useTheme();
  const active = schedule.filter(s => s.instance.scheduledStart !== '00:00');
  const fixed = active.filter(s => s.task.priority === "fixed").length;
  const flexible = active.filter(s => s.task.priority === "flexible").length;
  const optional = active.filter(s => s.task.priority === "optional").length;
  const completed = active.filter(s => s.instance.status === "completed").length;
  return (
    <View style={s.summaryRow}>
      {fixed > 0 && <View style={[s.summaryPill, { backgroundColor: theme.colors.fixedSurface }]}><View style={[s.summaryDot, { backgroundColor: theme.colors.fixed }]} /><Text style={[s.summaryText, { color: theme.colors.fixed, fontFamily: theme.fonts.body }]}>{fixed} fixed</Text></View>}
      {flexible > 0 && <View style={[s.summaryPill, { backgroundColor: theme.colors.flexibleSurface }]}><View style={[s.summaryDot, { backgroundColor: theme.colors.flexible }]} /><Text style={[s.summaryText, { color: theme.colors.flexible, fontFamily: theme.fonts.body }]}>{flexible} flexible</Text></View>}
      {optional > 0 && <View style={[s.summaryPill, { backgroundColor: theme.colors.optionalSurface }]}><View style={[s.summaryDot, { backgroundColor: theme.colors.optional }]} /><Text style={[s.summaryText, { color: theme.colors.optional, fontFamily: theme.fonts.body }]}>{optional} optional</Text></View>}
      {active.length > 0 && <View style={[s.summaryPill, { backgroundColor: theme.colors.successSurface }]}><Text style={[s.summaryText, { color: theme.colors.success, fontFamily: theme.fonts.body }]}>{completed}/{active.length} done</Text></View>}
    </View>
  );
}

// ─── MENU ACTION ─────────────────────────────────────────────────────────────

function MenuAction({ label, color, bg, onPress }: {
  label: string; color: string; bg: string; onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={[s.menuAction, { backgroundColor: bg, minHeight: 52 }]}
      accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[s.menuActionText, { color, fontFamily: theme.fonts.body }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── TASK ACTION MENU ─────────────────────────────────────────────────────────

function TaskActionMenu({ scheduledTask, visible, onClose, onComplete, onSkip, onSnooze, onEdit, onDelete, isToday }: {
  scheduledTask: ScheduledTask | null; visible: boolean; onClose: () => void;
  onComplete: () => void; onSkip: () => void; onSnooze: () => void;
  onEdit: () => void; onDelete: () => void; isToday: boolean;
}) {
  const { theme } = useTheme();
  if (!scheduledTask) return null;
  const isDone = scheduledTask.instance.status !== "pending";
  const isUnscheduled = scheduledTask.instance.scheduledStart === '00:00';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <TouchableOpacity style={s.menuBackdrop} onPress={onClose} activeOpacity={1} />
      <View style={[s.menuSheet, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <View style={[s.menuHandle, { backgroundColor: theme.colors.border }]} />
        <Text style={[s.menuTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>{scheduledTask.task.name}</Text>
        <Text style={[s.menuSub, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
          {isUnscheduled ? "Unscheduled" : formatTime(scheduledTask.instance.scheduledStart)} · {scheduledTask.task.duration} min · {scheduledTask.category.label}
        </Text>
        {isToday && !isDone && !isUnscheduled && (
          <>
            <MenuAction label="Mark as complete" color={theme.colors.success} bg={theme.colors.successSurface} onPress={onComplete} />
            <MenuAction label="Snooze — do it later" color={theme.colors.warning} bg={theme.colors.warningSurface} onPress={onSnooze} />
            <MenuAction label="Skip for today" color={theme.colors.textMuted} bg={theme.colors.surfaceAlt} onPress={onSkip} />
          </>
        )}
        {isDone && (
          <View style={[s.doneNotice, { backgroundColor: theme.colors.successSurface }]}>
            <Text style={[s.doneNoticeText, { color: theme.colors.success, fontFamily: theme.fonts.body }]}>
              This task is already {scheduledTask.instance.status}.
            </Text>
          </View>
        )}
        <MenuAction label="Edit task" color={theme.colors.accent} bg={theme.colors.accentSurface} onPress={onEdit} />
        <MenuAction label="Delete task" color={theme.colors.danger} bg={theme.colors.dangerSurface} onPress={onDelete} />
        <TouchableOpacity onPress={onClose} style={[s.menuClose, { borderColor: theme.colors.border }]}
          accessibilityRole="button" accessibilityLabel="Close menu">
          <Text style={[s.menuCloseText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────

function TaskCard({ scheduledTask, onPress, onCheckbox, isNextUp = false, isToday = true }: {
  scheduledTask: ScheduledTask; onPress: () => void; onCheckbox: () => void;
  isNextUp?: boolean; isToday?: boolean;
}) {
  const { theme } = useTheme();
  const { task, instance, category } = scheduledTask;
  const status = instance.status;
  const isDone = status === "completed";
  const isSkipped = status === "skipped";
  const isSnoozed = status === "snoozed";
  const isConflict = instance.hasConflict;
  const isUnscheduled = instance.scheduledStart === '00:00';
  const isInactive = isDone || isSkipped || isSnoozed;

  const priorityColor = isConflict ? theme.colors.danger : {
    fixed: theme.colors.fixed, flexible: theme.colors.flexible, optional: theme.colors.optional,
  }[task.priority];

  const priorityBg = {
    fixed: theme.colors.fixedSurface, flexible: theme.colors.flexibleSurface, optional: theme.colors.optionalSurface,
  }[task.priority];

  return (
    <TouchableOpacity onPress={onPress}
      style={[s.taskCard, {
        backgroundColor: isNextUp ? theme.colors.accentSurface : theme.colors.surface,
        borderColor: isConflict ? theme.colors.danger : isNextUp ? theme.colors.accent : theme.colors.border,
        borderLeftColor: priorityColor,
        opacity: isInactive ? 0.55 : 1,
      }]}
      accessibilityRole="button"
      accessibilityLabel={`${task.name}, ${task.priority}, ${isUnscheduled ? 'unscheduled' : formatTime(instance.scheduledStart)}, ${status}`}
      accessibilityHint="Tap for options">
      <View style={s.timeColumn}>
        {isUnscheduled ? (
          <Text style={[s.taskTime, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono, fontSize: 10 }]}>—</Text>
        ) : (
          <>
            <Text style={[s.taskTime, { color: isNextUp ? theme.colors.accent : theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
              {formatTime(instance.scheduledStart)}
            </Text>
            <Text style={[s.taskDuration, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>{task.duration}m</Text>
          </>
        )}
      </View>
      <View style={s.taskContent}>
        {isNextUp && <Text style={[s.nextUpLabel, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>Next up</Text>}
        <Text style={[s.taskName, {
          color: isInactive ? theme.colors.textMuted : theme.colors.textPrimary,
          fontFamily: theme.fonts.body,
          textDecorationLine: isDone ? "line-through" : "none",
        }]} numberOfLines={1}>{task.name}</Text>
        <View style={s.taskMeta}>
          <View style={[s.categoryBadge, { backgroundColor: category.color + "22" }]}>
            <View style={[s.categoryDot, { backgroundColor: category.color }]} />
            <Text style={[s.categoryText, { color: category.color, fontFamily: theme.fonts.body }]}>{category.label}</Text>
          </View>
          <View style={[s.priorityBadge, { backgroundColor: priorityBg }]}>
            <Text style={[s.priorityText, { color: priorityColor, fontFamily: theme.fonts.body }]}>{task.priority}</Text>
          </View>
          {isConflict && <View style={[s.statusBadge, { backgroundColor: theme.colors.dangerSurface }]}><Text style={[s.statusText, { color: theme.colors.danger, fontFamily: theme.fonts.body }]}>conflict</Text></View>}
          {isSnoozed && <View style={[s.statusBadge, { backgroundColor: theme.colors.warningSurface }]}><Text style={[s.statusText, { color: theme.colors.warning, fontFamily: theme.fonts.body }]}>snoozed</Text></View>}
          {isSkipped && <View style={[s.statusBadge, { backgroundColor: theme.colors.surfaceAlt }]}><Text style={[s.statusText, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>skipped</Text></View>}
        </View>
        {(task.travelTo > 0 || task.travelFrom > 0) && (
          <Text style={[s.travelText, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
            🚗 {task.travelTo > 0 ? `${task.travelTo}m to` : ""}{task.travelTo > 0 && task.travelFrom > 0 ? " · " : ""}{task.travelFrom > 0 ? `${task.travelFrom}m back` : ""}
          </Text>
        )}
      </View>
      {!isUnscheduled && (
        <TouchableOpacity onPress={onCheckbox}
          style={[s.checkbox, {
            borderColor: isDone ? theme.colors.success : theme.colors.border,
            backgroundColor: isDone ? theme.colors.success : "transparent",
          }]}
          accessibilityRole="checkbox"
          accessibilityLabel={`Mark ${task.name} as complete`}
          accessibilityState={{ checked: isDone }}>
          {isDone && <Text style={[s.checkmark, { color: theme.colors.textOnAccent }]}>✓</Text>}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function SectionDivider({ label, count, collapsed, onToggle }: {
  label: string; count: number; collapsed: boolean; onToggle: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity onPress={onToggle} style={[s.sectionDivider, { borderColor: theme.colors.border }]}
      accessibilityRole="button" accessibilityLabel={`${label}, ${count} tasks, ${collapsed ? 'collapsed' : 'expanded'}`}>
      <Text style={[s.sectionDividerText, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>{label} ({count})</Text>
      <Text style={[s.sectionDividerChevron, { color: theme.colors.textMuted }]}>{collapsed ? '▼' : '▲'}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ isToday }: { isToday: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={s.emptyState}>
      <Text style={s.emptyEmoji}>{isToday ? '⚒️' : '📅'}</Text>
      <Text style={[s.emptyTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>
        {isToday ? 'No tasks today' : 'No tasks on this day'}
      </Text>
      <Text style={[s.emptyBody, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
        {isToday
          ? 'Tap the + button to add your first task.'
          : 'No tasks were scheduled for this day.'}
      </Text>
    </View>
  );
}

// ─── PAST/FUTURE DAY VIEW ────────────────────────────────────────────────────
// Read-only view for yesterday and tomorrow

function OtherDayView({ dateStr, categories, tasks }: {
  dateStr: string;
  categories: any[];
  tasks: any[];
}) {
  const { theme } = useTheme();
  const [dayTasks, setDayTasks] = useState<any[]>([]);
  const [dayScore, setDayScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const today = todayString();
  const isPast = dateStr < today;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
        const score = await getScoreForDate(dateStr);
        setDayScore(score);

        const instances = await getInstancesForDate(dateStr);
        if (instances.length > 0) {
          const result = instances
            .map(instance => {
              const task = tasks.find((t: any) => t.id === instance.taskId);
              const category = task ? categoryMap.get(task.categoryId) : null;
              return { instance, task, category };
            })
            .filter(r => r.task && r.category);
          setDayTasks(result);
        } else {
          // Future date — show what tasks will occur
          const result: any[] = [];
          for (const task of tasks) {
            const rule = await getRecurrenceRule(task.id);
            if (!rule) continue;
            if (!taskOccursOn(rule, dateStr)) continue;
            if (task.pausedUntil && dateStr <= task.pausedUntil) continue;
            const category = categoryMap.get(task.categoryId);
            if (category) result.push({ instance: null, task, category });
          }
          result.sort((a, b) => {
            const aTime = a.task.time ? timeToMinutes(a.task.time) : a.task.preferredTime ? timeToMinutes(a.task.preferredTime) : 999;
            const bTime = b.task.time ? timeToMinutes(b.task.time) : b.task.preferredTime ? timeToMinutes(b.task.preferredTime) : 999;
            return aTime - bTime;
          });
          setDayTasks(result);
        }
      } catch (e) {
        console.error('OtherDayView load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dateStr, tasks, categories]);

  if (loading) {
    return <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />;
  }

  if (dayTasks.length === 0) {
    return <EmptyState isToday={false} />;
  }

  const completedCount = dayTasks.filter(t => t.instance?.status === 'completed').length;
  const totalCount = dayTasks.length;

  return (
    <View style={s.timeline}>
      {isPast && dayScore && (
        <View style={[s.daySummaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[s.daySummaryScore, { color: theme.colors.accent, fontFamily: theme.fonts.heading }]}>
            {Math.round(dayScore.score)}%
          </Text>
          <Text style={[s.daySummaryText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
            {completedCount}/{totalCount} tasks completed
          </Text>
        </View>
      )}
      {!isPast && (
        <View style={[s.previewBanner, { backgroundColor: theme.colors.accentSurface, borderColor: theme.colors.accent }]}>
          <Text style={[s.previewBannerText, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>
            📅 Preview — {dayTasks.length} tasks scheduled for tomorrow
          </Text>
        </View>
      )}
      {dayTasks.map((item, idx) => {
        const { task, category, instance } = item;
        if (!task || !category) return null;
        const priorityColor = { fixed: theme.colors.fixed, flexible: theme.colors.flexible, optional: theme.colors.optional }[task.priority as string] ?? theme.colors.textMuted;
        const priorityBg = { fixed: theme.colors.fixedSurface, flexible: theme.colors.flexibleSurface, optional: theme.colors.optionalSurface }[task.priority as string] ?? theme.colors.surfaceAlt;
        const isDone = instance?.status === 'completed';
        const isSkipped = instance?.status === 'skipped';
        const timeStr = instance?.scheduledStart && instance.scheduledStart !== '00:00'
          ? formatTime(instance.scheduledStart)
          : task.time ? formatTime(task.time) : task.preferredTime ? formatTime(task.preferredTime) : '—';

        return (
          <View key={`${task.id}-${idx}`}
            style={[s.taskCard, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderLeftColor: priorityColor,
              opacity: isDone || isSkipped ? 0.55 : 1,
            }]}>
            <View style={s.timeColumn}>
              <Text style={[s.taskTime, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>{timeStr}</Text>
              <Text style={[s.taskDuration, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>{task.duration}m</Text>
            </View>
            <View style={s.taskContent}>
              <Text style={[s.taskName, {
                color: theme.colors.textPrimary, fontFamily: theme.fonts.body,
                textDecorationLine: isDone ? 'line-through' : 'none',
              }]} numberOfLines={1}>{task.name}</Text>
              <View style={s.taskMeta}>
                <View style={[s.categoryBadge, { backgroundColor: category.color + '22' }]}>
                  <View style={[s.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={[s.categoryText, { color: category.color, fontFamily: theme.fonts.body }]}>{category.label}</Text>
                </View>
                <View style={[s.priorityBadge, { backgroundColor: priorityBg }]}>
                  <Text style={[s.priorityText, { color: priorityColor, fontFamily: theme.fonts.body }]}>{task.priority}</Text>
                </View>
                {instance?.status && instance.status !== 'pending' && (
                  <View style={[s.statusBadge, { backgroundColor: isDone ? theme.colors.successSurface : theme.colors.surfaceAlt }]}>
                    <Text style={[s.statusText, { color: isDone ? theme.colors.success : theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
                      {instance.status}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── TODAY SCREEN ─────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { theme } = useTheme();
  const {
    todayDate, todaySchedule, todayScore, isScheduleBuilt,
    buildTodaySchedule, completeTask, uncompleteTask, skipTask, snoozeTask, removeTask,
    tasks, categories,
  } = useDayForgeStore();

  const today = todayString();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  const [viewDate, setViewDate] = useState(today);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [unscheduledCollapsed, setUnscheduledCollapsed] = useState(false);
  const [currentTimeMins, setCurrentTimeMins] = useState(getCurrentTimeMins());
  const [regenerating, setRegenerating] = useState(false);

  const isViewingToday = viewDate === today;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTimeMins(getCurrentTimeMins()), 60000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await buildTodaySchedule();
    setRefreshing(false);
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    await buildTodaySchedule();
    setRegenerating(false);
  };

  const handleCardPress = (st: ScheduledTask) => { setSelectedTask(st); setMenuVisible(true); };
  const handleCheckbox = (st: ScheduledTask) => {
    if (st.instance.status === "completed") { uncompleteTask(st.instance.id); }
    else if (st.instance.status === "pending") { completeTask(st.instance.id); }
    else { setSelectedTask(st); setMenuVisible(true); }
  };

  const handleComplete = async () => { if (selectedTask) { await completeTask(selectedTask.instance.id); setMenuVisible(false); } };
  const handleSkip = async () => { if (selectedTask) { await skipTask(selectedTask.instance.id); setMenuVisible(false); } };
  const handleSnooze = async () => {
    if (selectedTask) {
      const tom = new Date(); tom.setDate(tom.getDate() + 1);
      await snoozeTask(selectedTask.instance.id, tom.toISOString().slice(0, 10));
      setMenuVisible(false);
    }
  };
  const handleEdit = () => { if (selectedTask) { setMenuVisible(false); openEditTaskModal(selectedTask.task); } };
  const handleDelete = () => {
    if (!selectedTask) return;
    setMenuVisible(false);
    const isRecurring = selectedTask.recurrenceRule?.frequency !== 'once';
    Alert.alert(
      'Delete Task',
      isRecurring ? `"${selectedTask.task.name}" is a recurring task.` : `Delete "${selectedTask.task.name}"?`,
      isRecurring ? [
        { text: 'Cancel', style: 'cancel' },
        { text: 'This occurrence only', onPress: () => skipTask(selectedTask.instance.id) },
        { text: 'All occurrences', style: 'destructive', onPress: () => removeTask(selectedTask.task.id) },
      ] : [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeTask(selectedTask.task.id) },
      ]
    );
  };

  // Today's schedule sections
  const scheduledTasks = todaySchedule.filter(st => st.instance.scheduledStart !== '00:00');
  const unscheduledTasks = todaySchedule.filter(st => st.instance.scheduledStart === '00:00');
  const activeTasks = scheduledTasks.filter(st => st.instance.status !== 'completed' && st.instance.status !== 'skipped');
  const completedTasks = scheduledTasks.filter(st => st.instance.status === 'completed' || st.instance.status === 'skipped');
  const hasConflicts = scheduledTasks.some(st => st.instance.hasConflict);
  const nextUpTask = activeTasks.find(st => timeToMins(st.instance.scheduledStart) >= currentTimeMins);

  const score = todayScore?.score ?? 0;
  const pointsEarned = todayScore?.pointsEarned ?? 0;
  const pointsPossible = todayScore?.pointsPossible ?? 0;

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {isViewingToday && (
              <Text style={[s.greeting, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>{getGreeting()}</Text>
            )}
            <Text style={[s.dateText, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]} accessibilityRole="header">
              {getDateLabel(viewDate)}
            </Text>
            {!isViewingToday && (
              <Text style={[s.fullDate, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
                {formatDate(viewDate)}
              </Text>
            )}
          </View>
          {isViewingToday ? (
            <ScoreRing score={score} pointsEarned={pointsEarned} pointsPossible={pointsPossible} />
          ) : (
            <TouchableOpacity onPress={() => setViewDate(today)}
              style={[s.backToTodayBtn, { backgroundColor: theme.colors.accentSurface, borderColor: theme.colors.accent }]}
              accessibilityRole="button" accessibilityLabel="Back to today">
              <Text style={[s.backToTodayText, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>Today</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Day navigation */}
        <View style={[s.dayNav, { borderColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={() => setViewDate(yesterday)}
            style={[s.dayNavBtn, viewDate === yesterday && { backgroundColor: theme.colors.surfaceAlt }]}
            accessibilityRole="button" accessibilityLabel="View yesterday">
            <Text style={[s.dayNavBtnText, {
              color: viewDate === yesterday ? theme.colors.textPrimary : theme.colors.textMuted,
              fontFamily: viewDate === yesterday ? theme.fonts.heading : theme.fonts.body,
            }]}>‹ Yesterday</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewDate(today)}
            style={[s.dayNavBtn, viewDate === today && { backgroundColor: theme.colors.accentSurface }]}
            accessibilityRole="button" accessibilityLabel="View today">
            <Text style={[s.dayNavBtnText, {
              color: viewDate === today ? theme.colors.accent : theme.colors.textMuted,
              fontFamily: viewDate === today ? theme.fonts.heading : theme.fonts.body,
            }]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewDate(tomorrow)}
            style={[s.dayNavBtn, viewDate === tomorrow && { backgroundColor: theme.colors.surfaceAlt }]}
            accessibilityRole="button" accessibilityLabel="Preview tomorrow">
            <Text style={[s.dayNavBtnText, {
              color: viewDate === tomorrow ? theme.colors.textPrimary : theme.colors.textMuted,
              fontFamily: viewDate === tomorrow ? theme.fonts.heading : theme.fonts.body,
            }]}>Tomorrow ›</Text>
          </TouchableOpacity>
        </View>

        {/* Conflict banner — today only */}
        {isViewingToday && hasConflicts && (
          <View style={[s.conflictBanner, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.danger }]}>
            <Text style={[s.conflictBannerText, { color: theme.colors.danger, fontFamily: theme.fonts.body }]}>
              ⚠️ You have conflicting tasks today. Review the highlighted items.
            </Text>
          </View>
        )}

        {/* Summary pills — today only */}
        {isViewingToday && todaySchedule.length > 0 && <ScheduleSummary schedule={todaySchedule} />}

        {/* Main content */}
        {!isViewingToday ? (
          <OtherDayView dateStr={viewDate} categories={categories} tasks={tasks} />
        ) : (
          <View style={s.timeline}>
            {!isScheduleBuilt || todaySchedule.length === 0 ? (
              <EmptyState isToday={true} />
            ) : (
              <>
                {activeTasks.map((st) => (
                  <View key={st.instance.id}>
                    <TaskCard scheduledTask={st} onPress={() => handleCardPress(st)}
                      onCheckbox={() => handleCheckbox(st)} isNextUp={st === nextUpTask} isToday />
                  </View>
                ))}
                {completedTasks.length > 0 && (
                  <>
                    <SectionDivider label="Completed" count={completedTasks.length}
                      collapsed={completedCollapsed} onToggle={() => setCompletedCollapsed(c => !c)} />
                    {!completedCollapsed && completedTasks.map(st => (
                      <View key={st.instance.id}>
                        <TaskCard scheduledTask={st} onPress={() => handleCardPress(st)} onCheckbox={() => handleCheckbox(st)} />
                      </View>
                    ))}
                  </>
                )}
                {unscheduledTasks.length > 0 && (
                  <>
                    <SectionDivider label="Couldn't fit today" count={unscheduledTasks.length}
                      collapsed={unscheduledCollapsed} onToggle={() => setUnscheduledCollapsed(c => !c)} />
                    {!unscheduledCollapsed && unscheduledTasks.map(st => (
                      <View key={st.instance.id}>
                        <TaskCard scheduledTask={st} onPress={() => handleCardPress(st)} onCheckbox={() => handleCheckbox(st)} />
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Regenerate — today only */}
        {isViewingToday && isScheduleBuilt && todaySchedule.length > 0 && (
          <TouchableOpacity onPress={handleRegenerate} disabled={regenerating}
            style={[s.regenerateBtn, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
            accessibilityRole="button" accessibilityLabel="Regenerate today's schedule">
            <Text style={[s.regenerateBtnText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
              {regenerating ? '⟳  Regenerating...' : '⟳  Regenerate day'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={s.bottomPad} />
      </ScrollView>

      <TaskActionMenu
        scheduledTask={selectedTask}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onSnooze={handleSnooze}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isToday={isViewingToday}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerLeft: { flex: 1, marginRight: 16 },
  greeting: { fontSize: 13, marginBottom: 2 },
  dateText: { fontSize: 26, lineHeight: 32 },
  fullDate: { fontSize: 13, marginTop: 2 },
  backToTodayBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  backToTodayText: { fontSize: 13 },
  dayNav: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 12 },
  dayNavBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 0 },
  dayNavBtnText: { fontSize: 13 },
  scoreRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  scoreNumber: { fontSize: 22, lineHeight: 26 },
  scorePercent: { fontSize: 11, lineHeight: 14 },
  scorePoints: { fontSize: 10, lineHeight: 13 },
  conflictBanner: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  conflictBannerText: { fontSize: 13 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  summaryPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  summaryDot: { width: 6, height: 6, borderRadius: 3 },
  summaryText: { fontSize: 12 },
  timeline: { paddingHorizontal: 16, gap: 8 },
  daySummaryCard: { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center', marginBottom: 8 },
  daySummaryScore: { fontSize: 36, lineHeight: 40 },
  daySummaryText: { fontSize: 14, marginTop: 4 },
  previewBanner: { borderRadius: 10, borderWidth: 1, padding: 12, marginHorizontal: 0, marginBottom: 8 },
  previewBannerText: { fontSize: 13 },
  taskCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, padding: 12, gap: 12, minHeight: 72 },
  timeColumn: { width: 44, alignItems: "center" },
  taskTime: { fontSize: 13, lineHeight: 17 },
  taskDuration: { fontSize: 11, lineHeight: 15 },
  taskContent: { flex: 1, gap: 4 },
  nextUpLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  taskName: { fontSize: 15, lineHeight: 20 },
  taskMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  categoryBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryText: { fontSize: 11 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  priorityText: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 11 },
  travelText: { fontSize: 11, marginTop: 2 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 },
  checkmark: { fontSize: 14, lineHeight: 18 },
  sectionDivider: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 4, marginTop: 4, marginBottom: 4, minHeight: 44 },
  sectionDividerText: { fontSize: 12 },
  sectionDividerChevron: { fontSize: 11 },
  regenerateBtn: { marginHorizontal: 16, marginTop: 16, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', minHeight: 44 },
  regenerateBtnText: { fontSize: 14 },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 22, marginBottom: 12, textAlign: "center" },
  emptyBody: { fontSize: 15, lineHeight: 24, textAlign: "center" },
  bottomPad: { height: 32 },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  menuSheet: { borderTopWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingTop: 12, gap: 10 },
  menuHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  menuTitle: { fontSize: 18, marginBottom: 2 },
  menuSub: { fontSize: 13, marginBottom: 8 },
  menuAction: { borderRadius: 12, padding: 16, alignItems: "center" },
  menuActionText: { fontSize: 15 },
  doneNotice: { borderRadius: 12, padding: 16, alignItems: "center" },
  doneNoticeText: { fontSize: 15 },
  menuClose: { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: "center", marginTop: 4 },
  menuCloseText: { fontSize: 15 },
});
