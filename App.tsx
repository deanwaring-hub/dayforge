import { useEffect } from "react";
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
import { useDayForgeStore } from "./src/store/useDayForgeStore";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { DayForgeProvider } from './src/store/useDayForgeStore';
SplashScreen.preventAutoHideAsync();

function InnerApp() {
  const { isDark } = useTheme();
  const { isOnboarded, isLoading, initialise } = useDayForgeStore();

  useEffect(() => {
    initialiseDatabase()
      .then(() => initialise())
      .catch(console.error);
  }, []);

  if (isLoading) return null;

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
