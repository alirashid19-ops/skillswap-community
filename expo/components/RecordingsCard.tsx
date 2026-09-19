import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Mic,
  Pause,
  Play,
  Square,
  SwitchCamera,
  Trash2,
  Video as VideoIcon,
  VideoOff,
  X,
} from 'lucide-react-native';
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

// Classic Animated drives styles natively on devices; web has no native animated module.
const nativeDriver = Platform.OS !== 'web';

/** Animated equalizer bars — animates while `active`, rests at a low baseline otherwise. */
function Waveform({ active, color }: { active: boolean; color: string }) {
  const bars = useMemo(() => Array.from({ length: 24 }, () => new Animated.Value(0.2)), []);
  const durations = useMemo(() => Array.from({ length: 24 }, (_, i) => 420 + ((i * 97) % 380)), []);

  useEffect(() => {
    if (!active) {
      bars.forEach(b => b.setValue(0.2));
      return;
    }
    // Varied durations desync the bars so they don't move in lockstep.
    const anims = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 1, duration: durations[i], useNativeDriver: nativeDriver }),
          Animated.timing(b, { toValue: 0.25, duration: durations[i], useNativeDriver: nativeDriver }),
        ]),
      ),
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [active, bars, durations]);

  return (
    <View style={s.waveRow}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={[s.waveBar, { backgroundColor: color, transform: [{ scaleY: b }] }]} />
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
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [playing, setPlaying] = useState<ClassRecording | null>(null);
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const pulseRef = useRef(new Animated.Value(0));
  const cameraRef = useRef<ComponentRef<typeof CameraView> | null>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | null> | null>(null);
  const recordingStartRef = useRef(0);
  const discardRef = useRef(false);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  const pulseAnim = useRef(
    Animated.loop(Animated.sequence([
      Animated.timing(pulseRef.current, { toValue: 1, duration: 650, useNativeDriver: nativeDriver }),
      Animated.timing(pulseRef.current, { toValue: 0.15, duration: 650, useNativeDriver: nativeDriver }),
    ])),
  ).current;

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  // Playback ticker (simulated entries only — real videos use native controls)
  useEffect(() => {
    if (!playing || !isPlaying || playing.videoUri) return;
    const t = setInterval(() => setPosition(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [playing, isPlaying]);

  useEffect(() => {
    if (playing && !playing.videoUri && isPlaying && position >= playing.durationSec) {
      setIsPlaying(false);
    }
  }, [position, playing, isPlaying]);

  // Auto-request camera/mic access when the studio opens
  useEffect(() => {
    if (!studioOpen) return;
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) {
      requestCamPerm().catch(() => undefined);
    }
    if (micPerm && !micPerm.granted && micPerm.canAskAgain) {
      requestMicPerm().catch(() => undefined);
    }
  }, [studioOpen, camPerm, micPerm, requestCamPerm, requestMicPerm]);

  const openStudio = useCallback(() => {
    setElapsed(0);
    setStudioOpen(true);
  }, []);

  const startRecording = useCallback(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    setElapsed(0);
    setIsRecording(true);
    discardRef.current = false;
    recordingStartRef.current = Date.now();
    pulseAnim.stop();
    pulseRef.current.setValue(0.15);
    pulseAnim.start();
    recordingPromiseRef.current = cam
      .recordAsync({ maxDuration: 1800 })
      .then(r => (r ? { uri: r.uri } : null))
      .catch(() => null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, [pulseAnim]);

  const stopAndSave = useCallback(async () => {
    cameraRef.current?.stopRecording();
    setIsRecording(false);
    pulseAnim.stop();
    const result = await (recordingPromiseRef.current ?? Promise.resolve(null));
    recordingPromiseRef.current = null;
    if (discardRef.current) return;
    const durationSec = Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000));
    if (result?.uri) {
      addRecording({
        classId,
        title: `Class video · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        durationSec,
        videoUri: result.uri,
      });
      setStudioOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else {
      setStudioOpen(false);
      Alert.alert(
        'Recording unavailable',
        'No camera could record a video on this device. Try again in the Expo Go app on a real phone.',
      );
    }
  }, [classId, addRecording, pulseAnim]);

  const discardRecording = useCallback(() => {
    if (isRecording) {
      discardRef.current = true;
      cameraRef.current?.stopRecording();
    }
    setIsRecording(false);
    pulseAnim.stop();
    setElapsed(0);
    setStudioOpen(false);
  }, [isRecording, pulseAnim]);

  const openPlayer = useCallback((rec: ClassRecording) => {
    setPlaying(rec);
    setPosition(0);
    setIsPlaying(!rec.videoUri);
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
    if (!playing || playing.videoUri) return;
    if (position >= playing.durationSec) setPosition(0);
    setIsPlaying(p => !p);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [playing, position]);

  // Native video player — source is null until a real video recording is opened.
  const player = useVideoPlayer(playing?.videoUri ?? null, p => {
    p.loop = false;
  });

  const permsMissing = !camPerm?.granted || !micPerm?.granted;
  const permsBlocked = (camPerm && !camPerm.granted && !camPerm.canAskAgain) || (micPerm && !micPerm.granted && !micPerm.canAskAgain);

  const renderStudioBody = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={s.studioBackdrop}>
          <View style={s.studioCard}>
            <View style={s.studioIconWrap}>
              <VideoOff size={28} color="#8B5CF6" />
            </View>
            <Text style={s.studioTitle}>Video recording needs the app</Text>
            <Text style={s.studioHint}>
              Camera capture isn't available in this preview. Open letsiki in the Expo Go app on your phone to record a class video.
            </Text>
            <TouchableOpacity style={s.ghostBtn} onPress={discardRecording} activeOpacity={0.8}>
              <Text style={s.ghostBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (permsMissing) {
      return (
        <View style={s.studioBackdrop}>
          <View style={s.studioCard}>
            <View style={s.studioIconWrap}>
              <VideoIcon size={28} color="#8B5CF6" />
            </View>
            <Text style={s.studioTitle}>Camera &amp; microphone access</Text>
            <Text style={s.studioHint}>
              {permsBlocked
                ? 'Access was denied. Allow camera and microphone for letsiki in your device Settings, then try again.'
                : 'letsiki needs your camera and microphone to record a class video. Nothing is shared until you publish it to the class.'}
            </Text>
            {!permsBlocked && (
              <TouchableOpacity
                style={s.startBtn}
                onPress={() => {
                  requestCamPerm().catch(() => undefined);
                  requestMicPerm().catch(() => undefined);
                }}
                activeOpacity={0.8}
                testID="grant-camera-button"
              >
                <Text style={s.startBtnText}>Allow Access</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.ghostBtn} onPress={discardRecording} activeOpacity={0.8}>
              <Text style={s.ghostBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          mode="video"
          facing={facing}
          videoQuality="720p"
        />
        <View style={s.camTopBar}>
          <TouchableOpacity style={s.camCircleBtn} onPress={discardRecording} activeOpacity={0.7} accessibilityLabel="Close recorder">
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.camTitle}>{isRecording ? 'Recording video' : 'New class video'}</Text>
          <TouchableOpacity
            style={s.camCircleBtn}
            onPress={() => setFacing(f => (f === 'back' ? 'front' : 'back'))}
            activeOpacity={0.7}
            accessibilityLabel="Flip camera"
          >
            <SwitchCamera size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={s.camBottom}>
          {isRecording ? (
            <View style={s.recPill}>
              <Animated.View style={[s.recDot, { opacity: pulseRef.current }]} />
              <Text style={s.recTimer}>{formatClock(elapsed)}</Text>
            </View>
          ) : (
            <Text style={s.camHint}>Class video is saved to this class for enrolled students</Text>
          )}
          <TouchableOpacity
            style={s.recordButton}
            onPress={isRecording ? stopAndSave : startRecording}
            activeOpacity={0.8}
            testID={isRecording ? 'stop-recording-button' : 'start-recording-button'}
            accessibilityLabel={isRecording ? 'Stop and publish' : 'Start recording'}
          >
            {isRecording ? (
              <View style={s.recordStopInner} />
            ) : (
              <View style={s.recordStartInner} />
            )}
          </TouchableOpacity>
          <Text style={s.recordLabel}>{isRecording ? 'Tap to stop & publish' : 'Tap to record'}</Text>
        </View>
      </>
    );
  };

  return (
    <View style={s.section}>
      <View style={s.headRow}>
        <View style={s.headIcon}>
          <VideoIcon size={18} color="#8B5CF6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headTitle}>Class Recordings</Text>
          <Text style={s.headSub}>
            {isTeacher
              ? recordings.length > 0
                ? `${recordings.length} session${recordings.length === 1 ? '' : 's'} published`
                : 'Record a video of your class'
              : recordings.length > 0
                ? `${recordings.length} recording${recordings.length === 1 ? '' : 's'} to revisit`
                : 'Your teacher hasn\u2019t posted recordings yet'}
          </Text>
        </View>
        {isTeacher && (
          <TouchableOpacity style={s.recordBtn} onPress={openStudio} activeOpacity={0.8} testID="record-session-button">
            <VideoIcon size={14} color="#FFFFFF" />
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
            {rec.videoUri ? (
              <View style={s.videoChip}>
                <VideoIcon size={11} color="#8B5CF6" />
                <Text style={s.videoChipText}>Video</Text>
              </View>
            ) : (
              <View style={[s.videoChip, s.audioChip]}>
                <Mic size={11} color={Colors.light.textTertiary} />
                <Text style={[s.videoChipText, { color: Colors.light.textTertiary }]}>Demo</Text>
              </View>
            )}
          </TouchableOpacity>
          {isTeacher && rec.recordedBy === currentUser.id && (
            <TouchableOpacity style={s.trashBtn} onPress={() => handleDelete(rec)} activeOpacity={0.7} accessibilityLabel="Delete recording">
              <Trash2 size={16} color={Colors.light.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Video recording studio */}
      <Modal visible={studioOpen} animationType="fade" statusBarTranslucent onRequestClose={discardRecording}>
        <View style={s.camRoot}>{renderStudioBody()}</View>
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
            {playing?.videoUri ? (
              <>
                <VideoView
                  player={player}
                  style={s.videoView}
                  contentFit="contain"
                  allowsFullscreen
                  testID="video-player-view"
                />
                <Text style={s.playerNote}>Class video · recorded on device</Text>
              </>
            ) : (
              <>
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
                <Text style={s.playerNote}>Demo session · simulated playback</Text>
              </>
            )}
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
  videoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  audioChip: { backgroundColor: Colors.light.backgroundTertiary },
  videoChipText: { fontSize: 10, fontWeight: '700' as const, color: '#8B5CF6' },
  trashBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  camRoot: { flex: 1, backgroundColor: '#0F172A' },
  camTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  camTitle: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  camCircleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center',
  },
  camBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 44, gap: 12 },
  camHint: { fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: 32 },
  recPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recTimer: { fontSize: 15, fontWeight: '800' as const, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  recordButton: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  recordStartInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444' },
  recordStopInner: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#FFFFFF' },
  recordLabel: { fontSize: 12, fontWeight: '600' as const, color: 'rgba(255,255,255,0.85)' },
  studioBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.95)', justifyContent: 'center', padding: 28 },
  studioCard: {
    backgroundColor: Colors.light.card, borderRadius: 24, padding: 24, alignItems: 'center',
  },
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
  videoView: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#0F172A' },
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
