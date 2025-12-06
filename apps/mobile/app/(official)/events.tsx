import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/Colors';

type EventItem = {
  id: string;
  name: string;
  age_group?: string;
  gender?: string;
  event_type?: string;
  scheduled_time?: string;
};

// Group events by name to find mergeable events
type EventGroup = {
  name: string;
  events: EventItem[];
  canMerge: boolean;
};

// Format event display with age group and gender
function formatEventDisplay(event: EventItem): string {
  const parts = [event.name];
  if (event.age_group && event.age_group !== 'Senior') {
    parts.push(event.age_group);
  }
  if (event.gender) {
    parts.push(event.gender === 'M' ? 'Menn' : event.gender === 'F' ? 'Kvinner' : event.gender);
  }
  return parts.join(' - ');
}

// Format short display for merged view
function formatShortDisplay(event: EventItem): string {
  const parts: string[] = [];
  if (event.age_group && event.age_group !== 'Senior') {
    parts.push(event.age_group);
  }
  if (event.gender) {
    parts.push(event.gender === 'M' ? 'M' : event.gender === 'F' ? 'K' : event.gender);
  }
  return parts.join(' ') || event.name;
}

// Format scheduled time for display (always in Norwegian timezone)
function formatScheduledTime(scheduledTime?: string): string | null {
  if (!scheduledTime) return null;
  try {
    const date = new Date(scheduledTime);
    return date.toLocaleTimeString('no-NO', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Oslo',
    });
  } catch {
    return null;
  }
}

// Group events by name
function groupEventsByName(events: EventItem[]): EventGroup[] {
  const groups = new Map<string, EventItem[]>();

  events.forEach(event => {
    const existing = groups.get(event.name) || [];
    existing.push(event);
    groups.set(event.name, existing);
  });

  return Array.from(groups.entries()).map(([name, groupEvents]) => ({
    name,
    events: groupEvents,
    canMerge: groupEvents.length > 1,
  }));
}

export default function OfficialEventsScreen() {
  const { session, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Selection state for merging events
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  // Group events by name to identify mergeable events
  const eventGroups = useMemo(() => {
    if (!session?.events) return [];
    return groupEventsByName(session.events);
  }, [session?.events]);

  // Check if there are any mergeable events
  const hasMergeableEvents = useMemo(() => {
    return eventGroups.some(group => group.canMerge);
  }, [eventGroups]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/(official)/login');
    }
  }, [isAuthenticated, authLoading]);

  const handleLogout = () => {
    Alert.alert(
      'Logg ut',
      'Er du sikker pa at du vil logge ut?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Logg ut',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const toggleSelectionMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectionMode) {
      // Exit selection mode, clear selections
      setSelectedEventIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const toggleEventSelection = (eventId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleEventPress = (event: EventItem) => {
    if (selectionMode) {
      toggleEventSelection(event.id);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to single event recording
    router.push({
      pathname: '/(official)/record',
      params: {
        eventIds: event.id,
        eventNames: event.name,
      },
    });
  };

  const handleMergePress = () => {
    if (selectedEventIds.size < 2) {
      Alert.alert('Velg ovelser', 'Du ma velge minst 2 ovelser for a sla sammen.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Get selected events
    const selectedEvents = session?.events.filter(e => selectedEventIds.has(e.id)) || [];
    const eventIds = selectedEvents.map(e => e.id).join(',');
    const eventNames = selectedEvents.map(e => formatShortDisplay(e)).join(', ');
    const mainEventName = selectedEvents[0]?.name || 'Ovelse';

    // Reset selection mode
    setSelectionMode(false);
    setSelectedEventIds(new Set());

    // Navigate to merged recording screen
    router.push({
      pathname: '/(official)/record',
      params: {
        eventIds,
        eventNames: `${mainEventName} (${eventNames})`,
        merged: 'true',
      },
    });
  };

  const handleQuickMerge = (group: EventGroup) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const eventIds = group.events.map(e => e.id).join(',');
    const eventNames = group.events.map(e => formatShortDisplay(e)).join(', ');

    // Navigate to merged recording screen
    router.push({
      pathname: '/(official)/record',
      params: {
        eventIds,
        eventNames: `${group.name} (${eventNames})`,
        merged: 'true',
      },
    });
  };

  const renderEventGroup = ({ item: group }: { item: EventGroup }) => {
    // For groups with only one event, render single event card
    if (!group.canMerge) {
      const event = group.events[0];
      return renderSingleEvent(event);
    }

    // For mergeable groups, render with merge option
    return (
      <View style={styles.groupContainer}>
        {/* Group header with merge button */}
        <View style={styles.groupHeader}>
          <View style={styles.groupTitleContainer}>
            <Text style={styles.groupTitle}>{group.name}</Text>
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>{group.events.length} klasser</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.mergeButton}
            onPress={() => handleQuickMerge(group)}
            activeOpacity={0.7}
          >
            <FontAwesome name="compress" size={14} color={colors.white} />
            <Text style={styles.mergeButtonText}>Sla sammen</Text>
          </TouchableOpacity>
        </View>

        {/* Individual events in the group */}
        {group.events.map(event => (
          <View key={event.id}>
            {renderSingleEvent(event, true)}
          </View>
        ))}
      </View>
    );
  };

  const renderSingleEvent = (event: EventItem, isInGroup = false) => {
    const scheduledTime = formatScheduledTime(event.scheduled_time);
    const isSelected = selectedEventIds.has(event.id);

    return (
      <TouchableOpacity
        key={event.id}
        style={[
          styles.eventCard,
          isInGroup && styles.eventCardInGroup,
          selectionMode && isSelected && styles.eventCardSelected,
        ]}
        onPress={() => handleEventPress(event)}
        onLongPress={() => {
          if (!selectionMode && hasMergeableEvents) {
            toggleSelectionMode();
            toggleEventSelection(event.id);
          }
        }}
        activeOpacity={0.7}
      >
        {selectionMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <FontAwesome name="check" size={12} color={colors.white} />}
          </View>
        )}
        <View style={[styles.eventIcon, isInGroup && styles.eventIconSmall]}>
          <FontAwesome
            name="flag"
            size={isInGroup ? 16 : 20}
            color={colors.primary}
          />
        </View>
        <View style={styles.eventContent}>
          <Text style={[styles.eventName, isInGroup && styles.eventNameSmall]}>
            {isInGroup ? formatShortDisplay(event) : formatEventDisplay(event)}
          </Text>
          <Text style={styles.eventStatus}>
            {scheduledTime ? `Kl. ${scheduledTime}` : 'Trykk for a registrere'}
          </Text>
        </View>
        {!selectionMode && (
          <FontAwesome name="chevron-right" size={16} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Competition Info Header */}
      <View style={styles.header}>
        <View style={styles.competitionInfo}>
          <Text style={styles.competitionName}>{session.competitionName}</Text>
          <Text style={styles.accessCodeName}>
            Logget inn som: {session.accessCodeName}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.viewCompetitionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/competition/${session.competitionId}`);
            }}
            activeOpacity={0.7}
          >
            <FontAwesome name="trophy" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <FontAwesome name="sign-out" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selection mode toolbar */}
      {selectionMode && (
        <View style={styles.selectionToolbar}>
          <Text style={styles.selectionText}>
            {selectedEventIds.size} valgt
          </Text>
          <View style={styles.selectionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={toggleSelectionMode}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Avbryt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.mergeSelectedButton,
                selectedEventIds.size < 2 && styles.mergeSelectedButtonDisabled,
              ]}
              onPress={handleMergePress}
              disabled={selectedEventIds.size < 2}
              activeOpacity={0.7}
            >
              <FontAwesome name="compress" size={14} color={colors.white} />
              <Text style={styles.mergeSelectedButtonText}>Sla sammen</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Events List */}
      {session.events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="inbox" size={48} color={colors.borderDark} />
          <Text style={styles.emptyTitle}>Ingen ovelser tildelt</Text>
          <Text style={styles.emptyText}>
            Du har ikke fatt tildelt noen ovelser enna.
            Kontakt stevnearrangoren.
          </Text>
        </View>
      ) : (
        <FlatList
          data={eventGroups}
          renderItem={renderEventGroup}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // TODO: Refresh events
              }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>
                Dine ovelser ({session.events.length})
              </Text>
              {hasMergeableEvents && !selectionMode && (
                <TouchableOpacity
                  style={styles.selectModeButton}
                  onPress={toggleSelectionMode}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="check-square-o" size={16} color={colors.primary} />
                  <Text style={styles.selectModeButtonText}>Velg</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  competitionInfo: {
    flex: 1,
  },
  competitionName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  accessCodeName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  viewCompetitionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  cancelButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  mergeSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  mergeSelectedButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  mergeSelectedButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  listContent: {
    padding: spacing[5],
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  selectModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  selectModeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  groupContainer: {
    marginBottom: spacing[4],
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  groupTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  groupBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  groupBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },
  mergeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  mergeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  eventCardInGroup: {
    marginBottom: 0,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  eventCardSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  eventIconSmall: {
    width: 36,
    height: 36,
  },
  eventContent: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  eventNameSmall: {
    fontSize: typography.fontSize.sm,
  },
  eventStatus: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[10],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing[4],
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[2],
    lineHeight: 20,
  },
});
