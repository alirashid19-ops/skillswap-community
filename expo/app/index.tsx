import { useState } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/auth';
import { useOnboarding } from '@/providers/onboarding';
import IntroSplash from '@/components/IntroSplash';

// Show the animated intro once per app launch, not on every return to "/".
let introPlayed = false;

export default function Index() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasCompletedOnboarding, isChecking } = useOnboarding();
  const [introDone, setIntroDone] = useState(introPlayed);

  const isLoading = authLoading || isChecking;

  if (!introDone || isLoading) {
    return (
      <View style={styles.root}>
        {!introDone && (
          <IntroSplash
            onFinish={() => {
              introPlayed = true;
              setIntroDone(true);
            }}
          />
        )}
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href={"/login" as any} />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href={"/onboarding" as any} />;
  }

  return <Redirect href={"/home" as any} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0920',
  },
});
