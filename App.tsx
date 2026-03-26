import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} from "@expo-google-fonts/atkinson-hyperlegible";
import * as SplashScreen from "expo-splash-screen";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import TabNavigator from "./src/navigation/TabNavigator";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initialiseDatabase } from "./src/database/db";
import { useDayForgeStore, DayForgeProvider } from "./src/store/useDayForgeStore";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { View } from "react-native";

SplashScreen.preventAutoHideAsync();

function InnerApp() {
  const { isDark, theme } = useTheme();
  const { isOnboarded, isLoading, initialise } = useDayForgeStore();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        // Step 1: initialise database fully before anything else
        await initialiseDatabase();
        if (!mounted) return;

        // Step 2: load user/tasks/categories into store
        await initialise();
        if (!mounted) return;

        setDbReady(true);
      } catch (error: any) {
        console.error("Boot error:", error?.message ?? error);
        if (mounted) {
          // Still mark ready so user isn't stuck on blank screen
          setDbReady(true);
        }
      }
    }

    boot();
    return () => { mounted = false; };
  }, []);

  // Hold render until database is confirmed ready
  // Prevents isOnboarded flash-to-false on APK builds
  if (!dbReady || isLoading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <>
      {!isOnboarded ? (
        <OnboardingScreen />
      ) : (
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      )}
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegible: AtkinsonHyperlegible_400Regular,
    "AtkinsonHyperlegible-Bold": AtkinsonHyperlegible_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DayForgeProvider>
            <InnerApp />
          </DayForgeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
