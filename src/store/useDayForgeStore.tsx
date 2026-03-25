// src/store/useDayForgeStore.tsx

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { getUser, updateUser, completeOnboarding, type User } from '../database/queries/userQueries';
import { getCategories, createCategory, updateCategory, deleteCategory, type Category } from '../database/queries/categoryQueries';
import { getAllTasks, createTask, updateTask, deleteTask, pauseTask, resumeTask, type Task, type CreateTaskData } from '../database/queries/taskQueries';
import { getRecurrenceRule, createRecurrenceRule, taskOccursOn, type RecurrenceRule, type RecurrenceFrequency } from '../database/queries/recurrenceQueries';
import { createInstance, updateInstanceStatus, incrementSnoozeCount, type TaskInstance } from '../database/queries/instanceQueries';
import { calculateAndSaveScore, getScoreForDate, type DailyScore } from '../database/queries/scoreQueries';
import { todayString, timeToMinutes, minutesToTime } from '../database/db';

export type ScheduledTask = {
  instance: TaskInstance;
  task: Task;
  category: Category;
  recurrenceRule: RecurrenceRule | null;
};

type State = {
  user: User | null;
  isOnboarded: boolean;
  categories: Category[];
  tasks: Task[];
  todayDate: string;
  todaySchedule: ScheduledTask[];
  todayScore: DailyScore | null;
  isScheduleBuilt: boolean;
  isLoading: boolean;
  error: string | null;
};

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ONBOARDED'; payload: boolean }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_SCHEDULE'; payload: { schedule: ScheduledTask[]; score: DailyScore | null } }
  | { type: 'SET_SCORE'; payload: DailyScore | null }
  | { type: 'UPDATE_INSTANCE'; payload: { instanceId: string; status: string; completedAt?: string; snoozeCount?: number } };

const initialState: State = {
  user: null,
  isOnboarded: false,
  categories: [],
  tasks: [],
  todayDate: todayString(),
  todaySchedule: [],
  todayScore: null,
  isScheduleBuilt: false,
  isLoading: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_USER': return { ...state, user: action.payload };
    case 'SET_ONBOARDED': return { ...state, isOnboarded: action.payload };
    case 'SET_CATEGORIES': return { ...state, categories: action.payload };
    case 'SET_TASKS': return { ...state, tasks: action.payload };
    case 'SET_SCHEDULE': return { ...state, todaySchedule: action.payload.schedule, todayScore: action.payload.score, isScheduleBuilt: true };
    case 'SET_SCORE': return { ...state, todayScore: action.payload };
    case 'UPDATE_INSTANCE':
      return {
        ...state,
        todaySchedule: state.todaySchedule.map(st =>
          st.instance.id === action.payload.instanceId
            ? { ...st, instance: { ...st.instance, status: action.payload.status as any, completedAt: action.payload.completedAt, snoozeCount: action.payload.snoozeCount ?? st.instance.snoozeCount } }
            : st
        ),
      };
    default: return state;
  }
}

type SlottedTask = {
  task: Task;
  rule: RecurrenceRule;
  startMins: number;
  endMins: number;
  displayStart: number;
  displayEnd: number;
  hasConflict?: boolean;
};

function buildScheduleAlgo(
  tasks: Task[],
  rules: Map<string, RecurrenceRule>,
  dateStr: string,
  dayStartMins: number,
  dayEndMins: number,
  effectiveStartMins: number,
): SlottedTask[] {
  const tierOrder: Record<string, number> = { high: 0, normal: 1, low: 2 };

  const occurring = tasks.filter(task => {
    const rule = rules.get(task.id);
    if (!rule) return false;
    if (task.pausedUntil && dateStr <= task.pausedUntil) return false;
    return taskOccursOn(rule, dateStr);
  });

  const fixed = occurring.filter(t => t.priority === 'fixed').sort((a, b) => timeToMinutes(a.time || '00:00') - timeToMinutes(b.time || '00:00'));
  const flexible = occurring.filter(t => t.priority === 'flexible').sort((a, b) => tierOrder[a.priorityTier] - tierOrder[b.priorityTier]);
  const optional = occurring.filter(t => t.priority === 'optional').sort((a, b) => tierOrder[a.priorityTier] - tierOrder[b.priorityTier]);

  const scheduled: SlottedTask[] = [];

  const overlaps = (start: number, end: number) =>
    scheduled.some(s => !(end <= s.startMins || start >= s.endMins));

  const tryPlace = (task: Task, rule: RecurrenceRule, preferredStart: number): boolean => {
    const travelTo = task.travelTo || 0;
    const travelFrom = task.travelFrom || 0;
    const bufferAfter = task.bufferAfter || 10;
    const blockStart = preferredStart - travelTo;
    const blockEnd = preferredStart + task.duration + travelFrom + bufferAfter;
    if (blockStart < dayStartMins || blockEnd > dayEndMins || overlaps(blockStart, blockEnd)) return false;
    scheduled.push({ task, rule, startMins: blockStart, endMins: blockEnd, displayStart: preferredStart, displayEnd: preferredStart + task.duration });
    return true;
  };

  // Fixed tasks — placed at exact time, conflicts detected and both marked
  const conflictingTaskIds = new Set<string>();

  for (const task of fixed) {
    const rule = rules.get(task.id)!;
    const timeMins = timeToMinutes(task.time || '09:00');
    const travelTo = task.travelTo || 0;
    const travelFrom = task.travelFrom || 0;
    const bufferAfter = task.bufferAfter || 10;
    const blockStart = timeMins - travelTo;
    const blockEnd = timeMins + task.duration + travelFrom + bufferAfter;

    if (overlaps(blockStart, blockEnd)) {
      conflictingTaskIds.add(task.id);
      const conflicting = scheduled.find(s => !(blockEnd <= s.startMins || blockStart >= s.endMins));
      if (conflicting) conflictingTaskIds.add(conflicting.task.id);
      scheduled.push({ task, rule, startMins: blockStart, endMins: blockEnd, displayStart: timeMins, displayEnd: timeMins + task.duration });
    } else {
      tryPlace(task, rule, timeMins);
    }
  }

  // Flexible tasks — never placed before effectiveStartMins
  for (const task of flexible) {
    const rule = rules.get(task.id)!;
    const rawPreferred = task.preferredTime ? timeToMinutes(task.preferredTime) : effectiveStartMins;
    const preferred = Math.max(rawPreferred, effectiveStartMins);
    const rawEarliest = task.earliestStart ? timeToMinutes(task.earliestStart) : dayStartMins;
    const earliest = Math.max(rawEarliest, effectiveStartMins);
    const latest = task.latestEnd ? timeToMinutes(task.latestEnd) - task.duration : dayEndMins - task.duration;

    let placed = false;
    for (let offset = 0; offset <= 120; offset += 15) {
      if (preferred + offset <= latest && preferred + offset >= earliest && tryPlace(task, rule, preferred + offset)) { placed = true; break; }
      if (offset > 0 && preferred - offset >= earliest && preferred - offset >= effectiveStartMins && preferred - offset <= latest && tryPlace(task, rule, preferred - offset)) { placed = true; break; }
    }
    if (!placed) { for (let t = earliest; t <= latest; t += 15) { if (tryPlace(task, rule, t)) break; } }
  }

  // Optional tasks — never placed before effectiveStartMins
  for (const task of optional) {
    const rule = rules.get(task.id)!;
    const rawPreferred = task.preferredTime ? timeToMinutes(task.preferredTime) : effectiveStartMins;
    const preferred = Math.max(rawPreferred, effectiveStartMins);
    for (let offset = 0; offset <= 240; offset += 15) {
      if (tryPlace(task, rule, preferred + offset)) break;
      if (offset > 0 && tryPlace(task, rule, preferred - offset)) break;
    }
  }

  // Mark conflicting tasks
  for (const slot of scheduled) {
    if (conflictingTaskIds.has(slot.task.id)) slot.hasConflict = true;
  }

  return scheduled.sort((a, b) => a.displayStart - b.displayStart);
}

type StoreContextType = State & {
  initialise: () => Promise<void>;
  finishOnboarding: (s: { dayStart: string; dayEnd: string; theme: string }) => Promise<void>;
  updateUserSettings: (patch: Partial<User>) => Promise<void>;
  loadCategories: () => Promise<void>;
  addCategory: (data: { label: string; color: string }) => Promise<void>;
  editCategory: (id: string, patch: Partial<Category>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  loadTasks: () => Promise<void>;
  addTask: (data: CreateTaskData, recurrence: { frequency: RecurrenceFrequency; startDate: string; endDate?: string; occurrences?: number; customDays?: number[]; monthlyDay?: number }) => Promise<void>;
  editTask: (id: string, patch: Partial<CreateTaskData>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  pauseTaskUntil: (id: string, pausedUntil: string) => Promise<void>;
  resumeTaskNow: (id: string) => Promise<void>;
  buildTodaySchedule: () => Promise<void>;
  refreshScore: () => Promise<void>;
  completeTask: (instanceId: string) => Promise<void>;
  uncompleteTask: (instanceId: string) => Promise<void>;
  skipTask: (instanceId: string) => Promise<void>;
  snoozeTask: (instanceId: string, snoozedUntil: string) => Promise<void>;
};

const StoreContext = createContext<StoreContextType | null>(null);

export function DayForgeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const buildScheduleFromData = useCallback(async (tasks: Task[], categories: Category[], user: User) => {
    const dayStartMins = timeToMinutes(user.dayStart);
    const dayEndMins = timeToMinutes(user.dayEnd);
    const todayDate = todayString();

    const now = new Date();
    const currentTimeMins = now.getHours() * 60 + now.getMinutes();
    const effectiveStartMins = Math.max(dayStartMins, currentTimeMins);

    const rules = new Map<string, RecurrenceRule>();
    for (const task of tasks) {
      const rule = await getRecurrenceRule(task.id);
      if (rule) rules.set(task.id, rule);
    }

    const slotted = buildScheduleAlgo(tasks, rules, todayDate, dayStartMins, dayEndMins, effectiveStartMins);

    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const scheduledTasks: ScheduledTask[] = [];

    for (const slot of slotted) {
      const instance = await createInstance({
        taskId: slot.task.id,
        date: todayDate,
        scheduledStart: minutesToTime(slot.displayStart),
        scheduledEnd: minutesToTime(slot.displayEnd),
        hasConflict: slot.hasConflict ?? false,
      });
      const category = categoryMap.get(slot.task.categoryId);
      if (category) scheduledTasks.push({ instance, task: slot.task, category, recurrenceRule: slot.rule });
    }

    const score = await getScoreForDate(todayDate);
    dispatch({ type: 'SET_SCHEDULE', payload: { schedule: scheduledTasks, score } });
  }, []);

  const buildTodaySchedule = useCallback(async () => {
    const { tasks, categories, user } = stateRef.current;
    if (!user) return;
    await buildScheduleFromData(tasks, categories, user);
  }, [buildScheduleFromData]);

  const initialise = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [user, categories, tasks] = await Promise.all([getUser(), getCategories(), getAllTasks()]);
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_ONBOARDED', payload: user?.onboarded ?? false });
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
      dispatch({ type: 'SET_TASKS', payload: tasks });
      dispatch({ type: 'SET_LOADING', payload: false });
      if (user?.onboarded && user && categories && tasks) await buildScheduleFromData(tasks, categories, user);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialise' });
      console.error('Initialise error:', error);
    }
  }, [buildScheduleFromData]);

  const finishOnboarding = useCallback(async (settings: { dayStart: string; dayEnd: string; theme: string }) => {
    await completeOnboarding(settings);
    const user = await getUser();
    dispatch({ type: 'SET_USER', payload: user });
    dispatch({ type: 'SET_ONBOARDED', payload: true });
    if (user) await buildScheduleFromData(stateRef.current.tasks, stateRef.current.categories, user);
  }, [buildScheduleFromData]);

  const updateUserSettings = useCallback(async (patch: Partial<User>) => {
    await updateUser(patch);
    const user = await getUser();
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const loadCategories = useCallback(async () => {
    const categories = await getCategories();
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
  }, []);

  const addCategory = useCallback(async (data: { label: string; color: string }) => {
    await createCategory(data);
    const categories = await getCategories();
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
  }, []);

  const editCategory = useCallback(async (id: string, patch: Partial<Category>) => {
    await updateCategory(id, patch);
    const categories = await getCategories();
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    const categories = await getCategories();
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
  }, []);

  const loadTasks = useCallback(async () => {
    const tasks = await getAllTasks();
    dispatch({ type: 'SET_TASKS', payload: tasks });
  }, []);

  const addTask = useCallback(async (data: CreateTaskData, recurrence: { frequency: RecurrenceFrequency; startDate: string; endDate?: string; occurrences?: number; customDays?: number[]; monthlyDay?: number }) => {
    const task = await createTask(data);
    await createRecurrenceRule({ taskId: task.id, ...recurrence });
    const tasks = await getAllTasks();
    dispatch({ type: 'SET_TASKS', payload: tasks });
    const { categories, user } = stateRef.current;
    if (user) await buildScheduleFromData(tasks, categories, user);
  }, [buildScheduleFromData]);

  const editTask = useCallback(async (id: string, patch: Partial<CreateTaskData>) => {
    await updateTask(id, patch);
    const tasks = await getAllTasks();
    dispatch({ type: 'SET_TASKS', payload: tasks });
    const { categories, user } = stateRef.current;
    if (user) await buildScheduleFromData(tasks, categories, user);
  }, [buildScheduleFromData]);

  const removeTask = useCallback(async (id: string) => {
    await deleteTask(id);
    const tasks = await getAllTasks();
    dispatch({ type: 'SET_TASKS', payload: tasks });
    const { categories, user } = stateRef.current;
    if (user) await buildScheduleFromData(tasks, categories, user);
  }, [buildScheduleFromData]);

  const pauseTaskUntil = useCallback(async (id: string, pausedUntil: string) => {
    await pauseTask(id, pausedUntil);
    const tasks = await getAllTasks();
    dispatch({ type: 'SET_TASKS', payload: tasks });
    const { categories, user } = stateRef.current;
    if (user) await buildScheduleFromData(tasks, categories, user);
  }, [buildScheduleFromData]);

  const resumeTaskNow = useCallback(async (id: string) => {
    await resumeTask(id);
    const tasks = await getAllTasks();
    dispatch({ type: 'SET_TASKS', payload: tasks });
    const { categories, user } = stateRef.current;
    if (user) await buildScheduleFromData(tasks, categories, user);
  }, [buildScheduleFromData]);

  const refreshScore = useCallback(async () => {
    const score = await calculateAndSaveScore(stateRef.current.todayDate);
    dispatch({ type: 'SET_SCORE', payload: score });
  }, []);

  const completeTask = useCallback(async (instanceId: string) => {
    await updateInstanceStatus(instanceId, 'completed');
    dispatch({ type: 'UPDATE_INSTANCE', payload: { instanceId, status: 'completed', completedAt: new Date().toISOString() } });
    const score = await calculateAndSaveScore(stateRef.current.todayDate);
    dispatch({ type: 'SET_SCORE', payload: score });
  }, []);

  const uncompleteTask = useCallback(async (instanceId: string) => {
    await updateInstanceStatus(instanceId, 'pending');
    dispatch({ type: 'UPDATE_INSTANCE', payload: { instanceId, status: 'pending', completedAt: undefined } });
    const score = await calculateAndSaveScore(stateRef.current.todayDate);
    dispatch({ type: 'SET_SCORE', payload: score });
  }, []);

  const skipTask = useCallback(async (instanceId: string) => {
    await updateInstanceStatus(instanceId, 'skipped');
    dispatch({ type: 'UPDATE_INSTANCE', payload: { instanceId, status: 'skipped' } });
    const score = await calculateAndSaveScore(stateRef.current.todayDate);
    dispatch({ type: 'SET_SCORE', payload: score });
  }, []);

  const snoozeTask = useCallback(async (instanceId: string, snoozedUntil: string) => {
    const newCount = await incrementSnoozeCount(instanceId);
    await updateInstanceStatus(instanceId, 'snoozed', { snoozedUntil });
    dispatch({ type: 'UPDATE_INSTANCE', payload: { instanceId, status: 'snoozed', snoozeCount: newCount } });
    const score = await calculateAndSaveScore(stateRef.current.todayDate);
    dispatch({ type: 'SET_SCORE', payload: score });
  }, []);

  const value: StoreContextType = {
    ...state,
    initialise, finishOnboarding, updateUserSettings,
    loadCategories, addCategory, editCategory, removeCategory,
    loadTasks, addTask, editTask, removeTask, pauseTaskUntil, resumeTaskNow,
    buildTodaySchedule, refreshScore,
    completeTask, uncompleteTask, skipTask, snoozeTask,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDayForgeStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useDayForgeStore must be used within a DayForgeProvider');
  return context;
}
