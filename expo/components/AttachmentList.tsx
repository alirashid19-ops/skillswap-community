import { memo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Download, FileText, Plus, X } from 'lucide-react-native';
import Colors from '../constants/colors';
import { downloadAttachment } from '../lib/attachments';
import type { AssignmentAttachment } from '../types';

interface AttachmentListProps {
  attachments: AssignmentAttachment[];
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  addLabel?: string;
}

function AttachmentListComponent({ attachments, onAdd, onRemove, addLabel = 'Add photo' }: AttachmentListProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDownload = async (att: AssignmentAttachment) => {
    setBusyId(att.id);
    try {
      await downloadAttachment(att);
    } catch {
      // Share sheet unavailable or write failed — surface a soft error.
    } finally {
      setBusyId(null);
    }
  };

  if (attachments.length === 0 && !onAdd) return null;

  return (
    <View style={s.wrap}>
      {attachments.map(att => (
        <View key={att.id} style={s.row}>
          {att.kind === 'image' ? (
            <Image source={{ uri: `data:${att.mimeType};base64,${att.data}` }} style={s.thumb} />
          ) : (
            <View style={[s.thumb, s.pdfThumb]}>
              <FileText size={16} color="#6366F1" />
            </View>
          )}
          <View style={s.meta}>
            <Text style={s.name} numberOfLines={1}>{att.name}</Text>
            <Text style={s.size}>{Math.max(1, Math.round(att.sizeBytes / 1024))} KB</Text>
          </View>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => handleDownload(att)}
            disabled={busyId === att.id}
            activeOpacity={0.7}
            accessibilityLabel={`Download ${att.name}`}
          >
            <Download size={16} color={busyId === att.id ? Colors.light.textTertiary : Colors.light.primary} />
          </TouchableOpacity>
          {onRemove && (
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => onRemove(att.id)}
              activeOpacity={0.7}
              accessibilityLabel={`Remove ${att.name}`}
            >
              <X size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {onAdd && (
        <TouchableOpacity style={s.addBtn} onPress={onAdd} activeOpacity={0.8}>
          <Plus size={15} color="#6366F1" />
          <Text style={s.addText}>{addLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export const AttachmentList = memo(AttachmentListComponent);

const s = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.light.backgroundTertiary, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: Colors.light.borderLight },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  pdfThumb: { backgroundColor: 'rgba(99,102,241,0.1)', justifyContent: 'center', alignItems: 'center' },
  meta: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600' as const, color: Colors.light.text },
  size: { fontSize: 11, color: Colors.light.textTertiary, marginTop: 1 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#6366F1', paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  addText: { fontSize: 13, fontWeight: '700' as const, color: '#6366F1' },
});
