import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, CalendarDays, BookOpen, CheckCircle2, Clock, MessageSquareText } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { mockUsers } from '@/mocks/data';
import { useClasses } from '@/providers/classes';
import { useAssignments } from '@/providers/assignments';
import { useCurrentUser } from '@/providers/current-user';
import type { AssignmentType } from '@/types';

const typeConfig: Record<AssignmentType, { label: string }> = {
  homework: { label: 'Homework' },
  assignment: { label: 'Assignment' },
  project: { label: 'Project' },
};

const QUICK_GRADES = [60, 70, 80, 90];

export default function AssignmentDetailScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const router = useRouter();
  const { getClassById } = useClasses();
  const { currentUser } = useCurrentUser();
  const {
    getAssignmentById,
    getMySubmission,
    getSubmissionsForAssignment,
    submitWork,
    updateSubmissionText,
    gradeSubmission,
  } = useAssignments();

  const assignment = useMemo(() => getAssignmentById(assignmentId ?? ''), [getAssignmentById, assignmentId]);
  const cls = useMemo(() => (assignment ? getClassById(assignment.classId) : undefined), [assignment, getClassById]);

  const isTeacher = assignment?.teacherId === currentUser.id;
  const mySubmission = useMemo(
    () => (assignment ? getMySubmission(assignment.id) : undefined),
    [assignment, getMySubmission],
  );

  // Student answer draft — synced to store on save
  const [answerText, setAnswerText] = useState<string>(() => mySubmission?.text ?? '');
  const [savedText, setSavedText] = useState<string>(() => mySubmission?.text ?? '');
  const [turnInError, setTurnInError] = useState<string | null>(null);

  // Teacher grading state per submission id
  const [openGradeId, setOpenGradeId] = useState<string | null>(null);
  const [gradeValue, setGradeValue] = useState<string>('85');
  const [feedbackText, setFeedbackText] = useState<string>('');

  const submissions = useMemo(
    () => (assignment && cls ? cls.enrollments.map(e => ({
      student: mockUsers.find(u => u.id === e.studentId),
      submission: getSubmissionsForAssignment(assignment.id).find(s => s.studentId === e.studentId),
    })) : []),
    [assignment, cls, getSubmissionsForAssignment],
  );

  const handleTurnIn = useCallback(() => {
    if (!assignment) return;
    if (!answerText.trim()) {
      setTurnInError('Write your answer before turning in.');
      return;
    }
    if (mySubmission?.status === 'graded') return;
    const result = submitWork(assignment.id);
    if (!result.success) {
      setTurnInError(result.error ?? 'Could not turn in.');
      return;
    }
    updateSubmissionText(assignment.id, answerText.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setSavedText(answerText.trim());
    setTurnInError(null);
  }, [assignment, answerText, mySubmission, submitWork, updateSubmissionText]);

  const handleSaveGrade = useCallback((submissionId: string) => {
    const num = parseInt(gradeValue, 10);
    if (Number.isNaN(num) || num < 0 || num > 100) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    gradeSubmission(submissionId, num, feedbackText);
    setOpenGradeId(null);
    setFeedbackText('');
  }, [gradeValue, feedbackText, gradeSubmission]);

  if (!assignment) {
    return (
      <View style={s.center}>
        <Text style={s.notFoundText}>Assignment not found</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backLinkText}>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  const dueLabel = assignment.dueISO
    ? new Date(assignment.dueISO).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : null;
  const overdue = assignment.dueISO ? new Date(assignment.dueISO).getTime() < Date.now() : false;
  const isGraded = mySubmission?.status === 'graded';

  const renderGradingRow = (
    entry: NonNullable<typeof submissions[number]>,
    index: number,
  ) => {
    const name = entry.student?.name ?? `Student ${index + 1}`;
    const avatar = entry.student?.avatarUrl;
    const sub = entry.submission;
    const isOpen = openGradeId === sub?.id;
    return (
      <View key={entry.student?.id ?? index} style={s.subCard}>
        <View style={s.subHeader}>
          {avatar ? <BookOpen size={18} color={Colors.light.primary} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={s.subName}>{name}</Text>
            <Text style={s.subMeta}>
              {sub ? `Turned in ${new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Not turned in yet'}
            </Text>
          </View>
          {sub?.status === 'graded' && (
            <View style={[s.gradePill, s.gradeDone]}>
              <Text style={s.gradePillText}>{sub.grade}%</Text>
            </View>
          )}
        </View>

        {sub && (
          <>
            <Text style={s.subBody}>{sub.text || '(No written answer)'}</Text>

            {sub.status === 'graded' ? (
              sub.feedback ? (
                <View style={s.feedbackBox}>
                  <MessageSquareText size={13} color="#8B5CF6" />
                  <Text style={s.feedbackSent}>{sub.feedback}</Text>
                </View>
              ) : null
            ) : isOpen ? (
              <View style={s.gradeForm}>
                <View style={s.stepperRow}>
                  <TouchableOpacity style={s.stepBtn} onPress={() => setGradeValue(String(Math.max(0, (parseInt(gradeValue, 10) || 0) - 5)))}>
                    <Text style={s.stepBtnText}>−5</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={s.gradeInput}
                    value={gradeValue}
                    onChangeText={setGradeValue}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={s.gradeUnit}>%</Text>
                  <TouchableOpacity style={s.stepBtn} onPress={() => setGradeValue(String(Math.min(100, (parseInt(gradeValue, 10) || 0) + 5)))}>
                    <Text style={s.stepBtnText}>+5</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.quickRow}>
                  {QUICK_GRADES.map(g => (
                    <TouchableOpacity key={g} style={s.quickChip} onPress={() => setGradeValue(String(g))}>
                      <Text style={s.quickChipText}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[s.input, s.textareaSmall]}
                  placeholder="Feedback (optional)"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                  textAlignVertical="top"
                  testID="grade-feedback-input"
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[s.saveBtn, { flex: 1 }]} onPress={() => handleSaveGrade(sub.id)} activeOpacity={0.8} testID="save-grade-button">
                    <Text style={s.saveBtnText}>Save grade</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setOpenGradeId(null)} activeOpacity={0.8}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={s.gradeBtn}
                onPress={() => {
                  setGradeValue(String(sub.grade ?? 85));
                  setFeedbackText(sub.feedback ?? '');
                  setOpenGradeId(sub.id);
                }}
                activeOpacity={0.8}
                testID={`grade-button-${sub.id}`}
              >
                <Text style={s.gradeBtnText}>Grade this</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={s.backRow} onPress={() => router.back()} activeOpacity={0.7}>
        <ArrowLeft size={18} color={Colors.light.primary} />
        <Text style={s.backLinkText}>
          {isTeacher ? 'Assignments' : 'Homework'}
        </Text>
      </TouchableOpacity>

      <View style={s.titleCard}>
        <View style={s.typeRow}>
          <Text style={s.typeTag}>{typeConfig[assignment.type].label}</Text>
          {dueLabel && (
            <View style={[s.dueChip, overdue && s.dueChipOverdue]}>
              <CalendarDays size={12} color={overdue ? '#EF4444' : Colors.light.textSecondary} />
              <Text style={[s.dueChipText, overdue && { color: '#EF4444' }]}>Due {dueLabel}</Text>
            </View>
          )}
        </View>
        <Text style={s.title}>{assignment.title}</Text>
        <Text style={s.description}>{assignment.description}</Text>
      </View>

      {isTeacher ? (
        <View style={{ gap: 12 }}>
          <Text style={s.sectionTitle}>Submissions ({cls?.enrolledCount ?? 0} students)</Text>
          {submissions.map(renderGradingRow)}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {isGraded && mySubmission ? (
            <View style={s.gradedCard}>
              <CheckCircle2 size={22} color="#8B5CF6" />
              <Text style={s.gradedTitle}>Graded — {mySubmission.grade}%</Text>
              {mySubmission.feedback && (
                <View style={s.teacherFeedbackBox}>
                  <MessageSquareText size={14} color="#8B5CF6" />
                  <Text style={s.teacherFeedbackText}>{mySubmission.feedback}</Text>
                </View>
              )}
              <Text style={s.yourAnswerLabel}>Your answer</Text>
              <Text style={s.savedAnswer}>{mySubmission.text || savedText || '—'}</Text>
            </View>
          ) : (
            <View style={s.answerCard}>
              <View style={s.turnInHeader}>
                <Clock size={15} color={mySubmission ? '#F59E0B' : Colors.light.primary} />
                <Text style={s.turnInTitle}>
                  {mySubmission ? 'Submitted — you can still edit before grading' : 'Your answer'}
                </Text>
              </View>
              <TextInput
                style={[s.input, s.answerArea]}
                placeholder="Type your homework here… attach details, explain your approach."
                placeholderTextColor={Colors.light.textTertiary}
                value={answerText}
                onChangeText={setAnswerText}
                multiline
                textAlignVertical="top"
                testID="student-answer-input"
              />
              {turnInError && <Text style={s.errorText}>{turnInError}</Text>}
              <TouchableOpacity style={s.turnInBtn} onPress={handleTurnIn} activeOpacity={0.8} testID="turn-in-button">
                <Text style={s.turnInBtnText}>{mySubmission ? 'Save changes' : 'Turn in'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { fontSize: 15, fontWeight: '600' as const, color: Colors.light.textSecondary },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backLinkText: { fontSize: 14, fontWeight: '700' as const, color: Colors.light.primary },

  titleCard: { backgroundColor: Colors.light.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: Colors.light.borderLight, gap: 10 },
  typeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  typeTag: { fontSize: 11, fontWeight: '800' as const, color: '#6366F1', backgroundColor: 'rgba(99,102,241,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  dueChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueChipOverdue: {},
  dueChipText: { fontSize: 11, fontWeight: '700' as const, color: Colors.light.textSecondary },
  title: { fontSize: 19, fontWeight: '800' as const, color: Colors.light.text },
  description: { fontSize: 14, lineHeight: 21, color: Colors.light.textSecondary },

  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.light.text },

  subCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.light.borderLight, gap: 10 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subName: { fontSize: 14, fontWeight: '700' as const, color: Colors.light.text },
  subMeta: { fontSize: 11, color: Colors.light.textTertiary, marginTop: 2 },
  subBody: { fontSize: 13, lineHeight: 19, color: Colors.light.textSecondary, backgroundColor: Colors.light.backgroundTertiary, borderRadius: 10, padding: 10 },
  gradePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  gradeDone: { backgroundColor: 'rgba(139,92,246,0.15)' },
  gradePillText: { fontSize: 13, fontWeight: '800' as const, color: '#8B5CF6' },
  feedbackBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 10, padding: 10 },
  feedbackSent: { flex: 1, fontSize: 12, lineHeight: 17, color: '#7C3AED', fontWeight: '500' as const },

  gradeForm: { gap: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 44, height: 40, borderRadius: 10, backgroundColor: Colors.light.backgroundTertiary, borderWidth: 1, borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center' },
  stepBtnText: { fontSize: 13, fontWeight: '800' as const, color: Colors.light.primary },
  gradeInput: { width: 64, height: 40, borderRadius: 10, borderWidth: 1, borderColor: Colors.light.border, textAlign: 'center', fontSize: 17, fontWeight: '800' as const, color: Colors.light.text, backgroundColor: Colors.light.backgroundTertiary },
  gradeUnit: { fontSize: 15, fontWeight: '700' as const, color: Colors.light.textTertiary },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.1)' },
  quickChipText: { fontSize: 12, fontWeight: '700' as const, color: '#6366F1' },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: Colors.light.text, backgroundColor: Colors.light.backgroundTertiary },
  textareaSmall: { minHeight: 56, paddingTop: 10 },
  saveBtn: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#FFFFFF' },
  cancelBtn: { backgroundColor: Colors.light.backgroundTertiary, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700' as const, color: Colors.light.textSecondary },
  gradeBtn: { backgroundColor: Colors.light.primary, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  gradeBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#FFFFFF' },

  answerCard: { backgroundColor: Colors.light.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.light.borderLight, gap: 12 },
  turnInHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  turnInTitle: { fontSize: 13, fontWeight: '700' as const, color: Colors.light.textSecondary },
  answerArea: { minHeight: 140, paddingTop: 12, fontSize: 14, lineHeight: 21 },
  errorText: { fontSize: 12, fontWeight: '600' as const, color: '#EF4444' },
  turnInBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  turnInBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },

  gradedCard: { backgroundColor: Colors.light.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: Colors.light.borderLight, gap: 12 },
  gradedTitle: { fontSize: 18, fontWeight: '800' as const, color: '#8B5CF6' },
  teacherFeedbackBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 12, padding: 12 },
  teacherFeedbackText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#7C3AED' },
  yourAnswerLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.light.textTertiary, textTransform: 'uppercase' as const, letterSpacing: 1 },
  savedAnswer: { fontSize: 14, lineHeight: 21, color: Colors.light.text },
});
