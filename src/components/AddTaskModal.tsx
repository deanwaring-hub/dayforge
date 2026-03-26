// src/components/AddTaskModal.tsx
// Add and Edit Task form with progressive disclosure
// Supports pre-filling for edit mode
// Conflict detection for fixed tasks
// Date picker for start date

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useDayForgeStore } from "../store/useDayForgeStore";
import type {
  TaskPriority,
  TaskPriorityTier,
  Task,
} from "../database/queries/taskQueries";
import type { RecurrenceFrequency } from "../database/queries/recurrenceQueries";
import { getRecurrenceRule } from "../database/queries/recurrenceQueries";
import { todayString, timeToMinutes } from "../database/db";
import TimePicker from "./TimePicker";

type Props = {
  visible: boolean;
  onClose: () => void;
  editTask?: Task | null;
};

type FormState = {
  name: string;
  categoryId: string;
  priority: TaskPriority;
  duration: number;
  frequency: RecurrenceFrequency;
  time: string;
  preferredTime: string;
  earliestStart: string;
  latestEnd: string;
  preferredTimeOptional: string;
  priorityTier: TaskPriorityTier;
  bufferAfter: number;
  travelTo: number;
  travelFrom: number;
  notificationEnabled: boolean;
  notificationMinutesBefore: number;
  notes: string;
  customDays: number[];
  startDate: string;
  endDate: string;
  occurrences: number;
  showExpanded: boolean;
};

const DEFAULT_FORM: FormState = {
  name: "",
  categoryId: "",
  priority: "flexible",
  duration: 30,
  frequency: "once",
  time: "09:00",
  preferredTime: "09:00",
  earliestStart: "06:00",
  latestEnd: "21:00",
  preferredTimeOptional: "09:00",
  priorityTier: "normal",
  bufferAfter: 10,
  travelTo: 0,
  travelFrom: 0,
  notificationEnabled: true,
  notificationMinutesBefore: 60,
  notes: "",
  customDays: [],
  startDate: todayString(),
  endDate: "",
  occurrences: 0,
  showExpanded: false,
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function isAppointmentCategory(categoryId: string): boolean {
  return ["appointments", "medical"].includes(categoryId);
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        fs.fieldLabel,
        { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
      ]}
    >
      {label}
      {required && <Text style={{ color: theme.colors.danger }}> *</Text>}
    </Text>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        fs.sectionHeader,
        { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
      ]}
    >
      {title}
    </Text>
  );
}

function SimpleDatePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const { theme } = useTheme();
  const parsed = value ? new Date(value + "T12:00:00") : new Date();
  const [year, setYear] = useState(parsed.getFullYear());
  const [month, setMonth] = useState(parsed.getMonth());
  const [day, setDay] = useState(parsed.getDate());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() + i,
  );

  useEffect(() => {
    const safeDay = Math.min(day, daysInMonth);
    const d = String(safeDay).padStart(2, "0");
    const m = String(month + 1).padStart(2, "0");
    onChange(`${year}-${m}-${d}`);
  }, [year, month, day]);

  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel label={label} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 6 }}
      >
        <View style={{ flexDirection: "row", gap: 6 }}>
          {days.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setDay(d)}
              style={[
                fs.dateChip,
                {
                  backgroundColor:
                    day === d ? theme.colors.accent : theme.colors.surfaceAlt,
                  borderColor:
                    day === d ? theme.colors.accent : theme.colors.border,
                },
              ]}
              accessibilityRole="radio"
              accessibilityLabel={`Day ${d}`}
              accessibilityState={{ checked: day === d }}
            >
              <Text
                style={[
                  fs.dateChipText,
                  {
                    color:
                      day === d
                        ? theme.colors.textOnAccent
                        : theme.colors.textSecondary,
                    fontFamily: theme.fonts.mono,
                  },
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 6 }}
      >
        <View style={{ flexDirection: "row", gap: 6 }}>
          {MONTHS.map((m, i) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMonth(i)}
              style={[
                fs.dateChip,
                {
                  backgroundColor:
                    month === i ? theme.colors.accent : theme.colors.surfaceAlt,
                  borderColor:
                    month === i ? theme.colors.accent : theme.colors.border,
                },
              ]}
              accessibilityRole="radio"
              accessibilityLabel={m}
              accessibilityState={{ checked: month === i }}
            >
              <Text
                style={[
                  fs.dateChipText,
                  {
                    color:
                      month === i
                        ? theme.colors.textOnAccent
                        : theme.colors.textSecondary,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {years.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              style={[
                fs.dateChip,
                {
                  backgroundColor:
                    year === y ? theme.colors.accent : theme.colors.surfaceAlt,
                  borderColor:
                    year === y ? theme.colors.accent : theme.colors.border,
                  minWidth: 64,
                },
              ]}
              accessibilityRole="radio"
              accessibilityLabel={String(y)}
              accessibilityState={{ checked: year === y }}
            >
              <Text
                style={[
                  fs.dateChipText,
                  {
                    color:
                      year === y
                        ? theme.colors.textOnAccent
                        : theme.colors.textSecondary,
                    fontFamily: theme.fonts.mono,
                  },
                ]}
              >
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step,
  label,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  suffix?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel label={label} />
      <View style={fs.stepper}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - step))}
          style={[
            fs.stepperBtn,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text
            style={[
              fs.stepperBtnText,
              { color: theme.colors.textPrimary, fontFamily: theme.fonts.body },
            ]}
          >
            −
          </Text>
        </TouchableOpacity>
        <View style={[fs.stepperValue, { borderColor: theme.colors.border }]}>
          <Text
            style={[
              fs.stepperValueText,
              { color: theme.colors.textPrimary, fontFamily: theme.fonts.mono },
            ]}
          >
            {value}
            {suffix || ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + step))}
          style={[
            fs.stepperBtn,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <Text
            style={[
              fs.stepperBtnText,
              { color: theme.colors.textPrimary, fontFamily: theme.fonts.body },
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AddTaskModal({
  visible,
  onClose,
  editTask: taskToEdit,
}: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { categories, addTask, editTask, todaySchedule, user } =
    useDayForgeStore();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const startMins = timeToMinutes(user?.dayStart || "06:00");
  const endMins = timeToMinutes(user?.dayEnd || "21:00");
  const isEditMode = !!taskToEdit;

  useEffect(() => {
    if (visible && taskToEdit) {
      const load = async () => {
        const rule = await getRecurrenceRule(taskToEdit.id);
        setForm({
          name: taskToEdit.name,
          categoryId: taskToEdit.categoryId,
          priority: taskToEdit.priority,
          duration: taskToEdit.duration,
          frequency: rule?.frequency || "once",
          time: taskToEdit.time || "09:00",
          preferredTime: taskToEdit.preferredTime || "09:00",
          earliestStart: taskToEdit.earliestStart || "06:00",
          latestEnd: taskToEdit.latestEnd || "21:00",
          preferredTimeOptional: taskToEdit.preferredTime || "09:00",
          priorityTier: taskToEdit.priorityTier,
          bufferAfter: taskToEdit.bufferAfter,
          travelTo: taskToEdit.travelTo,
          travelFrom: taskToEdit.travelFrom,
          notificationEnabled: taskToEdit.notificationEnabled,
          notificationMinutesBefore: taskToEdit.notificationMinutesBefore,
          notes: taskToEdit.notes || "",
          customDays: rule?.customDays || [],
          startDate: rule?.startDate || todayString(),
          endDate: rule?.endDate || "",
          occurrences: rule?.occurrences || 0,
          showExpanded: false,
        });
      };
      load();
    } else if (visible) {
      const firstCat = categories[0];
      setForm({
        ...DEFAULT_FORM,
        categoryId: firstCat?.id || "",
        priority: firstCat?.defaultPriority ?? DEFAULT_FORM.priority,
        priorityTier:
          firstCat?.defaultPriorityTier ?? DEFAULT_FORM.priorityTier,
        duration: firstCat?.defaultDuration ?? DEFAULT_FORM.duration,
        bufferAfter: firstCat?.defaultBufferAfter ?? DEFAULT_FORM.bufferAfter,
        notificationEnabled:
          firstCat?.defaultNotificationEnabled ??
          DEFAULT_FORM.notificationEnabled,
      });
      setErrors({});
    }
  }, [visible, taskToEdit]);

  useEffect(() => {
    if (categories.length > 0 && !form.categoryId) {
      setForm((f) => ({ ...f, categoryId: categories[0].id }));
    }
  }, [categories]);

  const update = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const checkConflicts = (time: string, duration: number): string[] => {
    const newStart = timeToMinutes(time);
    const newEnd = newStart + duration;
    return todaySchedule
      .filter((st) => {
        if (taskToEdit && st.task.id === taskToEdit.id) return false;
        if (st.task.priority !== "fixed") return false;
        const s = timeToMinutes(st.instance.scheduledStart);
        const e = s + st.task.duration;
        return !(newEnd <= s || newStart >= e);
      })
      .map((st) => st.task.name);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Task name is required";
    if (!form.categoryId) e.category = "Please select a category";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const performSave = async () => {
    setSaving(true);
    try {
      const preferredTime =
        form.priority === "fixed"
          ? form.time
          : form.priority === "flexible"
            ? form.preferredTime
            : form.preferredTimeOptional;

      const taskData = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        priority: form.priority,
        priorityTier: form.priorityTier,
        duration: form.duration,
        bufferAfter: form.bufferAfter,
        time: form.priority === "fixed" ? form.time : undefined,
        preferredTime: form.priority !== "fixed" ? preferredTime : undefined,
        earliestStart:
          form.priority === "flexible" ? form.earliestStart : undefined,
        latestEnd: form.priority === "flexible" ? form.latestEnd : undefined,
        travelTo: form.travelTo,
        travelFrom: form.travelFrom,
        notificationEnabled: form.notificationEnabled,
        notificationMinutesBefore: form.notificationMinutesBefore,
        notes: form.notes || undefined,
        pausedUntil: undefined,
      };

      if (isEditMode && taskToEdit) {
        await editTask(taskToEdit.id, taskData);
      } else {
        await addTask(taskData, {
          frequency: form.frequency,
          startDate: form.startDate || todayString(),
          endDate: form.endDate || undefined,
          occurrences: form.occurrences > 0 ? form.occurrences : undefined,
          customDays: form.frequency === "custom" ? form.customDays : undefined,
          monthlyDay:
            form.frequency === "monthly" ? new Date().getDate() : undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error("Save task error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (form.priority === "fixed") {
      const conflicts = checkConflicts(form.time, form.duration);
      if (conflicts.length > 0) {
        Alert.alert(
          "Scheduling Conflict",
          `This task conflicts with: ${conflicts.join(", ")}. Both tasks will be saved and highlighted on your schedule.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Save Anyway", onPress: performSave },
          ],
        );
        return;
      }
    }
    await performSave();
  };

  const showTravel =
    isAppointmentCategory(form.categoryId) || form.priority === "fixed";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <TouchableOpacity
        style={fs.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={fs.kavContainer}
      >
        <View
          style={[
            fs.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[fs.handle, { backgroundColor: theme.colors.border }]} />
          <View style={fs.sheetHeader}>
            <Text
              style={[
                fs.sheetTitle,
                {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.fonts.heading,
                },
              ]}
              accessibilityRole="header"
            >
              {isEditMode ? "Edit Task" : "Add Task"}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={fs.closeTouchable}
            >
              <Text style={[fs.closeBtn, { color: theme.colors.textMuted }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={fs.formScroll}
            keyboardShouldPersistTaps="handled"
          >
            <FieldLabel label="Task name" required />
            <TextInput
              value={form.name}
              onChangeText={(v) => update({ name: v })}
              placeholder="e.g. Take medication"
              placeholderTextColor={theme.colors.textMuted}
              style={[
                fs.textInput,
                {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.fonts.body,
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: errors.name
                    ? theme.colors.danger
                    : theme.colors.border,
                },
              ]}
              autoFocus={!isEditMode}
              returnKeyType="done"
              accessibilityLabel="Task name"
            />
            {errors.name && (
              <Text
                style={[
                  fs.errorText,
                  { color: theme.colors.danger, fontFamily: theme.fonts.body },
                ]}
              >
                {errors.name}
              </Text>
            )}

            <FieldLabel label="Category" required />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      update({
                        categoryId: cat.id,
                        priority: cat.defaultPriority,
                        priorityTier: cat.defaultPriorityTier,
                        duration: cat.defaultDuration,
                        bufferAfter: cat.defaultBufferAfter,
                        notificationEnabled: cat.defaultNotificationEnabled,
                      });
                    }}
                    style={[
                      fs.categoryChip,
                      {
                        backgroundColor:
                          form.categoryId === cat.id
                            ? cat.color + "33"
                            : theme.colors.surfaceAlt,
                        borderColor:
                          form.categoryId === cat.id
                            ? cat.color
                            : theme.colors.border,
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={cat.label}
                    accessibilityState={{ checked: form.categoryId === cat.id }}
                  >
                    <View
                      style={[fs.categoryDot, { backgroundColor: cat.color }]}
                    />
                    <Text
                      style={[
                        fs.categoryChipText,
                        {
                          color:
                            form.categoryId === cat.id
                              ? cat.color
                              : theme.colors.textSecondary,
                          fontFamily: theme.fonts.body,
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <FieldLabel label="Type" required />
            <View style={[fs.priorityRow, { marginBottom: 16 }]}>
              {(["fixed", "flexible", "optional"] as TaskPriority[]).map(
                (p) => {
                  const colors = {
                    fixed: theme.colors.fixed,
                    flexible: theme.colors.flexible,
                    optional: theme.colors.optional,
                  };
                  const bgs = {
                    fixed: theme.colors.fixedSurface,
                    flexible: theme.colors.flexibleSurface,
                    optional: theme.colors.optionalSurface,
                  };
                  const isSelected = form.priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => update({ priority: p })}
                      style={[
                        fs.priorityBtn,
                        {
                          backgroundColor: isSelected
                            ? bgs[p]
                            : theme.colors.surfaceAlt,
                          borderColor: isSelected
                            ? colors[p]
                            : theme.colors.border,
                          flex: 1,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityLabel={p}
                      accessibilityState={{ checked: isSelected }}
                    >
                      <Text
                        style={[
                          fs.priorityBtnText,
                          {
                            color: isSelected
                              ? colors[p]
                              : theme.colors.textMuted,
                            fontFamily: theme.fonts.body,
                          },
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            {form.priority === "fixed" && (
              <TimePicker
                value={form.time}
                onChange={(v) => update({ time: v })}
                label="Time"
                startMins={startMins}
                endMins={endMins}
              />
            )}
            {form.priority === "flexible" && (
              <TimePicker
                value={form.preferredTime}
                onChange={(v) => update({ preferredTime: v })}
                label="Preferred time (optional)"
                startMins={startMins}
                endMins={endMins}
              />
            )}
            {form.priority === "optional" && (
              <TimePicker
                value={form.preferredTimeOptional}
                onChange={(v) => update({ preferredTimeOptional: v })}
                label="Preferred time (optional)"
                startMins={startMins}
                endMins={endMins}
              />
            )}
            <FieldLabel label="Duration" />
            <View style={[fs.durationRow, { marginBottom: 16 }]}>
              {DURATION_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => update({ duration: d })}
                  style={[
                    fs.durationChip,
                    {
                      backgroundColor:
                        form.duration === d
                          ? theme.colors.accent
                          : theme.colors.surfaceAlt,
                      borderColor:
                        form.duration === d
                          ? theme.colors.accent
                          : theme.colors.border,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={`${d} minutes`}
                  accessibilityState={{ checked: form.duration === d }}
                >
                  <Text
                    style={[
                      fs.durationChipText,
                      {
                        color:
                          form.duration === d
                            ? theme.colors.textOnAccent
                            : theme.colors.textSecondary,
                        fontFamily: theme.fonts.body,
                      },
                    ]}
                  >
                    {d >= 60 ? `${d / 60}h` : `${d}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel label="Repeat" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(
                  [
                    "once",
                    "daily",
                    "weekdays",
                    "weekends",
                    "weekly",
                    "monthly",
                    "custom",
                  ] as RecurrenceFrequency[]
                ).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => update({ frequency: f })}
                    style={[
                      fs.freqChip,
                      {
                        backgroundColor:
                          form.frequency === f
                            ? theme.colors.accent
                            : theme.colors.surfaceAlt,
                        borderColor:
                          form.frequency === f
                            ? theme.colors.accent
                            : theme.colors.border,
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={f}
                    accessibilityState={{ checked: form.frequency === f }}
                  >
                    <Text
                      style={[
                        fs.freqChipText,
                        {
                          color:
                            form.frequency === f
                              ? theme.colors.textOnAccent
                              : theme.colors.textSecondary,
                          fontFamily: theme.fonts.body,
                        },
                      ]}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {form.frequency === "custom" && (
              <View style={{ marginBottom: 16 }}>
                <FieldLabel label="Select days" />
                <View style={fs.daysRow}>
                  {DAYS.map((day, i) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => {
                        const days = form.customDays.includes(i)
                          ? form.customDays.filter((d) => d !== i)
                          : [...form.customDays, i];
                        update({ customDays: days });
                      }}
                      style={[
                        fs.dayChip,
                        {
                          backgroundColor: form.customDays.includes(i)
                            ? theme.colors.accent
                            : theme.colors.surfaceAlt,
                          borderColor: form.customDays.includes(i)
                            ? theme.colors.accent
                            : theme.colors.border,
                        },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityLabel={day}
                      accessibilityState={{
                        checked: form.customDays.includes(i),
                      }}
                    >
                      <Text
                        style={[
                          fs.dayChipText,
                          {
                            color: form.customDays.includes(i)
                              ? theme.colors.textOnAccent
                              : theme.colors.textSecondary,
                            fontFamily: theme.fonts.body,
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <SimpleDatePicker
              value={form.startDate}
              onChange={(v) => update({ startDate: v })}
              label="Start date"
            />

            <TouchableOpacity
              onPress={() => update({ showExpanded: !form.showExpanded })}
              style={[fs.expandBtn, { borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={
                form.showExpanded ? "Hide options" : "More options"
              }
            >
              <Text
                style={[
                  fs.expandBtnText,
                  { color: theme.colors.accent, fontFamily: theme.fonts.body },
                ]}
              >
                {form.showExpanded ? "▲ Fewer options" : "▼ More options"}
              </Text>
            </TouchableOpacity>

            {form.showExpanded && (
              <View style={fs.expandedSection}>
                <SectionHeader title="PRIORITY TIER" />
                <View style={[fs.priorityRow, { marginBottom: 16 }]}>
                  {(["high", "normal", "low"] as TaskPriorityTier[]).map(
                    (t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => update({ priorityTier: t })}
                        style={[
                          fs.priorityBtn,
                          {
                            backgroundColor:
                              form.priorityTier === t
                                ? theme.colors.accentSurface
                                : theme.colors.surfaceAlt,
                            borderColor:
                              form.priorityTier === t
                                ? theme.colors.accent
                                : theme.colors.border,
                            flex: 1,
                          },
                        ]}
                        accessibilityRole="radio"
                        accessibilityLabel={`${t} priority`}
                        accessibilityState={{
                          checked: form.priorityTier === t,
                        }}
                      >
                        <Text
                          style={[
                            fs.priorityBtnText,
                            {
                              color:
                                form.priorityTier === t
                                  ? theme.colors.accent
                                  : theme.colors.textMuted,
                              fontFamily: theme.fonts.body,
                            },
                          ]}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>

                <NumberStepper
                  value={form.bufferAfter}
                  onChange={(v) => update({ bufferAfter: v })}
                  min={0}
                  max={60}
                  step={5}
                  label="Gap after task"
                  suffix=" min"
                />

                {showTravel && (
                  <>
                    <SectionHeader title="TRAVEL TIME" />
                    <NumberStepper
                      value={form.travelTo}
                      onChange={(v) => update({ travelTo: v })}
                      min={0}
                      max={120}
                      step={5}
                      label="Travel to"
                      suffix=" min"
                    />
                    <NumberStepper
                      value={form.travelFrom}
                      onChange={(v) => update({ travelFrom: v })}
                      min={0}
                      max={120}
                      step={5}
                      label="Travel from"
                      suffix=" min"
                    />
                  </>
                )}

                <SectionHeader title="END DATE (OPTIONAL)" />
                <SimpleDatePicker
                  value={form.endDate || todayString()}
                  onChange={(v) => update({ endDate: v })}
                  label="Stop repeating after"
                />

                <SectionHeader title="NOTIFICATIONS" />
                <View style={[fs.switchRow, { marginBottom: 12 }]}>
                  <Text
                    style={[
                      fs.switchLabel,
                      {
                        color: theme.colors.textPrimary,
                        fontFamily: theme.fonts.body,
                      },
                    ]}
                  >
                    Notify me
                  </Text>
                  <Switch
                    value={form.notificationEnabled}
                    onValueChange={(v) => update({ notificationEnabled: v })}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.accent,
                    }}
                    thumbColor={theme.colors.textOnAccent}
                    accessibilityLabel="Enable notification"
                  />
                </View>
                {form.notificationEnabled && (
                  <NumberStepper
                    value={form.notificationMinutesBefore}
                    onChange={(v) => update({ notificationMinutesBefore: v })}
                    min={5}
                    max={120}
                    step={5}
                    label="Minutes before"
                    suffix=" min"
                  />
                )}

                <SectionHeader title="NOTES" />
                <TextInput
                  value={form.notes}
                  onChangeText={(v) => update({ notes: v })}
                  placeholder="Any additional notes..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={3}
                  style={[
                    fs.notesInput,
                    {
                      color: theme.colors.textPrimary,
                      fontFamily: theme.fonts.body,
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  accessibilityLabel="Notes"
                />
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[
              fs.saveBtn,
              {
                backgroundColor: saving
                  ? theme.colors.border
                  : theme.colors.accent,
                minHeight: 52,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? "Update task" : "Save task"}
            accessibilityState={{ disabled: saving }}
          >
            <Text
              style={[
                fs.saveBtnText,
                {
                  color: theme.colors.textOnAccent,
                  fontFamily: theme.fonts.heading,
                },
              ]}
            >
              {saving ? "Saving..." : isEditMode ? "Update Task" : "Add Task"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  kavContainer: { justifyContent: "flex-end" },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
    maxHeight: "92%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20 },
  closeTouchable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: { fontSize: 18 },
  formScroll: { flexGrow: 0 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  sectionHeader: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 48,
    marginBottom: 16,
  },
  errorText: { fontSize: 12, marginTop: -12, marginBottom: 12 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryChipText: { fontSize: 13 },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 44,
  },
  priorityBtnText: { fontSize: 14 },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  durationChipText: { fontSize: 14 },
  freqChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  freqChipText: { fontSize: 13 },
  daysRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipText: { fontSize: 12 },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  timeChipText: { fontSize: 13 },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateChipText: { fontSize: 13 },
  expandBtn: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
    minHeight: 44,
  },
  expandBtnText: { fontSize: 14 },
  expandedSection: { gap: 4 },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepperBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  stepperBtnText: { fontSize: 20, lineHeight: 24 },
  stepperValue: {
    flex: 1,
    height: 44,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueText: { fontSize: 15 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
  },
  switchLabel: { fontSize: 15 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  saveBtn: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnText: { fontSize: 17 },
});
