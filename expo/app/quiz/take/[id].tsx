import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, View as RNView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, X, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useQuizzes } from '@/providers/quizzes';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizTakeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getQuizById, submitAttempt } = useQuizzes();

  const quiz = useMemo(() => getQuizById(id), [getQuizById, id]);
  const [current, setCurrent] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const submittedRef = useRef<boolean>(false);

  const finish = useCallback(
    (auto: boolean) => {
      if (submittedRef.current || !quiz) return;
      submittedRef.current = true;
      const attempt = submitAttempt(quiz.id, answers);
      if (!attempt) {
        submittedRef.current = false;
        return;
      }
      if (auto) {
        console.log('[Quiz] Time expired — auto-submitted', { quizId: quiz.id });
      }
      router.replace(`/quiz/result/${attempt.id}` as never);
    },
    [quiz, answers, submitAttempt, router],
  );

  useEffect(() => {
    if (quiz) setSecondsLeft(quiz.timeLimitMinutes * 60);
  }, [quiz]);

  // Countdown timer with auto-submit at zero.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      setSecondsLeft(prev => {
        const next = prev - 1;
        if (next === 0) finish(true);
        return next;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, finish]);

  const handleSelect = useCallback((questionId: string, optionIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!quiz) return;
    const unanswered = quiz.questions.filter(q => answers[q.id] === undefined).length;
    if (unanswered > 0) {
      Alert.alert('Submit test?', `${unanswered} question${unanswered !== 1 ? 's' : ''} still unanswered. Unanswered questions are marked wrong.`, [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Submit anyway', style: 'default', onPress: () => finish(false) },
      ]);
      return;
    }
    finish(false);
  }, [quiz, answers, finish]);

  const handleQuit = useCallback(() => {
    Alert.alert('Leave test?', 'Your progress on this attempt will be lost.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [router]);

  if (!quiz || quiz.questions.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.emptyText}>Quiz not found</Text>
      </View>
    );
  }

  const question = quiz.questions[current];
  const total = quiz.questions.length;
  const answeredCount = quiz.questions.filter(q => answers[q.id] !== undefined).length;
  const progress = answeredCount / total;
  const isLast = current === total - 1;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLow = secondsLeft <= 30;
  const selected = answers[question.id];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <RNView style={styles.header}>
        <TouchableOpacity onPress={handleQuit} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={22} color={Colors.light.textSecondary} />
        </TouchableOpacity>
        <RNView style={styles.timerWrap}>
          <Clock size={15} color={timeLow ? '#EF4444' : Colors.light.primary} />
          <Text style={[styles.timerText, timeLow && { color: '#EF4444' }]}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </Text>
        </RNView>
        <RNView style={styles.counterWrap}>
          <Text style={styles.counterText}>{current + 1}/{total}</Text>
        </RNView>
      </RNView>

      <RNView style={styles.progressBar}>
        <RNView style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </RNView>

      <RNView style={styles.body}>
        <Text style={styles.questionLabel}>Question {current + 1}</Text>
        <Text style={styles.questionText}>{question.question}</Text>

        <RNView style={styles.optionsList}>
          {question.options.map((option, index) => {
            const isSelected = selected === index;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleSelect(question.id, index)}
                activeOpacity={0.8}
                testID={`quiz-option-${index}`}
              >
                <RNView style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                  <Text style={[styles.optionLetterText, isSelected && { color: '#FFFFFF' }]}>{OPTION_LETTERS[index]}</Text>
                </RNView>
                <Text style={[styles.optionText, isSelected && { color: Colors.light.primary, fontWeight: '700' as const }]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </RNView>
      </RNView>

      <RNView style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.navButton, current === 0 && { opacity: 0.4 }]}
          disabled={current === 0}
          onPress={() => setCurrent(prev => Math.max(0, prev - 1))}
        >
          <ChevronLeft size={20} color={Colors.light.text} />
          <Text style={styles.navText}>Prev</Text>
        </TouchableOpacity>
        {isLast ? (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85} testID="submit-quiz-button">
            <Text style={styles.submitText}>Submit Test</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={() => setCurrent(prev => Math.min(total - 1, prev + 1))}
          >
            <Text style={styles.nextText}>Next</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </RNView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.light.backgroundTertiary, alignItems: 'center', justifyContent: 'center' },
  timerWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.light.backgroundTertiary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  timerText: { fontSize: 14, fontWeight: '700' as const, color: Colors.light.primary },
  counterWrap: { minWidth: 52, alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  counterText: { fontSize: 13, fontWeight: '700' as const, color: '#6366F1' },
  progressBar: { height: 6, backgroundColor: Colors.light.backgroundTertiary, marginHorizontal: 16, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 3 },
  body: { flex: 1, padding: 20, gap: 14 },
  questionLabel: { fontSize: 12, fontWeight: '700' as const, color: '#6366F1', textTransform: 'uppercase' as const, letterSpacing: 1 },
  questionText: { fontSize: 22, fontWeight: '800' as const, color: Colors.light.text, lineHeight: 30 },
  optionsList: { gap: 12, marginTop: 6 },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.light.backgroundTertiary, borderWidth: 2, borderColor: 'transparent', borderRadius: 16, padding: 16 },
  optionCardSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  optionLetter: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.light.borderLight, alignItems: 'center', justifyContent: 'center' },
  optionLetterSelected: { backgroundColor: '#6366F1' },
  optionLetterText: { fontSize: 14, fontWeight: '800' as const, color: Colors.light.textSecondary },
  optionText: { flex: 1, fontSize: 15, color: Colors.light.text, lineHeight: 21 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.light.borderLight, backgroundColor: Colors.light.background },
  navButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 15, borderRadius: 14, backgroundColor: Colors.light.backgroundTertiary },
  nextButton: { backgroundColor: '#6366F1' },
  nextText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  navText: { fontSize: 15, fontWeight: '700' as const, color: Colors.light.text },
  submitButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 14, backgroundColor: '#10B981' },
  submitText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  emptyText: { fontSize: 15, color: Colors.light.textSecondary, marginTop: 16 },
});
