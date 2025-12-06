import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';

// Session token key in SecureStore
const SESSION_TOKEN_KEY = 'official_session_token';

export interface EventInfo {
  id: string;
  name: string;
  age_group?: string;
  gender?: string;
  event_type?: string;
  scheduled_time?: string;
}

export interface OfficialSession {
  id: string;
  competitionId: string;
  competitionName: string;
  accessCodeName: string;
  events: EventInfo[];
  expiresAt: string;
}

interface AuthContextType {
  session: OfficialSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OfficialSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const sessionData = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData) as OfficialSession;
        // Check if session is expired
        if (new Date(parsed.expiresAt) > new Date()) {
          setSession(parsed);
        } else {
          // Session expired, clear it
          await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (accessCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Call the database function to validate access code
      const { data, error } = await supabase.rpc('validate_official_access_code', {
        p_access_code: accessCode.toUpperCase(),
      });

      if (error) {
        return { success: false, error: 'Ugyldig tilgangskode' };
      }

      if (!data || !data.valid) {
        return { success: false, error: data?.error || 'Tilgangskoden er ugyldig eller utløpt' };
      }

      // Create session object
      const sessionData: OfficialSession = {
        id: data.session_id,
        competitionId: data.competition_id,
        competitionName: data.competition_name,
        accessCodeName: data.access_code_name,
        events: data.events || [],
        expiresAt: data.expires_at,
      };

      // Store in SecureStore
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, JSON.stringify(sessionData));
      setSession(sessionData);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'En feil oppstod under innlogging' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Clear session from Supabase if needed
      if (session?.id) {
        await supabase
          .from('official_sessions')
          .update({ is_active: false })
          .eq('id', session.id);
      }

      // Clear local storage
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local session anyway
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      setSession(null);
    }
  }, [session?.id]);

  const refreshSession = useCallback(async () => {
    if (!session?.id) return;

    try {
      const { data, error } = await supabase
        .from('official_sessions')
        .select(`
          id,
          expires_at,
          is_active,
          event_access_codes (
            id,
            name,
            competition_id,
            competitions (
              id,
              name
            )
          )
        `)
        .eq('id', session.id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // Session invalid, clear it
        await logout();
        return;
      }

      // Update session expiry
      setSession(prev => prev ? { ...prev, expiresAt: data.expires_at } : null);
    } catch (error) {
      console.error('Refresh session error:', error);
    }
  }, [session?.id, logout]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isAuthenticated: !!session,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
