import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ClipboardList,
  BookOpen,
  FolderKanban,
  Plus,
  ChevronDown,
  CalendarDays,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useClasses } from '@/providers/classes';
import { useAssignments } from '@/providers/assignments';
import { useCurrentUser } from '@/providers/current-user';
import type { AssignmentType } from '@/types';

const DAY_MS = 86400000;

const typeConfig: Record<AssignmentType, { label: string; icon: typeof BookOpen; color: string }> = {
  homework: { label: 'Homework', icon: BookOpen, color: '#6366F1' },
  assignment: { label: 'Assignment', icon: ClipboardList, color: '#8B5CF6' },
  project: { label: 'Project', icon: FolderKanban, color: '#F59E0B' },
};

type DueOption = 'none' | 'tomorrow' | 'three_days' | 'week';

const dueOptions: { id: DueOption; label: string }[] = [
  { id: 'none', label: 'No due date' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'three_days', label: 'In 3 days' },
  { id: 'week', label: 'In a week' },
];

export default function ClassAssignmentsScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getClassById, isEnrolled } = useClasses();
  const { currentUser } = useCurrentUser();
  const { getAssignmentsForClass, getMySubmission, getSubmissionsForAssignment, createAssignment } =
    useAssignments();

  const cls = useMemo(() => getClassById(classId ?? ''), [getClassById, classId]);
  const isTeacher = cls?.teacherId === currentUser.id;
  const canSee = Boolean(cls && (isTeacher || isEnrolled(cls.id, currentUser.id)));
  const classAssignments = useMemo(
    () => (classId ? getAssignmentsForClass(classId) : []),
    [classId, getAssignmentsForClass],
  );

  // Inline create form (teacher only)
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<AssignmentType>('homework');
  const [dueOption, setDueOption] = useState<DueOption>('tomorrow');

  const handleCreate = useCallback(() => {
    if (!classId || !title.trim() || !description.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const dueMsMap: Record<DueOption, number> = { none: 0, tomorrow: DAY_MS, three_days: 3 * DAY_MS, week: 7 * DAY_MS };
    const ms = dueMsMap[dueOption];
    createAssignment({
      classId,
      title: title.trim(),
      description: description.trim(),
      type,
      dueISO: ms > 0 ? new Date(Date.now() + ms).toISOString() : undefined,
    });
    setTitle('');
    setDescription('');
    setType('homework');
    setDueOption('tomorrow');
    setFormOpen(false);
  }, [classId, title, description, type, dueOption, createAssignment]);

  const formatDue = useCallback((iso?: string) => {
    if (!iso) return 'No due date';
    const d = new Date(iso);
    const sameDayNow = new Date();
    sameDayNow.setHours(23, 59, 59, 999);
    const overdue = d.getTime() < sameDayNow.getTime();
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return overdue ? `Overdue · was ${label}` : `Due ${label}`;
  }, []);

  if (!cls || !canSee) {
    return (
      <View style={s.notFound}>
        <Text style={s.notFoundText}>Assignments are available to the teacher and enrolled students.</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[Colors.light.primary, Colors.light.primaryLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={s.headerTitle}>{isTeacher ? 'Assignments' : 'Homework'}</Text>
        <Text style={s.headerSub} numberOfLines={1}>{cls.title}</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
        {isTeacher && (
          <View style={s.createCard}>
            <TouchableOpacity
              style={s.createHeader}
              onPress={() => setFormOpen(prev => !prev)}
              activeOpacity={0.7}
              testID="toggle-create-assignment"
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={s.createHeaderText}>
                {formOpen ? 'Hide form' : 'Give new work'}
              </Text>
              <ChevronDown size={16} color="#FFFFFF" style={formOpen && s.chevronUp} />
            </TouchableOpacity>

            {formOpen && (
              <View style={s.formBody}>
                <TextInput
                  style={s.input}
                  placeholder="Title (e.g. Chapter 4 exercises)"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={title}
                  onChangeText={setTitle}
                  testID="assignment-title-input"
                />
                <TextInput
                  style={[s.input, s.textarea]}
                  placeholder="Instructions for students…"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  testID="assignment-description-input"
                />
                <Text style={s.fieldLabel}>Type</Text>
                <View style={s.chipRow}>
                  {(Object.keys(typeConfig) as AssignmentType[]).map(t => {
                    const cfg = typeConfig[t];
                    const active = type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[s.chip, active && s.chipActive]}
                        onPress={() => setType(t)}
                        activeOpacity={0.7}
                      >
                        <cfg.icon size={13} color={active ? '#FFFFFF' : cfg.color} />
                        <Text style={[s.chipText, active && s.chipTextActive]}>{cfg.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={s.fieldLabel}>Due</Text>
                <View style={s.chipRow}>
                  {dueOptions.map(opt => {
                    const active = dueOption === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[s.chip, active && s.chipActive]}
                        onPress={() => setDueOption(opt.id)}
                        activeOpacity={0.7}
                      >
                        <CalendarDays size={13} color={active ? '#FFFFFF' : Colors.light.textSecondary} />
                        <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[s.postBtn, (!title.trim() || !description.trim()) && s.postBtnDisabled]}
                  onPress={handleCreate}
                  disabled={!title.trim() || !description.trim()}
                  activeOpacity={0.8}
                  testID="post-assignment-button"
                >
                  <Text style={s.postBtnText}>Post to students</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <Text style={s.sectionLabel}>
          {classAssignments.length} item{classAssignments.length === 1 ? '' : 's'} assigned
        </Text>

        {classAssignments.map(a => {
          const cfg = typeConfig[a.type];
          const mine = getMySubmission(a.id);
          const subs = getSubmissionsForAssignment(a.id);
          const overdue = a.dueISO ? new Date(a.dueISO).getTime() < Date.now() : false;
          const statusBadge =
            isTeacher ? null
            : mine?.status === 'graded' ? { text: `Graded ${mine.grade}%`, bg: 'rgba(139,92,246,0.15)', fg: '#8B5CF6' }
            : mine?.status === 'submitted'
              ? overdue ? { text: 'Submitted late', bg: 'rgba(245,158,11,0.15)', fg: '#D97706' } : { text: 'Turned in', bg: 'rgba(16,185,129,0.15)', fg: '#10B981' }
              : overdue ? { text: 'Missing', bg: 'rgba(239,68,68,0.15)', fg: '#EF4444' } : { text: 'To do', bg: 'rgba(99,102,241,0.12)', fg: '#6366F1' };
          return (
            <TouchableOpacity
              key={a.id}
              style={s.card}
              onPress={() => router.push(`/class/assignments/${a.id}` as never)}
              activeOpacity={0.8}
              testID={`assignment-card-${a.id}`}
            >
              <View style={s.cardTop}>
                <View style={[s.typeChip, { backgroundColor: `${cfg.color}22` }]}>
                  <cfg.icon size={12} color={cfg.color} />
                  <Text style={[s.typeChipText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                {statusBadge ? (
                  <View style={[s.statusChip, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[s.statusText, { color: statusBadge.fg }]}>{statusBadge.text}</Text>
                  </View>
                ) : (
                  <Text style={s.subCount}>{subs.length}/{cls.enrolledCount} turned in</Text>
                )}
              </View>
              <Text style={s.cardTitle} numberOfLines={1}>{a.title}</Text>
              <Text style={s.cardDesc} numberOfLines={2}>{a.description}</Text>
              <Text style={[s.dueText, overdue && !mine && s.dueOverdue]}>{formatDue(a.dueISO)}</Text>
            </TouchableOpacity>
          );
        })}

        {classAssignments.length === 0 && (
          <View style={s.emptyWrap}>
            <BookOpen size={40} color={Colors.light.border} />
            <Text style={s.emptyText}>
              {isTeacher
                ? 'You haven\u2019t given any work yet. Tap "Give new work" above.'
                : 'Nothing assigned yet \u2014 check back after your next session.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800' as const, color: '#FFFFFF' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  listContent: { padding: 20, paddingBottom: 48, gap: 12 },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32, backgroundColor: Colors.light.background },
  notFoundText: { fontSize: 15, fontWeight: '600' as const, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 22 },
  backLink: { paddingVertical: 10, paddingHorizontal: 20 },
  backLinkText: { fontSize: 15, fontWeight: '700' as const, color: Colors.light.primary },

  createCard: { backgroundColor: Colors.light.card, borderRadius: 18, borderWidth: 1, borderColor: Colors.light.borderLight, overflow: 'hidden' },
  createHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.light.primary, paddingVertical: 13, paddingHorizontal: 16 },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  createHeaderText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF', flex: 1 },
  formBody: { padding: 16, gap: 10 },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.light.text, backgroundColor: Colors.light.backgroundTertiary },
  textarea: { minHeight: 90, paddingTop: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700' as const, color: Colors.light.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.backgroundTertiary },
  chipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  chipText: { fontSize: 12, fontWeight: '700' as const, color: Colors.light.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  postBtn: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  postBtnDisabled: { opacity: 0.45 },
  postBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },

  sectionLabel: { fontSize: 13, fontWeight: '700' as const, color: Colors.light.textTertiary, textTransform: 'uppercase' as const, letterSpacing: 1 },
  card: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.light.borderLight, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  typeChipText: { fontSize: 11, fontWeight: '700' as const },
  statusChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' as const },
  subCount: { fontSize: 12, fontWeight: '600' as const, color: Colors.light.textSecondary },
  cardTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.light.text },
  cardDesc: { fontSize: 13, lineHeight: 19, color: Colors.light.textSecondary },
  dueText: { fontSize: 12, fontWeight: '600' as const, color: Colors.light.textTertiary },
  dueOverdue: { color: '#EF4444' },

  emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 48, paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: Colors.light.textTertiary, textAlign: 'center', lineHeight: 21 },
});
