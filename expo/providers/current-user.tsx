import { useCallback, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { mockUsers } from '../mocks/data';
import type { MatchRecommendation, OnboardingRole, User } from '../types';
import { computeMatchRecommendations, getUserRole } from '../lib/matching';

interface CurrentUserContextValue {
  currentUser: User;
  allUsers: User[];
  recommendations: MatchRecommendation[];
  topRecommendations: MatchRecommendation[];
  teachMatches: MatchRecommendation[];
  learnMatches: MatchRecommendation[];
  swapMatches: MatchRecommendation[];
  userRole: OnboardingRole;
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

  const userRole = useMemo<OnboardingRole>(() => getUserRole(currentUser), [currentUser]);

  const teachMatches = useMemo<MatchRecommendation[]>(() => {
    return recommendations.filter((recommendation) => recommendation.theyCanLearn.length > 0);
  }, [recommendations]);

  const learnMatches = useMemo<MatchRecommendation[]>(() => {
    return recommendations.filter((recommendation) => recommendation.youCanLearn.length > 0);
  }, [recommendations]);

  const swapMatches = useMemo<MatchRecommendation[]>(() => {
    return recommendations.filter(
      (recommendation) => recommendation.youCanLearn.length > 0 && recommendation.theyCanLearn.length > 0,
    );
  }, [recommendations]);

  const topRecommendations = useMemo<MatchRecommendation[]>(() => {
    // Role-aware: prioritize the match list that matters most for the user's role.
    if (userRole === 'teacher') return teachMatches.slice(0, 6);
    if (userRole === 'learner') return learnMatches.slice(0, 6);
    return swapMatches.slice(0, 6);
  }, [userRole, teachMatches, learnMatches, swapMatches]);

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
      learnMatches,
      swapMatches,
      userRole,
      refreshRecommendations,
    };
  }, [currentUser, recommendations, topRecommendations, teachMatches, learnMatches, swapMatches, userRole, refreshRecommendations]);

  return value;
});
