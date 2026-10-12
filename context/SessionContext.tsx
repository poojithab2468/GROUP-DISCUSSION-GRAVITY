import { useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { PracticeSession, PracticeEntry, SessionReportMetrics } from '@/types/session';
import { useAuth } from './AuthContext';

const BASE_STORAGE_KEY = 'gd_practice_sessions';

export const [SessionProvider, useSessions] = createContextHook(() => {
  const { user, isLoggedIn } = useAuth();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const queryClient = useQueryClient();

  // Dynamic storage key based on user email
  const storageKey = useMemo(() => {
    return user?.email ? `${BASE_STORAGE_KEY}_${user.email}` : BASE_STORAGE_KEY;
  }, [user?.email]);

  const sessionsQuery = useQuery({
    queryKey: ['sessions', user?.email],
    enabled: isLoggedIn === true,
    queryFn: async () => {
      console.log(`[SessionContext] Loading sessions for ${user?.email} using key ${storageKey}`);
      const stored = await AsyncStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as PracticeSession[]) : [];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (updated: PracticeSession[]) => {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.email] });
    },
  });

  // Reset or load sessions when the user or query data changes
  useEffect(() => {
    if (!isLoggedIn) {
      console.log('[SessionContext] User logged out or auth pending, clearing local sessions');
      setSessions([]);
    } else if (sessionsQuery.data) {
      console.log(`[SessionContext] Updating local sessions with ${sessionsQuery.data.length} items`);
      setSessions(sessionsQuery.data);
    }
  }, [sessionsQuery.data, isLoggedIn]);

  const addSession = useCallback((session: PracticeSession) => {
    setSessions((prev) => {
      const updated = [session, ...prev];
      syncMutation.mutate(updated);
      return updated;
    });
  }, [syncMutation]);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      syncMutation.mutate(updated);
      return updated;
    });
  }, [syncMutation]);

  const addEntry = useCallback((sessionId: string, entry: PracticeEntry) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              entries: [entry, ...s.entries],
              lastPracticedAt: new Date().toISOString(),
            }
          : s
      );
      syncMutation.mutate(updated);
      return updated;
    });
  }, [syncMutation]);

  const updateEntryAnalysis = useCallback((sessionId: string, entryId: string, analysis: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              entries: s.entries.map((e) =>
                e.id === entryId ? { ...e, analysis } : e
              ),
            }
          : s
      );
      syncMutation.mutate(updated);
      return updated;
    });
  }, [syncMutation]);

  const deleteEntry = useCallback((sessionId: string, entryId: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId
          ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) }
          : s
      );
      syncMutation.mutate(updated);
      return updated;
    });
  }, [syncMutation]);

  const getSession = useCallback(
    (id: string) => sessions.find((s) => s.id === id) ?? null,
    [sessions]
  );

  const clearAllSessions = useCallback(() => {
    setSessions([]);
    syncMutation.mutate([]);
  }, [syncMutation]);

  const saveFinalReport = useCallback(
    (sessionId: string, finalReport: string, metrics?: SessionReportMetrics | null) => {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                finalReport,
                status: 'completed' as const,
                reportGeneratedAt: new Date().toISOString(),
                reportMetrics: metrics !== undefined ? metrics : s.reportMetrics,
              }
            : s
        );
        syncMutation.mutate(updated);
        return updated;
      });
    },
    [syncMutation]
  );

  return {
    sessions,
    isLoading: sessionsQuery.isLoading,
    addSession,
    deleteSession,
    addEntry,
    updateEntryAnalysis,
    deleteEntry,
    saveFinalReport,
    getSession,
    clearAllSessions,
  };
});
