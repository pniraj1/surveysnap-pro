// App.js — SurveySnap Pro
import React, { useEffect, useCallback, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
  CormorantGaramond_700Bold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import MobileAds from 'react-native-google-mobile-ads';

import HomeScreen     from './src/screens/HomeScreen';
import ProjectScreen  from './src/screens/ProjectScreen';
import CameraScreen   from './src/screens/CameraScreen';
import GalleryScreen  from './src/screens/GalleryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ErrorBoundary  from './src/components/ErrorBoundary';
import { Colors }     from './src/theme';
import { initAds }    from './src/utils/admob';
import { boot }       from './src/utils/fs';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

const NavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary:      Colors.blue,
    background:   Colors.bg,
    card:         Colors.surface,
    text:         Colors.textPrimary,
    border:       Colors.border,
    notification: Colors.blue,
  },
};

export default function App() {
  const [ready, setReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    CormorantGaramond_700Bold_Italic,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    (async () => {
      try {
        await MobileAds().initialize();
        initAds();
        await boot();
      } catch (e) {
        console.warn('Init error:', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const onLayout = useCallback(async () => {
    if ((fontsLoaded || fontError) && ready) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, ready]);

  if ((!fontsLoaded && !fontError) || !ready) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: Colors.bg }} onLayout={onLayout}>
        <StatusBar style="light" />
        {/* FIX: ErrorBoundary wraps the entire navigation tree */}
        <ErrorBoundary>
          <NavigationContainer theme={NavTheme}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.bg },
                animation: 'fade_from_bottom',
                animationDuration: 200,
              }}
            >
              <Stack.Screen name="Home"     component={withErrorBoundary(HomeScreen)} />
              <Stack.Screen name="Project"  component={withErrorBoundary(ProjectScreen)} />
              <Stack.Screen name="Camera"   component={withErrorBoundary(CameraScreen)}
                options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="Gallery"  component={withErrorBoundary(GalleryScreen)} />
              <Stack.Screen name="Settings" component={withErrorBoundary(SettingsScreen)} />
            </Stack.Navigator>
          </NavigationContainer>
        </ErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}

// Wrap each screen individually so errors don't crash the whole app
function withErrorBoundary(ScreenComponent) {
  return function WrappedScreen(props) {
    return (
      <ErrorBoundary>
        <ScreenComponent {...props} />
      </ErrorBoundary>
    );
  };
}
