import Colors from "@/constants/colors";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SessionProvider } from "@/context/SessionContext";
import { SettingsProvider } from "@/context/SettingsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.light.background },
        headerTintColor: Colors.light.text,
        headerTitleStyle: { color: Colors.light.text, fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: true }} />
      <Stack.Screen
        name="create-session"
        options={{ headerShown: true, presentation: "modal" }}
      />
      <Stack.Screen
        name="practice/[id]"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="modals/about"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="modals/help-center"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="modals/notifications"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
}

function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [appIsReady, setAppIsReady] = useState(false);
  const { isLoggedIn } = useAuth();
  const segments = useSegments();

  // Clear Query Cache on logout to prevent cross-user data persistence
  useEffect(() => {
    if (isLoggedIn === false) {
      console.log('[AppStateProvider] User logged out, clearing query cache');
      queryClient.clear();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    async function prepare() {
      try {
        if (isLoggedIn === null) return; // Wait for auth state

        const firstSegment = segments[0] as string | undefined;
        const isLanding = !firstSegment || firstSegment === 'index';
        const isAuthScreen = firstSegment === 'login' || firstSegment === 'signup' || firstSegment === 'onboarding';
        const isPublic = isLanding || isAuthScreen || firstSegment === 'modals';

        if (isLoggedIn === true) {
          // If already logged in and on login or signup, redirect to dashboard
          if (firstSegment === 'login' || firstSegment === 'signup') {
            router.replace("/(tabs)/(home)" as never);
          }
        } else if (isLoggedIn === false) {
          // If not logged in and visiting protected page, redirect to login
          if (!isPublic) {
            router.replace("/login" as never);
          }
        }

        setAppIsReady(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn(e);
        setAppIsReady(true);
      }
    }
    prepare();
  }, [isLoggedIn, segments]);

  if (!appIsReady) return null;

  return <>{children}</>;
}


export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SettingsProvider>
          <AuthProvider>
            <SessionProvider>
              <AppStateProvider>
                <RootLayoutNav />
              </AppStateProvider>
            </SessionProvider>
          </AuthProvider>
        </SettingsProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
