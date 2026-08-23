import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, XCircle, RefreshCw, Home, Coins, BookOpen } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useQuizzes } from '@/providers/quizzes';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 190;
const RING_RADIUS = 80;
const STROKE_WIDTH = 13;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function QuizResultScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getAttemptById, getQuizById } = useQuizzes();

  const attempt = useMemo(() => getAttemptById(attemptId), [getAttemptById, attemptId]);
  const quiz = useMemo(() => (attempt ? getQuizById(attempt.quizId) : undefined), [attempt, getQuizById]);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!attempt) return;
    const percent = attempt.score / attempt.total;
    Animated.timing(progress, {
      toValue: percent,
      duration: 1200,
      useNativeDriver: false,
    }).start();
    Haptics.notificationAsync(
      attempt.passed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => undefined);
  }, [attempt, progress]);

  if (!attempt || !quiz) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Result not found</Text>
      </View>
    );
  }

  const percent = Math.round((attempt.score / attempt.total) * 100);
  const ringColor = attempt.passed ? '#10B981' : '#EF4444';
  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, CIRCUMFERENCE * (1 - attempt.score / attempt.total)],
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={Colors.light.borderLight} strokeWidth={STROKE_WIDTH} fill="none" />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={ringColor}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringScore, { color: ringColor }]}>{percent}%</Text>
            <Text style={styles.ringSub}>{attempt.score}/{attempt.total} correct</Text>
          </View>
        </View>

        <View style={styles.bannerCard}>
          <LinearGradient
            colors={attempt.passed ? ['#10B981', '#34D399'] : ['#F59E0B', '#FBBF24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            <Text style={styles.bannerTitle}>{attempt.passed ? 'Passed! Well done' : 'Almost there — keep practicing'}</Text>
            <Text style={styles.bannerSubtitle}>
              {attempt.passed
                ? `You scored above the ${quiz.passPercent}% pass mark on ${quiz.title}`
                : `You need ${quiz.passPercent}% to pass. Review the answers below and retake.`}
            </Text>
            {attempt.creditsEarned > 0 && (
              <View style={styles.creditsChip}>
                <Coins size={14} color="#92400E" />
                <Text style={styles.creditsText}>+{attempt.creditsEarned} credits earned</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>Answer review</Text>
          {quiz.questions.map((question, index) => {
            const userAnswer = attempt.answers[question.id];
            const wasCorrect = userAnswer === question.correctIndex;
            return (
              <View key={question.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  {wasCorrect ? (
                    <CheckCircle size={20} color="#10B981" />
                  ) : (
                    <XCircle size={20} color="#EF4444" />
                  )}
                  <Text style={styles.reviewQuestionText}>
                    {index + 1}. {question.question}
                  </Text>
                </View>
                <View style={styles.answerBlock}>
                  {wasCorrect ? (
                    <Text style={[styles.answerLine, { color: '#10B981' }]}>
                      Your answer: {question.options[userAnswer ?? 0] ?? '—'}
                    </Text>
                  ) : (
                    <>
                      <Text style={[styles.answerLine, { color: '#EF4444' }]}>
                        Your answer: {userAnswer === undefined ? 'Skipped' : question.options[userAnswer]}
                      </Text>
                      <Text style={[styles.answerLine, { color: '#10B981' }]}>
                        Correct: {question.options[question.correctIndex]}
                      </Text>
                    </>
                  )}
                  {question.explanation && (
                    <View style={styles.explanationBox}>
                      <BookOpen size={14} color={Colors.light.textSecondary} />
                      <Text style={styles.explanationText}>{question.explanation}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.retakeButton} onPress={() => router.replace(`/quiz/take/${quiz.id}` as never)} activeOpacity={0.85} testID="retake-quiz-button">
          <RefreshCw size={18} color="#6366F1" />
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneButton} onPress={() => router.back()} activeOpacity={0.85} testID="quiz-done-button">
          <Home size={18} color="#FFFFFF" />
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  emptyText: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center', marginTop: 100 },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringScore: { fontSize: 44, fontWeight: '800' as const },
  ringSub: { fontSize: 14, fontWeight: '600' as const, color: Colors.light.textSecondary, marginTop: 2 },
  bannerCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 28 },
  bannerGradient: { padding: 22 },
  bannerTitle: { fontSize: 20, fontWeight: '800' as const, color: '#FFFFFF' },
  bannerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 19, marginTop: 6 },
  creditsChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12 },
  creditsText: { fontSize: 13, fontWeight: '700' as const, color: '#92400E' },
  reviewSection: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.light.text, marginBottom: 4 },
  reviewCard: { backgroundColor: Colors.light.backgroundTertiary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.light.borderLight },
  reviewHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reviewQuestionText: { flex: 1, fontSize: 15, fontWeight: '700' as const, color: Colors.light.text, lineHeight: 21 },
  answerBlock: { marginTop: 10, gap: 4, paddingLeft: 30 },
  answerLine: { fontSize: 13, fontWeight: '600' as const, lineHeight: 19 },
  explanationBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.light.background, borderRadius: 10, padding: 10, marginTop: 8 },
  explanationText: { flex: 1, fontSize: 12, color: Colors.light.textSecondary, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.light.borderLight, backgroundColor: Colors.light.background },
  retakeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: '#EEF2FF' },
  retakeText: { fontSize: 15, fontWeight: '700' as const, color: '#6366F1' },
  doneButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: '#6366F1' },
  doneText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
});
