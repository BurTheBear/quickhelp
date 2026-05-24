import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, Image, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchPublicFeed, fetchFollowingFeed, setFeedType, toggleLikeOptimistic,
  fetchComments, addComment, SocialPost, PostComment,
} from '../../store/slices/socialSlice';
import { socialAPI } from '../../services/api';
import { theme } from '../../theme';
import { formatDistanceToNow } from '../../utils/time';

// ─── Post Card ───────────────────────────────────────────────────────────────

const PostCard = React.memo(({
  post, feedType, onLike, onCommentPress, onProfilePress,
}: {
  post: SocialPost;
  feedType: 'public' | 'following';
  onLike: (id: string) => void;
  onCommentPress: (post: SocialPost) => void;
  onProfilePress: (userId: string) => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onLike(post.id);
  };

  const displayName = post.author?.profile?.displayName ?? 'Anonymous';
  const avatarUrl = post.author?.profile?.avatarUrl;
  const level = post.author?.gamification?.level ?? 1;
  const levelName = post.author?.gamification?.levelName ?? 'Newcomer';

  return (
    <View style={styles.card}>
      {/* Author row */}
      <TouchableOpacity style={styles.authorRow} onPress={() => onProfilePress(post.authorId)}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitial}>{displayName[0]?.toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{displayName}</Text>
          <Text style={styles.authorMeta}>
            Lv.{level} {levelName} · {formatDistanceToNow(post.createdAt)}
          </Text>
        </View>
        {post.author?.profile?.city && (
          <View style={styles.cityBadge}>
            <Ionicons name="location-outline" size={11} color={theme.colors.textMuted} />
            <Text style={styles.cityText}>{post.author.profile.city}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Content */}
      <Text style={styles.content}>{post.content}</Text>

      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={post.isLiked ? '#FF4D6D' : theme.colors.textMuted}
            />
          </Animated.View>
          <Text style={[styles.actionCount, post.isLiked && { color: '#FF4D6D' }]}>
            {post.likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onCommentPress(post)}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textMuted} />
          <Text style={styles.actionCount}>{post.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── Comment Sheet ────────────────────────────────────────────────────────────

const CommentSheet = ({
  post, visible, onClose,
}: {
  post: SocialPost | null;
  visible: boolean;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const comments = useAppSelector((s) => (post ? s.social.comments[post.id] ?? [] : []));
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (post && visible) dispatch(fetchComments(post.id));
  }, [post?.id, visible]);

  const submit = async () => {
    if (!post || !text.trim()) return;
    setSubmitting(true);
    await dispatch(addComment({ postId: post.id, content: text.trim() }));
    setText('');
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }: { item: PostComment }) => (
              <View style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {item.author?.profile?.displayName?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={styles.commentBubble}>
                  <Text style={styles.commentAuthor}>{item.author?.profile?.displayName ?? 'User'}</Text>
                  <Text style={styles.commentText}>{item.content}</Text>
                  <Text style={styles.commentTime}>{formatDistanceToNow(item.createdAt)}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyComments}>No comments yet. Be the first!</Text>
            }
          />

          <View style={styles.commentInput}>
            <TextInput
              style={styles.commentField}
              placeholder="Write a comment..."
              placeholderTextColor={theme.colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || submitting) && { opacity: 0.4 }]}
              onPress={submit}
              disabled={!text.trim() || submitting}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SocialFeedScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const { publicFeed, followingFeed, currentFeedType, loading, hasMorePublic, hasMoreFollowing,
    publicFeedPage, followingFeedPage } = useAppSelector((s) => s.social);

  const [refreshing, setRefreshing] = useState(false);
  const [commentPost, setCommentPost] = useState<SocialPost | null>(null);

  const feed = currentFeedType === 'public' ? publicFeed : followingFeed;

  useEffect(() => {
    dispatch(fetchPublicFeed(1));
    dispatch(fetchFollowingFeed(1));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(currentFeedType === 'public' ? fetchPublicFeed(1) : fetchFollowingFeed(1));
    setRefreshing(false);
  }, [currentFeedType]);

  const loadMore = useCallback(() => {
    if (loading) return;
    if (currentFeedType === 'public' && hasMorePublic) {
      dispatch(fetchPublicFeed(publicFeedPage + 1));
    } else if (currentFeedType === 'following' && hasMoreFollowing) {
      dispatch(fetchFollowingFeed(followingFeedPage + 1));
    }
  }, [loading, currentFeedType, hasMorePublic, hasMoreFollowing, publicFeedPage, followingFeedPage]);

  const handleLike = useCallback(async (postId: string) => {
    const post = feed.find((p) => p.id === postId);
    if (!post) return;
    dispatch(toggleLikeOptimistic({ postId, feedType: currentFeedType }));
    try {
      if (post.isLiked) await socialAPI.unlikePost(postId);
      else await socialAPI.likePost(postId);
    } catch {
      // revert
      dispatch(toggleLikeOptimistic({ postId, feedType: currentFeedType }));
    }
  }, [feed, currentFeedType]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Feed toggle */}
      <View style={styles.toggle}>
        {(['public', 'following'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.toggleBtn, currentFeedType === type && styles.toggleActive]}
            onPress={() => dispatch(setFeedType(type))}
          >
            <Text style={[styles.toggleText, currentFeedType === type && styles.toggleTextActive]}>
              {type === 'public' ? '🌍 Discover' : '👥 Following'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feed */}
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            feedType={currentFeedType}
            onLike={handleLike}
            onCommentPress={setCommentPost}
            onProfilePress={(id) => navigation.navigate('UserProfile', { userId: id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyTitle}>
                {currentFeedType === 'following' ? 'Follow people to see their posts' : 'No posts yet'}
              </Text>
              <Text style={styles.emptySubtitle}>Be the first to share something!</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CreatePost')}
              >
                <Text style={styles.emptyBtnText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={loading && feed.length > 0 ? <ActivityIndicator color={theme.colors.primary} style={{ margin: 16 }} /> : null}
      />

      <CommentSheet post={commentPost} visible={!!commentPost} onClose={() => setCommentPost(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  createBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  toggle: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: theme.colors.surface, borderRadius: 12, padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: theme.colors.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  toggleTextActive: { color: '#fff' },

  // Card
  card: {
    backgroundColor: theme.colors.surface, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: theme.colors.primary + '33',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
    overflow: 'hidden',
  },
  avatarImg: { width: 42, height: 42 },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  authorMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  cityBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cityText: { fontSize: 11, color: theme.colors.textMuted },
  content: { fontSize: 15, color: theme.colors.text, lineHeight: 22, marginBottom: 10 },
  postImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '600' },

  // Comment sheet
  sheet: { flex: 1, backgroundColor: theme.colors.background },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  commentItem: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  commentAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  commentBubble: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12,
    padding: 10,
  },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  commentText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  commentTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  emptyComments: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40 },
  commentInput: {
    flexDirection: 'row', padding: 12, gap: 10, alignItems: 'flex-end',
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  commentField: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, color: theme.colors.text,
    maxHeight: 100, fontSize: 14,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 24 },
  emptyBtn: {
    backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
