import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types for athletes and entries
type RollCallStatus = 'present' | 'absent' | null;

type Athlete = {
  id: string;
  entry_id: string;
  field_result_id?: string;
  bib_number: string;
  first_name: string;
  last_name: string;
  club?: string;
  event_id: string;
  event_name?: string;
  age_group?: string;
  gender?: string;
  rollCallStatus: RollCallStatus;
  attempts: AttemptResult[];
  bestResult?: number;
};

type AttemptResult = {
  id?: string;
  attempt_number: number;
  result: number | null;
  is_foul: boolean;
  is_pass: boolean;
};

// View tabs
const VIEWS = ['Startliste', 'Registrering', 'Resultater'];

export default function RecordScreen() {
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventIds: string;
    eventNames: string;
    merged?: string;
  }>();

  // Main state
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState(0);
  const [resultInput, setResultInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  // Finale mode state
  const [isFinalsMode, setIsFinalsMode] = useState(false);
  const [showFinalsPrompt, setShowFinalsPrompt] = useState(false);
  const [finalistIds, setFinalistIds] = useState<string[]>([]); // IDs of top 8 athletes

  // Add participant modal state
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    club: '',
    gender: 'M' as 'M' | 'W' | 'X',
  });

  // View navigation state
  const [currentViewIndex, setCurrentViewIndex] = useState(1); // Start on Registration view
  const scrollViewRef = useRef<ScrollView>(null);

  const isMerged = params.merged === 'true';
  const eventIds = params.eventIds?.split(',') || [];
  const eventName = params.eventNames || 'Øvelse';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/(official)/login');
    }
  }, [isAuthenticated, authLoading]);

  // Load athletes for the event(s) - using useFocusEffect to reload when returning to screen
  useFocusEffect(
    useCallback(() => {
      const currentEventIds = params.eventIds?.split(',') || [];
      console.log('[RecordScreen] Screen focused');
      console.log('[RecordScreen] params.eventIds:', params.eventIds);
      console.log('[RecordScreen] currentEventIds:', currentEventIds);
      console.log('[RecordScreen] session:', session ? 'exists' : 'null');

      if (session && currentEventIds.length > 0) {
        console.log('[RecordScreen] Loading athletes...');
        loadAthletes();
      } else {
        console.log('[RecordScreen] Skipping load - session:', !!session, 'eventIds count:', currentEventIds.length);
      }
    }, [session, params.eventIds])
  );

  // Scroll to initial view (Registration) when component mounts
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
      }, 100);
    }
  }, [loading]);

  const loadAthletes = async () => {
    setLoading(true);
    console.log('[loadAthletes] Starting load for eventIds:', eventIds);
    try {
      // Fetch entries (athletes) for the event(s) with existing results
      const { data, error } = await supabase
        .from('entries')
        .select(`
          id,
          bib_number,
          status,
          athletes (
            id,
            first_name,
            last_name,
            club_name
          ),
          events (
            id,
            name,
            age_group,
            gender
          ),
          field_results (
            id,
            best_mark,
            attempts_taken,
            status,
            field_attempts (
              id,
              attempt_number,
              distance,
              is_foul,
              is_pass
            )
          )
        `)
        .in('event_id', eventIds)
        .order('bib_number');

      if (error) {
        console.error('[loadAthletes] Error loading athletes:', error);
        Alert.alert('Feil', 'Kunne ikke laste utøvere');
        return;
      }

      console.log('[loadAthletes] Query returned', data?.length || 0, 'entries');

      // Log field_results info
      const entriesWithResults = (data || []).filter((e: any) => e.field_results?.length > 0);
      console.log('[loadAthletes] Entries with field_results:', entriesWithResults.length);
      if (entriesWithResults.length > 0) {
        const sample = entriesWithResults[0];
        console.log('[loadAthletes] Sample entry field_results:', JSON.stringify(sample.field_results));
      }

      // Transform the data including existing results
      const transformedAthletes: Athlete[] = (data || []).map((entry: any) => {
        const fieldResult = entry.field_results?.[0];
        const existingAttempts: AttemptResult[] = (fieldResult?.field_attempts || [])
          .sort((a: any, b: any) => a.attempt_number - b.attempt_number)
          .map((att: any) => ({
            id: att.id,
            attempt_number: att.attempt_number,
            // Convert centimeters (database) to meters (display)
            result: att.distance ? parseFloat(att.distance) / 100 : null,
            is_foul: att.is_foul || false,
            is_pass: att.is_pass || false,
          }));

        const validResults = existingAttempts
          .filter(att => att.result !== null)
          .map(att => att.result as number);
        const bestResult = validResults.length > 0 ? Math.max(...validResults) : undefined;

        // Determine roll call status from entry status
        let rollCallStatus: RollCallStatus = null;
        if (entry.status === 'checked_in') {
          rollCallStatus = 'present';
        } else if (entry.status === 'DNS' || entry.status === 'scratched') {
          rollCallStatus = 'absent';
        }

        return {
          id: entry.athletes?.id || entry.id,
          entry_id: entry.id,
          field_result_id: fieldResult?.id,
          bib_number: entry.bib_number || '-',
          first_name: entry.athletes?.first_name || '',
          last_name: entry.athletes?.last_name || '',
          club: entry.athletes?.club_name,
          event_id: entry.events?.id,
          event_name: entry.events?.name,
          age_group: entry.events?.age_group,
          gender: entry.events?.gender,
          rollCallStatus,
          attempts: existingAttempts,
          bestResult,
        };
      });

      setAthletes(transformedAthletes);

      // Log transformed athletes summary
      const athletesWithAttempts = transformedAthletes.filter(a => a.attempts.length > 0);
      console.log('[loadAthletes] Transformed athletes:', transformedAthletes.length);
      console.log('[loadAthletes] Athletes with attempts:', athletesWithAttempts.length);
      if (athletesWithAttempts.length > 0) {
        console.log('[loadAthletes] Sample athlete attempts:', athletesWithAttempts[0].first_name, athletesWithAttempts[0].attempts.length, 'attempts');
      }

      // Determine current round based on max attempts
      const maxAttempts = Math.max(...transformedAthletes.map(a => a.attempts.length), 0);
      console.log('[loadAthletes] Max attempts found:', maxAttempts);
      if (maxAttempts > 0) {
        setCurrentRound(Math.ceil(maxAttempts));
        console.log('[loadAthletes] Setting currentRound to:', Math.ceil(maxAttempts));
      }
    } catch (error) {
      console.error('Error loading athletes:', error);
      Alert.alert('Feil', 'En feil oppstod ved lasting av utøvere');
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const navigateToView = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentViewIndex(index);
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentViewIndex) {
      setCurrentViewIndex(index);
    }
  };

  // Roll call functions
  const updateRollCallStatus = async (athleteId: string, status: RollCallStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Find the athlete to get their entry_id
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete || !session) return;

    // Update local state immediately for responsiveness
    setAthletes(prev =>
      prev.map(a =>
        a.id === athleteId ? { ...a, rollCallStatus: status } : a
      )
    );

    // Save to database using secure function
    try {
      // Map roll call status to entry status
      let entryStatus: string = 'registered';
      if (status === 'present') {
        entryStatus = 'checked_in';
      } else if (status === 'absent') {
        entryStatus = 'DNS';
      }

      // Use the secure RPC function to update roll call status
      const { data: result, error } = await supabase.rpc('update_roll_call_status', {
        p_session_id: session.id,
        p_entry_id: athlete.entry_id,
        p_status: entryStatus,
      });

      if (error) {
        console.error('Error updating roll call status:', error);
        // Revert local state on error
        setAthletes(prev =>
          prev.map(a =>
            a.id === athleteId ? { ...a, rollCallStatus: athlete.rollCallStatus } : a
          )
        );
      } else if (result && !result.success) {
        console.error('Roll call update failed:', result.error);
        // Revert local state on error
        setAthletes(prev =>
          prev.map(a =>
            a.id === athleteId ? { ...a, rollCallStatus: athlete.rollCallStatus } : a
          )
        );
      }
    } catch (error) {
      console.error('Error updating roll call status:', error);
    }
  };

  // Check if roll call has been completed (at least one athlete marked)
  const isRollCallComplete = athletes.some(a => a.rollCallStatus !== null);

  // Get only present/unchecked athletes for registration queue (exclude DNS)
  // In finals mode, only include finalists in reverse order (8th best throws first)
  const getRegistrationQueue = (): Athlete[] => {
    const activeAthletes = athletes.filter(a => a.rollCallStatus !== 'absent');

    if (!isFinalsMode) {
      return activeAthletes;
    }

    // In finals mode: filter to finalists and sort by current standing (reversed)
    // 8th best throws first, 1st best throws last
    const finalists = activeAthletes
      .filter(a => finalistIds.includes(a.id))
      .sort((a, b) => (a.bestResult || 0) - (b.bestResult || 0)); // ascending = 8th first

    return finalists;
  };

  const presentAthletes = getRegistrationQueue();

  // Registration functions - use presentAthletes for queue navigation
  const currentAthlete = presentAthletes[currentAthleteIndex];
  const previousAthlete = currentAthleteIndex > 0 ? presentAthletes[currentAthleteIndex - 1] : null;
  const nextAthlete = currentAthleteIndex < presentAthletes.length - 1 ? presentAthletes[currentAthleteIndex + 1] : null;
  const nextNextAthlete = currentAthleteIndex < presentAthletes.length - 2 ? presentAthletes[currentAthleteIndex + 2] : null;

  const handleSaveResult = async (type: 'valid' | 'foul' | 'pass') => {
    if (!currentAthlete) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      let distance: number | null = null;
      let is_foul = false;
      let is_pass = false;

      if (type === 'valid' && resultInput) {
        // Support both comma (Norwegian) and period as decimal separator
        const normalizedInput = resultInput.replace(',', '.');
        const distanceInMeters = parseFloat(normalizedInput);
        if (isNaN(distanceInMeters)) {
          Alert.alert('Ugyldig resultat', 'Skriv inn en gyldig avstand (f.eks. 5,45 eller 5.45)');
          setSaving(false);
          return;
        }
        // Convert meters to centimeters for database storage (web app convention)
        distance = Math.round(distanceInMeters * 100);
        console.log(`Saving result for ${currentAthlete.first_name}: ${distanceInMeters}m (${distance}cm)`);
      } else if (type === 'foul') {
        is_foul = true;
        console.log(`Recording foul for ${currentAthlete.first_name}`);
      } else if (type === 'pass') {
        is_pass = true;
        console.log(`Recording pass for ${currentAthlete.first_name}`);
      } else {
        setSaving(false);
        return;
      }

      const attemptNumber = currentAthlete.attempts.length + 1;

      // Log the parameters being sent
      console.log('Saving attempt with params:', {
        session_id: session.id,
        entry_id: currentAthlete.entry_id,
        attempt_number: attemptNumber,
        distance: distance,
        is_foul: is_foul,
        is_pass: is_pass,
      });

      // Call the secure database function to save the attempt
      const { data: result, error: saveError } = await supabase.rpc('save_field_attempt', {
        p_session_id: session.id,
        p_entry_id: currentAthlete.entry_id,
        p_attempt_number: attemptNumber,
        p_distance: distance,
        p_is_foul: is_foul,
        p_is_pass: is_pass,
      });

      if (saveError) {
        console.error('Error saving attempt:', saveError);
        Alert.alert('Feil', `Kunne ikke lagre forsøket: ${saveError.message || JSON.stringify(saveError)}`);
        setSaving(false);
        return;
      }

      console.log('RPC result:', JSON.stringify(result));

      if (!result?.success) {
        console.error('Save attempt failed:', result?.error);
        Alert.alert('Feil', result?.error || 'Kunne ikke lagre forsøket');
        setSaving(false);
        return;
      }

      // Create new attempt object for local state
      // Convert centimeters back to meters for display
      const newAttempt: AttemptResult = {
        id: result.attempt_id,
        attempt_number: attemptNumber,
        result: distance !== null ? distance / 100 : null, // cm to meters
        is_foul,
        is_pass,
      };

      // best_mark from database is in cm, convert to meters
      const newBestMark = result.best_mark !== null ? result.best_mark / 100 : null;
      const fieldResultId = result.field_result_id;

      // Update local state
      setAthletes(prev =>
        prev.map(a => {
          if (a.id === currentAthlete.id) {
            const newAttempts = [...a.attempts, newAttempt];
            return {
              ...a,
              field_result_id: fieldResultId,
              attempts: newAttempts,
              bestResult: newBestMark ?? undefined,
            };
          }
          return a;
        })
      );

      // Clear input and advance to next athlete
      setResultInput('');
      if (currentAthleteIndex < presentAthletes.length - 1) {
        setCurrentAthleteIndex(prev => prev + 1);
      } else {
        // Round is complete
        if (currentRound === 3 && !isFinalsMode) {
          // After round 3, show finals prompt
          setShowFinalsPrompt(true);
        } else if (currentRound >= 6) {
          // Competition complete
          Alert.alert(
            'Konkurranse fullført!',
            'Alle 6 runder er gjennomført.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          // Normal round complete
          Alert.alert(
            'Runde fullført',
            `Alle utøvere har hatt sitt forsøk i runde ${currentRound}.`,
            [
              {
                text: 'Start ny runde',
                onPress: () => {
                  setCurrentAthleteIndex(0);
                  setCurrentRound(prev => prev + 1);
                }
              },
              { text: 'Tilbake', onPress: () => router.back() },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error saving result:', error);
      Alert.alert('Feil', 'Kunne ikke lagre resultatet');
    } finally {
      setSaving(false);
    }
  };

  const goToPreviousAthlete = () => {
    if (currentAthleteIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentAthleteIndex(prev => prev - 1);
    }
  };

  const goToNextAthlete = () => {
    if (currentAthleteIndex < presentAthletes.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentAthleteIndex(prev => prev + 1);
    }
  };

  // Finals mode functions
  const startFinalsMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Get active athletes and sort by best result (descending)
    const activeAthletes = athletes.filter(a => a.rollCallStatus !== 'absent');
    const sortedByResult = [...activeAthletes].sort(
      (a, b) => (b.bestResult || 0) - (a.bestResult || 0)
    );

    // Take top 8 (or all if less than 8)
    const top8 = sortedByResult.slice(0, 8);
    const top8Ids = top8.map(a => a.id);

    setFinalistIds(top8Ids);
    setIsFinalsMode(true);
    setShowFinalsPrompt(false);
    setCurrentAthleteIndex(0);
    setCurrentRound(4); // Start round 4
  };

  const continueAllAthletes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowFinalsPrompt(false);
    setCurrentAthleteIndex(0);
    setCurrentRound(4); // Start round 4 with all athletes
  };

  // Get non-finalist athletes (for display in results)
  const getNonFinalists = (): Athlete[] => {
    if (!isFinalsMode) return [];
    return athletes
      .filter(a => a.rollCallStatus !== 'absent' && !finalistIds.includes(a.id))
      .sort((a, b) => (b.bestResult || 0) - (a.bestResult || 0));
  };

  // Add participant functions
  const openAddParticipantModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Pre-fill gender from event if available (from first athlete)
    const eventGender = athletes[0]?.gender as 'M' | 'W' | 'X' || 'M';
    setNewParticipant({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      club: '',
      gender: eventGender,
    });
    setShowAddParticipant(true);
  };

  const closeAddParticipantModal = () => {
    setShowAddParticipant(false);
    setNewParticipant({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      club: '',
      gender: 'M',
    });
  };

  const handleAddParticipant = async () => {
    if (!session || eventIds.length === 0) return;

    // Validate required fields
    if (!newParticipant.firstName.trim() || !newParticipant.lastName.trim()) {
      Alert.alert('Mangler informasjon', 'Fornavn og etternavn er påkrevd');
      return;
    }

    if (!newParticipant.dateOfBirth.trim()) {
      Alert.alert('Mangler informasjon', 'Fødselsdato er påkrevd');
      return;
    }

    if (!newParticipant.club.trim()) {
      Alert.alert('Mangler informasjon', 'Klubb er påkrevd');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddingParticipant(true);

    try {
      // Parse date of birth (format: DD.MM.YYYY or YYYY-MM-DD)
      let dateOfBirth: string | null = null;
      const dateStr = newParticipant.dateOfBirth.trim();
      // Try DD.MM.YYYY format (Norwegian)
      const norMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (norMatch) {
        dateOfBirth = `${norMatch[3]}-${norMatch[2].padStart(2, '0')}-${norMatch[1].padStart(2, '0')}`;
      } else {
        // Try YYYY-MM-DD format
        const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          dateOfBirth = dateStr;
        }
      }

      if (!dateOfBirth) {
        Alert.alert('Ugyldig format', 'Fødselsdato må være på format DD.MM.ÅÅÅÅ');
        setAddingParticipant(false);
        return;
      }

      // Add to the first event (most common use case)
      const eventId = eventIds[0];

      const { data: result, error } = await supabase.rpc('add_participant_to_event', {
        p_session_id: session.id,
        p_event_id: eventId,
        p_first_name: newParticipant.firstName.trim(),
        p_last_name: newParticipant.lastName.trim(),
        p_gender: newParticipant.gender,
        p_date_of_birth: dateOfBirth,
        p_club_name: newParticipant.club.trim() || null,
      });

      if (error) {
        console.error('Error adding participant:', error);
        Alert.alert('Feil', `Kunne ikke legge til deltager: ${error.message}`);
        return;
      }

      if (!result?.success) {
        console.error('Add participant failed:', result?.error);
        Alert.alert('Feil', result?.error || 'Kunne ikke legge til deltager');
        return;
      }

      // Add the new athlete to local state
      const newAthlete: Athlete = {
        id: result.athlete_id,
        entry_id: result.entry_id,
        bib_number: result.bib_number || '-',
        first_name: result.first_name,
        last_name: result.last_name,
        club: newParticipant.club.trim() || undefined,
        event_id: eventId,
        gender: newParticipant.gender,
        rollCallStatus: null,
        attempts: [],
      };

      setAthletes(prev => [...prev, newAthlete]);

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Deltager lagt til',
        `${result.first_name} ${result.last_name} er lagt til med startnummer ${result.bib_number}`,
        [{ text: 'OK' }]
      );

      closeAddParticipantModal();
    } catch (error) {
      console.error('Error adding participant:', error);
      Alert.alert('Feil', 'En feil oppstod ved tillegging av deltager');
    } finally {
      setAddingParticipant(false);
    }
  };

  // ============================================================================
  // RENDER COMPONENTS
  // ============================================================================

  // Roll Call Row with tap buttons (green check, red X)
  const RollCallRow = ({ athlete }: { athlete: Athlete }) => {
    const isPresent = athlete.rollCallStatus === 'present';
    const isAbsent = athlete.rollCallStatus === 'absent';

    return (
      <View style={[styles.rollCallRow, isAbsent && styles.rollCallRowDNS]}>
        <View style={[styles.bibContainer, isAbsent && styles.bibContainerDNS]}>
          <Text style={[styles.bibNumber, isAbsent && styles.bibNumberDNS]}>
            {athlete.bib_number}
          </Text>
        </View>
        <View style={styles.nameContainer}>
          <View style={styles.nameRow}>
            <Text style={[styles.athleteName, isAbsent && styles.athleteNameDNS]}>
              {athlete.first_name} {athlete.last_name}
            </Text>
            {isAbsent && (
              <View style={styles.dnsBadge}>
                <Text style={styles.dnsBadgeText}>DNS</Text>
              </View>
            )}
          </View>
          <Text style={[styles.athleteClub, isAbsent && styles.athleteClubDNS]}>
            {athlete.club || 'Ingen klubb'}
            {isMerged && athlete.age_group && ` • ${athlete.age_group}`}
          </Text>
        </View>
        <View style={styles.rollCallButtons}>
          {/* Green checkmark - Present */}
          <TouchableOpacity
            style={[
              styles.rollCallButton,
              styles.rollCallButtonPresent,
              isPresent && styles.rollCallButtonActive,
            ]}
            onPress={() => updateRollCallStatus(athlete.id, isPresent ? null : 'present')}
            activeOpacity={0.7}
          >
            <FontAwesome
              name="check"
              size={18}
              color={isPresent ? colors.white : colors.success}
            />
          </TouchableOpacity>

          {/* Red X - Absent/DNS */}
          <TouchableOpacity
            style={[
              styles.rollCallButton,
              styles.rollCallButtonAbsent,
              isAbsent && styles.rollCallButtonAbsentActive,
            ]}
            onPress={() => updateRollCallStatus(athlete.id, isAbsent ? null : 'absent')}
            activeOpacity={0.7}
          >
            <FontAwesome
              name="times"
              size={18}
              color={isAbsent ? colors.white : colors.error}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Athlete Card for registration queue
  const renderAthleteCard = (athlete: Athlete | null, size: 'small' | 'current' | 'medium') => {
    if (!athlete) return null;

    const isSmall = size === 'small';
    const isCurrent = size === 'current';
    const isMedium = size === 'medium';

    return (
      <TouchableOpacity
        style={[
          styles.athleteCard,
          isSmall && styles.athleteCardSmall,
          isCurrent && styles.athleteCardCurrent,
        ]}
        onPress={isSmall ? goToPreviousAthlete : undefined}
        activeOpacity={isSmall ? 0.7 : 1}
      >
        <View style={styles.athleteInfo}>
          <View style={[styles.bibContainer, isSmall && styles.bibContainerSmall]}>
            <Text style={[styles.bibNumber, isSmall && styles.bibNumberSmall]}>
              {athlete.bib_number}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <View style={styles.nameAndBestRow}>
              <Text style={[styles.athleteName, isSmall && styles.athleteNameSmall]} numberOfLines={1}>
                {athlete.first_name} {athlete.last_name}
              </Text>
              {/* Show best result next to name */}
              {athlete.bestResult !== undefined && (
                <View style={[styles.bestResultBadge, isSmall && styles.bestResultBadgeSmall]}>
                  <Text style={[styles.bestResultText, isSmall && styles.bestResultTextSmall]}>
                    {athlete.bestResult.toFixed(2)} m
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.athleteClub, isSmall && styles.athleteClubSmall]}>
              {athlete.club || 'Ingen klubb'}
              {isMerged && athlete.age_group && ` • ${athlete.age_group}`}
            </Text>
            {/* Show attempts for all athletes with results */}
            {athlete.attempts.length > 0 && (
              <View style={[styles.attemptsRow, isSmall && styles.attemptsRowSmall]}>
                {athlete.attempts.map((att, idx) => (
                  <View key={idx} style={[
                    styles.attemptBadge,
                    isSmall && styles.attemptBadgeSmall,
                    (isMedium || isSmall) && styles.attemptBadgeCompact,
                    att.is_foul && styles.attemptFoul,
                    att.is_pass && styles.attemptPass,
                    att.result !== null && styles.attemptValid,
                  ]}>
                    <Text style={[
                      styles.attemptText,
                      isSmall && styles.attemptTextSmall,
                      (att.is_foul || att.result !== null) && styles.attemptTextLight,
                    ]}>
                      {att.is_foul ? 'X' : att.is_pass ? '-' : att.result?.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        {isCurrent && isMerged && athlete.age_group && (
          <View style={styles.ageGroupBadge}>
            <Text style={styles.ageGroupBadgeText}>{athlete.age_group}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Result row for live results view
  const renderResultRow = ({ item, index }: { item: Athlete; index: number }) => {
    const rank = index + 1;

    return (
      <View style={styles.resultRow}>
        <View style={styles.rankContainer}>
          <Text style={[
            styles.rankText,
            rank === 1 && styles.rankGold,
            rank === 2 && styles.rankSilver,
            rank === 3 && styles.rankBronze,
          ]}>
            {rank}
          </Text>
        </View>
        <View style={styles.resultNameContainer}>
          <Text style={styles.resultName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.resultClub}>
            {item.club || 'Ingen klubb'}
            {isMerged && item.age_group && ` • ${item.age_group}`}
          </Text>
        </View>
        <View style={styles.resultValueContainer}>
          {item.bestResult !== undefined ? (
            <Text style={styles.resultValue}>{item.bestResult.toFixed(2)} m</Text>
          ) : (
            <Text style={styles.resultPending}>-</Text>
          )}
        </View>
      </View>
    );
  };

  // Finals Prompt Modal Component
  const renderFinalsPromptModal = () => {
    // Get top 8 for display
    const activeAthletes = athletes.filter(a => a.rollCallStatus !== 'absent');
    const sortedByResult = [...activeAthletes].sort(
      (a, b) => (b.bestResult || 0) - (a.bestResult || 0)
    );
    const top8Preview = sortedByResult.slice(0, 8);
    const excluded = sortedByResult.slice(8);

    return (
      <Modal
        visible={showFinalsPrompt}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFinalsPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.finalsModalContent}>
            <View style={styles.finalsModalHeader}>
              <FontAwesome name="trophy" size={32} color={colors.gold} />
              <Text style={styles.finalsModalTitle}>Runde 3 fullført!</Text>
              <Text style={styles.finalsModalSubtitle}>
                Velg format for resterende forsøk
              </Text>
            </View>

            {/* Option 1: Finals with Top 8 */}
            <TouchableOpacity
              style={styles.finalsOptionButton}
              onPress={startFinalsMode}
              activeOpacity={0.7}
            >
              <View style={styles.finalsOptionHeader}>
                <FontAwesome name="star" size={24} color={colors.gold} />
                <Text style={styles.finalsOptionTitle}>Finale (beste 8)</Text>
              </View>
              <Text style={styles.finalsOptionDescription}>
                Kun de 8 beste fortsetter. Rekkefølge: 8-7-6-5-4-3-2-1
              </Text>
              <View style={styles.finalsPreviewContainer}>
                <Text style={styles.finalsPreviewLabel}>Finalister:</Text>
                <View style={styles.finalsPreviewList}>
                  {top8Preview.map((athlete, idx) => (
                    <View key={athlete.id} style={styles.finalsPreviewItem}>
                      <Text style={styles.finalsPreviewRank}>{idx + 1}.</Text>
                      <Text style={styles.finalsPreviewName} numberOfLines={1}>
                        {athlete.first_name} {athlete.last_name}
                      </Text>
                      <Text style={styles.finalsPreviewResult}>
                        {athlete.bestResult?.toFixed(2) || '-'} m
                      </Text>
                    </View>
                  ))}
                </View>
                {excluded.length > 0 && (
                  <Text style={styles.finalsExcludedText}>
                    {excluded.length} utøver{excluded.length > 1 ? 'e' : ''} er ferdig etter 3 runder
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Option 2: Continue with all */}
            <TouchableOpacity
              style={[styles.finalsOptionButton, styles.finalsOptionSecondary]}
              onPress={continueAllAthletes}
              activeOpacity={0.7}
            >
              <View style={styles.finalsOptionHeader}>
                <FontAwesome name="users" size={24} color={colors.primary} />
                <Text style={[styles.finalsOptionTitle, styles.finalsOptionTitleSecondary]}>
                  Alle fortsetter
                </Text>
              </View>
              <Text style={[styles.finalsOptionDescription, styles.finalsOptionDescSecondary]}>
                Alle {activeAthletes.length} utøvere får 3 nye forsøk
              </Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.finalsCancelButton}
              onPress={() => setShowFinalsPrompt(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.finalsCancelText}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Add Participant Modal Component
  const renderAddParticipantModal = () => {
    return (
      <Modal
        visible={showAddParticipant}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAddParticipantModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addParticipantModalContent}>
            <View style={styles.addParticipantHeader}>
              <FontAwesome name="user-plus" size={28} color={colors.primary} />
              <Text style={styles.addParticipantTitle}>Legg til deltager</Text>
              <Text style={styles.addParticipantSubtitle}>
                Legges kun til i denne øvelsen
              </Text>
            </View>

            <ScrollView style={styles.addParticipantForm} showsVerticalScrollIndicator={false}>
              {/* First Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Fornavn *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Skriv fornavn"
                  placeholderTextColor={colors.textMuted}
                  value={newParticipant.firstName}
                  onChangeText={(text) => setNewParticipant(prev => ({ ...prev, firstName: text }))}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Last Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Etternavn *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Skriv etternavn"
                  placeholderTextColor={colors.textMuted}
                  value={newParticipant.lastName}
                  onChangeText={(text) => setNewParticipant(prev => ({ ...prev, lastName: text }))}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Date of Birth */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Fødselsdato *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="DD.MM.ÅÅÅÅ"
                  placeholderTextColor={colors.textMuted}
                  value={newParticipant.dateOfBirth}
                  onChangeText={(text) => setNewParticipant(prev => ({ ...prev, dateOfBirth: text }))}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {/* Club */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Klubb *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Klubbnavn"
                  placeholderTextColor={colors.textMuted}
                  value={newParticipant.club}
                  onChangeText={(text) => setNewParticipant(prev => ({ ...prev, club: text }))}
                  autoCapitalize="words"
                />
              </View>

              {/* Gender */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kjønn *</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      newParticipant.gender === 'M' && styles.genderButtonActive,
                    ]}
                    onPress={() => setNewParticipant(prev => ({ ...prev, gender: 'M' }))}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      newParticipant.gender === 'M' && styles.genderButtonTextActive,
                    ]}>Mann</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      newParticipant.gender === 'W' && styles.genderButtonActive,
                    ]}
                    onPress={() => setNewParticipant(prev => ({ ...prev, gender: 'W' }))}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      newParticipant.gender === 'W' && styles.genderButtonTextActive,
                    ]}>Kvinne</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.addParticipantActions}>
              <TouchableOpacity
                style={[styles.addParticipantButton, styles.addParticipantButtonPrimary, addingParticipant && styles.buttonDisabled]}
                onPress={handleAddParticipant}
                disabled={addingParticipant}
                activeOpacity={0.7}
              >
                {addingParticipant ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <FontAwesome name="plus" size={18} color={colors.white} />
                    <Text style={styles.addParticipantButtonText}>Legg til</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addParticipantCancelButton}
                onPress={closeAddParticipantModal}
                activeOpacity={0.7}
              >
                <Text style={styles.addParticipantCancelText}>Avbryt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ============================================================================
  // VIEW RENDERS
  // ============================================================================

  // Mark all athletes as present
  const markAllPresent = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Update all non-absent athletes to present
    const athletesToMark = athletes.filter(a => a.rollCallStatus !== 'present');

    // Update local state immediately
    setAthletes(prev =>
      prev.map(a => ({ ...a, rollCallStatus: a.rollCallStatus === 'absent' ? 'absent' : 'present' }))
    );

    // Save to database for each
    for (const athlete of athletesToMark) {
      if (athlete.rollCallStatus === 'absent') continue; // Skip DNS athletes
      try {
        await supabase
          .from('entries')
          .update({ status: 'checked_in' })
          .eq('id', athlete.entry_id);
      } catch (error) {
        console.error('Error marking athlete present:', error);
      }
    }
  };

  // View 1: Startlist / Roll Call
  const renderStartlistView = () => {
    // Sort: present/null first, then absent (DNS) at bottom
    const sortedAthletes = [...athletes].sort((a, b) => {
      if (a.rollCallStatus === 'absent' && b.rollCallStatus !== 'absent') return 1;
      if (a.rollCallStatus !== 'absent' && b.rollCallStatus === 'absent') return -1;
      return 0;
    });

    const presentCount = athletes.filter(a => a.rollCallStatus === 'present').length;
    const absentCount = athletes.filter(a => a.rollCallStatus === 'absent').length;
    const unmarkedCount = athletes.filter(a => a.rollCallStatus === null).length;
    const inQueueCount = presentAthletes.length;

    return (
      <View style={styles.viewContainer}>
        <View style={styles.viewHeader}>
          <View style={styles.viewHeaderLeft}>
            <Text style={styles.viewTitle}>Startliste / Opprop</Text>
            <View style={styles.rollCallStats}>
              <Text style={styles.viewSubtitle}>
                {presentCount} tilstede
              </Text>
              {absentCount > 0 && (
                <Text style={styles.dnsCount}>
                  {absentCount} DNS
                </Text>
              )}
            </View>
          </View>
          {/* Add Participant Button */}
          <TouchableOpacity
            style={styles.addParticipantFab}
            onPress={openAddParticipantModal}
            activeOpacity={0.7}
          >
            <FontAwesome name="plus" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Mark all present button */}
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={markAllPresent}
          activeOpacity={0.7}
        >
          <FontAwesome name="check-circle" size={18} color={colors.white} />
          <Text style={styles.markAllButtonText}>Merk alle tilstede ({inQueueCount} i køen)</Text>
        </TouchableOpacity>

        <Text style={styles.rollCallHint}>
          Trykk grønn hake for tilstede, rødt kryss for DNS
        </Text>
        <FlatList
          data={sortedAthletes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RollCallRow athlete={item} />}
          contentContainerStyle={styles.startlistContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        />
      </View>
    );
  };

  // View 2: Registration (main workspace)
  const renderRegistrationView = () => {
    // Show prompt if roll call hasn't been done
    if (!isRollCallComplete) {
      return (
        <View style={styles.viewContainer}>
          <View style={styles.rollCallRequiredContainer}>
            <FontAwesome name="list-alt" size={64} color={colors.warning} />
            <Text style={styles.rollCallRequiredTitle}>Opprop ikke fullført</Text>
            <Text style={styles.rollCallRequiredText}>
              Du må foreta opprop før du kan registrere resultater.
              Marker minst én utøver som tilstede eller DNS.
            </Text>
            <TouchableOpacity
              style={styles.goToRollCallButton}
              onPress={() => navigateToView(0)}
              activeOpacity={0.7}
            >
              <FontAwesome name="arrow-left" size={16} color={colors.white} />
              <Text style={styles.goToRollCallButtonText}>Gå til opprop</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.viewContainer}>
        <View style={[styles.roundIndicator, isFinalsMode && styles.roundIndicatorFinals]}>
          <View style={styles.roundInfo}>
            <View style={styles.roundTextRow}>
              <Text style={[styles.roundText, isFinalsMode && styles.roundTextFinals]}>
                {isFinalsMode ? `Finale ${currentRound - 3}` : `Runde ${currentRound}`}
              </Text>
              {isFinalsMode && (
                <View style={styles.finalsBadge}>
                  <FontAwesome name="trophy" size={10} color={colors.white} />
                  <Text style={styles.finalsBadgeText}>Top 8</Text>
                </View>
              )}
            </View>
            <Text style={[styles.queueCountText, isFinalsMode && styles.queueCountTextFinals]}>
              ({presentAthletes.length} utøvere i køen)
            </Text>
          </View>
          <Text style={[styles.progressText, isFinalsMode && styles.progressTextFinals]}>
            {currentAthleteIndex + 1} / {presentAthletes.length}
          </Text>
        </View>

        {/* Athlete Queue */}
        <View style={styles.queueContainer}>
          {/* Previous athlete (small) */}
          {previousAthlete && renderAthleteCard(previousAthlete, 'small')}

          {/* Current athlete (large) */}
          {currentAthlete ? (
            renderAthleteCard(currentAthlete, 'current')
          ) : (
            <View style={styles.noAthletesContainer}>
              <FontAwesome name="users" size={48} color={colors.textMuted} />
              <Text style={styles.noAthletesText}>Ingen utøvere registrert</Text>
            </View>
          )}

          {/* Next athletes (medium) */}
          {nextAthlete && renderAthleteCard(nextAthlete, 'medium')}
          {nextNextAthlete && renderAthleteCard(nextNextAthlete, 'medium')}
        </View>

        {/* Result Input */}
        {currentAthlete && (
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.resultInput}
                placeholder="Resultat"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={resultInput}
                onChangeText={setResultInput}
                editable={!saving}
              />
              <Text style={styles.unitLabel}>m</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {currentAthlete && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.validButton, (!resultInput || saving) && styles.buttonDisabled]}
              onPress={() => handleSaveResult('valid')}
              disabled={saving || !resultInput}
              activeOpacity={0.7}
            >
              <FontAwesome name="check" size={24} color={colors.white} />
              <Text style={styles.actionButtonText}>Godkjent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.foulButton, saving && styles.buttonDisabled]}
              onPress={() => handleSaveResult('foul')}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.foulButtonX}>X</Text>
              <Text style={styles.actionButtonText}>Ugyldig</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.passButton, saving && styles.buttonDisabled]}
              onPress={() => handleSaveResult('pass')}
              disabled={saving}
              activeOpacity={0.7}
            >
              <FontAwesome name="minus" size={24} color={colors.textSecondary} />
              <Text style={[styles.actionButtonText, styles.passButtonText]}>Pass</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // View 3: Live Results
  const renderResultsView = () => {
    // Separate DNS athletes from others
    const dnsAthletes = athletes.filter(a => a.rollCallStatus === 'absent');
    const activeAthletes = athletes.filter(a => a.rollCallStatus !== 'absent');

    // In finals mode, separate finalists from non-finalists
    let sortedAthletes: Athlete[];
    let nonFinalistAthletes: Athlete[] = [];

    if (isFinalsMode) {
      // Finalists: athletes in finalistIds, sorted by best result
      const finalists = activeAthletes
        .filter(a => finalistIds.includes(a.id) && (a.bestResult !== undefined || a.attempts.length > 0))
        .sort((a, b) => (b.bestResult || 0) - (a.bestResult || 0));

      // Non-finalists: athletes NOT in finalistIds, with results from first 3 rounds
      nonFinalistAthletes = activeAthletes
        .filter(a => !finalistIds.includes(a.id) && (a.bestResult !== undefined || a.attempts.length > 0))
        .sort((a, b) => (b.bestResult || 0) - (a.bestResult || 0));

      sortedAthletes = finalists;
    } else {
      // Normal mode: all athletes with results, sorted by best
      sortedAthletes = [...activeAthletes]
        .filter(a => a.bestResult !== undefined || a.attempts.length > 0)
        .sort((a, b) => (b.bestResult || 0) - (a.bestResult || 0));
    }

    // Athletes waiting for results (exclude DNS and non-finalists in finals mode)
    const athletesWithoutResults = activeAthletes.filter(
      a => a.bestResult === undefined && a.attempts.length === 0 && (!isFinalsMode || finalistIds.includes(a.id))
    );

    return (
      <View style={styles.viewContainer}>
        <View style={styles.viewHeader}>
          <Text style={styles.viewTitle}>Live Resultater</Text>
          <View style={styles.rollCallStats}>
            <Text style={styles.viewSubtitle}>
              {sortedAthletes.length} med resultater
            </Text>
            {dnsAthletes.length > 0 && (
              <Text style={styles.dnsCount}>
                {dnsAthletes.length} DNS
              </Text>
            )}
          </View>
        </View>

        {sortedAthletes.length === 0 && dnsAthletes.length === 0 ? (
          <View style={styles.emptyResultsContainer}>
            <FontAwesome name="trophy" size={48} color={colors.textMuted} />
            <Text style={styles.emptyResultsText}>
              Ingen resultater registrert ennå
            </Text>
            <Text style={styles.emptyResultsHint}>
              Gå til Registrering for å legge inn resultater
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedAthletes}
            keyExtractor={(item) => item.id}
            renderItem={renderResultRow}
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            ListFooterComponent={
              <>
                {/* Non-finalists section (only in finals mode) */}
                {isFinalsMode && nonFinalistAthletes.length > 0 && (
                  <View style={styles.nonFinalistsSection}>
                    <Text style={styles.nonFinalistsSectionTitle}>
                      Utenfor finale ({nonFinalistAthletes.length})
                    </Text>
                    <Text style={styles.nonFinalistsSectionSubtitle}>
                      Resultat etter 3 omganger
                    </Text>
                    {nonFinalistAthletes.map((athlete, index) => (
                      <View key={athlete.id} style={styles.nonFinalistRow}>
                        <View style={styles.nonFinalistRankContainer}>
                          <Text style={styles.nonFinalistRank}>{sortedAthletes.length + index + 1}.</Text>
                        </View>
                        <View style={styles.resultNameContainer}>
                          <Text style={styles.nonFinalistName}>
                            {athlete.first_name} {athlete.last_name}
                          </Text>
                          <Text style={styles.nonFinalistClub}>
                            {athlete.club || 'Ingen klubb'}
                            {isMerged && athlete.age_group && ` • ${athlete.age_group}`}
                          </Text>
                        </View>
                        <View style={styles.resultValueContainer}>
                          <Text style={styles.nonFinalistResult}>
                            {athlete.bestResult?.toFixed(2) || '-'} m
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Athletes waiting for results */}
                {athletesWithoutResults.length > 0 && (
                  <View style={styles.pendingSection}>
                    <Text style={styles.pendingSectionTitle}>
                      Venter på resultat ({athletesWithoutResults.length})
                    </Text>
                    {athletesWithoutResults.map(athlete => (
                      <View key={athlete.id} style={styles.pendingRow}>
                        <Text style={styles.pendingName}>
                          {athlete.first_name} {athlete.last_name}
                        </Text>
                        <Text style={styles.pendingClub}>{athlete.club || ''}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* DNS athletes at the bottom */}
                {dnsAthletes.length > 0 && (
                  <View style={styles.dnsSection}>
                    <Text style={styles.dnsSectionTitle}>
                      Ikke møtt - DNS ({dnsAthletes.length})
                    </Text>
                    {dnsAthletes.map(athlete => (
                      <View key={athlete.id} style={styles.dnsResultRow}>
                        <View style={styles.resultNameContainer}>
                          <Text style={[styles.resultName, styles.dnsResultName]}>
                            {athlete.first_name} {athlete.last_name}
                          </Text>
                          <Text style={[styles.resultClub, styles.dnsResultClub]}>
                            {athlete.club || 'Ingen klubb'}
                            {isMerged && athlete.age_group && ` • ${athlete.age_group}`}
                          </Text>
                        </View>
                        <View style={styles.dnsResultBadge}>
                          <Text style={styles.dnsResultBadgeText}>DNS</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            }
          />
        )}
      </View>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Laster utøvere...</Text>
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{eventName}</Text>
            {isMerged && (
              <View style={styles.mergedBadge}>
                <FontAwesome name="compress" size={10} color={colors.white} />
                <Text style={styles.mergedBadgeText}>Sammenslått</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <View style={styles.syncIndicator}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>Live</Text>
            </View>
          </View>
        </View>

        {/* Swipeable Views */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          directionalLockEnabled={true}
          style={styles.scrollView}
        >
          <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            {renderStartlistView()}
          </View>
          <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            {renderRegistrationView()}
          </View>
          <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            {renderResultsView()}
          </View>
        </ScrollView>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          {VIEWS.map((view, index) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.tab,
                currentViewIndex === index && styles.tabActive,
              ]}
              onPress={() => navigateToView(index)}
            >
              <FontAwesome
                name={index === 0 ? 'list' : index === 1 ? 'edit' : 'trophy'}
                size={18}
                color={currentViewIndex === index ? colors.primary : colors.textMuted}
              />
              <Text style={[
                styles.tabText,
                currentViewIndex === index && styles.tabTextActive,
              ]}>
                {view}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Finals Prompt Modal */}
        {renderFinalsPromptModal()}

        {/* Add Participant Modal */}
        {renderAddParticipantModal()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  mergedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 4,
  },
  mergedBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  syncText: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },

  // Swipeable Views
  scrollView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  viewContainer: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  viewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  viewTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  viewSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 0 : spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: 4,
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary,
  },

  // Startlist / Roll Call
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.success,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
  },
  markAllButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  rollCallHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  startlistContent: {
    paddingBottom: spacing[4],
  },
  rollCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  rollCallButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  rollCallButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  rollCallButtonPresent: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  rollCallButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  rollCallButtonAbsent: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  rollCallButtonAbsentActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  rollCallRowDNS: {
    opacity: 0.5,
    backgroundColor: colors.backgroundInput,
  },
  bibContainerDNS: {
    backgroundColor: colors.border,
  },
  bibNumberDNS: {
    color: colors.textMuted,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  athleteNameDNS: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  athleteClubDNS: {
    color: colors.textMuted,
  },
  dnsBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  dnsBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  rollCallStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  dnsCount: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.medium,
  },

  // Roll Call Required (shown when trying to register without roll call)
  rollCallRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  rollCallRequiredTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing[4],
    textAlign: 'center',
  },
  rollCallRequiredText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  goToRollCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  goToRollCallButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },

  // Athlete Cards (Registration)
  roundIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  roundInfo: {
    flexDirection: 'column',
  },
  roundText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  queueCountText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  roundTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  roundIndicatorFinals: {
    backgroundColor: colors.gold,
    marginHorizontal: -spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
    borderRadius: borderRadius.lg,
  },
  roundTextFinals: {
    color: colors.textPrimary,
  },
  queueCountTextFinals: {
    color: 'rgba(0, 0, 0, 0.6)',
  },
  progressTextFinals: {
    color: colors.textPrimary,
  },
  finalsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  finalsBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  queueContainer: {
    flex: 1,
    gap: spacing[2],
  },
  athleteCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  athleteCardSmall: {
    padding: spacing[3],
    opacity: 0.6,
  },
  athleteCardCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.md,
  },
  athleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bibContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  bibContainerSmall: {
    width: 36,
    height: 36,
  },
  bibNumber: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  bibNumberSmall: {
    fontSize: typography.fontSize.base,
  },
  nameContainer: {
    flex: 1,
  },
  nameAndBestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  bestResultBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  bestResultBadgeSmall: {
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  bestResultText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  bestResultTextSmall: {
    fontSize: typography.fontSize.xs,
  },
  athleteName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  athleteNameSmall: {
    fontSize: typography.fontSize.base,
  },
  athleteClub: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  athleteClubSmall: {
    fontSize: typography.fontSize.xs,
  },
  attemptsRow: {
    flexDirection: 'row',
    gap: spacing[1],
    marginTop: spacing[2],
    flexWrap: 'wrap',
  },
  attemptsRowSmall: {
    marginTop: spacing[1],
    gap: 2,
  },
  attemptBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundInput,
  },
  attemptBadgeSmall: {
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  attemptBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attemptValid: {
    backgroundColor: colors.success,
  },
  attemptFoul: {
    backgroundColor: colors.error,
  },
  attemptPass: {
    backgroundColor: colors.backgroundInput,
  },
  attemptText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  attemptTextLight: {
    color: colors.white,
  },
  attemptTextSmall: {
    fontSize: typography.fontSize.xs,
  },
  ageGroupBadge: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  ageGroupBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  noAthletesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  noAthletesText: {
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
    marginTop: spacing[4],
  },

  // Result Input
  inputContainer: {
    paddingVertical: spacing[3],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  resultInput: {
    flex: 1,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    padding: spacing[4],
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
    paddingRight: spacing[4],
  },

  // Action Buttons
  actionContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[1],
    minHeight: 80,
  },
  validButton: {
    backgroundColor: colors.success,
  },
  foulButton: {
    backgroundColor: colors.error,
  },
  foulButtonX: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  passButton: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 2,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  passButtonText: {
    color: colors.textSecondary,
  },

  // Results View
  emptyResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  emptyResultsText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing[4],
  },
  emptyResultsHint: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  resultsContent: {
    paddingBottom: spacing[4],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  rankContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundInput,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  rankText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  rankGold: {
    color: colors.gold,
  },
  rankSilver: {
    color: colors.silver,
  },
  rankBronze: {
    color: colors.bronze,
  },
  resultNameContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  resultClub: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  resultValueContainer: {
    alignItems: 'flex-end',
  },
  resultValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  resultPending: {
    fontSize: typography.fontSize.lg,
    color: colors.textMuted,
  },
  pendingSection: {
    marginTop: spacing[4],
    padding: spacing[3],
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.lg,
  },
  pendingSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  pendingName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  pendingClub: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },

  // DNS section in results view
  dnsSection: {
    marginTop: spacing[4],
    padding: spacing[3],
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  dnsSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing[2],
  },
  dnsResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.2)',
  },
  dnsResultName: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  dnsResultClub: {
    color: colors.textMuted,
  },
  dnsResultBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  dnsResultBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },

  // Finals Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  finalsModalContent: {
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[5],
    maxHeight: '90%',
  },
  finalsModalHeader: {
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  finalsModalTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing[3],
  },
  finalsModalSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  finalsOptionButton: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  finalsOptionSecondary: {
    backgroundColor: colors.backgroundInput,
    borderWidth: 2,
    borderColor: colors.border,
  },
  finalsOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  finalsOptionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  finalsOptionTitleSecondary: {
    color: colors.textPrimary,
  },
  finalsOptionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  finalsOptionDescSecondary: {
    color: colors.textSecondary,
  },
  finalsPreviewContainer: {
    marginTop: spacing[3],
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  finalsPreviewLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  finalsPreviewList: {
    gap: spacing[1],
  },
  finalsPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  finalsPreviewRank: {
    width: 24,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  finalsPreviewName: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  finalsPreviewResult: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  finalsExcludedText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  finalsCancelButton: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    marginTop: spacing[2],
  },
  finalsCancelText: {
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
  },

  // Non-finalists section (athletes outside top 8)
  nonFinalistsSection: {
    marginTop: spacing[6],
    padding: spacing[4],
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nonFinalistsSectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  nonFinalistsSectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing[3],
    fontStyle: 'italic',
  },
  nonFinalistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  nonFinalistRankContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  nonFinalistRank: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
  },
  nonFinalistName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  nonFinalistClub: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  nonFinalistResult: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },

  // View Header Left (for add participant button)
  viewHeaderLeft: {
    flex: 1,
  },

  // Add Participant FAB Button
  addParticipantFab: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },

  // Add Participant Modal Styles
  addParticipantModalContent: {
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[5],
    maxHeight: '85%',
  },
  addParticipantHeader: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  addParticipantTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing[2],
  },
  addParticipantSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  addParticipantForm: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  formLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
  formInput: {
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing[3],
    backgroundColor: colors.backgroundInput,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  genderButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  genderButtonTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  addParticipantActions: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  addParticipantButtonPrimary: {
    backgroundColor: colors.primary,
  },
  addParticipantButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  addParticipantCancelButton: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  addParticipantCancelText: {
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
  },
});
