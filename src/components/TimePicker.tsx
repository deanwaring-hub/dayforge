// src/components/TimePicker.tsx
// Two-step grid time picker
// Step 1: tap an hour
// Step 2: tap minutes (00, 15, 30, 45)
// Filtered to user's active day hours

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { timeToMinutes } from '../database/db';

type Props = {
  value: string;           // HH:MM
  onChange: (v: string) => void;
  label: string;
  startMins: number;       // user's day start in minutes
  endMins: number;         // user's day end in minutes
};

export default function TimePicker({ value, onChange, label, startMins, endMins }: Props) {
  const { theme } = useTheme();

  const startHour = Math.floor(startMins / 60);
  const endHour = Math.ceil(endMins / 60);

  // Parse current value
  const [selHour, setSelHour] = useState<number>(() => {
    if (!value) return startHour;
    return parseInt(value.split(':')[0], 10);
  });
  const [selMin, setSelMin] = useState<number>(() => {
    if (!value) return 0;
    return parseInt(value.split(':')[1], 10);
  });
  const [step, setStep] = useState<'hour' | 'minute'>('hour');

  // Sync value → internal state when value changes externally
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setSelHour(h);
      setSelMin(m);
    }
  }, [value]);

  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  ).filter(h => h <= 23);

  const minutes = [0, 15, 30, 45];

  const pad = (n: number) => String(n).padStart(2, '0');

  const handleHourSelect = (h: number) => {
    setSelHour(h);
    setStep('minute');
  };

  const handleMinuteSelect = (m: number) => {
    setSelMin(m);
    const newValue = `${pad(selHour)}:${pad(m)}`;
    onChange(newValue);
    setStep('hour');
  };

  const displayValue = `${pad(selHour)}:${pad(selMin)}`;

  return (
    <View style={{ marginBottom: 16 }}>
      {/* Label + current value */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
          {label}
        </Text>
        <TouchableOpacity
          onPress={() => setStep(step === 'hour' ? 'minute' : 'hour')}
          style={[styles.valueChip, { backgroundColor: theme.colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel={`Selected time ${displayValue}, tap to change`}
        >
          <Text style={[styles.valueText, { color: theme.colors.textOnAccent, fontFamily: theme.fonts.mono }]}>
            {displayValue}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        <TouchableOpacity onPress={() => setStep('hour')} style={styles.stepBtn}
          accessibilityRole="button" accessibilityLabel="Select hour">
          <Text style={[styles.stepLabel, {
            color: step === 'hour' ? theme.colors.accent : theme.colors.textMuted,
            fontFamily: theme.fonts.body,
          }]}>
            Hour
          </Text>
          {step === 'hour' && <View style={[styles.stepUnderline, { backgroundColor: theme.colors.accent }]} />}
        </TouchableOpacity>
        <Text style={[styles.stepSep, { color: theme.colors.textMuted }]}>›</Text>
        <TouchableOpacity onPress={() => setStep('minute')} style={styles.stepBtn}
          accessibilityRole="button" accessibilityLabel="Select minutes">
          <Text style={[styles.stepLabel, {
            color: step === 'minute' ? theme.colors.accent : theme.colors.textMuted,
            fontFamily: theme.fonts.body,
          }]}>
            Minutes
          </Text>
          {step === 'minute' && <View style={[styles.stepUnderline, { backgroundColor: theme.colors.accent }]} />}
        </TouchableOpacity>
      </View>

      {/* Hour grid */}
      {step === 'hour' && (
        <View style={styles.grid}>
          {hours.map(h => {
            const isSelected = h === selHour;
            return (
              <TouchableOpacity
                key={h}
                onPress={() => handleHourSelect(h)}
                style={[styles.cell, {
                  backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceAlt,
                  borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                }]}
                accessibilityRole="radio"
                accessibilityLabel={`${h}:00`}
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={[styles.cellText, {
                  color: isSelected ? theme.colors.textOnAccent : theme.colors.textPrimary,
                  fontFamily: theme.fonts.mono,
                }]}>
                  {pad(h)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Minute grid */}
      {step === 'minute' && (
        <View>
          <Text style={[styles.hourContext, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
            {pad(selHour)} :
          </Text>
          <View style={styles.minuteGrid}>
            {minutes.map(m => {
              const isSelected = m === selMin;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => handleMinuteSelect(m)}
                  style={[styles.minuteCell, {
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceAlt,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  }]}
                  accessibilityRole="radio"
                  accessibilityLabel={`${pad(selHour)}:${pad(m)}`}
                  accessibilityState={{ checked: isSelected }}
                >
                  <Text style={[styles.minuteCellText, {
                    color: isSelected ? theme.colors.textOnAccent : theme.colors.textPrimary,
                    fontFamily: theme.fonts.mono,
                  }]}>
                    :{pad(m)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
  },
  valueChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  stepBtn: {
    paddingBottom: 4,
    minHeight: 32,
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 12,
  },
  stepUnderline: {
    height: 2,
    borderRadius: 1,
    marginTop: 2,
  },
  stepSep: {
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '13%',
    aspectRatio: 1.4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  cellText: {
    fontSize: 14,
  },
  hourContext: {
    fontSize: 22,
    marginBottom: 12,
  },
  minuteGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  minuteCell: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  minuteCellText: {
    fontSize: 18,
  },
});
