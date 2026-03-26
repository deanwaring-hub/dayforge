// src/screens/DashboardScreen.tsx
// Stats dashboard — scores, task counts, completion trends, all tasks view

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useDayForgeStore } from '../store/useDayForgeStore';
import { getInstancesForDate } from '../database/queries/instanceQueries';
import { getScoreForDate } from '../database/queries/scoreQueries';
import { todayString } from '../database/db';
import { taskOccursOn, getRecurrenceRule } from '../database/queries/recurrenceQueries';

type DayStats = {
  date: string;
  score: number;
  completed: number;
  total: number;
};

type AllTasksView = 'today' | 'all';

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[ds.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[ds.statValue, { color: color ?? theme.colors.accent, fontFamily: theme.fonts.heading }]}>
        {value}
      </Text>
      <Text style={[ds.statLabel, { color: theme.colors.textPrimary, fontFamily: theme.fonts.body }]}>{label}</Text>
      {sub && <Text style={[ds.statSub, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>{sub}</Text>}
    </View>
  );
}

function ScoreBar({ score, date, isToday }: { score: number; date: string; isToday: boolean }) {
  const { theme } = useTheme();
  const day = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
  const barColor = score >= 80 ? theme.colors.success : score >= 50 ? theme.colors.accent : theme.colors.textMuted;

  return (
    <View style={ds.barWrapper}>
      <View style={[ds.barTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
        <View style={[ds.barFill, { height: `${score}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={[ds.barDay, {
        color: isToday ? theme.colors.accent : theme.colors.textMuted,
        fontFamily: isToday ? theme.fonts.heading : theme.fonts.body,
      }]}>{day}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { tasks, categories, todaySchedule, todayScore } = useDayForgeStore();

  const [weekStats, setWeekStats] = useState<DayStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTasksView, setAllTasksView] = useState<AllTasksView>('all');
  const [taskFilter, setTaskFilter] = useState<'all' | 'fixed' | 'flexible' | 'optional'>('all');

  const today = todayString();

  const loadWeekStats = useCallback(async () => {
    setLoading(true);
    try {
      const stats: DayStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        const score = await getScoreForDate(dateStr);
        const instances = await getInstancesForDate(dateStr);
        const completed = instances.filter(inst => inst.status === 'completed').length;
        stats.push({
          date: dateStr,
          score: score?.score ?? 0,
          completed,
          total: instances.length,
        });
      }
      setWeekStats(stats);
    } catch (e) {
      console.error('Load week stats error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWeekStats(); }, [loadWeekStats]);

  // Today summary stats
  const activeTodaySchedule = todaySchedule.filter(st => st.instance.scheduledStart !== '00:00');
  const completedToday = activeTodaySchedule.filter(st => st.instance.status === 'completed').length;
  const pendingToday = activeTodaySchedule.filter(st => st.instance.status === 'pending').length;
  const skippedToday = activeTodaySchedule.filter(st => st.instance.status === 'skipped').length;
  const snoozedToday = activeTodaySchedule.filter(st => st.instance.status === 'snoozed').length;

  // All tasks summary
  const totalTasks = tasks.length;
  const fixedCount = tasks.filter(t => t.priority === 'fixed').length;
  const flexibleCount = tasks.filter(t => t.priority === 'flexible').length;
  const optionalCount = tasks.filter(t => t.priority === 'optional').length;

  // Streak calculation
  const currentStreak = (() => {
    let streak = 0;
    for (let i = weekStats.length - 1; i >= 0; i--) {
      if (weekStats[i].score > 0) streak++;
      else break;
    }
    return streak;
  })();

  // Average score
  const avgScore = weekStats.length > 0
    ? Math.round(weekStats.filter(d => d.total > 0).reduce((sum, d) => sum + d.score, 0) / Math.max(weekStats.filter(d => d.total > 0).length, 1))
    : 0;

  // Filtered tasks for all tasks view
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const filteredTasks = tasks.filter(t => taskFilter === 'all' || t.priority === taskFilter);

  return (
    <SafeAreaView style={[ds.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ds.scroll}>

        {/* Header */}
        <Text style={[ds.pageTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}
          accessibilityRole="header">
          Dashboard
        </Text>

        {/* Today's score */}
        <View style={[ds.scoreSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={ds.scoreLeft}>
            <Text style={[ds.scoreSectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
              TODAY'S SCORE
            </Text>
            <Text style={[ds.scoreBig, { color: theme.colors.accent, fontFamily: theme.fonts.heading }]}>
              {todayScore?.score ?? 0}%
            </Text>
            <Text style={[ds.scorePoints, { color: theme.colors.textSecondary, fontFamily: theme.fonts.mono }]}>
              {todayScore?.pointsEarned ?? 0} / {todayScore?.pointsPossible ?? 0} pts
            </Text>
          </View>
          <View style={ds.scoreRight}>
            <View style={ds.scoreBreakdown}>
              {[
                { label: 'Completed', value: completedToday, color: theme.colors.success },
                { label: 'Pending', value: pendingToday, color: theme.colors.textMuted },
                { label: 'Snoozed', value: snoozedToday, color: theme.colors.warning },
                { label: 'Skipped', value: skippedToday, color: theme.colors.textMuted },
              ].map(item => (
                <View key={item.label} style={ds.breakdownRow}>
                  <View style={[ds.breakdownDot, { backgroundColor: item.color }]} />
                  <Text style={[ds.breakdownLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
                    {item.label}
                  </Text>
                  <Text style={[ds.breakdownValue, { color: item.color, fontFamily: theme.fonts.mono }]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Stat cards */}
        <View style={ds.statsGrid}>
          <StatCard label="7-day avg" value={`${avgScore}%`} sub="score" color={theme.colors.accent} />
          <StatCard label="Streak" value={currentStreak} sub="days" color={theme.colors.success} />
          <StatCard label="Total tasks" value={totalTasks} sub="in schedule" color={theme.colors.flexible} />
          <StatCard label="This week" value={weekStats.reduce((s, d) => s + d.completed, 0)} sub="completed" color={theme.colors.fixed} />
        </View>

        {/* 7-day score chart */}
        <View style={[ds.chartSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[ds.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
            LAST 7 DAYS
          </Text>
          {loading ? (
            <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 20 }} />
          ) : (
            <View style={ds.barChart}>
              {weekStats.map(day => (
                <ScoreBar key={day.date} score={day.score} date={day.date} isToday={day.date === today} />
              ))}
            </View>
          )}
        </View>

        {/* Task type breakdown */}
        <View style={[ds.breakdownSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[ds.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
            TASK BREAKDOWN
          </Text>
          <View style={ds.typeGrid}>
            {[
              { label: 'Fixed', count: fixedCount, color: theme.colors.fixed, bg: theme.colors.fixedSurface },
              { label: 'Flexible', count: flexibleCount, color: theme.colors.flexible, bg: theme.colors.flexibleSurface },
              { label: 'Optional', count: optionalCount, color: theme.colors.optional, bg: theme.colors.optionalSurface },
            ].map(item => (
              <View key={item.label} style={[ds.typeCard, { backgroundColor: item.bg }]}>
                <Text style={[ds.typeCount, { color: item.color, fontFamily: theme.fonts.heading }]}>{item.count}</Text>
                <Text style={[ds.typeLabel, { color: item.color, fontFamily: theme.fonts.body }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* All tasks */}
        <View style={[ds.allTasksSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[ds.sectionLabel, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
            ALL TASKS
          </Text>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['all', 'fixed', 'flexible', 'optional'] as const).map(f => {
                const isSelected = taskFilter === f;
                const colors: Record<string, string> = {
                  all: theme.colors.accent,
                  fixed: theme.colors.fixed,
                  flexible: theme.colors.flexible,
                  optional: theme.colors.optional,
                };
                const bgs: Record<string, string> = {
                  all: theme.colors.accentSurface,
                  fixed: theme.colors.fixedSurface,
                  flexible: theme.colors.flexibleSurface,
                  optional: theme.colors.optionalSurface,
                };
                return (
                  <TouchableOpacity key={f} onPress={() => setTaskFilter(f)}
                    style={[ds.filterChip, {
                      backgroundColor: isSelected ? bgs[f] : theme.colors.surfaceAlt,
                      borderColor: isSelected ? colors[f] : theme.colors.border,
                    }]}
                    accessibilityRole="radio" accessibilityState={{ checked: isSelected }}>
                    <Text style={[ds.filterChipText, {
                      color: isSelected ? colors[f] : theme.colors.textMuted,
                      fontFamily: theme.fonts.body,
                    }]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Task list */}
          {filteredTasks.length === 0 ? (
            <Text style={[ds.noTasks, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
              No tasks found
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredTasks.map(task => {
                const category = categoryMap.get(task.categoryId);
                const priorityColor = { fixed: theme.colors.fixed, flexible: theme.colors.flexible, optional: theme.colors.optional }[task.priority] ?? theme.colors.textMuted;
                const priorityBg = { fixed: theme.colors.fixedSurface, flexible: theme.colors.flexibleSurface, optional: theme.colors.optionalSurface }[task.priority] ?? theme.colors.surfaceAlt;
                return (
                  <View key={task.id} style={[ds.taskRow, {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    borderLeftColor: priorityColor,
                  }]}>
                    <View style={ds.taskInfo}>
                      <Text style={[ds.taskName, { color: theme.colors.textPrimary, fontFamily: theme.fonts.body }]} numberOfLines={1}>
                        {task.name}
                      </Text>
                      <View style={ds.taskMeta}>
                        {category && (
                          <View style={[ds.catBadge, { backgroundColor: category.color + '22' }]}>
                            <View style={[ds.catDot, { backgroundColor: category.color }]} />
                            <Text style={[ds.catText, { color: category.color, fontFamily: theme.fonts.body }]}>{category.label}</Text>
                          </View>
                        )}
                        <View style={[ds.priorityBadge, { backgroundColor: priorityBg }]}>
                          <Text style={[ds.priorityText, { color: priorityColor, fontFamily: theme.fonts.body }]}>{task.priority}</Text>
                        </View>
                        <Text style={[ds.taskDuration, { color: theme.colors.textMuted, fontFamily: theme.fonts.mono }]}>
                          {task.duration >= 60 ? `${task.duration / 60}h` : `${task.duration}m`}
                        </Text>
                      </View>
                    </View>
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

const ds = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 20 },
  pageTitle: { fontSize: 34, marginBottom: 20 },
  scoreSection: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, flexDirection: 'row', gap: 16 },
  scoreLeft: { flex: 1 },
  scoreSectionLabel: { fontSize: 11, letterSpacing: 1.2, marginBottom: 8 },
  scoreBig: { fontSize: 48, lineHeight: 52 },
  scorePoints: { fontSize: 13, marginTop: 4 },
  scoreRight: { flex: 1, justifyContent: 'center' },
  scoreBreakdown: { gap: 6 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdownDot: { width: 6, height: 6, borderRadius: 3 },
  breakdownLabel: { flex: 1, fontSize: 12 },
  breakdownValue: { fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '47%', borderRadius: 12, borderWidth: 1, padding: 14 },
  statValue: { fontSize: 28, lineHeight: 32, marginBottom: 4 },
  statLabel: { fontSize: 13 },
  statSub: { fontSize: 11, marginTop: 2 },
  chartSection: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, marginBottom: 16 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 },
  barWrapper: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barDay: { fontSize: 10 },
  breakdownSection: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  typeGrid: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  typeCount: { fontSize: 24, lineHeight: 28 },
  typeLabel: { fontSize: 12, marginTop: 4 },
  allTasksSection: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, minHeight: 36 },
  filterChipText: { fontSize: 13 },
  noTasks: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  taskRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderLeftWidth: 4, padding: 10 },
  taskInfo: { flex: 1, gap: 4 },
  taskName: { fontSize: 14 },
  taskMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  catDot: { width: 5, height: 5, borderRadius: 3 },
  catText: { fontSize: 11 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  priorityText: { fontSize: 11 },
  taskDuration: { fontSize: 11 },
});
