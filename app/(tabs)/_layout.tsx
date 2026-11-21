import Colors from "@/constants/colors";
import { Tabs } from "expo-router";
import { Award, BarChart3, Home, User } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderTopColor: '#E0E7FF',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 14,
          paddingTop: 8,
          shadowColor: 'rgba(79,70,229,0.12)',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 1,
          shadowRadius: 32,
          elevation: 20,
          ...(Platform.OS === 'web'
            ? {
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 -4px 32px rgba(79,70,229,0.12)',
                position: 'sticky' as any,
                bottom: 0,
              }
            : {}),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.4,
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 4,
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="(home)/index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={color === '#4F46E5' ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="recordings"
        options={{
          title: "History",
          tabBarLabel: "History",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size} color={color} strokeWidth={color === '#4F46E5' ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          title: "Badges",
          tabBarLabel: "Badges",
          tabBarIcon: ({ color, size }) => (
            <Award size={size} color={color} strokeWidth={color === '#4F46E5' ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} strokeWidth={color === '#4F46E5' ? 2.5 : 1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
