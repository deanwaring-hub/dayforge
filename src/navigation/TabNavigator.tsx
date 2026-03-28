// src/navigation/TabNavigator.tsx
// Bottom tab navigation for DayForge
// Centre tab opens Add Task modal sheet
// Exports openEditTaskModal for use from TodayScreen
// Auto-creates General category if all categories deleted

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

import TodayScreen from '../screens/TodayScreen';
import CalendarScreen from '../screens/CalendarScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddTaskModal from '../components/AddTaskModal';
import type { Task } from '../database/queries/taskQueries';
import { useDayForgeStore } from '../store/useDayForgeStore';

// ─── EDIT TASK EVENT ──────────────────────────────────────────────────────────

type EditTaskCallback = (task: Task) => void;
let _editTaskCallback: EditTaskCallback | null = null;

export function openEditTaskModal(task: Task) {
  _editTaskCallback?.(task);
}

// ─── TAB PARAM LIST ───────────────────────────────────────────────────────────

export type TabParamList = {
  Today: undefined;
  Calendar: undefined;
  AddTask: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// ─── TAB ICON ─────────────────────────────────────────────────────────────────

function TabIcon({ label, focused, color, isAdd = false }: {
  label: string; focused: boolean; color: string; isAdd?: boolean;
}) {
  const { theme } = useTheme();

  if (isAdd) {
    return (
      <View style={[styles.addButton, { backgroundColor: theme.colors.accent, shadowColor: theme.colors.accent }]}
        accessibilityLabel="Add task" accessibilityRole="button" accessibilityHint="Opens the add task form">
        <Text style={{ color: theme.colors.textOnAccent, fontSize: 28, lineHeight: 32, fontFamily: theme.fonts.body }}>+</Text>
      </View>
    );
  }

  const icons: Record<string, string> = {
    Today: '◈', Calendar: '▦', Dashboard: '▤', Settings: '◉',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={{ fontSize: focused ? 22 : 20, color, opacity: focused ? 1 : 0.7 }} accessibilityElementsHidden>
        {icons[label] || '●'}
      </Text>
    </View>
  );
}

// ─── CUSTOM TAB BAR ───────────────────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { categories, addCategory } = useDayForgeStore();
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    _editTaskCallback = (task: Task) => {
      setEditingTask(task);
      setAddTaskVisible(true);
    };
    return () => { _editTaskCallback = null; };
  }, []);

  const handleOpenAddTask = async () => {
    // If no categories exist, create General before opening the form
    if (categories.length === 0) {
      await addCategory({
        label: 'General',
        color: '#8892B0',
        defaultPriority: 'flexible',
        defaultPriorityTier: 'normal',
        defaultDuration: 30,
        defaultBufferAfter: 10,
        defaultNotificationEnabled: true,
      });
    }
    setAddTaskVisible(true);
  };

  const handleCloseModal = () => {
    setAddTaskVisible(false);
    setEditingTask(null);
  };

  return (
    <>
      <View
        style={[styles.tabBar, {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          paddingBottom: insets.bottom,
        }]}
        accessibilityRole="tablist">
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const isAdd = route.name === 'AddTask';
          const color = focused ? theme.colors.tabActive : theme.colors.tabInactive;
          const label = route.name === 'AddTask' ? 'Add' : route.name;

          const onPress = () => {
            if (isAdd) { handleOpenAddTask(); return; }
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) { navigation.navigate(route.name); }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tabItem, isAdd && styles.addTabItem]}
              accessibilityRole="tab"
              accessibilityLabel={isAdd ? 'Add task' : `${route.name} tab`}
              accessibilityState={{ selected: focused }}
              accessibilityHint={isAdd ? 'Opens the add task form' : `Navigate to ${route.name}`}>
              <TabIcon label={route.name} focused={focused} color={color} isAdd={isAdd} />
              {!isAdd && (
                <Text style={{ color, fontSize: theme.fontSizes.xs, fontFamily: theme.fonts.body, marginTop: 2, opacity: focused ? 1 : 0.7 }}
                  accessibilityElementsHidden>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <AddTaskModal
        visible={addTaskVisible}
        onClose={handleCloseModal}
        editTask={editingTask}
      />
    </>
  );
}

// ─── NAVIGATOR ────────────────────────────────────────────────────────────────

export default function TabNavigator() {
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="AddTask" component={TodayScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, minHeight: 60 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, minHeight: 44, minWidth: 44 },
  addTabItem: { alignItems: 'center', justifyContent: 'center' },
  iconContainer: { alignItems: 'center', justifyContent: 'center', minHeight: 28 },
  addButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: -20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});
