import { useCallback, useMemo, useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Clock, Users, Coins, Image as ImageIcon, Check, Sparkles, Layers } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { categories } from '@/mocks/data';
import { useClasses } from '@/providers/classes';
import { useCurrentUser } from '@/providers/current-user';
import type { SkillCategory, SkillLevel, ClassSessionType, ClassBillingCycle, Skill } from '@/types';

const LEVELS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const SESSION_TYPES: { key: ClassSessionType; label: string }[] = [
  { key: 'single', label: 'Single Session' },
  { key: 'daily', label: 'Daily Course' },
  { key: 'weekly', label: 'Weekly Course' },
];
const BILLING_CYCLES: { key: ClassBillingCycle; label: string }[] = [
  { key: 'one_time', label: 'One-time' },
  { key: 'monthly', label: 'Monthly' },
];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800';

export default function CreateClassScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createClass } = useClasses();
  const { currentUser } = useCurrentUser();
  const { skillId } = useLocalSearchParams<{ skillId?: string }>();
  const offeredSkills = currentUser.skillsOffered ?? [];
  const selectedSkill = useMemo<Skill | undefined>(() =>
    skillId ? offeredSkills.find(s => s.id === skillId) : undefined,
  [skillId, offeredSkills]);

  const [title, setTitle] = useState(selectedSkill?.title ?? '');
  const [description, setDescription] = useState(selectedSkill?.description ?? '');
  const [category, setCategory] = useState<SkillCategory>(selectedSkill?.category ?? 'Technology');
  const [level, setLevel] = useState<SkillLevel>(selectedSkill?.level ?? 'Beginner');
  const [coverUrl, setCoverUrl] = useState(selectedSkill?.imageUrl ?? DEFAULT_COVER);
  const [sessionType, setSessionType] = useState<ClassSessionType>('single');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [capacity, setCapacity] = useState('10');
  const [seatPrice, setSeatPrice] = useState(() => {
    if (!selectedSkill) return '0';
    if (selectedSkill.pricingModel === 'per_session') return String(selectedSkill.pricePerSession ?? 0);
    if (selectedSkill.pricingModel === 'monthly') return String(selectedSkill.monthlyPrice ?? 0);
    return '0';
  });
  const [billingCycle, setBillingCycle] = useState<ClassBillingCycle>(() => selectedSkill?.pricingModel === 'monthly' ? 'monthly' : 'one_time');
  const [submitting, setSubmitting] = useState(false);

  const isWeekly = sessionType === 'weekly';
  const isRecurring = sessionType !== 'single';
  const sessionCount = useMemo(() => {
    if (sessionType === 'single') return 1;
    if (!startDate || !endDate) return 0;
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end = new Date(`${endDate}T00:00:00`).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
    const days = Math.floor((end - start) / 86400000) + 1;
    if (sessionType === 'daily') return days;
    if (scheduleDays.length === 0) return 0;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let count = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(start + i * 86400000);
      if (scheduleDays.includes(dayNames[d.getDay()])) count++;
    }
    return count;
  }, [sessionType, startDate, endDate, scheduleDays]);

  const toggleDay = (day: string) => {
    setScheduleDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleCreate = useCallback(() => {
    if (title.trim().length < 3) { Alert.alert('Title too short', 'Please enter at least 3 characters.'); return; }
    if (description.trim().length < 10) { Alert.alert('Description too short', 'Please enter at least 10 characters.'); return; }
    if (!startDate.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert('Invalid start date', 'Use format YYYY-MM-DD (e.g. 2026-08-10).'); return; }
    if (!startTime.match(/^\d{2}:\d{2}$/) || !endTime.match(/^\d{2}:\d{2}$/)) { Alert.alert('Invalid time', 'Use 24h format HH:MM (e.g. 14:30).'); return; }
    if (isRecurring && !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert('Invalid end date', 'Use format YYYY-MM-DD for the last session.'); return; }
    if (isWeekly && scheduleDays.length === 0) { Alert.alert('Select days', 'Pick at least one weekday for the weekly course.'); return; }
    if (sessionCount === 0) { Alert.alert('Invalid schedule', 'Check start/end dates and selected days.'); return; }
    const cap = parseInt(capacity, 10);
    if (!cap || cap < 1 || cap > 500) { Alert.alert('Invalid capacity', 'Enter a number between 1 and 500.'); return; }
    const price = parseInt(seatPrice, 10) || 0;
    if (price < 0) { Alert.alert('Invalid price', 'Price cannot be negative.'); return; }

    const startISO = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endISO = isRecurring
      ? new Date(`${endDate}T${endTime}:00`).toISOString()
      : new Date(`${startDate}T${endTime}:00`).toISOString();
    if (new Date(endISO) <= new Date(startISO)) { Alert.alert('Invalid time range', 'End time must be after start time.'); return; }

    setSubmitting(true);
    const cls = createClass({
      title: title.trim(),
      description: description.trim(),
      category,
      level,
      coverImageUrl: coverUrl.trim() || DEFAULT_COVER,
      startISO,
      endISO,
      sessionType,
      billingCycle,
      scheduleDays: isWeekly ? scheduleDays : undefined,
      maxCapacity: cap,
      seatPriceCredits: price,
    });
    setSubmitting(false);
    Alert.alert('Class created!', `"${cls.title}" is now live.`, [
      { text: 'View', onPress: () => router.replace(`/class/${cls.id}` as any) },
      { text: 'Done', onPress: () => router.back() },
    ]);
  }, [title, description, category, level, coverUrl, startDate, endDate, startTime, endTime, sessionType, billingCycle, scheduleDays, isRecurring, isWeekly, sessionCount, capacity, seatPrice, createClass, router]);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient
        colors={[Colors.light.primary, Colors.light.primaryLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={s.headerTitle}>Create a Group Class</Text>
        <Text style={s.headerSub}>{selectedSkill ? `From skill: ${selectedSkill.title}` : 'Teach multiple students at once'}</Text>
      </LinearGradient>

      <View style={s.form}>
        {offeredSkills.length > 0 && (
          <>
            <Text style={s.label}>Create from your skill</Text>
            <View style={s.skillPicker}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.skillPickerContent}>
                <TouchableOpacity
                  style={[s.skillChip, !selectedSkill && s.skillChipActive]}
                  onPress={() => router.setParams({})}
                  activeOpacity={0.7}
                >
                  <Layers size={14} color={!selectedSkill ? '#FFFFFF' : Colors.light.textSecondary} />
                  <Text style={[s.skillChipText, !selectedSkill && s.skillChipTextActive]}>Blank</Text>
                </TouchableOpacity>
                {offeredSkills.map(skill => (
                  <TouchableOpacity
                    key={skill.id}
                    style={[s.skillChip, selectedSkill?.id === skill.id && s.skillChipActive]}
                    onPress={() => router.setParams({ skillId: skill.id })}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: skill.imageUrl }} style={s.skillChipImg} />
                    <Text style={[s.skillChipText, selectedSkill?.id === skill.id && s.skillChipTextActive]} numberOfLines={1}>{skill.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        <Text style={s.label}>Class Title</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Intro to Watercolor Painting" placeholderTextColor={Colors.light.textTertiary} />

        <Text style={s.label}>Description</Text>
        <TextInput style={[s.input, s.textArea]} value={description} onChangeText={setDescription} placeholder="What will students learn? What should they bring?" placeholderTextColor={Colors.light.textTertiary} multiline numberOfLines={4} textAlignVertical="top" />

        <Text style={s.label}>Category</Text>
        <View style={s.chipRow}>
          {categories.filter(c => c !== 'All').map(cat => (
            <TouchableOpacity key={cat} style={[s.chip, category === cat && s.chipActive]} onPress={() => setCategory(cat as SkillCategory)} activeOpacity={0.7}>
              <Text style={[s.chipText, category === cat && s.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Level</Text>
        <View style={s.chipRow}>
          {LEVELS.map(lvl => (
            <TouchableOpacity key={lvl} style={[s.chip, level === lvl && s.chipActive]} onPress={() => setLevel(lvl)} activeOpacity={0.7}>
              <Text style={[s.chipText, level === lvl && s.chipTextActive]}>{lvl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Cover Image URL</Text>
        <View style={s.inputRow}>
          <ImageIcon size={18} color={Colors.light.textTertiary} />
          <TextInput style={[s.input, { flex: 1 }]} value={coverUrl} onChangeText={setCoverUrl} placeholder="https://..." placeholderTextColor={Colors.light.textTertiary} autoCapitalize="none" />
        </View>

        <Text style={s.label}>Session Type</Text>
        <View style={s.chipRow}>
          {SESSION_TYPES.map(type => (
            <TouchableOpacity key={type.key} style={[s.chip, sessionType === type.key && s.chipActive]} onPress={() => setSessionType(type.key)} activeOpacity={0.7}>
              <Text style={[s.chipText, sessionType === type.key && s.chipTextActive]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Billing</Text>
        <View style={s.chipRow}>
          {BILLING_CYCLES.map(cycle => (
            <TouchableOpacity key={cycle.key} style={[s.chip, billingCycle === cycle.key && s.chipActive]} onPress={() => setBillingCycle(cycle.key)} activeOpacity={0.7}>
              <Text style={[s.chipText, billingCycle === cycle.key && s.chipTextActive]}>{cycle.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Start Date</Text>
            <View style={s.inputRow}>
              <Calendar size={18} color={Colors.light.textTertiary} />
              <TextInput style={[s.input, { flex: 1 }]} value={startDate} onChangeText={setStartDate} placeholder="2026-08-10" placeholderTextColor={Colors.light.textTertiary} autoCapitalize="none" />
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{isRecurring ? 'End Date' : 'End Date (optional)'}</Text>
            <View style={s.inputRow}>
              <Calendar size={18} color={Colors.light.textTertiary} />
              <TextInput style={[s.input, { flex: 1 }]} value={endDate} onChangeText={setEndDate} placeholder={isRecurring ? '2026-08-31' : ''} placeholderTextColor={Colors.light.textTertiary} autoCapitalize="none" editable={isRecurring} />
            </View>
          </View>
        </View>

        {isWeekly && (
          <>
            <Text style={s.label}>Weekly Days</Text>
            <View style={s.chipRow}>
              {WEEK_DAYS.map(day => (
                <TouchableOpacity key={day} style={[s.chip, scheduleDays.includes(day) && s.chipActive]} onPress={() => toggleDay(day)} activeOpacity={0.7}>
                  <Text style={[s.chipText, scheduleDays.includes(day) && s.chipTextActive]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={s.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Start Time (HH:MM)</Text>
            <View style={s.inputRow}>
              <Clock size={18} color={Colors.light.textTertiary} />
              <TextInput style={[s.input, { flex: 1 }]} value={startTime} onChangeText={setStartTime} placeholder="14:30" placeholderTextColor={Colors.light.textTertiary} autoCapitalize="none" />
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>End Time (HH:MM)</Text>
            <View style={s.inputRow}>
              <Clock size={18} color={Colors.light.textTertiary} />
              <TextInput style={[s.input, { flex: 1 }]} value={endTime} onChangeText={setEndTime} placeholder="16:00" placeholderTextColor={Colors.light.textTertiary} autoCapitalize="none" />
            </View>
          </View>
        </View>

        {isRecurring && sessionCount > 0 && (
          <View style={s.sessionCountNote}>
            <Text style={s.sessionCountText}>This course will have {sessionCount} session{sessionCount === 1 ? '' : 's'}.</Text>
          </View>
        )}

        <View style={s.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Max Capacity</Text>
            <View style={s.inputRow}>
              <Users size={18} color={Colors.light.textTertiary} />
              <TextInput style={[s.input, { flex: 1 }]} value={capacity} onChangeText={setCapacity} placeholder="10" placeholderTextColor={Colors.light.textTertiary} keyboardType="numeric" />
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Seat Price (credits)</Text>
            <View style={s.inputRow}>
              <Coins size={18} color={Colors.light.textTertiary} />
              <TextInput style={[s.input, { flex: 1 }]} value={seatPrice} onChangeText={setSeatPrice} placeholder="0 = free" placeholderTextColor={Colors.light.textTertiary} keyboardType="numeric" />
            </View>
          </View>
        </View>

        {parseInt(seatPrice, 10) === 0 && (
          <View style={s.freeNote}>
            <Sparkles size={14} color="#10B981" />
            <Text style={s.freeNoteText}>Free class — you'll earn 50 credits per attending student (platform-sponsored).</Text>
          </View>
        )}
        {parseInt(seatPrice, 10) > 0 && (
          <View style={s.paidNote}>
            <Coins size={14} color="#F59E0B" />
            <Text style={s.paidNoteText}>
              {billingCycle === 'monthly' ? 'Monthly billing' : 'One-time billing'} — you'll earn 80% of the seat price × enrolled students. Platform takes 20%.
            </Text>
          </View>
        )}

        <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleCreate} disabled={submitting} activeOpacity={0.8}>
          <Check size={20} color="#FFFFFF" />
          <Text style={s.submitBtnText}>{submitting ? 'Creating...' : 'Create Class'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '800' as const, color: '#FFFFFF' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: '700' as const, color: Colors.light.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: Colors.light.backgroundTertiary, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border },
  textArea: { minHeight: 100, paddingTop: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.light.backgroundTertiary, borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: Colors.light.border },
  skillPicker: { marginBottom: 8 },
  skillPickerContent: { gap: 10 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.light.backgroundTertiary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border },
  skillChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  skillChipImg: { width: 24, height: 24, borderRadius: 6 },
  skillChipText: { fontSize: 13, fontWeight: '600' as const, color: Colors.light.textSecondary, maxWidth: 140 },
  skillChipTextActive: { color: '#FFFFFF' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: Colors.light.backgroundTertiary, borderWidth: 1, borderColor: Colors.light.border },
  chipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  chipText: { fontSize: 13, fontWeight: '600' as const, color: Colors.light.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  timeRow: { flexDirection: 'row' },
  sessionCountNote: { backgroundColor: Colors.light.primaryLight + '20', borderRadius: 12, padding: 12, marginTop: 12 },
  sessionCountText: { fontSize: 13, color: Colors.light.primary, fontWeight: '600' as const, textAlign: 'center' },
  freeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 12, padding: 12, marginTop: 16 },
  freeNoteText: { fontSize: 13, color: '#10B981', fontWeight: '500' as const, flex: 1 },
  paidNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 12, padding: 12, marginTop: 16 },
  paidNoteText: { fontSize: 13, color: '#F59E0B', fontWeight: '500' as const, flex: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 16, marginTop: 24, shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
});
