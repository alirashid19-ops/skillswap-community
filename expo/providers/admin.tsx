import { useCallback, useEffect, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockUsers } from '../mocks/data';
import type { User, Review, SkillSwapRequest, UserVerifications, VerificationStatus } from '../types';

const ADMIN_SESSION_KEY = '@skillswap/admin_session';

const ADMIN_CREDENTIALS = {
  email: 'admin@leteski.app',
  password: 'admin123',
};

export type BanStatus = 'active' | 'banned' | 'suspended';

export interface AdminUser extends User {
  email: string;
  banStatus: BanStatus;
  banReason?: string;
  bannedAt?: string;
  reportCount: number;
}

export interface AdminReview extends Review {
  reviewerName: string;
  revieweeName: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderatedAt?: string;
  moderationNote?: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'identity' | 'email' | 'phone' | 'linkedin' | 'portfolio';
  status: VerificationStatus;
  submittedAt: string;
  details: string;
  documentUrl?: string;
}

export type CertificationStatus = 'pending' | 'approved' | 'rejected';

export interface CertificationRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  skillId: string;
  skillTitle: string;
  documentUri?: string;
  status: CertificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface SubmitCertificationInput {
  userId: string;
  userName: string;
  userAvatar: string;
  skillId: string;
  skillTitle: string;
  documentUri?: string;
}

interface AdminContextValue {
  users: AdminUser[];
  reviews: AdminReview[];
  verificationRequests: VerificationRequest[];
  certificationRequests: CertificationRequest[];
  isAdminAuthenticated: boolean;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
  banUser: (userId: string, reason: string) => void;
  unbanUser: (userId: string) => void;
  suspendUser: (userId: string, reason: string) => void;
  updateUserCredits: (userId: string, credits: number) => void;
  approveReview: (reviewId: string, note?: string) => void;
  rejectReview: (reviewId: string, note: string) => void;
  approveVerification: (requestId: string) => void;
  rejectVerification: (requestId: string, reason: string) => void;
  submitCertification: (input: SubmitCertificationInput) => void;
  approveCertification: (requestId: string) => void;
  rejectCertification: (requestId: string, reason: string) => void;
  getSkillCertificationStatus: (userId: string, skillId: string) => CertificationStatus | null;
  stats: {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    pendingReviews: number;
    pendingVerifications: number;
    pendingCertifications: number;
    totalSwaps: number;
  };
}

const seedAdminUsers = (): AdminUser[] => {
  return mockUsers.map((user, index) => ({
    ...user,
    email: `${user.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    banStatus: 'active' as BanStatus,
    reportCount: Math.floor(Math.random() * 5),
  }));
};

const seedReviews = (): AdminReview[] => {
  const now = new Date();
  return [
    {
      id: 'rev-1',
      reviewerId: '2',
      revieweeId: '1',
      rating: 5,
      comment: 'Amazing photography session! Learned so much about lighting and composition.',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      reviewerName: 'Rahul Verma',
      revieweeName: 'Priya Sharma',
      moderationStatus: 'approved',
    },
    {
      id: 'rev-2',
      reviewerId: '4',
      revieweeId: '3',
      rating: 4,
      comment: 'Great Hindi conversation practice. Very patient teacher.',
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      reviewerName: 'Arjun Mehta',
      revieweeName: 'Ananya Reddy',
      moderationStatus: 'pending',
    },
    {
      id: 'rev-3',
      reviewerId: '5',
      revieweeId: '6',
      rating: 2,
      comment: 'Session was okay but felt rushed. Could improve time management.',
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      reviewerName: 'Kavya Nair',
      revieweeName: 'Vikram Singh',
      moderationStatus: 'pending',
      flaggedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      flagReason: 'Potentially unfair rating',
      flagReporterId: '6',
    },
    {
      id: 'rev-4',
      reviewerId: '1',
      revieweeId: '5',
      rating: 5,
      comment: 'Kavya is an incredible digital artist. Her teaching style is clear and inspiring!',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      reviewerName: 'Priya Sharma',
      revieweeName: 'Kavya Nair',
      moderationStatus: 'approved',
    },
    {
      id: 'rev-5',
      reviewerId: '3',
      revieweeId: '2',
      rating: 1,
      comment: 'Did not show up for the session. Very unprofessional.',
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      reviewerName: 'Ananya Reddy',
      revieweeName: 'Rahul Verma',
      moderationStatus: 'pending',
      flaggedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      flagReason: 'Dispute - user claims they attended',
      flagReporterId: '2',
    },
    {
      id: 'rev-6',
      reviewerId: '6',
      revieweeId: '4',
      rating: 4,
      comment: 'Good piano fundamentals session. Would recommend for beginners.',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      reviewerName: 'Vikram Singh',
      revieweeName: 'Arjun Mehta',
      moderationStatus: 'approved',
    },
  ];
};

const seedVerificationRequests = (): VerificationRequest[] => {
  const now = new Date();
  return [
    {
      id: 'vr-1',
      userId: '2',
      userName: 'Rahul Verma',
      userAvatar: 'https://i.pravatar.cc/150?img=12',
      type: 'identity',
      status: 'pending',
      submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'National ID card submitted',
      documentUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    },
    {
      id: 'vr-2',
      userId: '4',
      userName: 'Arjun Mehta',
      userAvatar: 'https://i.pravatar.cc/150?img=13',
      type: 'linkedin',
      status: 'pending',
      submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'LinkedIn profile: linkedin.com/in/arjunmehta',
    },
    {
      id: 'vr-3',
      userId: '5',
      userName: 'Kavya Nair',
      userAvatar: 'https://i.pravatar.cc/150?img=9',
      type: 'portfolio',
      status: 'pending',
      submittedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      details: 'Portfolio: behance.net/kavyanair',
    },
    {
      id: 'vr-4',
      userId: '3',
      userName: 'Ananya Reddy',
      userAvatar: 'https://i.pravatar.cc/150?img=5',
      type: 'phone',
      status: 'pending',
      submittedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      details: 'Phone: +91 98765 43210',
    },
    {
      id: 'vr-5',
      userId: '6',
      userName: 'Vikram Singh',
      userAvatar: 'https://i.pravatar.cc/150?img=14',
      type: 'identity',
      status: 'pending',
      submittedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      details: "Driver's license submitted",
      documentUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    },
  ];
};

const seedCertificationRequests = (): CertificationRequest[] => {
  const now = new Date();
  return [
    {
      id: 'cr-1',
      userId: '2',
      userName: 'Rahul Verma',
      userAvatar: 'https://i.pravatar.cc/150?img=12',
      skillId: '3',
      skillTitle: 'Web Development (React)',
      documentUri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
      status: 'pending',
      submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'cr-2',
      userId: '3',
      userName: 'Ananya Reddy',
      userAvatar: 'https://i.pravatar.cc/150?img=5',
      skillId: '5',
      skillTitle: 'Hindi Conversation',
      documentUri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
      status: 'pending',
      submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'cr-3',
      userId: '4',
      userName: 'Arjun Mehta',
      userAvatar: 'https://i.pravatar.cc/150?img=13',
      skillId: '7',
      skillTitle: 'Piano Fundamentals',
      documentUri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
      status: 'approved',
      submittedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      reviewNote: 'ABRSM certificate verified',
    },
  ];
};

export const [AdminProvider, useAdmin] = createContextHook<AdminContextValue>(() => {
  const [users, setUsers] = useState<AdminUser[]>(seedAdminUsers);
  const [reviews, setReviews] = useState<AdminReview[]>(seedReviews);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>(seedVerificationRequests);
  const [certificationRequests, setCertificationRequests] = useState<CertificationRequest[]>(seedCertificationRequests);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  const adminLogin = useCallback(async (email: string, password: string) => {
    console.log('[Admin] Login attempt', { email });
    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail === ADMIN_CREDENTIALS.email &&
      password === ADMIN_CREDENTIALS.password
    ) {
      await AsyncStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setIsAdminAuthenticated(true);
      console.log('[Admin] Login successful');
    } else {
      console.warn('[Admin] Login failed - invalid credentials');
      throw new Error('Invalid admin credentials');
    }
  }, []);

  const adminLogout = useCallback(async () => {
    console.log('[Admin] Logging out');
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdminAuthenticated(false);
  }, []);

  // Restore admin session on mount
  useEffect(() => {
    (async () => {
      try {
        const session = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
        if (session === 'true') {
          setIsAdminAuthenticated(true);
        }
      } catch (error) {
        console.error('[Admin] Failed to restore session:', error);
      }
    })();
  }, []);

  const banUser = useCallback((userId: string, reason: string) => {
    console.log('[Admin] Banning user', { userId, reason });
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, banStatus: 'banned' as BanStatus, banReason: reason, bannedAt: new Date().toISOString() } : u
    ));
  }, []);

  const unbanUser = useCallback((userId: string) => {
    console.log('[Admin] Unbanning user', { userId });
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, banStatus: 'active' as BanStatus, banReason: undefined, bannedAt: undefined } : u
    ));
  }, []);

  const suspendUser = useCallback((userId: string, reason: string) => {
    console.log('[Admin] Suspending user', { userId, reason });
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, banStatus: 'suspended' as BanStatus, banReason: reason, bannedAt: new Date().toISOString() } : u
    ));
  }, []);

  const updateUserCredits = useCallback((userId: string, credits: number) => {
    console.log('[Admin] Updating credits', { userId, credits });
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, credits } : u
    ));
  }, []);

  const approveReview = useCallback((reviewId: string, note?: string) => {
    console.log('[Admin] Approving review', { reviewId, note });
    setReviews(prev => prev.map(r =>
      r.id === reviewId ? { ...r, moderationStatus: 'approved' as const, moderatedAt: new Date().toISOString(), moderationNote: note } : r
    ));
  }, []);

  const rejectReview = useCallback((reviewId: string, note: string) => {
    console.log('[Admin] Rejecting review', { reviewId, note });
    setReviews(prev => prev.map(r =>
      r.id === reviewId ? { ...r, moderationStatus: 'rejected' as const, moderatedAt: new Date().toISOString(), moderationNote: note } : r
    ));
  }, []);

  const approveVerification = useCallback((requestId: string) => {
    console.log('[Admin] Approving verification', { requestId });
    setVerificationRequests(prev => prev.map(vr =>
      vr.id === requestId ? { ...vr, status: 'verified' as VerificationStatus } : vr
    ));
  }, []);

  const rejectVerification = useCallback((requestId: string, reason: string) => {
    console.log('[Admin] Rejecting verification', { requestId, reason });
    setVerificationRequests(prev => prev.map(vr =>
      vr.id === requestId ? { ...vr, status: 'rejected' as VerificationStatus } : vr
    ));
  }, []);

  // Teachers submit a skill certificate for review; replaces any previous
  // request for the same skill (including approved, since the document changed).
  const submitCertification = useCallback((input: SubmitCertificationInput) => {
    console.log('[Admin] New certification request', { userId: input.userId, skillId: input.skillId });
    setCertificationRequests(prev => {
      const entry: CertificationRequest = {
        id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...input,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };
      const existingIdx = prev.findIndex(c => c.userId === input.userId && c.skillId === input.skillId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = entry;
        return next;
      }
      return [entry, ...prev];
    });
  }, []);

  const approveCertification = useCallback((requestId: string) => {
    console.log('[Admin] Approving certification', { requestId });
    setCertificationRequests(prev => prev.map(c =>
      c.id === requestId ? { ...c, status: 'approved' as CertificationStatus, reviewedAt: new Date().toISOString() } : c
    ));
  }, []);

  const rejectCertification = useCallback((requestId: string, reason: string) => {
    console.log('[Admin] Rejecting certification', { requestId });
    setCertificationRequests(prev => prev.map(c =>
      c.id === requestId ? { ...c, status: 'rejected' as CertificationStatus, reviewedAt: new Date().toISOString(), reviewNote: reason } : c
    ));
  }, []);

  const getSkillCertificationStatus = useCallback((userId: string, skillId: string): CertificationStatus | null => {
    const forSkill = certificationRequests.filter(c => c.userId === userId && c.skillId === skillId);
    if (forSkill.length === 0) return null;
    if (forSkill.some(c => c.status === 'approved')) return 'approved';
    const latest = [...forSkill].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
    return latest?.status ?? null;
  }, [certificationRequests]);

  const stats = useMemo(() => ({
    totalUsers: users.length,
    activeUsers: users.filter(u => u.banStatus === 'active').length,
    bannedUsers: users.filter(u => u.banStatus === 'banned').length,
    pendingReviews: reviews.filter(r => r.moderationStatus === 'pending').length,
    pendingVerifications: verificationRequests.filter(vr => vr.status === 'pending').length,
    pendingCertifications: certificationRequests.filter(c => c.status === 'pending').length,
    totalSwaps: users.reduce((sum, u) => sum + u.totalSwaps, 0),
  }), [users, reviews, verificationRequests, certificationRequests]);

  return useMemo<AdminContextValue>(() => ({
    users,
    reviews,
    verificationRequests,
    certificationRequests,
    isAdminAuthenticated,
    adminLogin,
    adminLogout,
    banUser,
    unbanUser,
    suspendUser,
    updateUserCredits,
    approveReview,
    rejectReview,
    approveVerification,
    rejectVerification,
    submitCertification,
    approveCertification,
    rejectCertification,
    getSkillCertificationStatus,
    stats,
  }), [users, reviews, verificationRequests, certificationRequests, isAdminAuthenticated, adminLogin, adminLogout, banUser, unbanUser, suspendUser, updateUserCredits, approveReview, rejectReview, approveVerification, rejectVerification, submitCertification, approveCertification, rejectCertification, getSkillCertificationStatus, stats]);
});
