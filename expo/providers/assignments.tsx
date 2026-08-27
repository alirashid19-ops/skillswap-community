import { useCallback, useEffect, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedAssignments, seedSubmissions } from '../mocks/assignments';
import { useCurrentUser } from './current-user';
import { useNotifications } from './notifications';
import type { AssignmentSubmission, AssignmentType, ClassAssignment } from '../types';

const CREATED_KEY = '@skillswap/assignments_created';
const SUBMISSIONS_KEY = '@skillswap/assignment_submissions';

export interface CreateAssignmentInput {
  classId: string;
  title: string;
  description: string;
  type: AssignmentType;
  dueISO?: string;
}

interface AssignmentsContextValue {
  assignments: ClassAssignment[];
  submissions: AssignmentSubmission[];
  getAssignmentsForClass: (classId: string) => ClassAssignment[];
  getAssignmentById: (id: string) => ClassAssignment | undefined;
  getSubmissionsForAssignment: (assignmentId: string) => AssignmentSubmission[];
  getMySubmission: (assignmentId: string) => AssignmentSubmission | undefined;
  createAssignment: (input: CreateAssignmentInput) => ClassAssignment;
  deleteAssignment: (id: string) => void;
  submitWork: (assignmentId: string) => { success: boolean; error?: string };
  updateSubmissionText: (assignmentId: string, text: string) => void;
  gradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
}

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const [AssignmentsProvider, useAssignments] = createContextHook<AssignmentsContextValue>(() => {
  const { currentUser } = useCurrentUser();
  const { addNotification } = useNotifications();

  // Teacher-created assignments are persisted; seeds merge in front of them.
  const [createdAssignments, setCreatedAssignments] = useState<ClassAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>(seedSubmissions.map(x => ({ ...x })));
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const [rawCreated, rawSubs] = await Promise.all([
          AsyncStorage.getItem(CREATED_KEY),
          AsyncStorage.getItem(SUBMISSIONS_KEY),
        ]);
        if (rawCreated) setCreatedAssignments(JSON.parse(rawCreated) as ClassAssignment[]);
        if (rawSubs) setSubmissions(JSON.parse(rawSubs) as AssignmentSubmission[]);
      } catch (error) {
        console.warn('[Assignments] Failed to restore saved data:', error);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CREATED_KEY, JSON.stringify(createdAssignments)).catch(() => undefined);
  }, [createdAssignments, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions)).catch(() => undefined);
  }, [submissions, hydrated]);

  const assignments = useMemo<ClassAssignment[]>(() => [...seedAssignments, ...createdAssignments], [createdAssignments]);

  const getAssignmentsForClass = useCallback(
    (classId: string) => assignments.filter(a => a.classId === classId),
    [assignments],
  );

  const getAssignmentById = useCallback(
    (id: string) => assignments.find(a => a.id === id),
    [assignments],
  );

  const getSubmissionsForAssignment = useCallback(
    (assignmentId: string) => submissions.filter(s => s.assignmentId === assignmentId),
    [submissions],
  );

  const getMySubmission = useCallback(
    (assignmentId: string) => submissions.find(s => s.assignmentId === assignmentId && s.studentId === currentUser.id),
    [submissions, currentUser.id],
  );

  const createAssignment = useCallback((input: CreateAssignmentInput): ClassAssignment => {
    const assignment: ClassAssignment = {
      id: generateId('asg'),
      teacherId: currentUser.id,
      createdAt: new Date().toISOString(),
      ...input,
    };
    setCreatedAssignments(prev => [assignment, ...prev]);
    addNotification({
      title: input.type === 'homework' ? 'Homework posted' : 'New assignment posted',
      body: `"${input.title}" has been shared with your students.`,
      category: 'class',
    });
    return assignment;
  }, [currentUser.id, addNotification]);

  const deleteAssignment = useCallback((id: string) => {
    setCreatedAssignments(prev => prev.filter(a => a.id !== id));
    setSubmissions(prev => prev.filter(s => s.assignmentId !== id));
  }, []);

  // A student hands work in for the first time.
  const submitWork = useCallback((assignmentId: string): { success: boolean; error?: string } => {
    const existing = submissions.find(s => s.assignmentId === assignmentId && s.studentId === currentUser.id);
    if (existing && existing.status === 'graded') {
      return { success: false, error: 'This submission has already been graded.' };
    }
    const now = new Date().toISOString();
    if (existing) {
      setSubmissions(prev =>
        prev.map(s => s.id === existing.id ? { ...s, submittedAt: now } : s),
      );
      return { success: true };
    }
    setSubmissions(prev => [
      ...prev,
      {
        id: generateId('sub'),
        assignmentId,
        studentId: currentUser.id,
        text: '',
        submittedAt: now,
        status: 'submitted',
      },
    ]);
    return { success: true };
  }, [submissions, currentUser.id]);

  // Edit the answer text before the teacher grades it.
  const updateSubmissionText = useCallback(
    (assignmentId: string, text: string) => {
      setSubmissions(prev =>
        prev.map(s =>
          s.assignmentId === assignmentId && s.studentId === currentUser.id ? { ...s, text } : s,
        ),
      );
    },
    [currentUser.id],
  );

  const gradeSubmission = useCallback((submissionId: string, grade: number, feedback: string) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.id === submissionId
          ? { ...s, grade, feedback: feedback.trim() || undefined, status: 'graded' as const, gradedAt: new Date().toISOString() }
          : s,
      ),
    );
  }, []);

  const value = useMemo<AssignmentsContextValue>(() => ({
    assignments,
    submissions,
    getAssignmentsForClass,
    getAssignmentById,
    getSubmissionsForAssignment,
    getMySubmission,
    createAssignment,
    deleteAssignment,
    submitWork,
    updateSubmissionText,
    gradeSubmission,
  }), [
    assignments, submissions, getAssignmentsForClass, getAssignmentById,
    getSubmissionsForAssignment, getMySubmission, createAssignment,
    deleteAssignment, submitWork, updateSubmissionText, gradeSubmission,
  ]);

  return value;
});
