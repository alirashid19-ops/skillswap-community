import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  Sparkles,
  GraduationCap,
  Target,
  Calendar,
  MapPin,
  MessageCircle,
  CheckCircle2,
  ArrowLeftRight,
  BookOpen,
  Languages,
  Award,
  Briefcase,
  Upload,
  Plus,
  X,
  FileCheck2,
  BadgeCheck,
  ChevronRight,
} from 'lucide-react-native';
import {
  useOnboarding,
  OnboardingRole,
  TeacherCertification,
  CareerEntry,
} from '@/providers/onboarding';
import { useCurrentUser } from '@/providers/current-user';
import { categories } from '@/mocks/data';

type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

const skillLevels: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const availabilityOptions = ['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings', 'Weekends', 'Flexible'];
const communicationOptions = ['Video Call', 'In Person', 'Chat', 'Mix of All'];

const languageOptions = [
  'English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
  'Kannada', 'Malayalam', 'Gujarati', 'Punjabi', 'Urdu', 'Odia',
];
const qualificationOptions = [
  "High School", "Bachelor's Degree", "Master's Degree", 'PhD / Doctorate',
  'B.Ed / D.El.Ed', 'Diploma', 'Professional Certification',
  'Industry Expert', 'Self-taught Expert',
];
const experienceOptions = ['None yet', '1–3 years', '3–5 years', '5–10 years', '10+ years'];

const genId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type StepKey =
  | 'welcome'
  | 'role'
  | 'teach'
  | 'experience'
  | 'languages'
  | 'credentials'
  | 'career'
  | 'learn'
  | 'availability'
  | 'preferences'
  | 'summary';

const ROLE_OPTIONS: {
  key: OnboardingRole;
  label: string;
  desc: string;
  icon: typeof GraduationCap;
  color: string;
  bg: string;
}[] = [
  { key: 'teacher', label: 'I want to Teach', desc: 'Share my skills with others', icon: GraduationCap, color: '#10B981', bg: '#ECFDF5' },
  { key: 'learner', label: 'I want to Learn', desc: 'Find someone to teach me', icon: BookOpen, color: '#6366F1', bg: '#EEF2FF' },
  { key: 'swap', label: 'Swap', desc: 'Teach & learn together', icon: ArrowLeftRight, color: '#F59E0B', bg: '#FFFBEB' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { updateOnboardingData, completeOnboarding } = useOnboarding();
  const { applyOnboardingData } = useCurrentUser();

  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);

  const [selectedTeachSkills, setSelectedTeachSkills] = useState<string[]>([]);
  const [selectedLearnSkills, setSelectedLearnSkills] = useState<string[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<Record<string, SkillLevel>>({});
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [communication, setCommunication] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [virtualEnabled, setVirtualEnabled] = useState<boolean>(true);
  const [inPersonEnabled, setInPersonEnabled] = useState<boolean>(false);

  // Teacher credentials
  const [languages, setLanguages] = useState<string[]>([]);
  const [customLanguage, setCustomLanguage] = useState<string>('');
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [isCertified, setIsCertified] = useState<boolean>(false);
  const [certTitle, setCertTitle] = useState<string>('');
  const [certifications, setCertifications] = useState<TeacherCertification[]>([]);
  const [yearsTeaching, setYearsTeaching] = useState<string>('');
  const [careerRole, setCareerRole] = useState<string>('');
  const [careerOrg, setCareerOrg] = useState<string>('');
  const [careerYears, setCareerYears] = useState<string>('');
  const [careerHistory, setCareerHistory] = useState<CareerEntry[]>([]);
  const [privateTuition, setPrivateTuition] = useState<boolean>(false);

  const skillCategories = categories.filter(c => c !== 'All');

  const steps = useMemo<StepKey[]>(() => {
    const list: StepKey[] = ['welcome', 'role'];
    if (role === 'teacher' || role === 'swap') {
      list.push('teach', 'experience');
    }
    if (role === 'teacher') {
      list.push('languages', 'credentials', 'career');
    }
    if (role === 'learner' || role === 'swap') {
      list.push('learn');
    }
    list.push('availability', 'preferences', 'summary');
    return list;
  }, [role]);

  const currentStep = steps[stepIndex] ?? 'welcome';
  const totalSteps = steps.length;

  const goToNextStep = () => {
    // Persist data when leaving relevant steps
    if (currentStep === 'role' && role) {
      updateOnboardingData({ role });
    } else if (currentStep === 'teach') {
      updateOnboardingData({ skillsToTeach: selectedTeachSkills });
    } else if (currentStep === 'experience') {
      updateOnboardingData({ skillsToTeach: selectedTeachSkills, experienceLevels });
    } else if (currentStep === 'learn') {
      updateOnboardingData({ skillsToLearn: selectedLearnSkills, learningGoals });
    } else if (currentStep === 'career') {
      updateOnboardingData({
        teacherProfile: {
          languages,
          qualifications,
          isCertified,
          certifications,
          yearsTeaching,
          careerHistory,
          privateTuition,
        },
      });
    } else if (currentStep === 'availability') {
      updateOnboardingData({ availability });
    } else if (currentStep === 'preferences') {
      updateOnboardingData({
        communicationPreference: communication,
        matchingPreferences: { location, virtual: virtualEnabled, inPerson: inPersonEnabled },
      });
    }

    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const goToPreviousStep = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const handleComplete = async () => {
    // Apply the collected onboarding data to the current user so Smart Matches
    // and the home screen immediately reflect the user's chosen role and skills.
    applyOnboardingData({
      role: role ?? 'swap',
      skillsToTeach: selectedTeachSkills,
      skillsToLearn: selectedLearnSkills,
      experienceLevels,
      learningGoals,
      availability,
      communicationPreference: communication,
      teacherProfile: role === 'teacher' ? {
        languages,
        qualifications,
        isCertified,
        certifications,
        yearsTeaching,
        careerHistory,
        privateTuition,
      } : undefined,
      matchingPreferences: { location, virtual: virtualEnabled, inPerson: inPersonEnabled },
    });
    try {
      await completeOnboarding();
    } catch (error) {
      console.warn('[Onboarding] completeOnboarding threw, navigating anyway:', error);
    }
    router.replace('/(tabs)/home' as any);
  };

  const canContinue = (): boolean => {
    switch (currentStep) {
      case 'welcome':
        return true;
      case 'role':
        return role !== null;
      case 'teach':
        return selectedTeachSkills.length > 0;
      case 'experience':
        return selectedTeachSkills.every(skill => experienceLevels[skill]);
      case 'learn':
        return selectedLearnSkills.length > 0;
      case 'languages':
        return languages.length > 0;
      case 'credentials':
        return !isCertified || certifications.length > 0;
      case 'availability':
        return availability.length > 0;
      case 'preferences':
        return communication.length > 0 && (virtualEnabled || inPersonEnabled);
      case 'summary':
        return true;
      default:
        return true;
    }
  };

  const toggleSkillSelection = (skill: string, isTeach: boolean) => {
    const setter = isTeach ? setSelectedTeachSkills : setSelectedLearnSkills;
    const selected = isTeach ? selectedTeachSkills : selectedLearnSkills;
    if (selected.includes(skill)) {
      setter(selected.filter(s => s !== skill));
      if (isTeach) {
        const next = { ...experienceLevels };
        delete next[skill];
        setExperienceLevels(next);
      }
    } else {
      setter([...selected, skill]);
    }
  };

  const setSkillLevel = (skill: string, level: SkillLevel) => {
    setExperienceLevels(prev => ({ ...prev, [skill]: level }));
  };

  const toggleGoal = (goal: string) => {
    if (learningGoals.includes(goal)) {
      setLearningGoals(learningGoals.filter(g => g !== goal));
    } else {
      setLearningGoals([...learningGoals, goal]);
    }
  };

  const toggleAvailability = (slot: string) => {
    if (availability.includes(slot)) {
      setAvailability(availability.filter(a => a !== slot));
    } else {
      setAvailability([...availability, slot]);
    }
  };

  // ---- Teacher credentials handlers ----
  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const addCustomLanguage = () => {
    const trimmed = customLanguage.trim();
    if (trimmed.length === 0) return;
    if (!languages.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
      setLanguages([...languages, trimmed]);
    }
    setCustomLanguage('');
  };

  const toggleQualification = (q: string) => {
    if (qualifications.includes(q)) {
      setQualifications(qualifications.filter(item => item !== q));
    } else {
      setQualifications([...qualifications, q]);
    }
  };

  const addCertification = () => {
    const trimmed = certTitle.trim();
    if (trimmed.length === 0) return;
    setCertifications(prev => [...prev, { id: genId('cert'), title: trimmed }]);
    setCertTitle('');
  };

  const removeCertification = (id: string) => {
    setCertifications(prev => prev.filter(c => c.id !== id));
  };

  const pickCertificate = async (certId: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      const uri = result.assets?.[0]?.uri;
      if (!result.canceled && uri) {
        setCertifications(prev => prev.map(c => (c.id === certId ? { ...c, documentUri: uri } : c)));
      }
    } catch (error) {
      console.warn('[Onboarding] Document pick failed:', error);
      Alert.alert('Upload failed', 'Could not attach the document. Please try again.');
    }
  };

  const addCareerEntry = () => {
    const role = careerRole.trim();
    if (role.length === 0) return;
    setCareerHistory(prev => [...prev, {
      id: genId('career'),
      role,
      organization: careerOrg.trim(),
      years: careerYears.trim(),
    }]);
    setCareerRole('');
    setCareerOrg('');
    setCareerYears('');
  };

  const removeCareerEntry = (id: string) => {
    setCareerHistory(prev => prev.filter(e => e.id !== id));
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Sparkles size={64} color="#FF6B9D" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>Welcome to leteski!</Text>
      <Text style={styles.subtitle}>
        Let&apos;s set up your profile so we can match you with the perfect skill exchange partners.
      </Text>
      <Text style={styles.description}>
        This will take about 2-3 minutes. You can always change these preferences later.
      </Text>
      <View style={styles.featureList}>
        {[
          { icon: GraduationCap, text: 'Share your expertise' },
          { icon: Target, text: 'Learn new skills' },
          { icon: MessageCircle, text: 'Connect with others' },
        ].map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <feature.icon size={20} color="#FF6B9D" />
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderRoleStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <ArrowLeftRight size={48} color="#FF6B9D" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>How will you use leteski?</Text>
      <Text style={styles.subtitle}>
        Choose the option that best fits you. You can do both later!
      </Text>
      <View style={styles.roleList}>
        {ROLE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = role === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.roleCard, selected && styles.roleCardSelected, selected && { borderColor: opt.color }]}
              onPress={() => setRole(opt.key)}
              activeOpacity={0.75}
            >
              <View style={[styles.roleIconWrap, { backgroundColor: opt.bg }]}>
                <Icon size={28} color={opt.color} />
              </View>
              <View style={styles.roleCardContent}>
                <Text style={styles.roleCardTitle}>{opt.label}</Text>
                <Text style={styles.roleCardSubtitle}>{opt.desc}</Text>
              </View>
              {selected && <CheckCircle2 size={22} color={opt.color} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderTeachSkillsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <GraduationCap size={48} color="#10B981" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>What can you teach?</Text>
      <Text style={styles.subtitle}>
        Select the skills you&apos;d like to share with others
      </Text>
      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        {skillCategories.map((skill) => (
          <TouchableOpacity
            key={skill}
            style={[styles.optionItem, selectedTeachSkills.includes(skill) && styles.optionItemSelected]}
            onPress={() => toggleSkillSelection(skill, true)}
          >
            <Text style={[styles.optionText, selectedTeachSkills.includes(skill) && styles.optionTextSelected]}>
              {skill}
            </Text>
            {selectedTeachSkills.includes(skill) && <CheckCircle2 size={20} color="#fff" />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderExperienceLevelStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Rate your expertise</Text>
      <Text style={styles.subtitle}>How would you rate your level in these skills?</Text>
      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        {selectedTeachSkills.map((skill) => (
          <View key={skill} style={styles.skillLevelContainer}>
            <Text style={styles.skillLevelTitle}>{skill}</Text>
            <View style={styles.levelButtons}>
              {skillLevels.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.levelButton, experienceLevels[skill] === level && styles.levelButtonSelected]}
                  onPress={() => setSkillLevel(skill, level)}
                >
                  <Text style={[styles.levelButtonText, experienceLevels[skill] === level && styles.levelButtonTextSelected]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderLearnSkillsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Target size={48} color="#6366F1" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>What do you want to learn?</Text>
      <Text style={styles.subtitle}>Select skills you&apos;re interested in learning</Text>
      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        {skillCategories.map((skill) => (
          <TouchableOpacity
            key={skill}
            style={[styles.optionItem, selectedLearnSkills.includes(skill) && styles.optionItemSelected]}
            onPress={() => toggleSkillSelection(skill, false)}
          >
            <Text style={[styles.optionText, selectedLearnSkills.includes(skill) && styles.optionTextSelected]}>
              {skill}
            </Text>
            {selectedLearnSkills.includes(skill) && <CheckCircle2 size={20} color="#fff" />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.goalsSection}>
        <Text style={styles.goalsTitle}>Your learning goals (optional)</Text>
        <View style={styles.goalsList}>
          {['Career Change', 'Hobby', 'Personal Growth', 'Side Project'].map((goal) => (
            <TouchableOpacity
              key={goal}
              style={[styles.goalChip, learningGoals.includes(goal) && styles.goalChipSelected]}
              onPress={() => toggleGoal(goal)}
            >
              <Text style={[styles.goalChipText, learningGoals.includes(goal) && styles.goalChipTextSelected]}>
                {goal}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderLanguagesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Languages size={48} color="#10B981" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>Languages you speak</Text>
      <Text style={styles.subtitle}>
        Students love knowing which languages you can teach in. Select all that apply.
      </Text>
      <View style={styles.chipWrap}>
        {languageOptions.map((lang) => {
          const selected = languages.includes(lang);
          return (
            <TouchableOpacity
              key={lang}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleLanguage(lang)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{lang}</Text>
            </TouchableOpacity>
          );
        })}
        {languages
          .filter((l) => !languageOptions.includes(l))
          .map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.chip, styles.chipSelected]}
              onPress={() => toggleLanguage(lang)}
            >
              <Text style={[styles.chipText, styles.chipTextSelected]}>{lang}</Text>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          ))}
      </View>
      <View style={styles.addRow}>
        <TextInput
          style={styles.addRowInput}
          placeholder="Add another language"
          placeholderTextColor="#999"
          value={customLanguage}
          onChangeText={setCustomLanguage}
          onSubmitEditing={addCustomLanguage}
        />
        <TouchableOpacity style={styles.addRowButton} onPress={addCustomLanguage}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCredentialsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Award size={48} color="#10B981" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>Qualifications & certifications</Text>
      <Text style={styles.subtitle}>
        Your formal background builds trust with students and helps your profile rank higher.
      </Text>
      <Text style={styles.sectionLabel}>Qualifications</Text>
      <View style={styles.chipWrap}>
        {qualificationOptions.map((q) => {
          const selected = qualifications.includes(q);
          return (
            <TouchableOpacity
              key={q}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleQualification(q)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{q}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.certifiedToggle, isCertified && styles.certifiedToggleActive]}
        onPress={() => setIsCertified(!isCertified)}
        activeOpacity={0.75}
      >
        <View style={[styles.certifiedToggleIcon, isCertified && styles.certifiedToggleIconActive]}>
          <BadgeCheck size={22} color={isCertified ? '#fff' : '#10B981'} />
        </View>
        <View style={styles.certifiedToggleContent}>
          <Text style={[styles.certifiedToggleTitle, isCertified && styles.certifiedToggleTitleActive]}>
            I am certified or professionally qualified
          </Text>
          <Text style={styles.certifiedToggleSubtitle}>
            Add your certificates and upload the documents below
          </Text>
        </View>
      </TouchableOpacity>

      {isCertified && (
        <View style={styles.certSection}>
          {certifications.map((cert) => (
            <View key={cert.id} style={styles.certCard}>
              <View style={styles.certCardHeader}>
                <View style={styles.certCardTitleWrap}>
                  <Award size={16} color="#10B981" />
                  <Text style={styles.certCardTitle} numberOfLines={1}>{cert.title}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeCertification(cert.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={16} color="#999" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.uploadButton, cert.documentUri && styles.uploadButtonDone]}
                onPress={() => pickCertificate(cert.id)}
              >
                {cert.documentUri
                  ? <FileCheck2 size={16} color="#065F46" />
                  : <Upload size={16} color="#059669" />}
                <Text style={[styles.uploadButtonText, cert.documentUri && styles.uploadButtonTextDone]}>
                  {cert.documentUri ? 'Document uploaded ✓' : 'Upload certificate document'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addRowInput}
              placeholder="e.g. CTET, AWS Certified, Grade 8 Piano"
              placeholderTextColor="#999"
              value={certTitle}
              onChangeText={setCertTitle}
              onSubmitEditing={addCertification}
            />
            <TouchableOpacity style={styles.addRowButton} onPress={addCertification}>
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderCareerStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Briefcase size={48} color="#10B981" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>Your teaching experience</Text>
      <Text style={styles.subtitle}>
        Past jobs, tuitions, and professional roles that make you a great teacher.
      </Text>

      <Text style={styles.sectionLabel}>Years of teaching experience</Text>
      <View style={styles.chipWrap}>
        {experienceOptions.map((opt) => {
          const selected = yearsTeaching === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setYearsTeaching(opt)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.certifiedToggle, privateTuition && styles.certifiedToggleActive]}
        onPress={() => setPrivateTuition(!privateTuition)}
        activeOpacity={0.75}
      >
        <View style={[styles.certifiedToggleIcon, privateTuition && styles.certifiedToggleIconActive]}>
          <GraduationCap size={22} color={privateTuition ? '#fff' : '#10B981'} />
        </View>
        <View style={styles.certifiedToggleContent}>
          <Text style={[styles.certifiedToggleTitle, privateTuition && styles.certifiedToggleTitleActive]}>
            I have given private tuitions or coaching
          </Text>
          <Text style={styles.certifiedToggleSubtitle}>
            Home tuitions, coaching centres, or online 1-on-1 teaching
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Past career & jobs</Text>
      {careerHistory.map((entry) => (
        <View key={entry.id} style={styles.careerCard}>
          <View style={styles.careerIconWrap}>
            <Briefcase size={16} color="#10B981" />
          </View>
          <View style={styles.careerContent}>
            <Text style={styles.careerRole}>{entry.role}</Text>
            <Text style={styles.careerMeta}>
              {[entry.organization, entry.years].filter(Boolean).join(' · ') || '—'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => removeCareerEntry(entry.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#999" />
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.careerForm}>
        <TextInput
          style={styles.careerInput}
          placeholder="Role (e.g. Software Engineer, School Teacher)"
          placeholderTextColor="#999"
          value={careerRole}
          onChangeText={setCareerRole}
        />
        <TextInput
          style={styles.careerInput}
          placeholder="Organization (e.g. TCS, Kendriya Vidyalaya)"
          placeholderTextColor="#999"
          value={careerOrg}
          onChangeText={setCareerOrg}
        />
        <TextInput
          style={styles.careerInput}
          placeholder="Years (e.g. 2018–2022 or 3 years)"
          placeholderTextColor="#999"
          value={careerYears}
          onChangeText={setCareerYears}
        />
        <TouchableOpacity style={styles.addCareerButton} onPress={addCareerEntry}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addCareerButtonText}>Add experience</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAvailabilityStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Calendar size={48} color="#FF6B9D" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>When are you available?</Text>
      <Text style={styles.subtitle}>Select your preferred times for skill exchanges</Text>
      <View style={styles.optionsList}>
        {availabilityOptions.map((slot) => (
          <TouchableOpacity
            key={slot}
            style={[styles.optionItem, availability.includes(slot) && styles.optionItemSelected]}
            onPress={() => toggleAvailability(slot)}
          >
            <Text style={[styles.optionText, availability.includes(slot) && styles.optionTextSelected]}>
              {slot}
            </Text>
            {availability.includes(slot) && <CheckCircle2 size={20} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPreferencesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <MessageCircle size={48} color="#FF6B9D" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>How do you prefer to connect?</Text>
      <Text style={styles.subtitle}>Choose your preferred method of skill exchange</Text>
      <View style={styles.optionsList}>
        {communicationOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.optionItem, communication === option && styles.optionItemSelected]}
            onPress={() => setCommunication(option)}
          >
            <Text style={[styles.optionText, communication === option && styles.optionTextSelected]}>
              {option}
            </Text>
            {communication === option && <CheckCircle2 size={20} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.locationSection}>
        <View style={styles.locationHeader}>
          <MapPin size={20} color="#333" />
          <Text style={styles.locationTitle}>Location Preferences</Text>
        </View>
        <TextInput
          style={styles.locationInput}
          placeholder="Enter your city or region (optional)"
          placeholderTextColor="#999"
          value={location}
          onChangeText={setLocation}
        />
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggle, virtualEnabled && styles.toggleActive]}
            onPress={() => setVirtualEnabled(!virtualEnabled)}
          >
            <Text style={[styles.toggleText, virtualEnabled && styles.toggleTextActive]}>Virtual Sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggle, inPersonEnabled && styles.toggleActive]}
            onPress={() => setInPersonEnabled(!inPersonEnabled)}
          >
            <Text style={[styles.toggleText, inPersonEnabled && styles.toggleTextActive]}>In-Person Meetups</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFinalStep = () => {
    const roleLabel = role ? ROLE_OPTIONS.find(r => r.key === role)?.label : '';
    return (
      <View style={styles.stepContainer}>
        <View style={styles.iconContainer}>
          <CheckCircle2 size={64} color="#4CAF50" strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>You&apos;re all set!</Text>
        <Text style={styles.subtitle}>Ready to start your skill exchange journey?</Text>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Your Profile Summary:</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Role:</Text>
            <Text style={styles.summaryValue}>{roleLabel}</Text>
          </View>
          {(role === 'teacher' || role === 'swap') && selectedTeachSkills.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Teaching:</Text>
              <Text style={styles.summaryValue}>{selectedTeachSkills.join(', ')}</Text>
            </View>
          )}
          {role === 'teacher' && languages.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Languages:</Text>
              <Text style={styles.summaryValue}>{languages.join(', ')}</Text>
            </View>
          )}
          {role === 'teacher' && qualifications.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Qualifications:</Text>
              <Text style={styles.summaryValue}>{qualifications.join(', ')}</Text>
            </View>
          )}
          {role === 'teacher' && certifications.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Certifications:</Text>
              <Text style={styles.summaryValue}>
                {certifications.length} certificate{certifications.length === 1 ? '' : 's'}
                {certifications.some((c) => c.documentUri)
                  ? ` (${certifications.filter((c) => c.documentUri).length} document${certifications.filter((c) => c.documentUri).length === 1 ? '' : 's'} uploaded)`
                  : ''}
              </Text>
            </View>
          )}
          {role === 'teacher' && (careerHistory.length > 0 || yearsTeaching) && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Experience:</Text>
              <Text style={styles.summaryValue}>
                {yearsTeaching || '—'}
                {careerHistory.length > 0
                  ? ` · ${careerHistory.length} past role${careerHistory.length === 1 ? '' : 's'}`
                  : ''}
                {privateTuition ? ' · Private tuition experience' : ''}
              </Text>
            </View>
          )}
          {(role === 'learner' || role === 'swap') && selectedLearnSkills.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Learning:</Text>
              <Text style={styles.summaryValue}>{selectedLearnSkills.join(', ')}</Text>
            </View>
          )}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Availability:</Text>
            <Text style={styles.summaryValue}>{availability.join(', ')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Preference:</Text>
            <Text style={styles.summaryValue}>{communication}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome': return renderWelcomeStep();
      case 'role': return renderRoleStep();
      case 'teach': return renderTeachSkillsStep();
      case 'experience': return renderExperienceLevelStep();
      case 'learn': return renderLearnSkillsStep();
      case 'languages': return renderLanguagesStep();
      case 'credentials': return renderCredentialsStep();
      case 'career': return renderCareerStep();
      case 'availability': return renderAvailabilityStep();
      case 'preferences': return renderPreferencesStep();
      case 'summary': return renderFinalStep();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#FFF5F7', '#FFFFFF', '#F0F9FF']} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${((stepIndex + 1) / totalSteps) * 100}%` }]} />
            </View>
          </View>
          <Text style={styles.stepCounter}>Step {stepIndex + 1} of {totalSteps}</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            {stepIndex > 0 && (
              <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.continueButton, !canContinue() && styles.continueButtonDisabled, stepIndex === 0 && styles.continueButtonFull]}
              onPress={goToNextStep}
              disabled={!canContinue()}
            >
              <Text style={styles.continueButtonText}>
                {stepIndex === totalSteps - 1 ? "Let's Go!" : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  gradient: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },
  progressBarContainer: { marginBottom: 8 },
  progressBarBackground: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FF6B9D', borderRadius: 2 },
  stepCounter: { fontSize: 12, color: '#666', fontWeight: '600' as const, textAlign: 'center' },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 24, paddingBottom: 24 },
  stepContainer: { flex: 1 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' as const, color: '#1A1A1A', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24, textAlign: 'center', lineHeight: 24 },
  description: { fontSize: 14, color: '#888', marginBottom: 32, textAlign: 'center', lineHeight: 20 },
  featureList: { marginTop: 32 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 16 },
  featureText: { fontSize: 16, color: '#333', marginLeft: 16, fontWeight: '500' as const },
  // Role selection
  roleList: { gap: 14, marginTop: 8 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 16,
    borderWidth: 2, borderColor: '#E0E0E0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  roleCardSelected: { borderWidth: 2, backgroundColor: '#FAFAFA' },
  roleIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  roleCardContent: { flex: 1 },
  roleCardTitle: { fontSize: 17, fontWeight: '700' as const, color: '#1A1A1A', marginBottom: 3 },
  roleCardSubtitle: { fontSize: 13, color: '#666', fontWeight: '500' as const },
  // Options
  optionsList: { marginTop: 8 },
  optionItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff',
    padding: 18, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#E0E0E0',
  },
  optionItemSelected: { backgroundColor: '#FF6B9D', borderColor: '#FF6B9D' },
  optionText: { fontSize: 16, color: '#333', fontWeight: '500' as const },
  optionTextSelected: { color: '#fff', fontWeight: '600' as const },
  // Skill levels
  skillLevelContainer: { marginBottom: 24 },
  skillLevelTitle: { fontSize: 16, fontWeight: '600' as const, color: '#333', marginBottom: 12 },
  levelButtons: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8 },
  levelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0' },
  levelButtonSelected: { backgroundColor: '#FF6B9D', borderColor: '#FF6B9D' },
  levelButtonText: { fontSize: 14, color: '#666', fontWeight: '500' as const },
  levelButtonTextSelected: { color: '#fff', fontWeight: '600' as const },
  // Goals
  goalsSection: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  goalsTitle: { fontSize: 16, fontWeight: '600' as const, color: '#333', marginBottom: 12 },
  goalsList: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8 },
  goalChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0' },
  goalChipSelected: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  goalChipText: { fontSize: 14, color: '#666', fontWeight: '500' as const },
  goalChipTextSelected: { color: '#2196F3', fontWeight: '600' as const },
  // Location
  locationSection: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  locationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationTitle: { fontSize: 16, fontWeight: '600' as const, color: '#333', marginLeft: 8 },
  locationInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggle: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  toggleActive: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  toggleText: { fontSize: 14, color: '#666', fontWeight: '500' as const },
  toggleTextActive: { color: '#2196F3', fontWeight: '600' as const },
  // Teacher onboarding — chips & inputs
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0' },
  chipSelected: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipText: { fontSize: 14, color: '#666', fontWeight: '500' as const },
  chipTextSelected: { color: '#fff', fontWeight: '600' as const },
  sectionLabel: { fontSize: 15, fontWeight: '600' as const, color: '#333', marginBottom: 10, marginTop: 8 },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  addRowInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#E0E0E0' },
  addRowButton: { width: 50, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  // Certified toggle
  certifiedToggle: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 16 },
  certifiedToggleActive: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  certifiedToggleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  certifiedToggleIconActive: { backgroundColor: '#10B981' },
  certifiedToggleContent: { flex: 1 },
  certifiedToggleTitle: { fontSize: 15, fontWeight: '600' as const, color: '#333', marginBottom: 2 },
  certifiedToggleTitleActive: { color: '#065F46' },
  certifiedToggleSubtitle: { fontSize: 12, color: '#888', lineHeight: 16 },
  // Certifications
  certSection: { gap: 10 },
  certCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14 },
  certCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  certCardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  certCardTitle: { fontSize: 15, fontWeight: '600' as const, color: '#1A1A1A', flexShrink: 1 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#10B981', borderStyle: 'dashed' as const },
  uploadButtonDone: { backgroundColor: '#D1FAE5', borderColor: '#34D399', borderStyle: 'solid' as const },
  uploadButtonText: { fontSize: 13, fontWeight: '600' as const, color: '#059669' },
  uploadButtonTextDone: { color: '#065F46' },
  // Career history
  careerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 10 },
  careerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  careerContent: { flex: 1 },
  careerRole: { fontSize: 15, fontWeight: '600' as const, color: '#1A1A1A' },
  careerMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  careerForm: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, gap: 10, marginTop: 4 },
  careerInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#E5E7EB' },
  addCareerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#10B981' },
  addCareerButtonText: { fontSize: 14, color: '#fff', fontWeight: '600' as const },
  // Summary
  summaryContainer: { backgroundColor: '#F9F9F9', borderRadius: 16, padding: 20, marginTop: 24 },
  summaryTitle: { fontSize: 18, fontWeight: '700' as const, color: '#333', marginBottom: 16 },
  summaryItem: { marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#666', marginBottom: 4, fontWeight: '600' as const },
  summaryValue: { fontSize: 15, color: '#333', lineHeight: 22 },
  // Footer
  footer: { paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  backButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center' },
  backButtonText: { fontSize: 16, color: '#666', fontWeight: '600' as const },
  continueButton: { flex: 2, paddingVertical: 16, borderRadius: 12, backgroundColor: '#FF6B9D', alignItems: 'center' },
  continueButtonFull: { flex: 1 },
  continueButtonDisabled: { backgroundColor: '#E0E0E0' },
  continueButtonText: { fontSize: 16, color: '#fff', fontWeight: '700' as const },
});
