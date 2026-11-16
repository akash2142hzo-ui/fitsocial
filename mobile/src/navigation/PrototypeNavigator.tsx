import { SettingsHeader } from "../social/SettingsScreen";
import { identityFor } from "../social/trainerIdentity";
import { ComposerHeader } from "../social/PostComposer";
import { ContentTransition } from "./ContentTransition";
import { FeedNavigationTabs } from "../social/FeedControls";
import { WeightUnitContext } from "../workout/WeightUnitContext";
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

import { GiftIcon } from "../components/GiftIcon";
import { HomeHeader } from "../components/HomeHeader";
import { SettingsIcon } from "../components/SettingsIcon";
import { Banner, IconButton, TextButton } from "../components/ui";
import { PrototypeScreen } from "../screens/PrototypeScreens";
import { colors } from "../theme/colors";
import { feedback, spacing, type } from "../theme/design";
import { destinations, FeedSection, PrimaryTabId, TabId, tabs } from "./navigationState";
import { WorkoutProps } from "../workout/WorkoutLogger";
import { AuthorNavigationProps, SocialProps } from "../social/SocialScreens";

type PrototypeNavigatorProps = WorkoutProps & SocialProps & AuthorNavigationProps & {
  activeTab: TabId;
  feedSection?: FeedSection;
  onSelectFeedSection?: (section: FeedSection) => void;
  navigationDepth?: number;
  selectedTab: PrimaryTabId;
  authorId?: string;
  canGoBack: boolean;
  onGoBack: () => void;
  onSelectTab: (tab: TabId) => void;
  onExit: () => void;
};

export function PrototypeNavigator({ activeTab, feedSection = "forYou", onSelectFeedSection, navigationDepth = 0, selectedTab, authorId, canGoBack, onGoBack, onOpenAuthor, onSelectTab, onExit, workout, onWorkoutAction, onShareWorkout, social, onSocialAction }: PrototypeNavigatorProps) {
  const routeKey = `${activeTab}:${authorId ?? ""}`;
  const [routeMotion, setRouteMotion] = useState({ key: routeKey, tab: activeTab, depth: navigationDepth, direction: 1 });
  if (routeMotion.key !== routeKey) setRouteMotion({ key: routeKey, tab: activeTab, depth: navigationDepth,
    direction: navigationDepth < routeMotion.depth ? -1 : navigationDepth > routeMotion.depth ? 1 : tabs.findIndex((tab) => tab.id === activeTab) < tabs.findIndex((tab) => tab.id === routeMotion.tab) ? -1 : 1 });
  const direction = routeMotion.direction;
  const sectionScroll = useRef<Partial<Record<FeedSection, number>>>({});
  const sectionKey = useRef(feedSection);
  useEffect(() => {
    if (activeTab !== "feed" || sectionKey.current === feedSection) return;
    sectionKey.current = feedSection;
    Keyboard.dismiss();
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: sectionScroll.current[feedSection] ?? 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [activeTab, feedSection]);
  const [activeWorkoutView, setActiveWorkoutView] = useState(false);
  const currentTab = destinations.find((tab) => tab.id === activeTab)!;
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const trainingSettingsKey = `${activeTab}:${workout.status}`;
  const [trainingSettings, setTrainingSettings] = useState({ key: trainingSettingsKey, open: false });
  if (trainingSettings.key !== trainingSettingsKey) setTrainingSettings({ key: trainingSettingsKey, open: false });
  const trainingSettingsOpen = trainingSettings.key === trainingSettingsKey && trainingSettings.open;
  const [trainingSettingsFocused, setTrainingSettingsFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [focusedTab, setFocusedTab] = useState<PrimaryTabId | null>(null);
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
      {activeTab === "create" ? <ComposerHeader social={social} onSocialAction={onSocialAction} onBack={onGoBack} /> : activeTab === "settings" ? <SettingsHeader onBack={onGoBack} /> : activeTab === "home" ? <HomeHeader canGoBack={canGoBack} onGoBack={onGoBack} /> : <View style={styles.header}>
        {activeTab === "author" && canGoBack && <TextButton label="Back" accessibilityLabel="Back to previous screen" onPress={onGoBack} />}
        <View style={styles.headerTitle}><Text accessibilityRole="header" style={[styles.brand, activeTab === "author" && type.heading]}>{activeTab === "workouts" && activeWorkoutView ? "Workout" : activeTab === "trainers" ? "Discover Trainers" : activeTab === "profile" ? "My Profile" : (activeTab === "author" ? "@" + (identityFor(social, authorId ?? "")?.username ?? "profile") : currentTab.label)}</Text>
        {activeTab !== "profile" && activeTab !== "author" && activeTab !== "workouts" && activeTab !== "rewards" && activeTab !== "feed" && activeTab !== "trainers" && <Text style={styles.demoText}>{"Demo \u00b7 Not saved or uploaded"}</Text>}</View>
        {activeTab === "profile" && <IconButton label="Open Settings" onPress={() => onSelectTab("settings")} icon={<SettingsIcon />} />}
        {(activeTab === "feed" || activeTab === "trainers") && <Text style={styles.feedDemo}>Demo</Text>}
        {activeTab === "rewards" && <GiftIcon color={colors.muted} />}
        {activeTab === "workouts" && !activeWorkoutView && <Pressable accessibilityRole="button" accessibilityLabel="Open training settings"
          accessibilityHint="Show or hide optional body weight for this workout"
          accessibilityState={{ expanded: trainingSettingsOpen || !!workout.bodyWeightError, disabled: workout.status === "completed" || workout.confirming }}
          disabled={workout.status === "completed" || workout.confirming} onPress={() => setTrainingSettings({ key: trainingSettingsKey, open: !trainingSettingsOpen })}
          onFocus={() => setTrainingSettingsFocused(true)} onBlur={() => setTrainingSettingsFocused(false)}
          style={({ pressed }) => [styles.trainingSettings, trainingSettingsFocused && styles.tabFocused, pressed && styles.pressed]}><SettingsIcon /></Pressable>}
        {canGoBack && activeTab !== "author" && <TextButton label="Back" accessibilityLabel="Back to previous screen" onPress={onGoBack} />}
      </View>}
      <View style={styles.demoNotice}>
        {workout.status === "active" && activeTab !== "workouts" && activeTab !== "home" && (
          <Banner label={"Workout active \u00b7 Return to Train"} onPress={() => onSelectTab("workouts")}
            icon={<TabIcon id="workouts" color={colors.accent} />} />
        )}
      </View>

      {activeTab === "feed" && <View style={styles.feedTabs}>
        <FeedNavigationTabs value={feedSection} onForYou={() => onSelectFeedSection?.("forYou")} onTrainers={() => onSelectFeedSection?.("trainers")} onGroups={() => onSelectFeedSection?.("groups")} />
      </View>}
      <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" scrollEventThrottle={16}
        onScroll={(event) => { if (activeTab === "feed") sectionScroll.current[feedSection] = event.nativeEvent.contentOffset.y; }}>
        <View style={styles.page}>
          <ContentTransition transitionKey={`${activeTab}:${authorId ?? ""}`} direction={direction} distance={navigationDepth ? 18 : 8}><WeightUnitContext.Provider value={workout.weightUnit ?? "kg"}><PrototypeScreen feedSection={feedSection} onActiveWorkoutViewChange={setActiveWorkoutView} trainingSettingsOpen={trainingSettingsOpen} activeTab={activeTab} authorId={authorId} onOpenAuthor={onOpenAuthor} onNavigate={onSelectTab} workout={workout} onWorkoutAction={onWorkoutAction} onShareWorkout={onShareWorkout} social={social} onSocialAction={onSocialAction} /></WeightUnitContext.Provider></ContentTransition>
          {activeTab !== "settings" && activeTab !== "profile" && activeTab !== "author" && activeTab !== "home" && activeTab !== "workouts" && activeTab !== "rewards" && activeTab !== "feed" && activeTab !== "create" && <View style={styles.footerExit}><TextButton label="Back to welcome" onPress={onExit} /></View>}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {keyboardVisible ? (
        <TextButton label="Hide keyboard" onPress={Keyboard.dismiss} />
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
              onFocus={() => setFocusedTab(tab.id)} onBlur={() => setFocusedTab(null)}
              onPress={() => onSelectTab(tab.id)}
              style={({ pressed }) => [styles.tab, focusedTab === tab.id && styles.tabFocused, pressed && styles.pressed]}
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
      {id === "rewards" && <GiftIcon color={color} />}
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
  trainingSettings: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent", borderRadius: 12 },
  headerTitle: { flex: 1, minWidth: 0, paddingVertical: spacing.sm },
  brand: { ...type.title, flexShrink: 1 },
  pressed: { opacity: feedback.pressedOpacity },
  demoNotice: { paddingHorizontal: spacing.lg },
  feedTabs: { paddingHorizontal: spacing.lg, alignSelf: "center", width: "100%", maxWidth: 752 },
  footerExit: { marginTop: spacing.lg },
  feedDemo: { ...type.caption, fontSize: 10, backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  demoText: { ...type.caption, flexShrink: 1, alignSelf: "flex-start", marginTop: 2 },
  scroll: { flex: 1 },
  content: { alignItems: "center", padding: spacing.lg, paddingBottom: spacing.xl },
  page: { width: "100%", maxWidth: 720 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 4,
    paddingBottom: Platform.OS === "android" ? 48 : 4,
    backgroundColor: colors.background,
  },
  tab: { flex: 1, minWidth: 0, minHeight: 48, alignItems: "center", borderWidth: 2, borderColor: "transparent", paddingHorizontal: 3, paddingTop: 4, paddingBottom: 4, gap: 2 },
  tabFocused: { borderColor: colors.text },
  indicator: { width: 20, height: 3, borderRadius: 2, marginBottom: 2 },
  tabLabel: { ...type.label, fontSize: 11, textAlign: "center", alignSelf: "stretch" },
  icon: { width: 28, height: 26 },
  roof: { position: "absolute", width: 16, height: 16, borderLeftWidth: 2, borderTopWidth: 2, left: 6, top: 3, transform: [{ rotate: "45deg" }] },
  house: { position: "absolute", width: 18, height: 14, borderWidth: 2, borderTopWidth: 0, left: 5, top: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  weightBar: { position: "absolute", width: 26, height: 3, top: 12, left: 1, borderRadius: 2 },
  weight: { position: "absolute", width: 5, height: 19, top: 4, borderRadius: 2 },
  bubble: { position: "absolute", width: 24, height: 20, borderWidth: 2, borderRadius: 6, left: 2, top: 3 },
  bubbleLine: { position: "absolute", width: 12, height: 2, left: 8, top: 12 },
  person: { position: "absolute", width: 9, height: 9, borderWidth: 2, borderRadius: 5, top: 2 },
  shoulders: { position: "absolute", width: 25, height: 10, borderWidth: 2, borderTopLeftRadius: 10, borderTopRightRadius: 10, left: 1, bottom: 1 },
});
