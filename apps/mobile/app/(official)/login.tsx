import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../src/contexts/AuthContext';

export default function OfficialLoginScreen() {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Format access code as user types
  // Supports both XXXX-XXXX (9 chars) and XX-XXXX-XXXX (12 chars) formats
  const formatAccessCode = (text: string) => {
    // Remove all non-alphanumeric characters except dashes
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // Auto-add dashes for readability
    const noDashes = cleaned.replace(/-/g, '');

    if (noDashes.length <= 4) {
      return noDashes;
    } else if (noDashes.length <= 8) {
      // Format as XXXX-XXXX (no prefix)
      return `${noDashes.slice(0, 4)}-${noDashes.slice(4)}`;
    } else {
      // Format as XX-XXXX-XXXX (with prefix)
      return `${noDashes.slice(0, 2)}-${noDashes.slice(2, 6)}-${noDashes.slice(6, 10)}`;
    }
  };

  const handleCodeChange = (text: string) => {
    const formatted = formatAccessCode(text);
    setAccessCode(formatted);
  };

  const handleLogin = async () => {
    // Minimum 8 alphanumeric characters (XXXX-XXXX format without dashes)
    const cleanedCode = accessCode.replace(/-/g, '');
    if (cleanedCode.length < 8) {
      Alert.alert('Ugyldig kode', 'Vennligst skriv inn hele tilgangskoden');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await login(accessCode);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(official)/events');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Innlogging mislyktes', result.error || 'Prov igjen');
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Feil', 'En uventet feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <FontAwesome name="chevron-left" size={16} color="#10b981" />
          <Text style={styles.backText}>Tilbake</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <FontAwesome name="clipboard" size={40} color="#10b981" />
            </View>
            <Text style={styles.title}>Funksjonaer</Text>
            <Text style={styles.subtitle}>Logg inn med tilgangskode</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Tilgangskode</Text>
            <TextInput
              style={styles.input}
              value={accessCode}
              onChangeText={handleCodeChange}
              placeholder="XXXX-XXXX"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={14}
              keyboardType="default"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <Text style={styles.hint}>
              Skriv inn koden du har fatt fra stevnearrangoren
            </Text>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Logg inn</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Trenger du hjelp? Kontakt stevnearrangoren.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  backText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    letterSpacing: 2,
    color: '#111827',
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
