import { StatusBar } from "expo-status-bar";
import { ComponentRef, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { appName } from "../appInfo";
import { PrototypeScreen } from "../screens/PrototypeScreens";
import { colors } from "../theme/colors";
import { spacing, type } from "../theme/design";
import { destinations, PrimaryTabId, TabId, tabs } from "./navigationState";
import { WorkoutProps } from "../workout/WorkoutLogger";
import { AuthorNavigationProps, SocialProps } from "../social/SocialScreens";

type PrototypeNavigatorProps = WorkoutProps & SocialProps & AuthorNavigationProps & {
  activeTab: TabId;
  selectedTab: PrimaryTabId;
  authorId?: string;
  canGoBack: boolean;
  onGoBack: () => void;
  onSelectTab: (tab: TabId) => void;
  onExit: () => void;
};

export function PrototypeNavigator({ activeTab, selectedTab, authorId, canGoBack, onGoBack, onOpenAuthor, onSelectTab, onExit, workout, onWorkoutAction, onShareWorkout, social, onSocialAction }: PrototypeNavigatorProps) {
  const currentTab = destinations.find((tab) => tab.id === activeTab)!;
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const socialConfirming = social.discardPrompt !== null;
  const composerId = social.composer?.id;
  const newestPostId = social.posts[0]?.id;
  const settingsSection = social.settingsDraft?.section;
  const settingsConfirming = social.settingsDraft?.confirming;
  useEffect(() => {
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [settingsSection, settingsConfirming]);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    // Native scroll views can retain offsets when recycled, even with a new React key.
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, authorId]);
  useEffect(() => {
    if (workout.confirming || socialConfirming) {
      Keyboard.dismiss();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [workout.confirming, socialConfirming]);
  useEffect(() => {
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [composerId, social.viewingDrafts]);
  useEffect(() => {
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [newestPostId, social.filter]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerTitle}><Text accessibilityRole="header" style={styles.brand}>{activeTab === "home" ? appName : currentTab.label}</Text>
        <Text style={styles.demoText}>{"Demo \u00b7 Not saved or uploaded"}</Text></View>
        {canGoBack && <Pressable
          onPress={onGoBack}
          accessibilityRole="button"
          accessibilityLabel={canGoBack ? "Back to previous screen" : "Back to welcome"}
          style={({ pressed }) => [styles.exit, pressed && styles.pressed]}
        >
          <Text style={styles.exitLabel}>Back</Text>
        </Pressable>}
      </View>
      <View style={styles.demoNotice}>
        {workout.status === "active" && activeTab !== "workouts" && activeTab !== "home" && (
          <Pressable accessibilityRole="button" onPress={() => onSelectTab("workouts")} style={styles.exit}>
            <Text style={styles.exitLabel}>{"Workout active \u00b7 Return to Train"}</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView ref={scrollRef} key={`${activeTab}:${authorId ?? ""}`} style={styles.scroll} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.page}>
          <PrototypeScreen activeTab={activeTab} authorId={authorId} onOpenAuthor={onOpenAuthor} onNavigate={onSelectTab} workout={workout} onWorkoutAction={onWorkoutAction} onShareWorkout={onShareWorkout} social={social} onSocialAction={onSocialAction} />
          <Pressable accessibilityRole="button" accessibilityLabel="Back to welcome" onPress={onExit} style={styles.footerExit}>
            <Text style={styles.exitLabel}>Back to welcome</Text>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {keyboardVisible ? (
        <Pressable accessibilityRole="button" onPress={Keyboard.dismiss} style={styles.exit}>
          <Text style={styles.exitLabel}>Hide keyboard</Text>
        </Pressable>
      ) : <View accessibilityRole="tablist" style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = tab.id === selectedTab;
          const accent = colors.accent;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.id === "workouts" ? "Train, workouts" : tab.label}
              accessibilityState={{ selected }}
              onPress={() => onSelectTab(tab.id)}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <View style={[styles.indicator, selected && { backgroundColor: accent }]} />
              <TabIcon id={tab.id} color={selected ? accent : colors.muted} />
              <Text style={[styles.tabLabel, selected && { color: accent }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>}
    </SafeAreaView>
  );
}

function TabIcon({ id, color }: { id: PrimaryTabId; color: string }) {
  return (
    <View
      style={styles.icon}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {id === "home" && (
        <>
          <View style={[styles.roof, { borderColor: color }]} />
          <View style={[styles.house, { borderColor: color }]} />
        </>
      )}
      {id === "workouts" && (
        <>
          <View style={[styles.weightBar, { backgroundColor: color }]} />
          <View style={[styles.weight, { backgroundColor: color, left: 3 }]} />
          <View style={[styles.weight, { backgroundColor: color, right: 3 }]} />
        </>
      )}
      {id === "create" && <>
        <View style={[styles.createHorizontal, { backgroundColor: color }]} />
        <View style={[styles.createVertical, { backgroundColor: color }]} />
      </>}
      {id === "feed" && (
        <>
          <View style={[styles.bubble, { borderColor: color }]} />
          <View style={[styles.bubbleLine, { backgroundColor: color }]} />
        </>
      )}
      {id === "profile" && (
        <>
          <View style={[styles.person, { borderColor: color, left: 8 }]} />
          <View style={[styles.shoulders, { borderColor: color }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? NativeStatusBar.currentHeight ?? 0 : 0,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    gap: 8,
    minHeight: 48,
  },
  headerTitle: { flex: 1, minWidth: 0, paddingVertical: spacing.sm },
  brand: { color: colors.text, fontSize: 17, fontWeight: "700", lineHeight: 24, flexShrink: 1 },
  exit: { minHeight: 48, maxWidth: "100%", justifyContent: "center", padding: 10, borderRadius: 12 },
  exitLabel: { color: colors.muted, fontSize: 13 },
  pressed: { backgroundColor: colors.surface },
  demoNotice: { paddingHorizontal: spacing.lg },
  footerExit: { minHeight: 48, marginTop: 16, paddingVertical: 12, alignSelf: "flex-start", justifyContent: "center" },
  demoText: { ...type.caption, flexShrink: 1 },
  scroll: { flex: 1 },
  content: { alignItems: "center", padding: spacing.lg, paddingBottom: spacing.xl },
  page: { width: "100%", maxWidth: 720 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 4,
    paddingBottom: Platform.OS === "android" ? 48 : 8,
    backgroundColor: colors.background,
  },
  tab: { flex: 1, minWidth: 0, minHeight: 64, alignItems: "center", paddingHorizontal: 3, paddingTop: 8, paddingBottom: 8, gap: 4 },
  indicator: { width: 20, height: 3, borderRadius: 2, marginBottom: 2 },
  tabLabel: { color: colors.muted, fontSize: 11, fontWeight: "600", textAlign: "center", alignSelf: "stretch" },
  icon: { width: 28, height: 26 },
  createHorizontal: { position: "absolute", width: 22, height: 2, top: 12, left: 3, borderRadius: 1 },
  createVertical: { position: "absolute", width: 2, height: 22, top: 2, left: 13, borderRadius: 1 },
  roof: { position: "absolute", width: 16, height: 16, borderLeftWidth: 2, borderTopWidth: 2, left: 6, top: 3, transform: [{ rotate: "45deg" }] },
  house: { position: "absolute", width: 18, height: 14, borderWidth: 2, borderTopWidth: 0, left: 5, top: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  weightBar: { position: "absolute", width: 26, height: 3, top: 12, left: 1, borderRadius: 2 },
  weight: { position: "absolute", width: 5, height: 19, top: 4, borderRadius: 2 },
  bubble: { position: "absolute", width: 24, height: 20, borderWidth: 2, borderRadius: 6, left: 2, top: 3 },
  bubbleLine: { position: "absolute", width: 12, height: 2, left: 8, top: 12 },
  person: { position: "absolute", width: 9, height: 9, borderWidth: 2, borderRadius: 5, top: 2 },
  shoulders: { position: "absolute", width: 25, height: 10, borderWidth: 2, borderTopLeftRadius: 10, borderTopRightRadius: 10, left: 1, bottom: 1 },
});
