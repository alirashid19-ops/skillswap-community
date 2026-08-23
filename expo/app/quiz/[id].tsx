import { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, ListChecks, Target, Trophy, ChevronRight, Sparkles, CheckCircle, XCircle, Coins } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useQuizzes } from '@/providers/quizzes';
import { QUIZ_PASS_CREDIT_REWARD } from '@/lib/payments';
import type { QuizDifficulty } from '@/types';

const difficultyConfig: Record<QuizDifficulty, { color: string; bg: string; label: string }> = {
  easy: { color: '#10B981', bg: '#ECFDF5', label: 'Easy' },
  medium: { color: '#F59E0B', bg: '#FFFBEB', label: 'Medium' },
  hard: { color: '#EF4444', bg: '#FEF2F2', label: 'Hard' },
};

export default function QuizOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getQuizById, getBestAttempt, getAttemptsForQuiz } = useQuizzes();

  const quiz = useMemo(() => getQuizById(id), [getQuizById, id]);
  const bestAttempt = useMemo(() => (quiz ? getBestAttempt(quiz.id) : null), [quiz, getBestAttempt]);
  const attempts = useMemo(() => (quiz ? getAttemptsForQuiz(quiz.id) : []), [quiz, getAttemptsForQuiz]);

  if (!quiz) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Practice Test' }} />
        <Text style={styles.emptyText}>Quiz not found</Text>
      </View>
    );
  }

  const difficulty = difficultyConfig[quiz.difficulty];
  const bestPercent = bestAttempt ? Math.round((bestAttempt.score / bestAttempt.total) * 100) : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Practice Test', headerTintColor: Colors.light.primary }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
            <View style={styles.heroTopRow}>
              <View style={[styles.difficultyBadge, { backgroundColor: difficulty.bg }]}>
                <Text style={[styles.difficultyText, { color: difficulty.color }]}>{difficulty.label}</Text>
              </View>
              {quiz.generatedByAi && (
                <View style={styles.aiBadge}>
                  <Sparkles size={13} color="#FFFFFF" />
                  <Text style={styles.aiBadgeText}>AI-generated</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroTitle}>{quiz.title}</Text>
            <Text style={styles.heroDescription}>{quiz.description}</Text>
          </LinearGradient>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCard}>
            <ListChecks size={20} color="#6366F1" />
            <Text style={styles.metaValue}>{quiz.questions.length}</Text>
            <Text style={styles.metaLabel}>Questions</Text>
          </View>
          <View style={styles.metaCard}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.metaValue}>{quiz.timeLimitMinutes}</Text>
            <Text style={styles.metaLabel}>Min limit</Text>
          </View>
          <View style={styles.metaCard}>
            <Target size={20} color="#10B981" />
            <Text style={styles.metaValue}>{quiz.passPercent}%</Text>
            <Text style={styles.metaLabel}>To pass</Text>
          </View>
        </View>

        <View style={styles.rewardCard}>
          <Coins size={20} color="#F59E0B" />
          <View style={styles.rewardTextWrap}>
            <Text style={styles.rewardTitle}>Pass to earn {QUIZ_PASS_CREDIT_REWARD} credits</Text>
            <Text style={styles.rewardSubtitle}>Awarded the first time you pass this test</Text>
          </View>
        </View>

        {bestAttempt && (
          <View style={styles.bestCard}>
            <Trophy size={22} color="#F59E0B" />
            <View style={styles.rewardTextWrap}>
              <Text style={styles.bestTitle}>Best score: {bestAttempt.score}/{bestAttempt.total} ({bestPercent}%)</Text>
              <Text style={[styles.bestSubtitle, { color: bestAttempt.passed ? '#10B981' : '#F59E0B' }]}>
                {bestAttempt.passed ? 'Passed' : 'Below pass mark — try again'}
              </Text>
            </View>
          </View>
        )}

        {attempts.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent attempts</Text>
            {attempts.slice(0, 3).map(attempt => (
              <View key={attempt.id} style={styles.attemptRow}>
                {attempt.passed ? (
                  <CheckCircle size={18} color="#10B981" />
                ) : (
                  <XCircle size={18} color="#EF4444" />
                )}
                <Text style={styles.attemptScore}>{attempt.score}/{attempt.total} correct</Text>
                <Text style={styles.attemptDate}>
                  {new Date(attempt.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.startButton}
          activeOpacity={0.85}
          onPress={() => router.push(`/quiz/take/${quiz.id}` as never)}
          testID="start-quiz-button"
        >
          <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGradient}>
            <Text style={styles.startText}>{attempts.length > 0 ? 'Retake Test' : 'Start Test'}</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  emptyText: { fontSize: 16, color: Colors.light.textSecondary, textAlign: 'center', marginTop: 80 },
  heroCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 20 },
  heroGradient: { padding: 24 },
  heroTopRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  difficultyBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  difficultyText: { fontSize: 12, fontWeight: '700' as const },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  aiBadgeText: { fontSize: 12, fontWeight: '700' as const, color: '#FFFFFF' },
  heroTitle: { fontSize: 24, fontWeight: '800' as const, color: '#FFFFFF', lineHeight: 31, marginBottom: 8 },
  heroDescription: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.85)' },
  metaGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metaCard: { flex: 1, backgroundColor: Colors.light.backgroundTertiary, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.light.borderLight },
  metaValue: { fontSize: 20, fontWeight: '800' as const, color: Colors.light.text },
  metaLabel: { fontSize: 11, fontWeight: '600' as const, color: Colors.light.textSecondary },
  rewardCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 16, padding: 16, marginBottom: 16 },
  rewardTextWrap: { flex: 1 },
  rewardTitle: { fontSize: 14, fontWeight: '700' as const, color: '#92400E' },
  rewardSubtitle: { fontSize: 12, color: '#A16207', marginTop: 2 },
  bestCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 16, padding: 16, marginBottom: 16 },
  bestTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.light.text },
  bestSubtitle: { fontSize: 12, fontWeight: '600' as const, marginTop: 2 },
  historySection: { marginBottom: 20, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.light.text, marginBottom: 4 },
  attemptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.light.backgroundTertiary, borderRadius: 12, padding: 14 },
  attemptScore: { flex: 1, fontSize: 14, fontWeight: '600' as const, color: Colors.light.text },
  attemptDate: { fontSize: 12, color: Colors.light.textSecondary },
  startButton: { borderRadius: 18, overflow: 'hidden' },
  startGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 17 },
  startText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
});
