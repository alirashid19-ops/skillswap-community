import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import type { CommunityPost } from '../types';

const POSTS_KEY = '@skillswap/community_posts';

const MIN_MS = 60 * 1000;

const seedPosts: CommunityPost[] = [
  {
    id: 'post-1',
    authorId: '3',
    body: "Big thanks to everyone who joined yesterday's Hindi grammar session — your questions made it so much fun! Next cohort opens next week.",
    createdAt: new Date(Date.now() - 2 * 60 * MIN_MS).toISOString(),
    likedBy: ['1', '2', '5', '6'],
  },
  {
    id: 'post-2',
    authorId: '2',
    body: 'Just finished my first swap — taught web dev basics and learned guitar chords in return. This app is unreal. 10/10 would swap again.',
    createdAt: new Date(Date.now() - 5 * 60 * MIN_MS).toISOString(),
    likedBy: ['1', '4'],
  },
  {
    id: 'post-3',
    authorId: '1',
    body: 'Tip for new teachers: keep your first group class to 45 minutes. Shorter sessions mean better energy and 5-star reviews.',
    createdAt: new Date(Date.now() - 26 * 60 * MIN_MS).toISOString(),
    likedBy: ['3', '4', '6'],
  },
  {
    id: 'post-4',
    authorId: '5',
    body: "Anyone else doing the daily spoken-English class? The 7am slot is honestly the best start to my day now.",
    createdAt: new Date(Date.now() - 30 * 60 * MIN_MS).toISOString(),
    likedBy: ['2'],
  },
  {
    id: 'post-5',
    authorId: '4',
    body: "Practice quiz for Grade 8 piano theory is live in my class materials. Try it before Friday's session!",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * MIN_MS).toISOString(),
    likedBy: ['1', '5', '6'],
  },
  {
    id: 'post-6',
    authorId: '6',
    body: 'Hit 50 credits this week just from hosting weekend sketching classes. Data plan covered.',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * MIN_MS).toISOString(),
    likedBy: ['2', '5'],
  },
];

interface CommunityContextValue {
  posts: CommunityPost[];
  addPost: (body: string, authorId: string) => void;
  toggleLike: (postId: string, userId: string) => void;
  deletePost: (postId: string) => void;
}

export const [CommunityProvider, useCommunity] = createContextHook((): CommunityContextValue => {
  const [posts, setPosts] = useState<CommunityPost[]>(seedPosts);
  const [hydrated, setHydrated] = useState(false);

  // Merge persisted posts (user-created + liked seeds) with seeds, newest first.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as CommunityPost[];
          const storedIds = new Set(stored.map(p => p.id));
          setPosts(
            [...stored, ...seedPosts.filter(p => !storedIds.has(p.id))].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            ),
          );
        }
      } catch {
        // Storage unavailable — seeds remain.
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts)).catch(() => undefined);
  }, [posts, hydrated]);

  const addPost = useCallback((body: string, authorId: string) => {
    const text = body.trim();
    if (!text) return;
    setPosts(prev => [
      {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        authorId,
        body: text,
        createdAt: new Date().toISOString(),
        likedBy: [],
      },
      ...prev,
    ]);
  }, []);

  const toggleLike = useCallback((postId: string, userId: string) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? {
              ...p,
              likedBy: p.likedBy.includes(userId)
                ? p.likedBy.filter(id => id !== userId)
                : [...p.likedBy, userId],
            }
          : p,
      ),
    );
  }, []);

  const deletePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  return useMemo(
    () => ({ posts, addPost, toggleLike, deletePost }),
    [posts, addPost, toggleLike, deletePost],
  );
});
