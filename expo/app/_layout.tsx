import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trpc, trpcClient } from "../lib/trpc";
import { AuthProvider } from "../providers/auth";
import { CurrentUserProvider } from "../providers/current-user";
import { SkillSwapsProvider } from "../providers/skill-swaps";
import { SafetyProvider } from "../providers/safety";
import { ClassesProvider } from "../providers/classes";
import { NotificationsProvider } from "../providers/notifications";
import { ResourcesProvider } from "../providers/resources";
import { OnboardingProvider } from "../providers/onboarding";
import { AdminProvider } from "../providers/admin";
import { EarningsProvider } from "../providers/earnings";
import { QuizzesProvider } from "../providers/quizzes";
import { AssignmentsProvider } from "../providers/assignments";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="skill/[id]" 
        options={{ 
          headerShown: true,
          presentation: 'card',
        }} 
      />
      <Stack.Screen
        name="class/[id]"
        options={{
          headerShown: true,
          title: 'Class Details',
        }}
      />
      <Stack.Screen
        name="class/create"
        options={{
          headerShown: true,
          title: 'Create Class',
        }}
      />
      <Stack.Screen
        name="class/my"
        options={{
          headerShown: true,
          title: 'My Classes',
        }}
      />
      <Stack.Screen
        name="class/assignments"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="class/assignments/[assignmentId]"
        options={{
          headerShown: true,
          title: 'Assignment',
        }}
      />
      <Stack.Screen
        name="quiz/[id]"
        options={{
          headerShown: true,
          title: 'Practice Test',
        }}
      />
      <Stack.Screen
        name="quiz/take/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="quiz/result/[attemptId]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin/reports"
        options={{
          headerShown: true,
          title: 'User Reports',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#F8FAFC',
        }}
      />
      <Stack.Screen
        name="admin/classes"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="profile/[id]" 
        options={{ 
          headerShown: true,
          title: 'Profile',
        }} 
      />
      <Stack.Screen
        name="swaps/index"
        options={{
          headerShown: true,
          title: 'Swaps',
        }}
      />
      <Stack.Screen
        name="swaps/[id]"
        options={{
          headerShown: true,
          title: 'Swap Detail',
        }}
      />
      <Stack.Screen
        name="call/[swapId]"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="call/[classId]"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          headerShown: true,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="add-skill"
        options={{
          headerShown: true,
          presentation: 'card',
        }}
      />

      <Stack.Screen
        name="store"
        options={{
          headerShown: true,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="verification"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin/login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin/users"
        options={{
          headerShown: true,
          title: 'User Management',
        }}
      />
      <Stack.Screen
        name="admin/reviews"
        options={{
          headerShown: true,
          title: 'Review Moderation',
        }}
      />
      <Stack.Screen
        name="admin/swaps"
        options={{
          headerShown: true,
          title: 'Swap Oversight',
        }}
      />
      <Stack.Screen
        name="admin/verifications"
        options={{
          headerShown: true,
          title: 'Verifications',
        }}
      />
      <Stack.Screen
        name="admin/certifications"
        options={{
          headerShown: true,
          title: 'Certifications',
        }}
      />
      <Stack.Screen
        name="admin/payouts"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="earnings/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="earnings/history"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="payout"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="assistant"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="certificate/[id]"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          headerShown: true,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          headerShown: true,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          headerShown: true,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="contact"
        options={{
          headerShown: true,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          headerShown: true,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <AuthProvider>
          <OnboardingProvider>
            <CurrentUserProvider>
              <QuizzesProvider>
              <EarningsProvider>
                <SkillSwapsProvider>
                  <SafetyProvider>
                  <NotificationsProvider>
                    <AssignmentsProvider>
                    <ClassesProvider>
                      <ResourcesProvider>
                        <AdminProvider>
                          <ErrorBoundary>
                          <GestureHandlerRootView style={styles.container}>
                            <RootLayoutNav />
                          </GestureHandlerRootView>
                          </ErrorBoundary>
                        </AdminProvider>
                      </ResourcesProvider>
                    </ClassesProvider>
                    </AssignmentsProvider>
                  </NotificationsProvider>
                  </SafetyProvider>
                </SkillSwapsProvider>
              </EarningsProvider>
              </QuizzesProvider>
            </CurrentUserProvider>
          </OnboardingProvider>
        </AuthProvider>
      </trpc.Provider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
