import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Flag,
  AlertTriangle,
  Ban,
  ShieldX,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { useAdmin } from '@/providers/admin';
import { useSafety } from '@/providers/safety';
import Colors from '@/constants/colors';
import type { ReportStatus, ReportAction } from '@/types';

type Filter = 'all' | ReportStatus;

const STATUS_CONFIG: Record<ReportStatus, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  pending: { color: '#F59E0B', bg: '#FFFBEB', label: 'Pending', icon: Clock },
  reviewing: { color: '#3B82F6', bg: '#EFF6FF', label: 'Reviewing', icon: AlertTriangle },
  actioned: { color: '#10B981', bg: '#ECFDF5', label: 'Actioned', icon: CheckCircle2 },
  dismissed: { color: '#64748B', bg: '#F1F5F9', label: 'Dismissed', icon: XCircle },
};

const REASON_LABELS: Record<string, string> = {
  harassment: 'Harassment',
  inappropriate_content: 'Inappropriate Content',
  spam_or_scam: 'Spam / Scam',
  fake_profile: 'Fake Profile',
  hate_speech: 'Hate Speech',
  threats: 'Threats / Violence',
  other: 'Other',
};

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export default function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const { isAdminAuthenticated } = useAdmin();
  const { reports, resolveReport, pendingReportsCount } = useSafety();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter);

  const handleResolve = useCallback(
    (reportId: string, reportedUserName: string) => {
      Alert.alert(
        `Resolve Report`,
        `Choose an action for the report against ${reportedUserName}:`,
        [
          {
            text: 'Warn User',
            onPress: () => {
              Alert.alert('Add Note', 'Add an admin note (optional):', [
                { text: 'Skip', onPress: () => resolveReport(reportId, 'warning') },
                {
                  text: 'Add Note',
                  onPress: (note?: string) => resolveReport(reportId, 'warning', note),
                },
              ]);
            },
          },
          {
            text: 'Suspend',
            onPress: () => resolveReport(reportId, 'suspend', 'User suspended due to report.'),
          },
          {
            text: 'Ban',
            style: 'destructive',
            onPress: () => resolveReport(reportId, 'ban', 'User banned due to report.'),
          },
          {
            text: 'Dismiss',
            style: 'cancel',
            onPress: () => resolveReport(reportId, 'dismiss', 'Report dismissed after review.'),
          },
        ],
      );
    },
    [resolveReport],
  );

  if (!isAdminAuthenticated) {
    return <View style={styles.container} />;
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${reports.length})` },
    { key: 'pending', label: `Pending (${pendingReportsCount})` },
    { key: 'actioned', label: 'Actioned' },
    { key: 'dismissed', label: 'Dismissed' },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'User Reports', headerStyle: { backgroundColor: '#0F172A' }, headerTintColor: '#F8FAFC' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.filterRow}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle2 size={48} color={Colors.light.textTertiary} />
            <Text style={styles.emptyTitle}>No reports</Text>
            <Text style={styles.emptyDesc}>
              {filter === 'all' ? 'No user reports have been submitted yet.' : 'No reports match this filter.'}
            </Text>
          </View>
        ) : (
          <View style={styles.reportList}>
            {filtered.map((report) => {
              const cfg = STATUS_CONFIG[report.status];
              const StatusIcon = cfg.icon;
              return (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <View style={styles.reporterInfo}>
                      <Image source={{ uri: report.reporterAvatar }} style={styles.avatar} />
                      <View>
                        <Text style={styles.reporterName}>{report.reporterName}</Text>
                        <Text style={styles.reportTime}>reported {timeAgo(report.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <StatusIcon size={12} color={cfg.color} />
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>

                  <View style={styles.reportedRow}>
                    <Text style={styles.reportedLabel}>Reported user:</Text>
                    <Image source={{ uri: report.reportedUserAvatar }} style={styles.reportedAvatar} />
                    <Text style={styles.reportedName}>{report.reportedUserName}</Text>
                  </View>

                  <View style={styles.reasonBadge}>
                    <Flag size={12} color="#EF4444" />
                    <Text style={styles.reasonText}>{REASON_LABELS[report.reason] ?? report.reason}</Text>
                  </View>

                  <Text style={styles.descText}>{report.description}</Text>

                  {report.adminNote && (
                    <View style={styles.adminNoteBox}>
                      <Text style={styles.adminNoteLabel}>Admin note:</Text>
                      <Text style={styles.adminNoteText}>{report.adminNote}</Text>
                    </View>
                  )}

                  {report.status !== 'actioned' && report.status !== 'dismissed' && (
                    <TouchableOpacity
                      style={styles.resolveBtn}
                      onPress={() => handleResolve(report.id, report.reportedUserName)}
                      activeOpacity={0.7}
                    >
                      <ShieldX size={16} color="#FFFFFF" />
                      <Text style={styles.resolveBtnText}>Resolve Report</Text>
                      <ChevronRight size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}

                  {report.action && (
                    <View style={styles.actionTakenRow}>
                      {report.action === 'ban' ? (
                        <Ban size={14} color="#EF4444" />
                      ) : report.action === 'suspend' ? (
                        <AlertTriangle size={14} color="#F59E0B" />
                      ) : report.action === 'warning' ? (
                        <AlertTriangle size={14} color="#3B82F6" />
                      ) : (
                        <XCircle size={14} color="#64748B" />
                      )}
                      <Text style={styles.actionTakenText}>
                        Action: {report.action.charAt(0).toUpperCase() + report.action.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  reportList: {
    gap: 14,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reporterName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#0F172A',
  },
  reportTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  reportedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reportedLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  reportedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  reportedName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0F172A',
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    marginBottom: 10,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#EF4444',
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
    marginBottom: 12,
  },
  adminNoteBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  adminNoteLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#64748B',
    marginBottom: 4,
  },
  adminNoteText: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
  },
  resolveBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    flex: 1,
  },
  actionTakenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  actionTakenText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748B',
  },
});
