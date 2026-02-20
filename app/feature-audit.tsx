import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/colors';

type GapPriority = 'Critical' | 'High' | 'Medium';
type PriorityFilter = GapPriority | 'All';

interface FeatureGap {
  id: string;
  title: string;
  summary: string;
  priority: GapPriority;
}

interface FeatureGroup {
  id: string;
  title: string;
  features: FeatureGap[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: 'onboarding',
    title: 'Adaptive Onboarding & Skill Graph',
    features: [
      { id: 'conversational-onboarding', title: 'Conversational coach onboarding', summary: 'Guided chat-based intake that captures motivations and availability.', priority: 'Critical' },
      { id: 'goal-tracking', title: 'Goal & milestone tracking', summary: 'Let members set learning goals and celebrate streaks.', priority: 'High' },
    ],
  },
  {
    id: 'ai-matching',
    title: 'AI Matching & Copilot Experiences',
    features: [
      { id: 'ai-concierge', title: 'AI skill concierge', summary: 'Dedicated agent that suggests swaps and resources based on intent.', priority: 'Critical' },
      { id: 'live-copilot', title: 'Live session copilots', summary: 'Real-time AI notes and follow-up tasks during swaps.', priority: 'High' },
    ],
  },
  {
    id: 'community',
    title: 'Community Signals & Safe Collaboration',
    features: [
      { id: 'verified-profiles', title: 'Verified identities & skill badges', summary: 'Multi-step verification and peer-endorsed skill badges.', priority: 'Critical' },
      { id: 'safety-toolkit', title: 'Safety toolkit & transparency center', summary: 'In-session safety controls and reporting flows.', priority: 'High' },
    ],
  },
  {
    id: 'engagement',
    title: 'Engagement Flywheel & Social Proof',
    features: [
      { id: 'micro-rituals', title: 'Weekly rituals & spotlight moments', summary: 'Swap retros, live jams, and rotating community prompts.', priority: 'High' },
      { id: 'social-proof', title: 'Dynamic social proof', summary: 'Testimonials, before/after snapshots, and skill heatmaps.', priority: 'Medium' },
    ],
  },
  {
    id: 'monetization',
    title: 'Premium Monetization & Marketplace Ops',
    features: [
      { id: 'credits', title: 'Skill credits economy', summary: 'Earned and purchasable credits to balance value across swaps.', priority: 'High' },
      { id: 'curated-cohorts', title: 'Curated cohort experiences', summary: 'Time-bound micro-cohorts with facilitators.', priority: 'Medium' },
    ],
  },
  {
    id: 'data-ops',
    title: 'Insights, Analytics & Growth',
    features: [
      { id: 'north-star-dashboard', title: 'North star metric cockpit', summary: 'Unified activation, swap health, and retention dashboard.', priority: 'Critical' },
      { id: 'experimentation', title: 'Self-serve experimentation platform', summary: 'Feature flags, A/B tests, and multi-armed bandits.', priority: 'High' },
    ],
  },
];

const priorityColor: Record<GapPriority, string> = {
  Critical: '#F87171',
  High: '#FB923C',
  Medium: '#FACC15',
};

export default function FeatureAuditScreen() {
  const insets = useSafeAreaInsets();
  const [selectedPriority, setSelectedPriority] = useState<PriorityFilter>('All');

  const allFeatures = useMemo(() => FEATURE_GROUPS.flatMap((g) => g.features), []);
  const metrics = useMemo(() => ({
    total: allFeatures.length,
    critical: allFeatures.filter((f) => f.priority === 'Critical').length,
    high: allFeatures.filter((f) => f.priority === 'High').length,
    medium: allFeatures.filter((f) => f.priority === 'Medium').length,
  }), [allFeatures]);

  const filteredGroups = useMemo(() => {
    return FEATURE_GROUPS.map((g) => ({
      ...g,
      features: g.features.filter((f) => selectedPriority === 'All' || f.priority === selectedPriority),
    })).filter((g) => g.features.length > 0);
  }, [selectedPriority]);

  const filters: { label: string; value: PriorityFilter }[] = [
    { label: 'All', value: 'All' },
    { label: 'Critical', value: 'Critical' },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 + insets.bottom, paddingTop: insets.top + 16 }}
      testID="feature-audit-screen"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Roadmap Intel</Text>
        <Text style={styles.subtitle}>High-leverage features for modern skill marketplaces.</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}><Text style={styles.metricValue}>{metrics.total}</Text><Text style={styles.metricLabel}>Total</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricValue}>{metrics.critical}</Text><Text style={styles.metricLabel}>Critical</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricValue}>{metrics.high}</Text><Text style={styles.metricLabel}>High</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricValue}>{metrics.medium}</Text><Text style={styles.metricLabel}>Medium</Text></View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, selectedPriority === f.value && styles.filterChipActive]}
            onPress={() => setSelectedPriority(f.value)}
            testID={`priority-${f.value.toLowerCase()}`}
          >
            <Text style={[styles.filterChipText, selectedPriority === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredGroups.map((group) => (
        <View key={group.id} style={styles.groupCard} testID={`group-${group.id}`}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.features.map((feature) => (
            <View key={feature.id} style={styles.featureCard} testID={`feature-${feature.id}`}>
              <View style={styles.featureHeader}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <View style={[styles.priorityPill, { backgroundColor: `${priorityColor[feature.priority]}30`, borderColor: priorityColor[feature.priority] }]}>
                  <Text style={[styles.priorityText, { color: priorityColor[feature.priority] }]}>{feature.priority}</Text>
                </View>
              </View>
              <Text style={styles.featureSummary}>{feature.summary}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  header: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800' as const, color: Colors.light.text },
  subtitle: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
  metricsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: Colors.light.card, paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.light.borderLight },
  metricValue: { fontSize: 20, fontWeight: '800' as const, color: Colors.light.text },
  metricLabel: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 10, paddingHorizontal: 20, marginBottom: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.borderLight },
  filterChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  filterChipText: { fontSize: 14, fontWeight: '600' as const, color: Colors.light.textSecondary },
  filterChipTextActive: { color: '#FFFFFF' },
  groupCard: { marginTop: 20, marginHorizontal: 20, padding: 18, borderRadius: 20, backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.borderLight, gap: 14 },
  groupTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.light.text },
  featureCard: { borderRadius: 16, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.borderLight, padding: 14, gap: 8 },
  featureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  featureTitle: { flex: 1, fontSize: 16, fontWeight: '700' as const, color: Colors.light.text },
  priorityPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  priorityText: { fontSize: 12, fontWeight: '700' as const },
  featureSummary: { fontSize: 14, lineHeight: 20, color: Colors.light.textSecondary },
});
