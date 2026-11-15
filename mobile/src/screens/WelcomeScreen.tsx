import { StatusBar } from "expo-status-bar";
import { Platform, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, View } from "react-native";
import { appName } from "../appInfo";
import { Button, Heading } from "../components/ui";
import { colors } from "../theme/colors";
import { spacing, type, ui } from "../theme/design";

type WelcomeScreenProps = { onExplorePrototype?: () => void };
export function WelcomeScreen({ onExplorePrototype }: WelcomeScreenProps) {
  return <SafeAreaView style={styles.root}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.page}>
        <Text style={styles.brand}>{appName}</Text>
        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.title}>Move with purpose.{"\n"}<Text style={styles.accent}>Connect through fitness.</Text></Text>
          <Text style={type.body}>Your training. Your progress. Your people.</Text>
        </View>
        <View style={ui.card}>
          <Heading>Track your training</Heading>
          <Text style={type.caption}>Find exercises, log sets and follow your progress.</Text>
          <Heading>Share the journey</Heading>
          <Text style={type.caption}>Share workouts and connect with a fitness community.</Text>
        </View>
        {onExplorePrototype && <Button label="Explore the local demo" accessibilityLabel="Explore the local demo without signing in" onPress={onExplorePrototype} />}
        <Text style={type.caption}>{"Demo \u00b7 Changes aren't saved or uploaded"}</Text>
        <Button disabled secondary label={"Get started \u00b7 Coming soon"} accessibilityLabel="Authentication placeholder. Sign-in and account creation are not available." onPress={() => {}} />
        <Text style={type.caption}>Sign-in placeholder</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? NativeStatusBar.currentHeight ?? 0 : 0 },
  content: { flexGrow: 1, alignItems: "center", padding: spacing.xl, paddingBottom: Platform.OS === "android" ? 48 : spacing.xl },
  page: { width: "100%", maxWidth: 560, gap: spacing.lg },
  brand: { ...type.title, color: colors.accent, paddingVertical: spacing.md },
  hero: { gap: spacing.md, paddingVertical: spacing.lg },
  title: { ...type.title, fontSize: 28, lineHeight: 38 },
  accent: { color: colors.accent },
});
