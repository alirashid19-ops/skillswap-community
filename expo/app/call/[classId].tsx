import { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import CallScreen from '../../components/CallScreen';
import { useCurrentUser } from '../../providers/current-user';
import { useClasses } from '../../providers/classes';
import { mockUsers } from '../../mocks/data';
import {
  buildLocalParticipant, buildRemoteParticipant, buildMockClassParticipants,
  type CallParticipant,
} from '../../lib/call-engine';

export default function ClassCallScreen() {
  const { classId, mode } = useLocalSearchParams<{ classId: string; mode?: string }>();
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { getClassById } = useClasses();

  const cls = useMemo(() => getClassById(classId), [getClassById, classId]);

  const callMode = mode === 'voice' ? 'voice' : 'video';

  const participants: CallParticipant[] = useMemo(() => {
    if (!cls) return [];
    const teacher = mockUsers.find((u) => u.id === cls.teacherId);
    const localRole = cls.teacherId === currentUser.id ? 'teacher' : 'student';
    const local = buildLocalParticipant(currentUser, localRole);

    const others: CallParticipant[] = [];
    if (teacher && teacher.id !== currentUser.id) {
      others.push(buildRemoteParticipant(
        { id: teacher.id, name: teacher.name, avatarUrl: teacher.avatarUrl },
        'teacher',
      ));
    }

    const enrolledStudents = cls.enrollments
      .filter(e => e.studentId !== currentUser.id && e.status === 'enrolled')
      .map(e => mockUsers.find(u => u.id === e.studentId))
      .filter((u): u is NonNullable<typeof u> => u !== undefined);

    others.push(...buildMockClassParticipants(enrolledStudents.length));

    return [local, ...others];
  }, [cls, currentUser]);

  const handleEndCall = () => {
    router.back();
  };

  if (!cls) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient colors={['#0B1120', '#1E293B']} style={styles.errorGradient}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#F8FAFC" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Class call not available</Text>
            <Text style={styles.errorMessage}>Unable to start the class call. Please try again.</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const isTeacher = cls.teacherId === currentUser.id;

  return (
    <CallScreen
      participants={participants}
      roomTitle={cls.title}
      mode={callMode}
      isGroupCall
      onEndCall={handleEndCall}
    />
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1 },
  errorGradient: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 14, color: '#F8FAFC', fontWeight: '600' as const },
  errorContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorTitle: { fontSize: 24, fontWeight: '800' as const, color: '#FFFFFF' },
  errorMessage: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' as const },
});
