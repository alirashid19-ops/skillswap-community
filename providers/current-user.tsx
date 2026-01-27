import { useCallback, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { mockUsers } from '../mocks/data';
import type { MatchRecommendation, User } from '../types';
import { computeMatchRecommendations } from '../lib/matching';

interface CurrentUserContextValue {
  currentUser: User;
  allUsers: User[];
  recommendations: MatchRecommendation[];
  topRecommendations: MatchRecommendation[];
  teachMatches: MatchRecommendation[];
  refreshRecommendations: () => void;
}

export const [CurrentUserProvider, useCurrentUser] = createContextHook<CurrentUserContextValue>(() => {
  const [currentUser] = useState<User>(mockUsers[0]);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  const otherUsers = useMemo<User[]>(() => {
    console.log('[Matching] Computing other users list', { refreshCounter });
    return mockUsers.filter((user) => user.id !== currentUser.id);
  }, [currentUser.id, refreshCounter]);

  const recommendations = useMemo<MatchRecommendation[]>(() => {
    console.log('[Matching] Recomputing recommendations', { refreshCounter });
    return computeMatchRecommendations(currentUser, otherUsers);
  }, [currentUser, otherUsers, refreshCounter]);

  const topRecommendations = useMemo<MatchRecommendation[]>(() => {
    return recommendations.slice(0, 6);
  }, [recommendations]);

  const teachMatches = useMemo<MatchRecommendation[]>(() => {
    return recommendations.filter((recommendation) => recommendation.theyCanLearn.length > 0);
  }, [recommendations]);

  const refreshRecommendations = useCallback(() => {
    console.log('[Matching] Refresh triggered');
    setRefreshCounter((value) => value + 1);
  }, []);

  const value = useMemo<CurrentUserContextValue>(() => {
    return {
      currentUser,
      allUsers: mockUsers,
      recommendations,
      topRecommendations,
      teachMatches,
      refreshRecommendations,
    };
  }, [currentUser, recommendations, topRecommendations, teachMatches, refreshRecommendations]);

  return value;
});
