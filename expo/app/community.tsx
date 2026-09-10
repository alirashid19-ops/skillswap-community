import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Heart, MessageCircle, Send, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { mockUsers } from '@/mocks/data';
import { useCommunity } from '@/providers/community';
import { useCurrentUser } from '@/providers/current-user';
import type { CommunityPost } from '@/types';
import type { User } from '@/types';

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function isTeacherUser(user: User | undefined): boolean {
  return user?.role === 'teacher' || !!user?.teacherProfile;
}

export default function CommunityWallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, addPost, toggleLike, deletePost, addComment } = useCommunity();
  const { currentUser } = useCurrentUser();
  const [draft, setDraft] = useState('');
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const handlePost = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    addPost(text, currentUser.id);
    setDraft('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [draft, addPost, currentUser.id]);

  const handleLike = useCallback(
    (postId: string) => {
      toggleLike(postId, currentUser.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    },
    [toggleLike, currentUser.id],
  );

  const handleDelete = useCallback(
    (postId: string) => {
      Alert.alert('Delete post', 'Remove this post from the wall?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePost(postId) },
      ]);
    },
    [deletePost],
  );

  const openProfile = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}` as never);
    },
    [router],
  );

  const toggleComments = useCallback((postId: string) => {
    setCommentDraft('');
    setOpenCommentsId(prev => (prev === postId ? null : postId));
  }, []);

  const handleComment = useCallback(() => {
    const text = commentDraft.trim();
    if (!text || !openCommentsId) return;
    addComment(openCommentsId, text, currentUser.id);
    setCommentDraft('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [commentDraft, openCommentsId, addComment, currentUser.id]);

  const renderPost = useCallback(
    ({ item }: { item: CommunityPost }) => {
      const author: User | undefined =
        item.authorId === currentUser.id ? currentUser : mockUsers.find(u => u.id === item.authorId);
      const isMine = item.authorId === currentUser.id;
      const teacher = isTeacherUser(author);
      const liked = item.likedBy.includes(currentUser.id);
      const commentsOpen = openCommentsId === item.id;
      const commentCount = item.comments?.length ?? 0;

      return (
        <View style={s.postCard}>
          <View style={s.postHeaderRow}>
            <TouchableOpacity
              style={s.postHeader}
              onPress={() => openProfile(item.authorId)}
              activeOpacity={0.7}
              accessibilityLabel={`View ${isMine ? 'your' : author?.name ?? "member's"} profile`}
            >
              <Image source={{ uri: author?.avatarUrl }} style={s.avatar} />
              <View style={{ flex: 1 }}>
                <View style={s.nameRow}>
                  <Text style={s.authorName}>{isMine ? 'You' : author?.name ?? 'Member'}</Text>
                  <View style={[s.badge, teacher ? s.badgeTeacher : s.badgeStudent]}>
                    <Text style={[s.badgeText, teacher ? s.badgeTextTeacher : s.badgeTextStudent]}>
                      {teacher ? 'Teacher' : 'Student'}
                    </Text>
                  </View>
                </View>
                <Text style={s.timeText}>{timeAgo(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
            {isMine && (
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => handleDelete(item.id)}
                activeOpacity={0.7}
                accessibilityLabel="Delete post"
              >
                <Trash2 size={16} color={Colors.light.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={s.postBody}>{item.body}</Text>

          <View style={s.actionsRow}>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => handleLike(item.id)}
              activeOpacity={0.7}
              testID={`like-button-${item.id}`}
            >
              <Heart size={18} color={liked ? '#EC4899' : Colors.light.textTertiary} fill={liked ? '#EC4899' : 'transparent'} />
              <Text style={[s.likeText, liked && s.likeTextActive]}>
                {item.likedBy.length > 0 ? item.likedBy.length : 'Like'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => toggleComments(item.id)}
              activeOpacity={0.7}
              testID={`comment-button-${item.id}`}
            >
              <MessageCircle size={18} color={commentsOpen ? Colors.light.primary : Colors.light.textTertiary} />
              <Text style={[s.likeText, commentsOpen && s.commentTextActive]}>
                {commentCount > 0 ? commentCount : 'Comment'}
              </Text>
            </TouchableOpacity>
          </View>

          {commentsOpen && (
            <View style={s.commentsWrap}>
              {(item.comments ?? []).map(comment => {
                const commentAuthor: User | undefined =
                  comment.authorId === currentUser.id
                    ? currentUser
                    : mockUsers.find(u => u.id === comment.authorId);
                const commentIsMine = comment.authorId === currentUser.id;
                return (
                  <TouchableOpacity
                    key={comment.id}
                    style={s.commentRow}
                    onPress={() => openProfile(comment.authorId)}
                    activeOpacity={0.7}
                    accessibilityLabel={`View ${commentIsMine ? 'your' : commentAuthor?.name ?? "member's"} profile`}
                  >
                    <Image source={{ uri: commentAuthor?.avatarUrl }} style={s.commentAvatar} />
                    <View style={s.commentBubble}>
                      <View style={s.commentHead}>
                        <Text style={s.commentName}>{commentIsMine ? 'You' : commentAuthor?.name ?? 'Member'}</Text>
                        <Text style={s.commentTime}>{timeAgo(comment.createdAt)}</Text>
                      </View>
                      <Text style={s.commentBody}>{comment.body}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={s.commentInputRow}>
                <Image source={{ uri: currentUser.avatarUrl }} style={s.commentAvatar} />
                <TextInput
                  style={s.commentInput}
                  placeholder="Write a comment…"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  onSubmitEditing={handleComment}
                  returnKeyType="send"
                  testID={`comment-input-${item.id}`}
                />
                <TouchableOpacity
                  onPress={handleComment}
                  disabled={commentDraft.trim().length === 0}
                  activeOpacity={0.8}
                  testID={`comment-send-${item.id}`}
                >
                  <Send
                    size={18}
                    color={commentDraft.trim().length > 0 ? Colors.light.primary : Colors.light.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      );
    },
    [currentUser, handleLike, handleDelete, openProfile, toggleComments, openCommentsId, commentDraft, handleComment],
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Community Wall</Text>
          <Text style={s.headerSub}>What students & teachers are saying</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.composer}>
          <Image source={{ uri: currentUser.avatarUrl }} style={s.composerAvatar} />
          <TextInput
            style={s.composerInput}
            placeholder="Share a tip, win, or question…"
            placeholderTextColor={Colors.light.textTertiary}
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            testID="community-composer-input"
          />
          <TouchableOpacity
            style={[s.postBtn, draft.trim().length === 0 && s.postBtnDisabled]}
            onPress={handlePost}
            disabled={draft.trim().length === 0}
            activeOpacity={0.8}
            testID="post-button"
          >
            <Send size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.light.background,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.light.backgroundTertiary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' as const, color: Colors.light.text },
  headerSub: { fontSize: 12, color: Colors.light.textTertiary, marginTop: 2 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.light.background,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
  },
  composerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.backgroundTertiary },
  composerInput: {
    flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.borderLight,
  },
  postBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center' },
  postBtnDisabled: { backgroundColor: Colors.light.backgroundTertiary },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  postCard: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.backgroundTertiary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontSize: 14, fontWeight: '700' as const, color: Colors.light.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTeacher: { backgroundColor: 'rgba(245,158,11,0.14)' },
  badgeStudent: { backgroundColor: 'rgba(99,102,241,0.12)' },
  badgeText: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.4 },
  badgeTextTeacher: { color: '#B45309' },
  badgeTextStudent: { color: Colors.light.primary },
  timeText: { fontSize: 11, color: Colors.light.textTertiary, marginTop: 2 },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  postBody: { fontSize: 14, lineHeight: 20, color: Colors.light.text, marginTop: 10 },
  postHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeText: { fontSize: 13, fontWeight: '600' as const, color: Colors.light.textTertiary },
  likeTextActive: { color: '#EC4899' },
  commentTextActive: { color: Colors.light.primary },
  commentsWrap: { marginTop: 12, gap: 10 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.light.backgroundTertiary },
  commentBubble: { flex: 1, backgroundColor: Colors.light.backgroundTertiary, borderRadius: 12, borderTopLeftRadius: 4, paddingHorizontal: 10, paddingVertical: 8 },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentName: { fontSize: 12, fontWeight: '700' as const, color: Colors.light.text },
  commentTime: { fontSize: 10, color: Colors.light.textTertiary },
  commentBody: { fontSize: 13, lineHeight: 18, color: Colors.light.text, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  commentInput: { flex: 1, minHeight: 38, backgroundColor: Colors.light.backgroundTertiary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.borderLight },
});
