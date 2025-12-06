import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

type MenuCardProps = {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  onPress: () => void;
  comingSoon?: boolean;
};

function MenuCard({ title, description, icon, color, onPress, comingSoon }: MenuCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.card, comingSoon && styles.cardDisabled]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={comingSoon}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <FontAwesome name={icon} size={28} color="#fff" />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          {comingSoon && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Kommer</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>EasyMeet</Text>
          <Text style={styles.tagline}>Friidrettsstevner - enkelt og greit</Text>
        </View>

        {/* Menu Cards */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Hva vil du gjore?</Text>

          <MenuCard
            title="Funksjonaer"
            description="Logg inn som funksjonaer og registrer resultater"
            icon="clipboard"
            color="#10b981"
            onPress={() => router.push('/(official)/login')}
          />

          <MenuCard
            title="Se resultater"
            description="Se live-resultater fra stevner"
            icon="trophy"
            color="#f59e0b"
            onPress={() => router.push('/results')}
          />

          <MenuCard
            title="Utover"
            description="Meld deg pa stevner og folg dine resultater"
            icon="user"
            color="#3b82f6"
            onPress={() => {}}
            comingSoon
          />

          <MenuCard
            title="Arrangorer"
            description="Administrer stevner og ovelser"
            icon="cog"
            color="#8b5cf6"
            onPress={() => {}}
            comingSoon
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Versjon 0.1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logo: {
    fontSize: 42,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  menuSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  comingSoonBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af',
  },
});
