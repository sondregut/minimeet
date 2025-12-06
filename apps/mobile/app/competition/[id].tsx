import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
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

type Competition = {
  id: string;
  name: string;
  date: string;
  venue: string;
  status: string;
};

type FilterType = 'all' | 'in_progress' | 'completed' | 'scheduled';

export default function CompetitionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const fetchCompetitionData = async () => {
    if (!id) return;

    try {
      // Fetch competition details
      const { data: compData, error: compError } = await supabase
        .from('competitions')
        .select('id, name, date, venue, status')
        .eq('id', id)
        .single();

      if (compError) throw compError;
      setCompetition(compData);

      // Fetch events for this competition
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, event_type, status, age_group, gender')
        .eq('competition_id', id)
        .order('name');

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching competition:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompetitionData();
  }, [id]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchCompetitionData();
  };

  // Filter and search events
  const filteredEvents = useMemo(() => {
    let result = events;

    // Apply status filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'scheduled') {
        // Include both scheduled and checkin status
        result = result.filter(event => event.status === 'scheduled' || event.status === 'checkin');
      } else {
        result = result.filter(event => event.status === activeFilter);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(event =>
        event.name.toLowerCase().includes(query) ||
        (event.age_group && event.age_group.toLowerCase().includes(query))
      );
    }

    return result;
  }, [events, activeFilter, searchQuery]);

  // Get filter counts
  const filterCounts = useMemo(() => ({
    all: events.length,
    in_progress: events.filter(e => e.status === 'in_progress').length,
    completed: events.filter(e => e.status === 'completed').length,
    scheduled: events.filter(e => e.status === 'scheduled' || e.status === 'checkin').length,
  }), [events]);

  const handleFilterChange = (filter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getEventTypeIcon = (eventType: string): React.ComponentProps<typeof FontAwesome>['name'] => {
    switch (eventType) {
      case 'track':
        return 'road';
      case 'field_horizontal':
        return 'arrows-h';
      case 'field_vertical':
        return 'arrows-v';
      case 'throw':
        return 'bullseye';
      default:
        return 'flag';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'track':
        return '#3b82f6';
      case 'field_horizontal':
        return '#10b981';
      case 'field_vertical':
        return '#f59e0b';
      case 'throw':
        return '#8b5cf6';
      default:
        return '#6b7280';
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

  const handleEventPress = (event: Event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  };

  const renderEvent = ({ item }: { item: Event }) => {
    const ageGroupDisplay = [item.age_group, formatGender(item.gender)]
      .filter(Boolean)
      .join(' - ');

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.eventIcon, { backgroundColor: getEventTypeColor(item.event_type) + '20' }]}>
          <FontAwesome
            name={getEventTypeIcon(item.event_type)}
            size={18}
            color={getEventTypeColor(item.event_type)}
          />
        </View>
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          </View>
          {ageGroupDisplay ? (
            <Text style={styles.ageGroup}>{ageGroupDisplay}</Text>
          ) : null}
          <Text style={styles.eventType}>
            {item.event_type === 'track' ? 'Løp' :
             item.event_type === 'field_horizontal' ? 'Hopp' :
             item.event_type === 'field_vertical' ? 'Høyde/Stav' :
             item.event_type === 'throw' ? 'Kast' : item.event_type}
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color="#9ca3af" />
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

  if (!competition) {
    return (
      <>
        <Stack.Screen options={{ title: 'Feil' }} />
        <View style={styles.emptyContainer}>
          <FontAwesome name="exclamation-circle" size={48} color="#ef4444" />
          <Text style={styles.emptyTitle}>Stevne ikke funnet</Text>
        </View>
      </>
    );
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Alle' },
    { key: 'in_progress', label: 'Pågår' },
    { key: 'scheduled', label: 'Planlagt' },
    { key: 'completed', label: 'Ferdig' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: competition.name,
          headerBackTitle: 'Tilbake',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Competition Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <FontAwesome name="calendar" size={16} color="#6b7280" />
            <Text style={styles.headerText}>{formatDate(competition.date)}</Text>
          </View>
          {competition.venue && (
            <View style={styles.headerRow}>
              <FontAwesome name="map-marker" size={16} color="#6b7280" />
              <Text style={styles.headerText}>{competition.venue}</Text>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <FontAwesome name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Sok etter ovelse eller aldersgruppe..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome name="times-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterTab,
                  activeFilter === filter.key && styles.filterTabActive,
                ]}
                onPress={() => handleFilterChange(filter.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeFilter === filter.key && styles.filterTabTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
                <View
                  style={[
                    styles.filterCount,
                    activeFilter === filter.key && styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      activeFilter === filter.key && styles.filterCountTextActive,
                    ]}
                  >
                    {filterCounts[filter.key]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Events List */}
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="list" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Ingen ovelser</Text>
            <Text style={styles.emptyText}>
              Det er ingen ovelser registrert for dette stevnet enna.
            </Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="search" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Ingen treff</Text>
            <Text style={styles.emptyText}>
              Ingen ovelser matcher soket ditt. Prov a endre filter eller sok.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredEvents}
            renderItem={renderEvent}
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
                Ovelser ({filteredEvents.length}{filteredEvents.length !== events.length ? ` av ${events.length}` : ''})
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
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    fontSize: 15,
    color: '#374151',
  },
  listContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ageGroup: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '500',
    marginTop: 2,
  },
  eventType: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#f59e0b',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterCount: {
    marginLeft: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterCountTextActive: {
    color: '#fff',
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
});
