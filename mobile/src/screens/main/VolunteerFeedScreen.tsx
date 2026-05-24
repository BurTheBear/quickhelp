import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert, Image,
  RefreshControl, TextInput, KeyboardAvoidingView, Platform,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '../../store';
import { socialAPI } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme';
import { formatDistanceToNow } from '../../utils/time';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
  author: {
    id: string;
    profile?: { displayName?: string; avatarUrl?: string } | null;
    gamification?: { level: number; levelName: string } | null;
  };
}

// ─── Video card (full-screen vertical) ────────────────────────────────────────
const VideoCard = React.memo(({ post, isActive, onLike, onComment, onProfile }: {
  post: Post; isActive: boolean;
  onLike: (id: string, liked: boolean) => void;
  onComment: (post: Post) => void;
  onProfile: (id: string) => void;
}) => {
  const { colors } = useTheme();
  const player = useVideoPlayer(post.videoUrl ?? '', p => {
    p.loop = true;
    if (isActive) p.play();
  });

  useEffect(() => {
    if (!post.videoUrl) return;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, post.videoUrl]);

  const avatarUrl = post.author.profile?.avatarUrl;
  const displayName = post.author.profile?.displayName ?? 'Anonymous';

  return (
    <View style={[vc.card, { width: SCREEN_W, height: SCREEN_H }]}>
      {/* Media */}
      {post.videoUrl ? (
        <VideoView
          player={player}
          style={vc.media}
          contentFit="cover"
          nativeControls={false}
        />
      ) : post.imageUrl ? (
        <Image source={{ uri: post.imageUrl }} style={vc.media} resizeMode="cover" />
      ) : (
        <View style={[vc.media, { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 80 }}>🤝</Text>
        </View>
      )}

      {/* Gradient overlay (dark bottom) */}
      <View style={vc.overlay} />

      {/* Content text */}
      <View style={vc.contentArea}>
        <TouchableOpacity onPress={() => onProfile(post.author.id)}>
          <View style={vc.authorRow}>
            {avatarUrl?.startsWith('emoji://') ? (
              <View style={vc.avatarCircle}>
                <Text style={{ fontSize: 22 }}>{avatarUrl.replace('emoji://', '')}</Text>
              </View>
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={vc.avatarCircle} />
            ) : (
              <View style={vc.avatarCircle}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>
                  {displayName[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={vc.authorName}>{displayName}</Text>
              <Text style={vc.authorMeta}>Lv.{post.author.gamification?.level ?? 1} · {formatDistanceToNow(post.createdAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <Text style={vc.caption} numberOfLines={3}>{post.content}</Text>
      </View>

      {/* Action buttons (right side) */}
      <View style={vc.actions}>
        <TouchableOpacity style={vc.actionBtn} onPress={() => onLike(post.id, post.isLiked)}>
          <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={32} color={post.isLiked ? '#FF6B6B' : '#fff'} />
          <Text style={vc.actionCount}>{post.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={vc.actionBtn} onPress={() => onComment(post)}>
          <Ionicons name="chatbubble-outline" size={28} color="#fff" />
          <Text style={vc.actionCount}>{post.commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={vc.actionBtn} onPress={() => onProfile(post.author.id)}>
          <Ionicons name="person-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const vc = StyleSheet.create({
  card: { position: 'relative', backgroundColor: '#000' },
  media: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    backgroundColor: 'transparent',
  },
  contentArea: {
    position: 'absolute', bottom: 80, left: spacing.lg, right: 80,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  authorName: { color: '#fff', fontWeight: '800', fontSize: 15 },
  authorMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20 },
  actions: {
    position: 'absolute', right: spacing.md, bottom: 80,
    alignItems: 'center', gap: spacing.lg,
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ─── Image card (grid-style) ────────────────────────────────────────────────
const ImagePostCard = ({ post, onLike, onComment, onProfile }: {
  post: Post;
  onLike: (id: string, liked: boolean) => void;
  onComment: (post: Post) => void;
  onProfile: (id: string) => void;
}) => {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const avatarUrl = post.author.profile?.avatarUrl;
  const displayName = post.author.profile?.displayName ?? 'Anonymous';

  return (
    <View style={[s.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={s.postAuthorRow} onPress={() => onProfile(post.author.id)}>
        {avatarUrl?.startsWith('emoji://') ? (
          <View style={[s.postAvatar, { backgroundColor: colors.primary + '25' }]}>
            <Text style={{ fontSize: 22 }}>{avatarUrl.replace('emoji://', '')}</Text>
          </View>
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.postAvatar} />
        ) : (
          <View style={[s.postAvatar, { backgroundColor: colors.primary + '25' }]}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>
              {displayName[0]?.toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.postAuthorName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[s.postAuthorMeta, { color: colors.textMuted }]}>
            Lv.{post.author.gamification?.level ?? 1} · {formatDistanceToNow(post.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>

      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={s.postImage} resizeMode="cover" />
      )}

      <Text style={[s.postContent, { color: colors.text }]} numberOfLines={4}>
        {post.content}
      </Text>

      <View style={[s.postActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.postAction} onPress={() => onLike(post.id, post.isLiked)}>
          <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={20} color={post.isLiked ? '#FF6B6B' : colors.textMuted} />
          <Text style={[s.postActionLabel, { color: colors.textMuted }]}>{post.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.postAction} onPress={() => onComment(post)}>
          <Ionicons name="chatbubble-outline" size={19} color={colors.textMuted} />
          <Text style={[s.postActionLabel, { color: colors.textMuted }]}>{post.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function VolunteerFeedScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const currentUser = useAppSelector(s => s.auth.user) as any;
  const s = makeStyles(colors);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVideo, setActiveVideo] = useState(0);
  const [viewMode, setViewMode] = useState<'video' | 'feed'>('feed');
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const res = await socialAPI.getPublicFeed(1);
      setPosts(res.data.data.posts ?? []);
    } catch { setPosts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const handleLike = useCallback(async (id: string, liked: boolean) => {
    setPosts(prev => prev.map(p => p.id === id
      ? { ...p, isLiked: !liked, likeCount: liked ? p.likeCount - 1 : p.likeCount + 1 }
      : p
    ));
    try {
      if (liked) await socialAPI.unlikePost(id);
      else await socialAPI.likePost(id);
    } catch {
      // revert
      setPosts(prev => prev.map(p => p.id === id
        ? { ...p, isLiked: liked, likeCount: liked ? p.likeCount : p.likeCount - 1 }
        : p
      ));
    }
  }, []);

  const openComments = async (post: Post) => {
    setCommentPost(post);
    setComments([]);
    try {
      const res = await socialAPI.getComments(post.id, 1);
      setComments(res.data.data.comments ?? []);
    } catch {}
  };

  const postComment = async () => {
    if (!commentText.trim() || !commentPost) return;
    setPostingComment(true);
    try {
      await socialAPI.addComment(commentPost.id, commentText.trim());
      setCommentText('');
      const res = await socialAPI.getComments(commentPost.id, 1);
      setComments(res.data.data.comments ?? []);
      setPosts(prev => prev.map(p => p.id === commentPost.id
        ? { ...p, commentCount: p.commentCount + 1 } : p
      ));
    } catch {} finally { setPostingComment(false); }
  };

  // ── Create post ──────────────────────────────────────────────────────────────
  const pickMedia = async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'video' ? ['videos'] : ['images'],
      allowsEditing: type === 'image',
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType(type);
    }
  };

  const takeMedia = async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: type === 'image',
      quality: 0.8,
      videoMaxDuration: 60,
      mediaTypes: type === 'video' ? ['videos'] : ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType(type);
    }
  };

  const submitPost = async () => {
    if (!newContent.trim() && !mediaUri) {
      Alert.alert('Add content', 'Write something or add a photo/video.');
      return;
    }
    setCreating(true);
    try {
      if (mediaUri) {
        await socialAPI.createPostWithMedia(newContent, mediaUri, mediaType);
      } else {
        await socialAPI.createPost({ content: newContent, visibility: 'PUBLIC' });
      }
      setShowCreate(false);
      setNewContent('');
      setMediaUri(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error ?? 'Could not post');
    } finally { setCreating(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const videoPosts = posts.filter(p => p.videoUrl);
  const allPosts = posts;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Volunteers Near You 🤝</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={s.createBtn}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* View mode switcher */}
      <View style={[s.modeBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.modeBtn, viewMode === 'feed' && { borderBottomColor: colors.primary }]}
          onPress={() => setViewMode('feed')}
        >
          <Text style={[s.modeBtnText, { color: viewMode === 'feed' ? colors.primary : colors.textMuted }]}>
            📋 Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeBtn, viewMode === 'video' && { borderBottomColor: colors.primary }]}
          onPress={() => setViewMode('video')}
        >
          <Text style={[s.modeBtnText, { color: viewMode === 'video' ? colors.primary : colors.textMuted }]}>
            📹 Videos ({videoPosts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'video' ? (
        videoPosts.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎬</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No volunteer videos yet</Text>
            <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
              Be the first to share a video of your volunteering!
            </Text>
            <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCreate(true)}>
              <Text style={s.emptyBtnText}>Share a Video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={videoPosts}
            keyExtractor={p => p.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={({ viewableItems }) => {
              if (viewableItems[0]) setActiveVideo(viewableItems[0].index ?? 0);
            }}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item, index }) => (
              <VideoCard
                post={item}
                isActive={index === activeVideo}
                onLike={handleLike}
                onComment={openComments}
                onProfile={(id) => navigation.navigate('UserProfile', { userId: id })}
              />
            )}
          />
        )
      ) : (
        <FlatList
          data={allPosts}
          keyExtractor={p => p.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🤝</Text>
              <Text style={[s.emptyTitle, { color: colors.text }]}>No posts yet</Text>
              <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
                Share your volunteering stories with the community!
              </Text>
              <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCreate(true)}>
                <Text style={s.emptyBtnText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <ImagePostCard
              post={item}
              onLike={handleLike}
              onComment={openComments}
              onProfile={(id) => navigation.navigate('UserProfile', { userId: id })}
            />
          )}
        />
      )}

      {/* Comment modal */}
      <Modal
        visible={!!commentPost}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentPost(null)}
      >
        <KeyboardAvoidingView style={s.commentModalOuter} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.commentSheet, { backgroundColor: colors.surface }]}>
            <View style={[s.commentHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.commentTitle, { color: colors.text }]}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentPost(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={comments}
              keyExtractor={c => c.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
              ListEmptyComponent={<Text style={[s.noComments, { color: colors.textMuted }]}>No comments yet. Be the first!</Text>}
              renderItem={({ item }) => (
                <View style={s.commentItem}>
                  <Text style={[s.commentAuthor, { color: colors.primary }]}>
                    {item.author?.profile?.displayName ?? 'Anonymous'}
                  </Text>
                  <Text style={[s.commentContent, { color: colors.text }]}>{item.content}</Text>
                </View>
              )}
            />
            <View style={[s.commentInput, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              <TextInput
                style={[s.commentTextInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                maxLength={300}
              />
              <TouchableOpacity
                style={[s.sendCommentBtn, { backgroundColor: colors.primary }]}
                onPress={postComment}
                disabled={postingComment || !commentText.trim()}
              >
                {postingComment
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="send" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create post modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreate(false)}
      >
        <SafeAreaView style={[s.createModal, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[s.createHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setShowCreate(false); setMediaUri(null); setNewContent(''); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.createTitle, { color: colors.text }]}>Share Your Story</Text>
            <TouchableOpacity
              style={[s.postBtn, (!newContent.trim() && !mediaUri) && s.postBtnDisabled, { backgroundColor: colors.primary }]}
              onPress={submitPost}
              disabled={creating || (!newContent.trim() && !mediaUri)}
            >
              {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.postBtnText}>Post</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <TextInput
              style={[s.createInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Share your volunteering experience..."
              placeholderTextColor={colors.textMuted}
              value={newContent}
              onChangeText={setNewContent}
              multiline
              maxLength={500}
              autoFocus
            />

            {/* Media preview */}
            {mediaUri && (
              <View style={s.mediaPreview}>
                <Image source={{ uri: mediaUri }} style={s.mediaThumb} resizeMode="cover" />
                <TouchableOpacity style={s.removeMedia} onPress={() => setMediaUri(null)}>
                  <Ionicons name="close-circle" size={28} color="#fff" />
                </TouchableOpacity>
                {mediaType === 'video' && (
                  <View style={s.videoTag}>
                    <Text style={s.videoTagText}>📹 VIDEO</Text>
                  </View>
                )}
              </View>
            )}

            {/* Media buttons */}
            <Text style={[s.mediaLabel, { color: colors.textMuted }]}>Add photo or video</Text>
            <View style={s.mediaButtons}>
              <TouchableOpacity style={[s.mediaBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => takeMedia('image')}>
                <Ionicons name="camera" size={22} color={colors.primary} />
                <Text style={[s.mediaBtnText, { color: colors.primary }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.mediaBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => pickMedia('image')}>
                <Ionicons name="image" size={22} color={colors.primary} />
                <Text style={[s.mediaBtnText, { color: colors.primary }]}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.mediaBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => pickMedia('video')}>
                <Ionicons name="videocam" size={22} color={colors.primary} />
                <Text style={[s.mediaBtnText, { color: colors.primary }]}>Video</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.createTip, { color: colors.textMuted }]}>
              💡 Share a photo or video of your volunteering to inspire others and earn community recognition!
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', flex: 1, marginLeft: spacing.md },
  createBtn: { padding: 4 },
  modeBar: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  modeBtn: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  modeBtnText: { fontSize: 14, fontWeight: '700' },
  postCard: {
    marginHorizontal: spacing.md, marginVertical: spacing.sm,
    borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden',
  },
  postAuthorRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md,
  },
  postAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  postAuthorName: { fontSize: 14, fontWeight: '700' },
  postAuthorMeta: { fontSize: 12 },
  postImage: { width: '100%', height: 240 },
  postContent: { padding: spacing.md, fontSize: 14, lineHeight: 22 },
  postActions: {
    flexDirection: 'row', padding: spacing.md, gap: spacing.xl,
    borderTopWidth: 1,
  },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  postActionLabel: { fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xxxl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  emptyBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Comment modal
  commentModalOuter: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  commentSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '65%' },
  commentHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1,
  },
  commentTitle: { fontSize: 17, fontWeight: '800' },
  noComments: { textAlign: 'center', paddingTop: 40 },
  commentItem: { marginBottom: spacing.md },
  commentAuthor: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  commentContent: { fontSize: 14, lineHeight: 20 },
  commentInput: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    gap: spacing.sm, borderTopWidth: 1,
  },
  commentTextInput: {
    flex: 1, borderRadius: radius.xl, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 14, maxHeight: 80,
  },
  sendCommentBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  // Create modal
  createModal: { flex: 1 },
  createHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1,
  },
  createTitle: { fontSize: 17, fontWeight: '800' },
  postBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  createInput: {
    minHeight: 120, borderRadius: radius.xl, borderWidth: 1,
    padding: spacing.lg, fontSize: 15, textAlignVertical: 'top',
    marginBottom: spacing.xl,
  },
  mediaPreview: { position: 'relative', borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.lg },
  mediaThumb: { width: '100%', height: 200 },
  removeMedia: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  videoTag: {
    position: 'absolute', bottom: spacing.sm, left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: radius.sm, padding: spacing.xs,
  },
  videoTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  mediaLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  mediaButtons: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  mediaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
    borderRadius: radius.xl, borderWidth: 1.5,
  },
  mediaBtnText: { fontSize: 13, fontWeight: '700' },
  createTip: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
