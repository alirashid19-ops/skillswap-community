import { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MapPin, Star, Calendar, Sparkles, MessageCircle, Users, Clock, Coins, Repeat, CreditCard, ArrowRight, Flag, Ban, X, CheckCircle2, ShieldX } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import { mockUsers, getSkillsWithUsers } from '../../mocks/data';
import ReviewsSection from '../../components/ReviewsSection';
import SkillSwapRequestModal from '../../components/SkillSwapRequestModal';
import { useSkillSwaps } from '../../providers/skill-swaps';
import { useCurrentUser } from '../../providers/current-user';
import { useClasses } from '../../providers/classes';
import { useSafety } from '../../providers/safety';
import { trpc } from '../../lib/trpc';
import { formatCredits, formatClassSchedule, formatBillingCycle, getClassEnrollmentCost } from '../../lib/payments';
import type { SkillWithUser, ClassWithTeacher } from '../../types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = mockUsers.find(u => u.id === id);
  const insets = useSafeAreaInsets();
  const { swaps } = useSkillSwaps();
  const { currentUser } = useCurrentUser();
  const { getClassesByTeacher, enrollInClass, isEnrolled } = useClasses();
  const { submitReport, blockUser, unblockUser, isBlocked, reportReasons } = useSafety();
  const [swapModalVisible, setSwapModalVisible] = useState<boolean>(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillWithUser | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [reportError, setReportError] = useState<string | null>(null);
  const reviewsSummary = trpc.reviews.list.useQuery({ revieweeId: id ?? '' }, {
    enabled: Boolean(id),
  });
  const averageRating = reviewsSummary.data?.stats.averageRating ?? user?.rating ?? 0;
  const totalReviews = reviewsSummary.data?.stats.totalReviews ?? 0;

  const teacherClasses = useMemo(() =>
    user ? getClassesByTeacher(user.id) : [],
  [user, getClassesByTeacher]);

  const handleQuickEnroll = useCallback((cls: ClassWithTeacher) => {
    const cost = getClassEnrollmentCost(cls.seatPriceCredits);
    const balanceAfter = currentUser.credits - cost;
    if (cost > 0 && balanceAfter < 0) {
      Alert.alert('Not enough credits', `You need ${cost} credits but have ${currentUser.credits}. Top up in the Store to enroll.`);
      return;
    }
    Alert.alert(
      'Confirm Enrollment',
      cost > 0
        ? `Pay ${cost} credits to enroll in "${cls.title}"?\n\nBalance: ${currentUser.credits} → ${balanceAfter}`
        : `Enroll in "${cls.title}" for free?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enroll',
          onPress: () => {
            const result = enrollInClass(cls.id);
            if (result.success) {
              Alert.alert('Enrolled!', `You're signed up for "${cls.title}".`, [
                { text: 'OK' },
                { text: 'View Class', onPress: () => router.push(`/class/${cls.id}` as any) },
              ]);
            } else {
              Alert.alert('Cannot enroll', result.error ?? 'Something went wrong.');
            }
          },
        },
      ],
    );
  }, [currentUser.credits, enrollInClass, router]);

  const handleReport = useCallback(() => {
    if (!user) return;
    if (!reportReason) { setReportError('Please select a reason'); return; }
    if (reportDesc.trim().length < 10) { setReportError('Please describe the issue (min 10 characters)'); return; }
    submitReport(currentUser.id, user.id, reportReason as any, reportDesc);
    setReportModalVisible(false);
    setReportReason('');
    setReportDesc('');
    setReportError(null);
    Alert.alert('Report Submitted', 'Thank you for reporting. Our team will review this and take appropriate action within 24 hours.');
  }, [reportReason, reportDesc, submitReport, currentUser.id, user]);

  const handleBlock = useCallback(() => {
    if (!user) return;
    Alert.alert(
      `Block ${user.name}?`,
      'They won\'t be able to send you swap requests or messages. You can unblock them later from your profile settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            blockUser(currentUser.id, user!.id);
            Alert.alert('User Blocked', `${user!.name} has been blocked.`, [{ text: 'OK', onPress: () => router.back() }]);
          },
        },
      ],
    );
  }, [user, currentUser.id, blockUser, router]);

  const handleUnblock = useCallback(() => {
    if (!user) return;
    Alert.alert(
      `Unblock ${user.name}?`,
      'They will be able to interact with you again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            unblockUser(user!.id);
            Alert.alert('User Unblocked', `${user!.name} has been unblocked.`);
          },
        },
      ],
    );
  }, [user, unblockUser]);

  const handleSendMessage = useCallback(() => {
    if (!user || !currentUser) return;

    const existingSwap = swaps.find(
      (s) =>
        (s.requesterId === currentUser.id && s.recipientId === user.id) ||
        (s.requesterId === user.id && s.recipientId === currentUser.id)
    );

    if (existingSwap) {
      console.log('[Profile] Navigating to existing swap:', existingSwap.id);
      router.push(`/swaps/${existingSwap.id}` as any);
      return;
    }

    const allSkills = getSkillsWithUsers();
    const userSkills = allSkills.filter((s) => s.userId === user.id);

    if (userSkills.length > 0) {
      console.log('[Profile] Opening swap request modal for skill:', userSkills[0].id);
      setSelectedSkill(userSkills[0]);
      setSwapModalVisible(true);
    } else {
      Alert.alert(
        'No Skills Available',
        `${user.name} hasn't listed any skills yet. Check back later!`,
        [{ text: 'OK' }]
      );
    }
  }, [user, currentUser, swaps, router]);

  if (!user) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ title: user.name }} />
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {user.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: Colors.light.backgroundTertiary }]} />
          )}
          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color={Colors.light.textSecondary} />
            <Text style={styles.location}>{user.location}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.totalSwaps}</Text>
              <Text style={styles.statLabel}>Total Swaps</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.ratingRow}>
                <Star size={20} fill={Colors.light.accent} color={Colors.light.accent} />
                <Text style={styles.statValue}>{averageRating.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statHint}>{totalReviews} review{totalReviews === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.joinedRow}>
                <Calendar size={16} color={Colors.light.primary} />
                <Text style={styles.statValue}>2024</Text>
              </View>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage} activeOpacity={0.8}>
            <MessageCircle size={18} color="#FFFFFF" />
            <Text style={styles.messageButtonText}>Send Message</Text>
          </TouchableOpacity>

          {isBlocked(user.id) ? (
            <View style={styles.safetyRow}>
              <View style={styles.blockedBadge}>
                <ShieldX size={16} color="#FFFFFF" />
                <Text style={styles.blockedBadgeText}>Blocked</Text>
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={handleUnblock} activeOpacity={0.7}>
                <Text style={styles.unblockBtnText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.safetyRow}>
              <TouchableOpacity style={styles.reportBtn} onPress={() => { setReportReason(''); setReportDesc(''); setReportError(null); setReportModalVisible(true); }} activeOpacity={0.7}>
                <Flag size={16} color="#EF4444" />
                <Text style={styles.reportBtnText}>Report User</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.blockBtn} onPress={handleBlock} activeOpacity={0.7}>
                <Ban size={16} color="#64748B" />
                <Text style={styles.blockBtnText}>Block</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{user.bio}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skills Offered</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{user.skillsOffered.length}</Text>
            </View>
          </View>
          <View style={styles.skillsGrid}>
            {user.skillsOffered.map((skill) => (
              <TouchableOpacity
                key={skill.id}
                style={styles.skillCard}
                onPress={() => router.push(`/skill/${skill.id}` as any)}
              >
                {skill.imageUrl ? (
                  <Image
                    source={{ uri: skill.imageUrl }}
                    style={styles.skillImage}
                  />
                ) : (
                  <View style={[styles.skillImage, { backgroundColor: Colors.light.backgroundTertiary }]} />
                )}
                <View style={styles.skillOverlay}>
                  <Text style={styles.skillCardTitle} numberOfLines={2}>
                    {skill.title}
                  </Text>
                  <View style={styles.skillCardBadge}>
                    <Text style={styles.skillCardBadgeText}>{skill.level}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {teacherClasses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Classes by {user.name.split(' ')[0]}</Text>
              <View style={[styles.badge, { backgroundColor: Colors.light.secondary }]}>
                <Text style={styles.badgeText}>{teacherClasses.length}</Text>
              </View>
            </View>
            <View style={styles.teacherClassesList}>
              {teacherClasses.map((cls) => {
                const seatsLeft = cls.maxCapacity - cls.enrolledCount;
                const isFree = cls.seatPriceCredits === 0;
                const enrolled = isEnrolled(cls.id, currentUser.id);
                const isFull = seatsLeft <= 0;
                const isRecurring = cls.sessionType !== 'single';
                const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const timeStr = new Date(cls.startISO).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                return (
                  <TouchableOpacity
                    key={cls.id}
                    style={styles.classCard}
                    onPress={() => router.push(`/class/${cls.id}` as any)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: cls.coverImageUrl }} style={styles.classCover} />
                    <View style={styles.classBody}>
                      <View style={styles.classTopRow}>
                        <Text style={styles.classCatBadge}>{cls.category}</Text>
                        <View style={styles.classLevelPill}>
                          <Text style={styles.classLevelText}>{cls.level}</Text>
                        </View>
                      </View>
                      <Text style={styles.classTitle} numberOfLines={2}>{cls.title}</Text>
                      <View style={styles.classMetaRow}>
                        <Calendar size={12} color={Colors.light.textTertiary} />
                        <Text style={styles.classMetaText}>
                          {isRecurring
                            ? `${shortDate(cls.startISO)} — ${shortDate(cls.endISO)}`
                            : shortDate(cls.startISO)}
                        </Text>
                        <Clock size={12} color={Colors.light.textTertiary} />
                        <Text style={styles.classMetaText}>{timeStr}</Text>
                      </View>
                      <View style={styles.classMetaRow}>
                        <Repeat size={12} color={Colors.light.primary} />
                        <Text style={[styles.classMetaText, { color: Colors.light.primary }]}>
                          {formatClassSchedule(cls.sessionType, cls.sessionCount, cls.scheduleDays)}
                        </Text>
                        <CreditCard size={12} color={Colors.light.secondary} />
                        <Text style={[styles.classMetaText, { color: Colors.light.secondary }]}>
                          {formatBillingCycle(cls.billingCycle)}
                        </Text>
                      </View>
                      <View style={styles.classSeatRow}>
                        <View style={styles.classSeatInfo}>
                          <Users size={13} color={Colors.light.primary} />
                          <Text style={styles.classSeatText}>{cls.enrolledCount}/{cls.maxCapacity} enrolled</Text>
                        </View>
                        {isFree ? (
                          <View style={styles.classFreeTag}>
                            <Sparkles size={12} color="#10B981" />
                            <Text style={styles.classFreeText}>Free</Text>
                          </View>
                        ) : (
                          <View style={styles.classPriceTag}>
                            <Coins size={13} color="#F59E0B" />
                            <Text style={styles.classPriceText}>{formatCredits(cls.seatPriceCredits)}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.classActionRow}>
                        {enrolled ? (
                          <View style={styles.classEnrolledBadge}>
                            <Sparkles size={14} color="#10B981" />
                            <Text style={styles.classEnrolledText}>Enrolled</Text>
                          </View>
                        ) : isFull ? (
                          <View style={styles.classFullBadge}>
                            <Text style={styles.classFullText}>Class Full</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.classEnrollBtn}
                            onPress={() => handleQuickEnroll(cls)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.classEnrollBtnText}>
                              {isFree ? 'Enroll Free' : `Enroll · ${cls.seatPriceCredits} cr`}
                            </Text>
                            <ArrowRight size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.classDetailLink}
                          onPress={() => router.push(`/class/${cls.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.classDetailLinkText}>Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Looking to Learn</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{user.skillsWanted.length}</Text>
            </View>
          </View>
          <View style={styles.wantsList}>
            {user.skillsWanted.map((skill, index) => (
              <View key={index} style={styles.wantCard}>
                <Sparkles size={18} color={Colors.light.primary} />
                <Text style={styles.wantText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.reviewsWrapper}>
          <ReviewsSection revieweeId={user.id} headline="What learners are saying" />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {selectedSkill && (
        <SkillSwapRequestModal
          visible={swapModalVisible}
          skill={selectedSkill}
          onClose={() => {
            setSwapModalVisible(false);
            setSelectedSkill(null);
          }}
        />
      )}

      {/* Report User Modal */}
      <Modal visible={reportModalVisible} transparent animationType={Platform.select({ ios: 'slide', default: 'fade' })} onRequestClose={() => { setReportModalVisible(false); setReportReason(''); setReportDesc(''); setReportError(null); }}>
        <Pressable style={styles.modalOverlay} onPress={() => { setReportModalVisible(false); setReportReason(''); setReportDesc(''); setReportError(null); }}>
          <Pressable style={styles.reportModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.reportModalHeader}>
              <View style={styles.reportModalTitleRow}>
                <Flag size={20} color="#EF4444" />
                <Text style={styles.reportModalTitle}>Report {user.name}</Text>
              </View>
              <Pressable onPress={() => { setReportModalVisible(false); setReportReason(''); setReportDesc(''); setReportError(null); }}>
                <X size={20} color={Colors.light.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.reportModalDesc}>Help us keep leteski safe. What happened?</Text>
            <View style={styles.reasonList}>
              {reportReasons.map((r) => {
                const active = reportReason === r.key;
                return (
                  <Pressable key={r.key} style={[styles.reasonChip, active && styles.reasonChipActive]} onPress={() => { setReportReason(r.key); setReportError(null); }}>
                    {active ? <CheckCircle2 size={18} color="#EF4444" /> : <Flag size={18} color={Colors.light.textSecondary} />}
                    <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.inputLabel}>Describe what happened</Text>
            <TextInput
              style={styles.reportInput}
              placeholder="Please describe the incident in detail..."
              placeholderTextColor={Colors.light.textTertiary}
              value={reportDesc}
              onChangeText={(t) => { setReportDesc(t); setReportError(null); }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {reportError && <Text style={styles.reportModalError}>{reportError}</Text>}
            <TouchableOpacity style={styles.reportSubmitBtn} onPress={handleReport} activeOpacity={0.7}>
              <Flag size={18} color="#FFFFFF" />
              <Text style={styles.reportSubmitBtnText}>Submit Report</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.light.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
  },
  location: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  statHint: {
    fontSize: 11,
    color: Colors.light.textTertiary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  messageButton: {
    width: '100%',
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: Colors.light.background,
    padding: 20,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  badge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.textSecondary,
  },
  skillsGrid: {
    gap: 12,
  },
  skillCard: {
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  skillImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  skillOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 16,
    justifyContent: 'space-between',
  },
  skillCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  skillCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  skillCardBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  teacherClassesList: {
    gap: 14,
  },
  classCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  classCover: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  classBody: {
    padding: 14,
  },
  classTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  classCatBadge: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.light.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  classLevelPill: {
    backgroundColor: Colors.light.backgroundTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classLevelText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.light.primary,
  },
  classTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  classMetaText: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    fontWeight: '500' as const,
    marginRight: 6,
  },
  classSeatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  classSeatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classSeatText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  classFreeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classFreeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  classPriceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classPriceText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
  classActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  classEnrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  classEnrollBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  classEnrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  classEnrolledText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  classFullBadge: {
    backgroundColor: Colors.light.backgroundTertiary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  classFullText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.light.textTertiary,
  },
  classDetailLink: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  classDetailLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  wantsList: {
    gap: 12,
  },
  wantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  wantText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  reviewsWrapper: {
    paddingHorizontal: 20,
  },
  bottomSpacer: {
    height: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  safetyRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 10,
  },
  reportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  blockBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#64748B',
  },
  blockedBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  unblockBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  unblockBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  reportModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    padding: 20,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportModalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  reportModalDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  reasonList: {
    gap: 8,
    marginBottom: 16,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  reasonChipActive: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  reasonChipText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  reasonChipTextActive: {
    color: '#EF4444',
    fontWeight: '600' as const,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  reportInput: {
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundSecondary,
    minHeight: 80,
    marginBottom: 8,
  },
  reportModalError: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 8,
  },
  reportSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
  },
  reportSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
