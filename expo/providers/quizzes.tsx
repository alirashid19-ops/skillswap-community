import { useCallback, useEffect, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedQuizzes } from '../mocks/quizzes';
import type { QuizAttempt, SkillQuiz } from '../types';
import { QUIZ_PASS_CREDIT_REWARD } from '../lib/payments';
import { useCurrentUser } from './current-user';

const GENERATED_KEY = '@skillswap/quizzes_generated';
const ATTEMPTS_KEY = '@skillswap/quiz_attempts';

interface QuizzesContextValue {
  quizzes: SkillQuiz[];
  attempts: QuizAttempt[];
  getQuizzesForSkill: (skillId: string) => SkillQuiz[];
  getQuizById: (quizId: string) => SkillQuiz | undefined;
  getAttemptById: (attemptId: string) => QuizAttempt | undefined;
  getAttemptsForQuiz: (quizId: string) => QuizAttempt[];
  getBestAttempt: (quizId: string) => QuizAttempt | null;
  addQuiz: (quiz: SkillQuiz) => void;
  submitAttempt: (quizId: string, answers: Record<string, number>) => QuizAttempt | null;
}

export const [QuizzesProvider, useQuizzes] = createContextHook<QuizzesContextValue>(() => {
  const { currentUser, earnCredits } = useCurrentUser();
  const [generatedQuizzes, setGeneratedQuizzes] = useState<SkillQuiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Restore AI-generated quizzes and past attempts from AsyncStorage.
  useEffect(() => {
    (async () => {
      try {
        const [rawQuizzes, rawAttempts] = await Promise.all([
          AsyncStorage.getItem(GENERATED_KEY),
          AsyncStorage.getItem(ATTEMPTS_KEY),
        ]);
        if (rawQuizzes) setGeneratedQuizzes(JSON.parse(rawQuizzes) as SkillQuiz[]);
        if (rawAttempts) setAttempts(JSON.parse(rawAttempts) as QuizAttempt[]);
      } catch (error) {
        console.warn('[Quizzes] Failed to restore saved data:', error);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist AI-generated quizzes and attempts after hydration.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(GENERATED_KEY, JSON.stringify(generatedQuizzes)).catch(() => undefined);
  }, [generatedQuizzes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts)).catch(() => undefined);
  }, [attempts, hydrated]);

  const quizzes = useMemo<SkillQuiz[]>(
    () => [...seedQuizzes, ...generatedQuizzes],
    [generatedQuizzes],
  );

  const getQuizzesForSkill = useCallback(
    (skillId: string) => quizzes.filter(q => q.skillId === skillId),
    [quizzes],
  );

  const getQuizById = useCallback(
    (quizId: string) => quizzes.find(q => q.id === quizId),
    [quizzes],
  );

  const getAttemptsForQuiz = useCallback(
    (quizId: string) =>
      attempts
        .filter(a => a.quizId === quizId && a.userId === currentUser.id)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [attempts, currentUser.id],
  );

  const getBestAttempt = useCallback(
    (quizId: string) => {
      const mine = getAttemptsForQuiz(quizId);
      if (mine.length === 0) return null;
      return mine.reduce((best, a) => (a.score / a.total > best.score / best.total ? a : best), mine[0]);
    },
    [getAttemptsForQuiz],
  );

  const getAttemptById = useCallback(
    (attemptId: string) => attempts.find(a => a.id === attemptId),
    [attempts],
  );

  const addQuiz = useCallback((quiz: SkillQuiz) => {
    setGeneratedQuizzes(prev => [...prev, quiz]);
  }, []);

  // Grade an attempt, award first-pass credits, and persist it.
  const submitAttempt = useCallback(
    (quizId: string, answers: Record<string, number>): QuizAttempt | null => {
      const quiz = quizzes.find(q => q.id === quizId);
      if (!quiz || quiz.questions.length === 0) return null;

      const score = quiz.questions.reduce(
        (sum, q) => (answers[q.id] === q.correctIndex ? sum + 1 : sum),
        0,
      );
      const total = quiz.questions.length;
      const passed = (score / total) * 100 >= quiz.passPercent;
      const alreadyPassed = attempts.some(
        a => a.quizId === quizId && a.userId === currentUser.id && a.passed,
      );
      const creditsEarned = passed && !alreadyPassed ? QUIZ_PASS_CREDIT_REWARD : 0;
      if (creditsEarned > 0) {
        earnCredits(creditsEarned);
        console.log('[Quizzes] First pass reward awarded', { quizId, creditsEarned });
      }

      const attempt: QuizAttempt = {
        id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        quizId,
        userId: currentUser.id,
        score,
        total,
        passed,
        creditsEarned,
        answers,
        completedAt: new Date().toISOString(),
      };
      setAttempts(prev => [attempt, ...prev]);
      return attempt;
    },
    [quizzes, attempts, currentUser.id, earnCredits],
  );

  const value = useMemo<QuizzesContextValue>(() => ({
    quizzes,
    attempts,
    getQuizzesForSkill,
    getQuizById,
    getAttemptById,
    getAttemptsForQuiz,
    getBestAttempt,
    addQuiz,
    submitAttempt,
  }), [quizzes, attempts, getQuizzesForSkill, getQuizById, getAttemptById, getAttemptsForQuiz, getBestAttempt, addQuiz, submitAttempt]);

  return value;
});
