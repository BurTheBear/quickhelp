import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMapRequests } from '../../store/slices/requestsSlice';
import { colors, spacing, radius, typography, shadows, categoryEmoji, urgencyConfig } from '../../theme';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const INITIAL_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 * ASPECT_RATIO };

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export const MapScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const { mapRequests } = useAppSelector((s) => s.requests);
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string | null>(null);

  // Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const userRegion: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          ...INITIAL_DELTA,
        };
        setRegion(userRegion);
        loadRequestsForRegion(userRegion);
      } else {
        // Default to SF
        const defaultRegion: Region = {
          latitude: 37.7749,
          longitude: -122.4194,
          ...INITIAL_DELTA,
        };
        setRegion(defaultRegion);
        loadRequestsForRegion(defaultRegion);
      }
    })();
  }, []);

  const loadRequestsForRegion = useCallback(
    (r: Region) => {
      dispatch(
        fetchMapRequests({
          north: r.latitude + r.latitudeDelta / 2,
          south: r.latitude - r.latitudeDelta / 2,
          east: r.longitude + r.longitudeDelta / 2,
          west: r.longitude - r.longitudeDelta / 2,
        })
      );
    },
    [dispatch]
  );

  const handleRegionChangeComplete = (r: Region) => {
    setRegion(r);
    loadRequestsForRegion(r);
  };

  const centerOnUser = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      ...INITIAL_DELTA,
    });
  };

  const filteredRequests = filterUrgency
    ? mapRequests.filter((r) => r.urgency === filterUrgency)
    : mapRequests;

  if (!region) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {filteredRequests.map((request) => {
          const urgency = urgencyConfig[request.urgency] ?? urgencyConfig.MEDIUM;
          const isSelected = selectedId === request.id;

          return (
            <Marker
              key={request.id}
              coordinate={{ latitude: request.latitude, longitude: request.longitude }}
              onPress={() => setSelectedId(request.id)}
              zIndex={isSelected ? 100 : 1}
            >
              {/* Custom marker */}
              <View
                style={[
                  styles.marker,
                  { backgroundColor: urgency.color },
                  isSelected && styles.markerSelected,
                ]}
              >
                <Text style={styles.markerEmoji}>{categoryEmoji[request.category] ?? '🤝'}</Text>
              </View>

              {/* Callout */}
              <Callout onPress={() => navigation.navigate('RequestDetail', { requestId: request.id })}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>{request.title}</Text>
                  <View style={styles.calloutMeta}>
                    <Text style={styles.calloutMetaText}>⏱ {request.estimatedMinutes}m</Text>
                    <Text style={styles.calloutMetaText}>⚡ {request.rewardPoints} XP</Text>
                  </View>
                  <Text style={styles.calloutCta}>Tap to view →</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Header overlay */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backFab} onPress={() => navigation.navigate('Home' as never)}>
          <Text style={styles.backFabIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleBubble}>
          <Text style={styles.title}>{filteredRequests.length} requests nearby</Text>
        </View>
      </View>

      {/* Urgency filter */}
      <View style={styles.filterBar}>
        {[null, 'EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'].map((u) => {
          const cfg = u ? urgencyConfig[u] : null;
          return (
            <TouchableOpacity
              key={u ?? 'ALL'}
              style={[
                styles.filterChip,
                filterUrgency === u && { backgroundColor: cfg?.color ?? colors.primary },
              ]}
              onPress={() => setFilterUrgency(u)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterUrgency === u && styles.filterChipTextActive,
                ]}
              >
                {u ?? 'All'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Center on user */}
      <TouchableOpacity
        style={[styles.locationFab, { bottom: insets.bottom + spacing.xl }]}
        onPress={centerOnUser}
      >
        <Text style={styles.locationFabIcon}>📍</Text>
      </TouchableOpacity>

      {/* Stats footer */}
      <View style={[styles.statsFooter, { paddingBottom: insets.bottom + spacing.sm }]}>
        {['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'].map((u) => {
          const count = mapRequests.filter((r) => r.urgency === u).length;
          const cfg = urgencyConfig[u];
          return (
            <View key={u} style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: cfg.color }]} />
              <Text style={styles.statText}>{count} {u.toLowerCase()}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  loadingText: { ...typography.body, color: colors.gray500 },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.md,
  },
  markerSelected: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
  },
  markerEmoji: { fontSize: 18 },
  callout: {
    width: 200,
    padding: spacing.md,
  },
  calloutTitle: { ...typography.label, color: colors.gray800, marginBottom: spacing.xs },
  calloutMeta: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  calloutMetaText: { ...typography.caption, color: colors.gray500 },
  calloutCta: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  backFab: {
    width: 44,
    height: 44,
    backgroundColor: colors.white,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  backFabIcon: { fontSize: 20, color: colors.gray700 },
  titleBubble: {
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  title: { ...typography.label, color: colors.gray800 },
  filterBar: {
    position: 'absolute',
    top: 100,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  filterChip: {
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...shadows.sm,
  },
  filterChipText: { ...typography.caption, color: colors.gray600, fontWeight: '600' },
  filterChipTextActive: { color: colors.white },
  locationFab: {
    position: 'absolute',
    right: spacing.lg,
    width: 48,
    height: 48,
    backgroundColor: colors.white,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  locationFabIcon: { fontSize: 22 },
  statsFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadows.md,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statText: { ...typography.caption, color: colors.gray600 },
});
