// src/screens/CategoriesScreen.tsx
// Manage categories — add, edit, delete
// Colour picker with 12 options
// Task defaults per category

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useDayForgeStore } from '../store/useDayForgeStore';
import { CATEGORY_COLOURS, type Category } from '../database/queries/categoryQueries';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

type Props = {
  onClose?: () => void;
};

type FormState = {
  label: string;
  color: string;
  defaultPriority: 'fixed' | 'flexible' | 'optional';
  defaultPriorityTier: 'high' | 'normal' | 'low';
  defaultDuration: number;
  defaultBufferAfter: number;
  defaultNotificationEnabled: boolean;
};

const EMPTY_FORM: FormState = {
  label: '',
  color: CATEGORY_COLOURS[0],
  defaultPriority: 'flexible',
  defaultPriorityTier: 'normal',
  defaultDuration: 30,
  defaultBufferAfter: 10,
  defaultNotificationEnabled: true,
};

function FieldLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text style={[cs.fieldLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.body }]}>
      {label}
    </Text>
  );
}

function CategoryFormModal({ visible, editCategory, onClose }: {
  visible: boolean;
  editCategory: Category | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { addCategory, editCategory: updateCategory } = useDayForgeStore();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      if (editCategory) {
        setForm({
          label: editCategory.label,
          color: editCategory.color,
          defaultPriority: editCategory.defaultPriority,
          defaultPriorityTier: editCategory.defaultPriorityTier,
          defaultDuration: editCategory.defaultDuration,
          defaultBufferAfter: editCategory.defaultBufferAfter,
          defaultNotificationEnabled: editCategory.defaultNotificationEnabled,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [visible, editCategory]);

  const update = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.label.trim()) {
      Alert.alert('Name required', 'Please enter a category name.');
      return;
    }
    setSaving(true);
    try {
      if (editCategory) {
        await updateCategory(editCategory.id, {
          label: form.label.trim(),
          color: form.color,
          defaultPriority: form.defaultPriority,
          defaultPriorityTier: form.defaultPriorityTier,
          defaultDuration: form.defaultDuration,
          defaultBufferAfter: form.defaultBufferAfter,
          defaultNotificationEnabled: form.defaultNotificationEnabled,
        });
      } else {
        await addCategory({
          label: form.label.trim(),
          color: form.color,
          defaultPriority: form.defaultPriority,
          defaultPriorityTier: form.defaultPriorityTier,
          defaultDuration: form.defaultDuration,
          defaultBufferAfter: form.defaultBufferAfter,
          defaultNotificationEnabled: form.defaultNotificationEnabled,
        });
      }
      onClose();
    } catch (e) {
      console.error('Save category error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} accessibilityViewIsModal>
      <TouchableOpacity style={cs.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={[cs.sheet, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <View style={[cs.handle, { backgroundColor: theme.colors.border }]} />
        <View style={cs.sheetHeader}>
          <Text style={[cs.sheetTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>
            {editCategory ? 'Edit Category' : 'New Category'}
          </Text>
          <TouchableOpacity onPress={onClose} style={cs.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[cs.closeBtnText, { color: theme.colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Name */}
          <FieldLabel label="Category name" />
          <TextInput
            value={form.label}
            onChangeText={v => update({ label: v })}
            placeholder="e.g. Medical"
            placeholderTextColor={theme.colors.textMuted}
            style={[cs.textInput, {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.body,
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
            }]}
            autoFocus={!editCategory}
            returnKeyType="done"
            accessibilityLabel="Category name"
          />

          {/* Colour picker */}
          <FieldLabel label="Colour" />
          <View style={cs.colourGrid}>
            {CATEGORY_COLOURS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => update({ color: c })}
                style={[cs.colourSwatch, {
                  backgroundColor: c,
                  borderWidth: form.color === c ? 3 : 0,
                  borderColor: theme.colors.textPrimary,
                }]}
                accessibilityRole="radio"
                accessibilityLabel={c}
                accessibilityState={{ checked: form.color === c }}>
                {form.color === c && (
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Live preview */}
          <View style={[cs.previewPill, { backgroundColor: form.color + '22', borderColor: form.color }]}>
            <View style={[cs.previewDot, { backgroundColor: form.color }]} />
            <Text style={[cs.previewLabel, { color: form.color, fontFamily: theme.fonts.body }]}>
              {form.label || 'Preview'}
            </Text>
          </View>

          {/* Task defaults */}
          <Text style={[cs.sectionHeader, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
            TASK DEFAULTS
          </Text>
          <Text style={[cs.sectionSub, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
            When you add a task in this category, these values are pre-filled.
          </Text>

          <FieldLabel label="Default type" />
          <View style={[cs.segmentRow, { marginBottom: 16 }]}>
            {(['fixed', 'flexible', 'optional'] as const).map(p => {
              const colors = { fixed: theme.colors.fixed, flexible: theme.colors.flexible, optional: theme.colors.optional };
              const bgs = { fixed: theme.colors.fixedSurface, flexible: theme.colors.flexibleSurface, optional: theme.colors.optionalSurface };
              const isSelected = form.defaultPriority === p;
              return (
                <TouchableOpacity key={p} onPress={() => update({ defaultPriority: p })}
                  style={[cs.segmentBtn, {
                    backgroundColor: isSelected ? bgs[p] : theme.colors.surfaceAlt,
                    borderColor: isSelected ? colors[p] : theme.colors.border,
                    flex: 1,
                  }]}
                  accessibilityRole="radio" accessibilityState={{ checked: isSelected }}>
                  <Text style={[cs.segmentText, {
                    color: isSelected ? colors[p] : theme.colors.textMuted,
                    fontFamily: theme.fonts.body,
                  }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FieldLabel label="Default priority tier" />
          <View style={[cs.segmentRow, { marginBottom: 16 }]}>
            {(['high', 'normal', 'low'] as const).map(t => {
              const isSelected = form.defaultPriorityTier === t;
              return (
                <TouchableOpacity key={t} onPress={() => update({ defaultPriorityTier: t })}
                  style={[cs.segmentBtn, {
                    backgroundColor: isSelected ? theme.colors.accentSurface : theme.colors.surfaceAlt,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                    flex: 1,
                  }]}
                  accessibilityRole="radio" accessibilityState={{ checked: isSelected }}>
                  <Text style={[cs.segmentText, {
                    color: isSelected ? theme.colors.accent : theme.colors.textMuted,
                    fontFamily: theme.fonts.body,
                  }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FieldLabel label="Default duration" />
          <View style={[cs.chipRow, { marginBottom: 16 }]}>
            {DURATION_OPTIONS.map(d => (
              <TouchableOpacity key={d} onPress={() => update({ defaultDuration: d })}
                style={[cs.chip, {
                  backgroundColor: form.defaultDuration === d ? theme.colors.accent : theme.colors.surfaceAlt,
                  borderColor: form.defaultDuration === d ? theme.colors.accent : theme.colors.border,
                }]}
                accessibilityRole="radio" accessibilityState={{ checked: form.defaultDuration === d }}>
                <Text style={[cs.chipText, {
                  color: form.defaultDuration === d ? theme.colors.textOnAccent : theme.colors.textSecondary,
                  fontFamily: theme.fonts.body,
                }]}>
                  {d >= 60 ? `${d / 60}h` : `${d}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FieldLabel label="Default gap after task" />
          <View style={[cs.chipRow, { marginBottom: 16 }]}>
            {[0, 5, 10, 15, 30].map(b => (
              <TouchableOpacity key={b} onPress={() => update({ defaultBufferAfter: b })}
                style={[cs.chip, {
                  backgroundColor: form.defaultBufferAfter === b ? theme.colors.accent : theme.colors.surfaceAlt,
                  borderColor: form.defaultBufferAfter === b ? theme.colors.accent : theme.colors.border,
                }]}
                accessibilityRole="radio" accessibilityState={{ checked: form.defaultBufferAfter === b }}>
                <Text style={[cs.chipText, {
                  color: form.defaultBufferAfter === b ? theme.colors.textOnAccent : theme.colors.textSecondary,
                  fontFamily: theme.fonts.body,
                }]}>
                  {b === 0 ? 'None' : `${b}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[cs.switchRow, { marginBottom: 24 }]}>
            <Text style={[cs.switchLabel, { color: theme.colors.textPrimary, fontFamily: theme.fonts.body }]}>
              Notify me by default
            </Text>
            <Switch
              value={form.defaultNotificationEnabled}
              onValueChange={v => update({ defaultNotificationEnabled: v })}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={theme.colors.textOnAccent}
              accessibilityLabel="Enable notification by default"
            />
          </View>
        </ScrollView>

        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={[cs.saveBtn, { backgroundColor: saving ? theme.colors.border : theme.colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel={editCategory ? 'Update category' : 'Add category'}>
          <Text style={[cs.saveBtnText, { color: theme.colors.textOnAccent, fontFamily: theme.fonts.heading }]}>
            {saving ? 'Saving...' : editCategory ? 'Update Category' : 'Add Category'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function CategoriesScreen({ onClose }: Props) {
  const { theme } = useTheme();
  const { categories, removeCategory } = useDayForgeStore();
  const [formVisible, setFormVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormVisible(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormVisible(true);
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.label}"? All tasks in this category will also be deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeCategory(cat.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={[cs.screen, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[cs.header, { borderBottomColor: theme.colors.border }]}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={cs.backBtn}
            accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[cs.backBtnText, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>✕</Text>
          </TouchableOpacity>
        )}
        <Text style={[cs.title, { color: theme.colors.textPrimary, fontFamily: theme.fonts.heading }]}>
          Categories
        </Text>
        <TouchableOpacity onPress={handleAdd}
          style={[cs.addBtn, { backgroundColor: theme.colors.accent }]}
          accessibilityRole="button" accessibilityLabel="Add category">
          <Text style={[cs.addBtnText, { color: theme.colors.textOnAccent, fontFamily: theme.fonts.body }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category list */}
      <ScrollView contentContainerStyle={cs.list} showsVerticalScrollIndicator={false}>
        {categories.length === 0 && (
          <View style={cs.emptyState}>
            <Text style={[cs.emptyText, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
              No categories yet. Tap + Add to create one.
            </Text>
          </View>
        )}
        {categories.map(cat => (
          <View key={cat.id}
            style={[cs.categoryRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[cs.categoryDot, { backgroundColor: cat.color }]} />
            <View style={cs.categoryInfo}>
              <Text style={[cs.categoryLabel, { color: theme.colors.textPrimary, fontFamily: theme.fonts.body }]}>
                {cat.label}
              </Text>
              <Text style={[cs.categoryMeta, { color: theme.colors.textMuted, fontFamily: theme.fonts.body }]}>
                {cat.defaultPriority} · {cat.defaultDuration >= 60 ? `${cat.defaultDuration / 60}h` : `${cat.defaultDuration}m`} · {cat.defaultNotificationEnabled ? '🔔' : '🔕'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleEdit(cat)}
              style={[cs.actionBtn, { backgroundColor: theme.colors.accentSurface }]}
              accessibilityRole="button" accessibilityLabel={`Edit ${cat.label}`}>
              <Text style={[cs.actionBtnText, { color: theme.colors.accent, fontFamily: theme.fonts.body }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(cat)}
              style={[cs.actionBtn, { backgroundColor: theme.colors.dangerSurface }]}
              accessibilityRole="button" accessibilityLabel={`Delete ${cat.label}`}>
              <Text style={[cs.actionBtnText, { color: theme.colors.danger, fontFamily: theme.fonts.body }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Add/Edit form modal */}
      <CategoryFormModal
        visible={formVisible}
        editCategory={editingCategory}
        onClose={() => { setFormVisible(false); setEditingCategory(null); }}
      />
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, gap: 12 },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 18 },
  title: { flex: 1, fontSize: 28 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, minHeight: 36 },
  addBtnText: { fontSize: 14 },
  list: { padding: 16, gap: 10 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  categoryDot: { width: 16, height: 16, borderRadius: 8, flexShrink: 0 },
  categoryInfo: { flex: 1 },
  categoryLabel: { fontSize: 15, marginBottom: 2 },
  categoryMeta: { fontSize: 12 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minHeight: 32 },
  actionBtnText: { fontSize: 13 },
  // Form modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 12, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20 },
  closeBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  sectionHeader: { fontSize: 11, letterSpacing: 1.2, marginTop: 16, marginBottom: 4 },
  sectionSub: { fontSize: 12, marginBottom: 12, opacity: 0.8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 48, marginBottom: 16 },
  colourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  colourSwatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  previewPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start', marginBottom: 20 },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewLabel: { fontSize: 14 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', minHeight: 44 },
  segmentText: { fontSize: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  switchLabel: { fontSize: 15 },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center', minHeight: 52, marginTop: 8 },
  saveBtnText: { fontSize: 17 },
});
