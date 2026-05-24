import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchPublicProfile, fetchFollowingFeed, followUser, unfollowUser,
} from '../../store/slices/socialSlice';
import { socialAPI } from '../../services/api';
import { theme } from '../../theme';
import { formatDistanceToNow } from '../../utils/time';

type RouteParams = { userId: string };

const LEVEL_COLORS: Record<number, string[]> = {
  1: ['#9CA3AF', '#6B7280'],
  2: ['#60A5FA', '#3B82F6'],
  3: ['#34D399', '#10B981'],
  4: ['#A78BFA', '#7C3AED'],
  5: ['#F59E0B', '#D97706'],
  6: ['#F97316', '#EA580C'],
  7: ['#EF4444', '#DC2626'],
  8: ['#EC4899', '#DB2777'],
  9: ['#8B5CF6', '#6D28D9'],
  10: ['#6C63FF', '#4F46E5'],
};

export default function UserProfileScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { userId } = route.params;

  const currentUser = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.social.profiles[userId]);
  const userPosts = useAppSelector((s) =>
    s.social.publicFeed.filter((p) => p.authorId === userId),
  );

  const [loadingFollow, setLoadingFollow] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    dispatch(fetchPublicProfile(userId));
    loadPosts();
  }, [userId]);

  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const res = await socialAPI.getUserPosts(userId);
      setPosts(res.data.data);
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    setLoadingFollow(true);
    try {
      if (profile.isFollowing) {
        await dispatch(unfollowUser(userId));
      } else {
        await dispatch(followUser(userId));
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong');
    } finally {
      setLoadingFollow(false);
    }
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const displayName = (profile.profile as any)?.displayName ?? 'User';
  const avatarUrl = (profile.profile as any)?.avatarUrl;
  const bio = (profile.profile as any)?.bio;
  const city = (profile.profile as any)?.city;
  const level = (profile.gamification as any)?.level ?? 1;
  const levelName = (profile.gamification as any)?.levelName ?? 'Newcomer';
  const totalXp = (profile.gamification as any)?.totalXp ?? 0;
  const gradientColors = LEVEL_COLORS[level] ?? LEVEL_COLORS[1];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Hero gradient */}
        <LinearGradient colors={gradientColors as [string, string]} style={styles.hero}>
          <View style={styles.heroContent}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{displayName[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{level}</Text>
              </View>
            </View>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.levelName}>{levelName}</Text>
            {city && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.locationText}>{city}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Follow + Report row */}
        {!isOwnProfile && (
          <View style={styles.followContainer}>
            <TouchableOpacity
              style={[styles.followBtn, profile.isFollowing && styles.followingBtn]}
              onPress={handleFollow}
              disabled={loadingFollow}
            >
              {loadingFollow ? (
                <ActivityIndicator size="small" color={profile.isFollowing ? theme.colors.primary : '#fff'} />
              ) : (
                <>
                  <Ionicons
                    name={profile.isFollowing ? 'person-remove-outline' : 'person-add-outline'}
                    size={16}
                    color={profile.isFollowing ? theme.colors.primary : '#fff'}
                  />
                  <Text style={[styles.followBtnText, profile.isFollowing && styles.followingBtnText]}>
                    {profile.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => navigation.navigate('ReportUser', { userId, userName: displayName })}
            >
              <Ionicons name="flag-outline" size={18} color={theme.colors.textMuted} />
              <Text style={styles.reportBtnText}>Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Followers', value: profile._count.followers },
            { label: 'Following', value: profile._count.following },
            { label: 'Tasks', value: profile._count.matchesAsVolunteer },
            { label: 'XP', value: totalXp.toLocaleString() },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Bio */}
        {bio && (
          <View style={styles.section}>
            <Text style={styles.bio}>{bio}</Text>
          </View>
        )}

        {/* Badges */}
        {profile.userBadges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <View style={styles.badgesRow}>
              {(profile.userBadges as any[]).map((ub) => (
                <View key={ub.id} style={styles.badge}>
                  <Text style={styles.badgeIcon}>{ub.badge?.iconUrl}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Posts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posts</Text>
          {postsLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
          ) : posts.length === 0 ? (
            <Text style={styles.noPosts}>No posts yet.</Text>
          ) : (
            posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <Text style={styles.postContent}>{post.content}</Text>
                <View style={styles.postMeta}>
                  <Text style={styles.postTime}>{formatDistanceToNow(post.createdAt)}</Text>
                  <View style={styles.postStats}>
                    <Ionicons name="heart" size={14} color="#FF4D6D" />
                    <Text style={styles.postStatText}>{post.likeCount}</Text>
                    <Ionicons name="chatbubble" size={13} color={theme.colors.textMuted} />
                    <Text style={styles.postStatText}>{post.commentCount}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  backBtn: { position: 'absolute', top: 16, left: 16, zIndex: 10, padding: 4 },
  hero: { height: 220, justifyContent: 'flex-end' },
  heroContent: { alignItems: 'center', paddingBottom: 24 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff',
  },
  avatarInitial: { fontSize: 32, fontWeight: '700', color: '#fff' },
  levelBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  levelBadgeText: { fontSize: 11, fontWeight: '800', color: '#333' },
  displayName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  levelName: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  followContainer: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  followBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.primary, paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 24,
  },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.primary },
  followBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  followingBtnText: { color: theme.colors.primary },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 24, borderWidth: 1.5, borderColor: theme.colors.border,
  },
  reportBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: theme.colors.border, marginVertical: 4,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  bio: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeIcon: { fontSize: 24 },
  noPosts: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 16 },
  postCard: {
    backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  postContent: { fontSize: 14, color: theme.colors.text, lineHeight: 20, marginBottom: 8 },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postTime: { fontSize: 12, color: theme.colors.textMuted },
  postStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postStatText: { fontSize: 12, color: theme.colors.textMuted },
});
