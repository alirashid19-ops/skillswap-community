import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import type { ClassRecording } from '../types';
import { useCurrentUser } from './current-user';
import { useNotifications } from './notifications';

const STORAGE_KEY = '@skillswap/class_recordings';
const MIN = 60_000;

function seedRecordings(): ClassRecording[] {
  const now = Date.now();
  return [
    {
      id: 'rec-1',
      classId: 'cls-1',
      title: 'Week 3 · Grammar drills review',
      durationSec: 2920,
      recordedBy: '1',
      createdAt: new Date(now - 3 * 24 * 60 * MIN).toISOString(),
    },
    {
      id: 'rec-2',
      classId: 'cls-1',
      title: 'Week 2 · Pronunciation practice',
      durationSec: 3140,
      recordedBy: '1',
      createdAt: new Date(now - 10 * 24 * 60 * MIN).toISOString(),
    },
    {
      id: 'rec-3',
      classId: 'cls-2',
      title: 'Session recording · Scales & warm-ups',
      durationSec: 2130,
      recordedBy: '2',
      createdAt: new Date(now - 5 * 24 * 60 * MIN).toISOString(),
    },
    {
      id: 'rec-4',
      classId: 'cls-3',
      title: 'Session recording · Canvas basics',
      durationSec: 2475,
      recordedBy: '3',
      createdAt: new Date(now - 1 * 24 * 60 * MIN).toISOString(),
    },
  ];
}

interface RecordingsContextValue {
  getRecordingsForClass: (classId: string) => ClassRecording[];
  addRecording: (input: { classId: string; title: string; durationSec: number }) => void;
  deleteRecording: (id: string) => void;
}

export const [RecordingsProvider, useRecordings] = createContextHook<RecordingsContextValue>(() => {
  const { currentUser } = useCurrentUser();
  const { addNotification } = useNotifications();
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => setRecordings(raw ? (JSON.parse(raw) as ClassRecording[]) : seedRecordings()))
      .catch(() => setRecordings(seedRecordings()))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recordings)).catch(() => undefined);
  }, [recordings, hydrated]);

  const getRecordingsForClass = useCallback(
    (classId: string): ClassRecording[] =>
      recordings
        .filter(r => r.classId === classId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [recordings],
  );

  const addRecording = useCallback(
    (input: { classId: string; title: string; durationSec: number }) => {
      const rec: ClassRecording = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        classId: input.classId,
        title: input.title,
        durationSec: Math.max(1, Math.round(input.durationSec)),
        recordedBy: currentUser.id,
        createdAt: new Date().toISOString(),
      };
      setRecordings(prev => [rec, ...prev]);
      addNotification({
        title: 'Recording published',
        body: `"${input.title}" is now available to enrolled students.`,
        category: 'class',
      });
    },
    [currentUser.id, addNotification],
  );

  const deleteRecording = useCallback((id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  }, []);

  return useMemo(
    () => ({ getRecordingsForClass, addRecording, deleteRecording }),
    [getRecordingsForClass, addRecording, deleteRecording],
  );
});
