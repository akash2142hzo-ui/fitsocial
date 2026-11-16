import { SocialAreaTabs } from "../social/FeedControls";
import { WorkoutShareAction } from "../social/WorkoutShareAction";
import { SettingsScreen } from "../social/SettingsScreen";
import { TrainerDiscovery, TrainerSetup } from "../social/TrainerScreens";
import { visiblePosts } from "../social/socialState";
import { BattleRopeImage } from "../components/BattleRopeImage";
import { ActivityChart } from "../components/ActivityChart";
import { useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, EmptyState, Heading, Stats, TextButton } from "../components/ui";
import { ContentTransition } from "../navigation/ContentTransition";
import { FeedSection, TabId } from "../navigation/navigationState";
import { colors } from "../theme/colors";
import { radii, spacing, type, ui } from "../theme/design";
import { TrainScreen } from "../workout/TrainScreen";
import { WorkoutProps } from "../workout/WorkoutLogger";
import { WorkoutAttachmentView } from "../workout/WorkoutAttachmentView";
import { createWorkoutAttachment } from "../workout/workoutSharing";
import { formatCalories, formatDuration, sampleClock, CALORIE_DISCLAIMER } from "../workout/workoutMetrics";
import { useWorkoutDuration } from "../workout/useWorkoutDuration";
import { formatWorkoutTotals, summarizeHistory } from "../workout/workoutState";
import { AuthorNavigationProps, PostCard, CreatePostScreen, FeedScreen, GroupsScreen, SocialProps } from "../social/SocialScreens";
import { ProfileScreen } from "../social/ProfileScreen";
import { RewardsScreen } from "./RewardsScreen";
import { relativeWorkoutTime, todayWorkoutCount } from "../workout/workoutPresentation";

type PrototypeScreenProps = WorkoutProps & SocialProps & AuthorNavigationProps & { activeTab: TabId; feedSection?: FeedSection; trainingSettingsOpen?: boolean; onActiveWorkoutViewChange?: (active: boolean) => void; authorId?: string; onNavigate: (tab: TabId) => void };

export function PrototypeScreen({ activeTab, feedSection = "forYou", trainingSettingsOpen, onActiveWorkoutViewChange, authorId, onOpenAuthor, onNavigate, workout, onWorkoutAction, onShareWorkout, social, onSocialAction }: PrototypeScreenProps) {
  switch (activeTab) {
    case "rewards": return <RewardsScreen />;
    case "settings": return <SettingsScreen social={social} onSocialAction={onSocialAction} />;
    case "trainers": return <TrainerDiscovery social={social} onSocialAction={onSocialAction} onOpenAuthor={onOpenAuthor} />;
    case "trainerSetup": return <TrainerSetup social={social} onSocialAction={onSocialAction} onDone={() => onNavigate("profile")} />;
    case "home": return <HomeScreen workout={workout} onWorkoutAction={onWorkoutAction} onShareWorkout={onShareWorkout} social={social} onSocialAction={onSocialAction} onOpenAuthor={onOpenAuthor} onNavigate={onNavigate} />;
    case "workouts": return <TrainScreen onActiveWorkoutViewChange={onActiveWorkoutViewChange} settingsOpen={trainingSettingsOpen} onOpenProgress={() => onNavigate("progress")} social={social} workout={workout} onWorkoutAction={onWorkoutAction} onShareWorkout={onShareWorkout} />;
    case "progress": return <ProgressScreen social={social} workout={workout} onNavigate={onNavigate} onShareWorkout={onShareWorkout} />;
    case "create": return <CreatePostScreen social={social} onSocialAction={onSocialAction} workout={workout} onShareWorkout={onShareWorkout} />;
    case "feed": return <ContentTransition transitionKey={feedSection} duration={200} order="forYou,trainers,groups">
      {feedSection === "trainers" ? <TrainerDiscovery social={social} onSocialAction={onSocialAction} onOpenAuthor={onOpenAuthor} /> : feedSection === "groups" ? <GroupsScreen social={social} onSocialAction={onSocialAction} /> : <FeedScreen social={social} onSocialAction={onSocialAction} onOpenAuthor={onOpenAuthor} onCreatePost={() => onNavigate("create")} onOpenGroups={() => onNavigate("groups")} onOpenTrainers={() => onNavigate("trainers")} />}
    </ContentTransition>;
    case "groups": return <GroupsScreen social={social} onSocialAction={onSocialAction} />;
    case "profile": return <ProfileScreen social={social} onSocialAction={onSocialAction} history={workout.history} onOpenAuthor={onOpenAuthor} onNavigate={onNavigate} />;
    case "author": return <ProfileScreen publicView key={authorId} authorId={authorId} social={social} onSocialAction={onSocialAction} history={workout.history} onOpenAuthor={onOpenAuthor} onNavigate={onNavigate} />;
  }
}
function HomeScreen({ workout, onWorkoutAction, onShareWorkout, social, onSocialAction, onOpenAuthor, onNavigate }: WorkoutProps & SocialProps & AuthorNavigationProps & { onNavigate: (tab: TabId) => void }) {
  const duration = useWorkoutDuration(workout);
  const [progressFocused, setProgressFocused] = useState(false);
  const [todayTime, setTodayTime] = useState(Date.now);
  useEffect(() => {
    const update = () => setTodayTime(Date.now());
    const interval = setInterval(update, 60_000);
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") update(); });
    return () => { clearInterval(interval); listener.remove(); };
  }, []);
  const recent = workout.history[0];
  const today = todayWorkoutCount(workout.history, todayTime);
  // Reuse the single social state's Following selection; Feed itself always shows For You.
  const following = social.filter === "following";
  const selectedPosts = visiblePosts({ ...social, filter: following ? "following" : "all", feedQuery: "" });
  const interestPosts = following ? selectedPosts : selectedPosts.slice(0, 2);
  return <View style={ui.stack}>
    <View style={[ui.card, homeStyles.hero]}>
      <Text accessibilityRole="header" style={homeStyles.instruction}>Choose an exercise and make your first entry.</Text>
      <Text style={type.caption}>{workout.status === "active" ? "Workout in progress" : workout.completed && !workout.saved ? "Workout ready to review" : today ? String(today) + " saved today" : "No saved workout today"}</Text>
      {workout.status === "active" && <Text style={type.metric}>{formatDuration(duration)}</Text>}
      <Button label={workout.status === "active" ? "Continue workout" : workout.completed && !workout.saved ? "Review workout" : "Start workout"} onPress={() => {
        if (workout.status !== "active" && !(workout.completed && !workout.saved)) onWorkoutAction({ type: "start", clock: sampleClock() });
        onNavigate("workouts");
      }} />
      <View style={homeStyles.progressRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="View Progress" onFocus={() => setProgressFocused(true)} onBlur={() => setProgressFocused(false)} onPress={() => onNavigate("progress")}
          style={({ pressed }) => [homeStyles.progressAction, progressFocused && homeStyles.progressFocused, pressed && homeStyles.pressed]}>
          <Text style={homeStyles.progressLabel}>View Progress</Text>
        </Pressable>
        <BattleRopeImage />
      </View>
    </View>
    {recent ? <View style={ui.stack}>
      <View style={ui.between}><Heading>Last saved workout</Heading>
      <Text style={type.caption}>{relativeWorkoutTime(recent.metrics?.finishedAt, todayTime)}</Text></View>
      <WorkoutAttachmentView attachment={createWorkoutAttachment(recent)} />
      <WorkoutShareAction social={social} workoutId={recent.id} onShare={onShareWorkout} />
    </View> : null}
    {recent && <ActivityChart history={workout.history} now={todayTime} />}
    {recent && <Stats items={[{ value: workout.history.length, label: "saved workouts" }, { value: formatDuration(summarizeHistory(workout.history).durationMs), label: "workout time" }]} />}
    <Text accessibilityRole="header" style={homeStyles.interestHeading}>Interest</Text>
    <SocialAreaTabs items={[
      { label: "For You", selected: !following, onPress: () => onSocialAction({ type: "setFilter", filter: "all" }) },
      { label: "Following", selected: following, onPress: () => onSocialAction({ type: "setFilter", filter: "following" }) },
    ]} />
    {interestPosts.length ? <>
      {interestPosts.map((post) => <PostCard key={post.id} post={post} social={social} onSocialAction={onSocialAction} onOpenAuthor={onOpenAuthor} />)}
      <TextButton label="Open Feed" onPress={() => onNavigate("feed")} />
    </> : <View style={ui.card}>
      <Text style={type.body}>{following ? "Your following feed is quiet." : "No discovery posts yet."}</Text>
      <Text style={type.caption}>{following ? "Follow fictional profiles to see their posts here." : "Explore Feed for fitness community posts."}</Text>
      <TextButton label="Open Feed" onPress={() => onNavigate("feed")} />
    </View>}
  </View>;
}
function ProgressScreen({ workout, onNavigate, onShareWorkout, social }: Pick<PrototypeScreenProps, "workout" | "onNavigate" | "onShareWorkout" | "social">) {
  const totals = summarizeHistory(workout.history);
  return <View style={ui.stack}>
    {totals.workoutCount > 0 && <Stats items={[
      { value: totals.workoutCount, label: "workouts" }, { value: formatDuration(totals.durationMs), label: "total time" },
      { value: formatCalories(totals.estimatedKcal), label: "estimated calories" },
      ...(totals.repSetCount ? [{ value: totals.repSetCount, label: "rep sets" }, { value: totals.reps, label: "reps" }] : []),
      ...(totals.durationSeconds ? [{ value: totals.durationSeconds, label: "logged activity seconds" }] : []), { value: totals.exerciseCount, label: "exercise entries" },
    ]} />}
    {totals.workoutCount > 0 && <Text style={type.caption}>{totals.distinctExercises} distinct exercises</Text>}
    {totals.workoutCount > 0 && <Text style={type.caption}>Calorie estimates available for {totals.estimatedWorkoutCount} of {totals.workoutCount} workouts.</Text>}
    {totals.estimatedKcal !== null && <Text style={type.caption}>{CALORIE_DISCLAIMER}</Text>}
    <Heading>Recent workouts</Heading>
    {workout.history.length === 0 && <EmptyState title="No completed workouts yet." detail="Finish and save a workout in Train to see it here.">
      <Button label="Open Train" onPress={() => onNavigate("workouts")} />
    </EmptyState>}
    {workout.history.map((completed) => {
      return <View key={completed.id} style={ui.stack}>
        <Text style={type.caption}>{completed.metrics ? new Date(completed.metrics.finishedAt).toLocaleString() : "Time not recorded"} {"\u00b7"} {formatWorkoutTotals(completed.sets)}</Text>
        <WorkoutAttachmentView attachment={createWorkoutAttachment(completed)} />
        <WorkoutShareAction social={social} workoutId={completed.id} onShare={onShareWorkout} identified />
      </View>;
    })}
  </View>;
}

const homeStyles = StyleSheet.create({
  interestHeading: { ...type.title, fontSize: 24, lineHeight: 32, flexShrink: 1 },
  instruction: { ...type.body, fontWeight: "600", flexShrink: 1 },
  progressFocused: { backgroundColor: colors.accentSurface },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  progressAction: { flex: 2, minWidth: 44, minHeight: 48, justifyContent: "center", paddingVertical: spacing.xs },
  progressLabel: { ...type.button, color: colors.accent, flexShrink: 1 },
  pressed: { opacity: 0.72 },
  hero: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, borderRadius: radii.hero, backgroundColor: colors.elevated },
});
