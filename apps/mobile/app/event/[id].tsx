import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/lib/supabase';

type Event = {
  id: string;
  name: string;
  event_type: string;
  status: string;
  age_group: string | null;
  gender: string | null;
};

type VerticalAttempt = {
  id: string;
  result_id: string;
  height: number;
  attempt_number: number;
  outcome: 'o' | 'x' | '-' | 'r'; // o=clear, x=fail, -=pass, r=retire
};

type EntryWithResult = {
  id: string;
  result_id?: string; // ID in the results table
  bib_number: string | null;
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    club_name: string | null;
  } | null;
  // Field results
  best_mark?: number | null;
  best_mark_wind?: number | null;
  // Track results
  time_ms?: number | null;
  time_display?: string | null;
  wind?: number | null;
  // Vertical results
  best_height?: number | null;
  total_attempts?: number | null;
  total_misses?: number | null;
  // Common
  place?: number | null;
  status?: string | null;
  is_pb?: boolean | null;
  is_sb?: boolean | null;
  // Attempts for expandable view
  attempts?: VerticalAttempt[];
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [entries, setEntries] = useState<EntryWithResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [allHeights, setAllHeights] = useState<number[]>([]);

  const fetchEventData = async () => {
    if (!id) return;

    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, event_type, status, age_group, gender')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch entries with athlete info
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select(`
          id,
          bib_number,
          athlete:athletes(id, first_name, last_name, club_name)
        `)
        .eq('event_id', id)
        .order('bib_number');

      if (entriesError) throw entriesError;

      // Determine which results table to use based on event type
      // Event types: track, field_vertical, field_horizontal, throw
      const resultTable = eventData.event_type === 'track'
        ? 'track_results'
        : eventData.event_type === 'field_vertical'
          ? 'vertical_results'
          : 'field_results';

      // Fetch results from the appropriate table
      const entryIds = (entriesData || []).map(e => e.id);
      let resultsData: any[] = [];

      if (entryIds.length > 0) {
        const { data: results, error: resultsError } = await supabase
          .from(resultTable)
          .select('*')
          .in('entry_id', entryIds);

        if (!resultsError && results) {
          resultsData = results;
        }
      }

      // For vertical events, fetch attempts
      let attemptsData: VerticalAttempt[] = [];
      let uniqueHeights: number[] = [];

      if (eventData.event_type === 'field_vertical' && resultsData.length > 0) {
        const resultIds = resultsData.map(r => r.id);
        const { data: attempts, error: attemptsError } = await supabase
          .from('vertical_attempts')
          .select('*')
          .in('result_id', resultIds)
          .order('height')
          .order('attempt_number');

        if (!attemptsError && attempts) {
          attemptsData = attempts.map(a => ({
            ...a,
            height: parseFloat(a.height),
          }));
          // Extract unique heights, sorted
          uniqueHeights = [...new Set(attemptsData.map(a => a.height))].sort((a, b) => a - b);
        }
      }

      setAllHeights(uniqueHeights);

      // Merge entries with their results and attempts
      const entriesWithResults: EntryWithResult[] = (entriesData || []).map(entry => {
        const result = resultsData.find(r => r.entry_id === entry.id);
        const entryAttempts = result
          ? attemptsData.filter(a => a.result_id === result.id)
          : [];
        return {
          ...entry,
          result_id: result?.id,
          athlete: Array.isArray(entry.athlete) ? entry.athlete[0] : entry.athlete,
          ...(result || {}),
          attempts: entryAttempts,
        };
      });

      // Sort by place if available, otherwise by result
      const sortedEntries = entriesWithResults.sort((a, b) => {
        // First try to sort by place
        if (a.place && b.place) return a.place - b.place;
        if (a.place && !b.place) return -1;
        if (!a.place && b.place) return 1;

        // Fall back to sorting by result
        if (eventData.event_type === 'track') {
          const aTime = a.time_ms ?? Infinity;
          const bTime = b.time_ms ?? Infinity;
          return aTime - bTime;
        } else if (eventData.event_type === 'field_vertical') {
          const aHeight = a.best_height ?? 0;
          const bHeight = b.best_height ?? 0;
          return bHeight - aHeight;
        } else {
          // field_horizontal or throw
          const aMark = a.best_mark ?? 0;
          const bMark = b.best_mark ?? 0;
          return bMark - aMark;
        }
      });

      setEntries(sortedEntries);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchEventData();
  };

  const formatResult = (entry: EntryWithResult, eventType: string | undefined): string => {
    if (eventType === 'track') {
      if (entry.time_display) return entry.time_display;
      if (entry.time_ms) {
        const seconds = entry.time_ms / 1000;
        if (seconds >= 60) {
          const minutes = Math.floor(seconds / 60);
          const secs = (seconds % 60).toFixed(2);
          return `${minutes}:${secs.padStart(5, '0')}`;
        }
        return seconds.toFixed(2);
      }
      return '-';
    } else if (eventType === 'field_vertical') {
      if (entry.best_height) return `${entry.best_height.toFixed(2)} m`;
      return '-';
    } else {
      // field_horizontal or throw
      if (entry.best_mark) return `${entry.best_mark.toFixed(2)} m`;
      return '-';
    }
  };

  const formatGender = (gender: string | null) => {
    if (!gender) return '';
    switch (gender) {
      case 'M':
      case 'male':
        return 'Menn';
      case 'F':
      case 'female':
        return 'Kvinner';
      default:
        return gender;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return '#10b981'; // Green
      case 'completed':
        return '#6b7280'; // Gray
      case 'checkin':
        return '#f59e0b'; // Orange
      case 'scheduled':
        return '#3b82f6'; // Blue
      default:
        return '#9ca3af';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'Pågår';
      case 'completed':
        return 'Ferdig';
      case 'checkin':
        return 'Innsjekk';
      case 'scheduled':
        return 'Planlagt';
      default:
        return status;
    }
  };

  const getMedalColor = (position: number): string | null => {
    switch (position) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return null;
    }
  };

  const handleEntryPress = (entryId: string) => {
    // Only expand for vertical events with attempts
    if (event?.event_type === 'field_vertical') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandedEntryId(expandedEntryId === entryId ? null : entryId);
    }
  };

  // Get the combined outcome for a height (O, X, XX, XXX, -, XO, etc.)
  const getHeightOutcome = (attempts: VerticalAttempt[], height: number): string => {
    const heightAttempts = attempts
      .filter(a => a.height === height)
      .sort((a, b) => a.attempt_number - b.attempt_number);
    return heightAttempts.map(a => {
      switch (a.outcome) {
        case 'o': return 'O';
        case 'x': return 'X';
        case '-': return '-';
        case 'r': return 'r';
        default: return '';
      }
    }).join('');
  };

  // Get color for outcome
  const getOutcomeColor = (outcome: string): string => {
    if (outcome.includes('O')) return '#10b981'; // Green for cleared
    if (outcome === 'XXX') return '#ef4444'; // Red for out
    if (outcome.includes('X')) return '#f59e0b'; // Orange for failed attempts
    if (outcome === '-') return '#6b7280'; // Gray for pass
    return '#374151';
  };

  const renderEntry = ({ item, index }: { item: EntryWithResult; index: number }) => {
    const position = item.place || index + 1;
    const medalColor = getMedalColor(position);
    const athleteName = item.athlete
      ? `${item.athlete.first_name} ${item.athlete.last_name}`
      : 'Ukjent utøver';

    // Get wind value based on event type
    const windValue = event?.event_type === 'track'
      ? item.wind
      : item.best_mark_wind;

    const isExpanded = expandedEntryId === item.id;
    const hasAttempts = item.attempts && item.attempts.length > 0;
    const isVertical = event?.event_type === 'field_vertical';

    return (
      <TouchableOpacity
        style={[styles.entryCard, isExpanded && styles.entryCardExpanded]}
        onPress={() => handleEntryPress(item.id)}
        activeOpacity={isVertical ? 0.7 : 1}
      >
        <View style={styles.entryMainRow}>
          <View style={[
            styles.positionContainer,
            medalColor ? { backgroundColor: medalColor + '30' } : null
          ]}>
            <Text style={[
              styles.positionText,
              medalColor ? { color: medalColor } : null
            ]}>
              {position}
            </Text>
          </View>
          <View style={styles.entryContent}>
            <View style={styles.entryHeader}>
              <Text style={styles.athleteName}>{athleteName}</Text>
              {item.bib_number && (
                <View style={styles.bibBadge}>
                  <Text style={styles.bibText}>{item.bib_number}</Text>
                </View>
              )}
            </View>
            {item.athlete?.club_name && (
              <Text style={styles.clubName}>{item.athlete.club_name}</Text>
            )}
            {/* Show PB/SB badges if applicable */}
            {(item.is_pb || item.is_sb) && (
              <View style={styles.badgesRow}>
                {item.is_pb && (
                  <View style={styles.pbBadge}>
                    <Text style={styles.pbText}>PB</Text>
                  </View>
                )}
                {item.is_sb && (
                  <View style={styles.sbBadge}>
                    <Text style={styles.sbText}>SB</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={styles.resultContainer}>
            <Text style={styles.resultValue}>
              {formatResult(item, event?.event_type)}
            </Text>
            {windValue !== null && windValue !== undefined && (
              <Text style={styles.windText}>
                {windValue > 0 ? '+' : ''}{windValue.toFixed(1)} m/s
              </Text>
            )}
            {isVertical && hasAttempts && (
              <FontAwesome
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color="#9ca3af"
                style={{ marginTop: 4 }}
              />
            )}
          </View>
        </View>

        {/* Expanded attempt grid for vertical events */}
        {isExpanded && hasAttempts && (
          <View style={styles.attemptGridContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.attemptGrid}>
                {/* Header row with heights */}
                <View style={styles.attemptGridRow}>
                  <View style={styles.attemptGridLabel}>
                    <Text style={styles.attemptGridLabelText}>Høyde</Text>
                  </View>
                  {allHeights.map(height => (
                    <View key={height} style={styles.attemptGridCell}>
                      <Text style={styles.attemptGridHeightText}>
                        {height.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Attempts row */}
                <View style={styles.attemptGridRow}>
                  <View style={styles.attemptGridLabel}>
                    <Text style={styles.attemptGridLabelText}>Resultat</Text>
                  </View>
                  {allHeights.map(height => {
                    const outcome = getHeightOutcome(item.attempts || [], height);
                    const color = getOutcomeColor(outcome);
                    return (
                      <View
                        key={height}
                        style={[
                          styles.attemptGridCell,
                          { backgroundColor: color + '15' }
                        ]}
                      >
                        <Text style={[styles.attemptGridOutcomeText, { color }]}>
                          {outcome || '-'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Laster...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Stack.Screen options={{ title: 'Feil' }} />
        <View style={styles.emptyContainer}>
          <FontAwesome name="exclamation-circle" size={48} color="#ef4444" />
          <Text style={styles.emptyTitle}>Ovelse ikke funnet</Text>
        </View>
      </>
    );
  }

  const ageGroupDisplay = [event.age_group, formatGender(event.gender)]
    .filter(Boolean)
    .join(' - ');

  return (
    <>
      <Stack.Screen
        options={{
          title: event.name,
          headerBackTitle: 'Tilbake',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Event Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {ageGroupDisplay && (
              <Text style={styles.ageGroupText}>{ageGroupDisplay}</Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
                {getStatusText(event.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.eventTypeText}>
            {event.event_type === 'track' ? 'Løp' :
             event.event_type === 'field_horizontal' ? 'Hopp' :
             event.event_type === 'field_vertical' ? 'Høyde/Stav' :
             event.event_type === 'throw' ? 'Kast' : event.event_type}
          </Text>
        </View>

        {/* Results List */}
        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="list-ol" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Ingen resultater</Text>
            <Text style={styles.emptyText}>
              Det er ingen resultater registrert for denne ovelsen enna.
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            renderItem={renderEntry}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#f59e0b"
              />
            }
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>
                Resultater ({entries.length} deltakere)
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ageGroupText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f59e0b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventTypeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entryCardExpanded: {
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  entryMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  positionContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  positionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  athleteName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  bibBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bibText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  clubName: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  pbBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pbText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d97706',
  },
  sbBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sbText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  attemptsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  attemptBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  attemptBadgeBest: {
    backgroundColor: '#10b981',
  },
  attemptBadgeFoul: {
    backgroundColor: '#fef2f2',
  },
  attemptText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  attemptTextBest: {
    color: '#fff',
  },
  attemptTextFoul: {
    color: '#ef4444',
  },
  resultContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  windText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  // Attempt grid styles for vertical events
  attemptGridContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attemptGrid: {
    flexDirection: 'column',
  },
  attemptGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attemptGridLabel: {
    width: 60,
    paddingVertical: 6,
    paddingRight: 8,
  },
  attemptGridLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  attemptGridCell: {
    width: 48,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    marginHorizontal: 2,
  },
  attemptGridHeightText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  attemptGridOutcomeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
