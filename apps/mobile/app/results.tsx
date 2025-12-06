import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';

type Competition = {
  id: string;
  name: string;
  date: string;
  venue: string;
  status: string;
};

export default function ResultsScreen() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('id, name, date, venue, status')
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCompetitions(data || []);
    } catch (error) {
      console.error('Error fetching competitions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchCompetitions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981'; // Green - competition is active
      case 'completed':
        return '#6b7280'; // Gray
      case 'draft':
        return '#f59e0b'; // Orange
      default:
        return '#9ca3af';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktivt';
      case 'completed':
        return 'Ferdig';
      case 'draft':
        return 'Utkast';
      default:
        return status;
    }
  };

  const handleCompetitionPress = (competition: Competition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/competition/${competition.id}`);
  };

  const renderCompetition = ({ item }: { item: Competition }) => (
    <TouchableOpacity
      style={styles.competitionCard}
      onPress={() => handleCompetitionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.competitionHeader}>
        <Text style={styles.competitionName}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      <View style={styles.competitionDetails}>
        <View style={styles.detailRow}>
          <FontAwesome name="calendar" size={14} color="#6b7280" />
          <Text style={styles.detailText}>{formatDate(item.date)}</Text>
        </View>
        {item.venue && (
          <View style={styles.detailRow}>
            <FontAwesome name="map-marker" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{item.venue}</Text>
          </View>
        )}
      </View>
      <FontAwesome name="chevron-right" size={16} color="#9ca3af" style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Resultater',
          headerBackTitle: 'Meny',
        }}
      />
      <SafeAreaView style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingText}>Laster stevner...</Text>
          </View>
        ) : competitions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="trophy" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Ingen stevner</Text>
            <Text style={styles.emptyText}>
              Det finnes ingen stevner a vise enna.
            </Text>
          </View>
        ) : (
          <FlatList
            data={competitions}
            renderItem={renderCompetition}
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
                Stevner ({competitions.length})
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
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
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
  competitionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  competitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  competitionName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  competitionDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
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
