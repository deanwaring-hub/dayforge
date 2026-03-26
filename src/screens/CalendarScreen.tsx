// src/screens/CalendarScreen.tsx
// Monthly calendar view with task summary for selected date

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useDayForgeStore } from '../store/useDayForgeStore';
import { getInstancesForDate } from '../database/queries/instanceQueries';
import { taskOccursOn } from '../database/queries/recurrenceQueries';
import { getRecurrenceRule } from '../database/queries/recurrenceQueries';
import { todayString, timeToMinutes } from '../database/db';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

type DayTaskSummary = {
  fixed: number;
  flexible: number;
  optional: number;
  completed: number;
  total: number;
};

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { tasks, categories } = useDayForgeStore();

  const today = todayString();
  const todayDate = new Date(today + 'T12:00:00');

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedDayTasks, setSelectedDayTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [monthSummaries, setMonthSummaries] = useState<Map<string, DayTaskSummary>>(new Map());

  // Get all days in the current view month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  // Convert Sunday=0 to Monday=0 layout
  const firstDayOffset = (firstDayOfMonth + 6) % 7;

  // Load tasks for selected date
  const loadSelectedDateTasks = useCallback(async (dateStr: string) => {
    setLoadingTasks(true);
    try {
      const instances = await getInstancesForDate(dateStr);
      const categoryMap = new Map(categories.map(c => [c.id, c]));

      if (instances.length > 0) {
        // Use existing instances
        const result = instances.map(instance => {
          const task = tasks.find(t => t.id === instance.taskId);
          const category = task ? categoryMap.get(task.categoryId) : null;
          return { instance, task, category };
        }).filter(r => r.task && r.category);
        setSelectedDayTasks(result);
      } else {
        // No instances yet — compute which tasks would occur on this date
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
        setSelectedDayTasks(result);
      }
    } catch (e) {
      console.error('Load calendar tasks error:', e);
      setSelectedDayTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [tasks, categories]);

  useEffect(() => {
    loadSelectedDateTasks(selectedDate);
  }, [selectedDate, loadSelectedDateTasks]);

  // Build month summary dots (which days have tasks)
  useEffect(() => {
    const buildSummary = async () => {
      const summary = new Map<string, DayTaskSummary>();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatDateString(viewYear, viewMonth, d);
        const instances = await getInstancesForDate(dateStr);
        if (instances.length > 0) {
          const taskMap = new Map(tasks.map(t => [t.id, t]));
          let fixed = 0, flexible = 0, optional = 0, completed = 0;
          for (const inst of instances) {
            const task = taskMap.get(inst.taskId);
            if (!task) continue;
            if (task.priority === 'fixed') fixed++;
            else if (task.priority === 'flexible') flexible++;
            else optional++;
            if (inst.status === 'completed') completed++;
          }
          summary.set(dateStr, { fixed, flexible, optional, completed, total: instances.length });
        } else {
          // Check if any tasks occur on this date
          let hasAny = false;
          for (const task of tasks) {
            const rule = await getRecurrenceRule(task.id);
            if (rule && taskOccursOn(rule, dateStr)) { hasAny = true; break; }
          }
          if (hasAny) {
            summary.set(dateStr, { fixed: 0, flexible: 0, optional: 0, completed: 0, total: 1 });
          }
        }
      }
      setMonthSummaries(summary);
    };
    buildSummary();
  }, [viewYear, viewMonth, tasks]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const goToToday = () => {
    setViewYear(todayDate.getFullYear());
    setViewMonth(todayDate.getMonth());
    setSelectedDate(today);
  };

  // Build calendar grid
  const calendarDays: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.pageTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}
            accessibilityRole="header">
            Calendar
          </Text>
          {(viewYear !== todayDate.getFullYear() || viewMonth !== todayDate.getMonth()) && (
            <TouchableOpacity onPress={goToToday}
              style={[s.todayBtn, { backgroundColor: theme.colors.accentSurface, borderColor: theme.colors.accent }]}
              accessibilityRole="button" accessibilityLabel="Go to today">
              <Text style={[s.todayBtnText, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>Today</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Month navigation */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={s.navBtn}
            accessibilityRole="button" accessibilityLabel="Previous month">
            <Text style={[s.navBtnText, { color: theme.colors.textPrimary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.monthTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={s.navBtn}
            accessibilityRole="button" accessibilityLabel="Next month">
            <Text style={[s.navBtnText, { color: theme.colors.textPrimary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={s.dayHeaders}>
          {DAYS_OF_WEEK.map(d => (
            <Text key={d} style={[s.dayHeader, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={[s.calendarGrid, { borderColor: theme.colors.border }]}>
          {calendarDays.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={s.dayCell} />;
            const dateStr = formatDateString(viewYear, viewMonth, day);
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const summary = monthSummaries.get(dateStr);
            const isPast = dateStr < today;

            return (
              <TouchableOpacity key={dateStr} onPress={() => setSelectedDate(dateStr)}
                style={[s.dayCell, {
                  backgroundColor: isSelected ? theme.colors.accent : isToday ? theme.colors.accentSurface : 'transparent',
                  borderRadius: 8,
                }]}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${MONTHS[viewMonth]}`}
                accessibilityState={{ selected: isSelected }}>
                <Text style={[s.dayNumber, {
                  color: isSelected ? theme.colors.textOnAccent : isToday ? theme.colors.accent : isPast ? theme.colors.textMuted : theme.colors.textPrimary,
                  fontFamily: isToday || isSelected ? theme.fonts.heading : theme.fonts.body,
                }]}>
                  {day}
                </Text>
                {summary && (
                  <View style={s.dotRow}>
                    {summary.fixed > 0 && <View style={[s.dot, { backgroundColor: isSelected ? theme.colors.textOnAccent : theme.colors.fixed }]} />}
                    {summary.flexible > 0 && <View style={[s.dot, { backgroundColor: isSelected ? theme.colors.textOnAccent : theme.colors.flexible }]} />}
                    {summary.optional > 0 && <View style={[s.dot, { backgroundColor: isSelected ? theme.colors.textOnAccent : theme.colors.optional }]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected date task summary */}
        <View style={[s.summarySection, { borderTopColor: theme.colors.border }]}>
          <Text style={[s.summaryDate, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>
            {formatDisplayDate(selectedDate)}
          </Text>

          {loadingTasks ? (
            <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
          ) : selectedDayTasks.length === 0 ? (
            <View style={s.emptyDay}>
              <Text style={[s.emptyDayText, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
                No tasks on this day
              </Text>
            </View>
          ) : (
            <View style={s.taskList}>
              {selectedDayTasks.map((item, idx) => {
                const { task, category, instance } = item;
                if (!task || !category) return null;
                const priorityColor = { fixed: theme.colors.fixed, flexible: theme.colors.flexible, optional: theme.colors.optional }[task.priority as string] ?? theme.colors.textMuted;
                const isDone = instance?.status === 'completed';
                const isSkipped = instance?.status === 'skipped';
                const timeStr = instance?.scheduledStart && instance.scheduledStart !== '00:00'
                  ? formatTime(instance.scheduledStart)
                  : task.time ? formatTime(task.time) : task.preferredTime ? formatTime(task.preferredTime) : '—';

                return (
                  <View key={`${task.id}-${idx}`}
                    style={[s.taskRow, {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      borderLeftColor: priorityColor,
                      opacity: isDone || isSkipped ? 0.55 : 1,
                    }]}>
                    <View style={s.taskTimeCol}>
                      <Text style={[s.taskTime, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
                        {timeStr}
                      </Text>
                    </View>
                    <View style={s.taskInfo}>
                      <Text style={[s.taskName, {
                        color: theme.colors.textPrimary,
                        fontFamily: theme.fonts.body,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      }]} numberOfLines={1}>
                        {task.name}
                      </Text>
                      <View style={s.taskMeta}>
                        <View style={[s.catBadge, { backgroundColor: category.color + '22' }]}>
                          <View style={[s.catDot, { backgroundColor: category.color }]} />
                          <Text style={[s.catText, { color: category.color, fontFamily: theme.fonts.body }]}>{category.label}</Text>
                        </View>
                        {instance?.status && instance.status !== 'pending' && (
                          <View style={[s.statusBadge, {
                            backgroundColor: isDone ? theme.colors.successSurface : theme.colors.surfaceAlt,
                          }]}>
                            <Text style={[s.statusText, {
                              color: isDone ? theme.colors.success : theme.colors.textMuted,
                              fontFamily: theme.fonts.body,
                            }]}>{instance.status}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[s.taskDuration, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
                      {task.duration}m
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 34 },
  todayBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  todayBtnText: { fontSize: 13 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  navBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 28, lineHeight: 32 },
  monthTitle: { fontSize: 18 },
  dayHeaders: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 12 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, borderTopWidth: 1, paddingTop: 8 },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayNumber: { fontSize: 14, lineHeight: 18 },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  summarySection: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 16, marginTop: 8 },
  summaryDate: { fontSize: 18, marginBottom: 12 },
  emptyDay: { paddingVertical: 32, alignItems: 'center' },
  emptyDayText: { fontSize: 14 },
  taskList: { gap: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderLeftWidth: 4, padding: 10, gap: 10 },
  taskTimeCol: { width: 40, alignItems: 'center' },
  taskTime: { fontSize: 12 },
  taskInfo: { flex: 1, gap: 4 },
  taskName: { fontSize: 14 },
  taskMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  catDot: { width: 5, height: 5, borderRadius: 3 },
  catText: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 11 },
  taskDuration: { fontSize: 11 },
});
