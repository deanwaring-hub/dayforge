// src/navigation/TabNavigator.tsx
// Bottom tab navigation for DayForge
// Centre tab opens Add Task modal sheet rather than navigating to a screen

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

// Screens
import TodayScreen from '../screens/TodayScreen';
import CalendarScreen from '../screens/CalendarScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Modal
import AddTaskModal from '../components/AddTaskModal';

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

function TabIcon({
  label,
  focused,
  color,
  isAdd = false,
}: {
  label: string;
  focused: boolean;
  color: string;
  isAdd?: boolean;
}) {
  const { theme } = useTheme();

  if (isAdd) {
    return (
      <View
        style={[
          styles.addButton,
          {
            backgroundColor: theme.colors.accent,
            shadowColor: theme.colors.accent,
          },
        ]}
        accessibilityLabel="Add task"
        accessibilityRole="button"
        accessibilityHint="Opens the add task form"
      >
        <Text
          style={{
            color: theme.colors.textOnAccent,
            fontSize: 28,
            lineHeight: 32,
            fontFamily: theme.fonts.body,
          }}
        >
          +
        </Text>
      </View>
    );
  }

  // Tab icons using text symbols — replace with icon library later
  const icons: Record<string, string> = {
    Today: '◈',
    Calendar: '▦',
    Dashboard: '▤',
    Settings: '◉',
  };

  return (
    <View style={styles.iconContainer}>
      <Text
        style={{
          fontSize: focused ? 22 : 20,
          color,
          opacity: focused ? 1 : 0.7,
        }}
        accessibilityElementsHidden
      >
        {icons[label] || '●'}
      </Text>
    </View>
  );
}

// ─── CUSTOM TAB BAR ───────────────────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [addTaskVisible, setAddTaskVisible] = useState(false);

  return (
    <>
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.tabBar,
            borderTopColor: theme.colors.tabBarBorder,
            paddingBottom: insets.bottom,
          },
        ]}
        accessibilityRole="tablist"
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const isAdd = route.name === 'AddTask';

          const onPress = () => {
            if (isAdd) {
              setAddTaskVisible(true);
              return;
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = focused
            ? theme.colors.tabActive
            : theme.colors.tabInactive;

          const label = route.name === 'AddTask' ? 'Add' : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tabItem, isAdd && styles.addTabItem]}
              accessibilityRole="tab"
              accessibilityLabel={
                isAdd ? 'Add task' : `${route.name} tab`
              }
              accessibilityState={{ selected: focused }}
              accessibilityHint={
                isAdd
                  ? 'Opens the add task form'
                  : `Navigate to ${route.name}`
              }
            >
              <TabIcon
                label={route.name}
                focused={focused}
                color={color}
                isAdd={isAdd}
              />
              {!isAdd && (
                <Text
                  style={{
                    color,
                    fontSize: theme.fontSizes.xs,
                    fontFamily: theme.fonts.body,
                    marginTop: 2,
                    opacity: focused ? 1 : 0.7,
                  }}
                  accessibilityElementsHidden
                >
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <AddTaskModal
        visible={addTaskVisible}
        onClose={() => setAddTaskVisible(false)}
      />
    </>
  );
}

// ─── NAVIGATOR ────────────────────────────────────────────────────────────────

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="AddTask" component={TodayScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    minHeight: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 44,
    minWidth: 44,
  },
  addTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
