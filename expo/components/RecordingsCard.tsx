import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mic, Pause, Play, Square, Trash2, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useCurrentUser } from '@/providers/current-user';
import { useRecordings } from '@/providers/recordings';
import type { ClassRecording } from '@/types';

function formatClock(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Animated equalizer bars — animates while `active`, rests at a low baseline otherwise. */
function Waveform({ active, color }: { active: boolean; color: string }) {
  const bars = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        value: new Animated.Value(0.2),
        duration: 420 + ((i * 97) % 380),
      })),
    [],
  );

  useEffect(() => {
    if (!active) {
      bars.forEach(b => b.value.setValue(0.2));
      return;
    }
    // Varied durations desync the bars so they don't move in lockstep.
    const anims = bars.map(b =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b.value, { toValue: 1, duration: b.duration, useNativeDriver: true }),
          Animated.timing(b.value, { toValue: 0.25, duration: b.duration, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [active, bars]);

  return (
    <View style={s.waveRow}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={[s.waveBar, { backgroundColor: color, transform: [{ scaleY: b.value }] }]} />
      ))}
    </View>
  );
}

interface RecordingsCardProps {
  classId: string;
  isTeacher: boolean;
}

export const RecordingsCard = memo(function RecordingsCard({ classId, isTeacher }: RecordingsCardProps) {
  const { currentUser } = useCurrentUser();
  const { getRecordingsForClass, addRecording, deleteRecording } = useRecordings();
  const recordings = getRecordingsForClass(classId);

  const [studioOpen, setStudioOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState<ClassRecording | null>(null);
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const pulseRef = useRef(new Animated.Value(0));

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  // Playback ticker
  useEffect(() => {
    if (!playing || !isPlaying) return;
    const t = setInterval(() => setPosition(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [playing, isPlaying]);

  useEffect(() => {
    if (playing && isPlaying && position >= playing.durationSec) {
      setIsPlaying(false);
    }
  }, [position, playing, isPlaying]);

  const pulseAnim = useRef(
    Animated.loop(Animated.sequence([
      Animated.timing(pulseRef.current, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(pulseRef.current, { toValue: 0.15, duration: 650, useNativeDriver: true }),
    ])),
  ).current;

  const openStudio = useCallback(() => {
    setElapsed(0);
    setStudioOpen(true);
  }, []);

  const startRecording = useCallback(() => {
    setElapsed(0);
    setIsRecording(true);
    pulseAnim.stop();
    pulseRef.current.setValue(0.15);
    pulseAnim.start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, [pulseAnim]);

  const stopAndSave = useCallback(() => {
    if (elapsed < 1) return;
    setIsRecording(false);
    pulseAnim.stop();
    addRecording({
      classId,
      title: `Session recording · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      durationSec: elapsed,
    });
    setStudioOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [elapsed, classId, addRecording, pulseAnim]);

  const discardRecording = useCallback(() => {
    setIsRecording(false);
    pulseAnim.stop();
    setElapsed(0);
    setStudioOpen(false);
  }, [pulseAnim]);

  const openPlayer = useCallback((rec: ClassRecording) => {
    setPlaying(rec);
    setPosition(0);
    setIsPlaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);

  const closePlayer = useCallback(() => {
    setIsPlaying(false);
    setPlaying(null);
  }, []);

  const handleDelete = useCallback((rec: ClassRecording) => {
    Alert.alert('Delete recording', `"${rec.title}" will be removed for all students.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecording(rec.id) },
    ]);
  }, [deleteRecording]);

  const togglePlay = useCallback(() => {
    if (!playing) return;
    if (position >= playing.durationSec) setPosition(0);
    setIsPlaying(p => !p);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [playing, position]);

  return (
    <View style={s.section}>
      <View style={s.headRow}>
        <View style={s.headIcon}>
          <Mic size={18} color="#8B5CF6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headTitle}>Class Recordings</Text>
          <Text style={s.headSub}>
            {isTeacher
              ? recordings.length > 0
                ? `${recordings.length} session${recordings.length === 1 ? '' : 's'} published`
                : 'Record a session for your students'
              : recordings.length > 0
                ? `${recordings.length} recording${recordings.length === 1 ? '' : 's'} to revisit`
                : 'Your teacher hasn\u2019t posted recordings yet'}
          </Text>
        </View>
        {isTeacher && (
          <TouchableOpacity style={s.recordBtn} onPress={openStudio} activeOpacity={0.8} testID="record-session-button">
            <Mic size={14} color="#FFFFFF" />
            <Text style={s.recordBtnText}>Record</Text>
          </TouchableOpacity>
        )}
      </View>

      {recordings.map(rec => (
        <View key={rec.id} style={s.row}>
          <TouchableOpacity
            style={s.rowMain}
            onPress={() => openPlayer(rec)}
            activeOpacity={0.7}
            testID={`play-button-${rec.id}`}
          >
            <View style={s.playChip}>
              <Play size={14} color="#8B5CF6" fill="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle} numberOfLines={1}>{rec.title}</Text>
              <Text style={s.rowMeta}>{formatClock(rec.durationSec)} · {formatDay(rec.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          {isTeacher && rec.recordedBy === currentUser.id && (
            <TouchableOpacity style={s.trashBtn} onPress={() => handleDelete(rec)} activeOpacity={0.7} accessibilityLabel="Delete recording">
              <Trash2 size={16} color={Colors.light.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Recording studio */}
      <Modal visible={studioOpen} transparent animationType="fade" onRequestClose={discardRecording}>
        <View style={s.studioBackdrop}>
          <View style={s.studioCard}>
            {isRecording ? (
              <>
                <View style={s.recBadge}>
                  <Animated.View style={[s.recDot, { opacity: pulseRef.current }]} />
                  <Text style={s.recBadgeText}>REC</Text>
                </View>
                <Text style={s.studioTimer}>{formatClock(elapsed)}</Text>
                <Waveform active color="#F87171" />
                <Text style={s.studioHint}>Recording session audio…</Text>
                <TouchableOpacity style={s.stopBtn} onPress={stopAndSave} activeOpacity={0.8} testID="stop-recording-button">
                  <Square size={18} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={s.stopBtnText}>Stop &amp; Publish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.ghostBtn} onPress={discardRecording} activeOpacity={0.8}>
                  <Text style={s.ghostBtnText}>Discard</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={s.studioIconWrap}>
                  <Mic size={28} color="#8B5CF6" />
                </View>
                <Text style={s.studioTitle}>Record a class session</Text>
                <Text style={s.studioHint}>
                  Capture your lesson audio and publish it here. Enrolled students can replay it anytime.
                </Text>
                <TouchableOpacity style={s.startBtn} onPress={startRecording} activeOpacity={0.8} testID="start-recording-button">
                  <Text style={s.startBtnText}>Start Recording</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.ghostBtn} onPress={discardRecording} activeOpacity={0.8}>
                  <Text style={s.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Playback player */}
      <Modal visible={playing !== null} transparent animationType="slide" onRequestClose={closePlayer}>
        <View style={s.playerBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closePlayer} activeOpacity={1} />
          <View style={s.playerCard}>
            <View style={s.playerHead}>
              <Text style={s.playerTitle} numberOfLines={1}>{playing?.title ?? ''}</Text>
              <TouchableOpacity onPress={closePlayer} activeOpacity={0.7} accessibilityLabel="Close player">
                <X size={20} color={Colors.light.textTertiary} />
              </TouchableOpacity>
            </View>
            <Waveform active={isPlaying} color="#8B5CF6" />
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: playing ? `${Math.min(100, (position / playing.durationSec) * 100)}%` : '0%' }]} />
            </View>
            <View style={s.timeRow}>
              <Text style={s.timeText}>{formatClock(position)}</Text>
              <Text style={s.timeText}>{formatClock(playing?.durationSec ?? 0)}</Text>
            </View>
            <TouchableOpacity style={s.playBtn} onPress={togglePlay} activeOpacity={0.8} testID="player-toggle-button">
              {isPlaying ? (
                <Pause size={24} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              )}
            </TouchableOpacity>
            <Text style={s.playerNote}>Session recording · stored with the class</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const s = StyleSheet.create({
  section: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  headIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  headTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.light.text },
  headSub: { fontSize: 12, color: Colors.light.textTertiary, marginTop: 2 },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#8B5CF6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  recordBtnText: { fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playChip: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(139,92,246,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '600' as const, color: Colors.light.text },
  rowMeta: { fontSize: 11, color: Colors.light.textTertiary, marginTop: 2 },
  trashBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  studioBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.92)', justifyContent: 'center', padding: 28 },
  studioCard: {
    backgroundColor: Colors.light.card, borderRadius: 24, padding: 24, alignItems: 'center',
  },
  recBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' },
  recBadgeText: { fontSize: 13, fontWeight: '800' as const, letterSpacing: 2, color: '#EF4444' },
  studioTimer: { fontSize: 52, fontWeight: '800' as const, color: Colors.light.text, marginTop: 14, fontVariant: ['tabular-nums'] },
  studioIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(139,92,246,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  studioTitle: { fontSize: 19, fontWeight: '800' as const, color: Colors.light.text, marginTop: 14, textAlign: 'center' },
  studioHint: { fontSize: 13, color: Colors.light.textTertiary, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  startBtn: {
    backgroundColor: '#8B5CF6', borderRadius: 16, paddingVertical: 15, alignSelf: 'stretch',
    alignItems: 'center', marginTop: 20,
  },
  startBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EF4444', borderRadius: 16, paddingVertical: 15, paddingHorizontal: 24, marginTop: 22,
  },
  stopBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  ghostBtn: { paddingVertical: 12, paddingHorizontal: 20, marginTop: 4 },
  ghostBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.light.textTertiary },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 44, alignSelf: 'stretch', justifyContent: 'center', marginTop: 18 },
  waveBar: { width: 4, borderRadius: 2, height: 38 },
  playerBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.85)', justifyContent: 'flex-end' },
  playerCard: {
    backgroundColor: Colors.light.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 22, paddingBottom: 34,
  },
  playerHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  playerTitle: { flex: 1, fontSize: 16, fontWeight: '700' as const, color: Colors.light.text },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.light.border, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#8B5CF6', borderRadius: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  timeText: { fontSize: 12, fontWeight: '600' as const, color: Colors.light.textTertiary, fontVariant: ['tabular-nums'] },
  playBtn: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#8B5CF6',
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 16,
  },
  playerNote: { fontSize: 11, color: Colors.light.textTertiary, textAlign: 'center', marginTop: 14 },
});
