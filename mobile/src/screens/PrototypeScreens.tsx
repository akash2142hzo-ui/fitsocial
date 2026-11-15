import { WorkoutShareAction } from "../social/WorkoutShareAction";
import { SettingsScreen } from "../social/SettingsScreen";
import { TrainerDiscovery, TrainerSetup } from "../social/TrainerScreens";
import { identityFor } from "../social/trainerIdentity";
import { ActivityChart } from "../components/ActivityChart";
import { useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Button, EmptyState, Heading, Stats, TextButton } from "../components/ui";
import { TabId } from "../navigation/navigationState";
import { colors } from "../theme/colors";
import { type, ui } from "../theme/design";
import { WorkoutLogger, WorkoutProps } from "../workout/WorkoutLogger";
import { WorkoutAttachmentView } from "../workout/WorkoutAttachmentView";
import { createWorkoutAttachment } from "../workout/workoutSharing";
import { formatCalories, formatDuration, sampleClock, CALORIE_DISCLAIMER } from "../workout/workoutMetrics";
import { useWorkoutDuration } from "../workout/useWorkoutDuration";
import { formatWorkoutTotals, summarizeHistory } from "../workout/workoutState";
import { AuthorNavigationProps, CreatePostScreen, FeedScreen, GroupsScreen, SocialProps } from "../social/SocialScreens";
import { ProfileScreen } from "../social/ProfileScreen";
import { relativeWorkoutTime, todayWorkoutCount } from "../workout/workoutPresentation";

type PrototypeScreenProps = WorkoutProps & SocialProps & AuthorNavigationProps & { activeTab: TabId; authorId?: string; onNavigate: (tab: TabId) => void };

export function PrototypeScreen({ activeTab, authorId, onOpenAuthor, onNavigate, workout, onWorkoutAction, onShareWorkout, social, onSocialAction }: PrototypeScreenProps) {
  switch (activeTab) {
    case "settings": return <SettingsScreen social={social} onSocialAction={onSocialAction} />;
    case "trainers": return <TrainerDiscovery social={social} onSocialAction={onSocialAction} onOpenAuthor={onOpenAuthor} />;
    case "trainerSetup": return <TrainerSetup social={social} onSocialAction={onSocialAction} onDone={() => onNavigate("profile")} />;
    case "home": return <HomeScreen workout={workout} onWorkoutAction={onWorkoutAction} onShareWorkout={onShareWorkout} social={social} onNavigate={onNavigate} />;
    case "workouts": return <WorkoutLogger social={social} workout={workout} onWorkoutAction={onWorkoutAction} onShareWorkout={onShareWorkout} />;
    case "progress": return <ProgressScreen social={social} workout={workout} onNavigate={onNavigate} onShareWorkout={onShareWorkout} />;
    case "create": return <CreatePostScreen social={social} onSocialAction={onSocialAction} workout={workout} onShareWorkout={onShareWorkout} />;
    case "feed": return <FeedScreen social={social} onSocialAction={onSocialAction} onOpenAuthor={onOpenAuthor} onCreatePost={() => onNavigate("create")} onOpenGroups={() => onNavigate("groups")} onOpenTrainers={() => onNavigate("trainers")} />;
    case "groups": return <GroupsScreen social={social} onSocialAction={onSocialAction} />;
    case "profile": return <ProfileScreen social={social} onSocialAction={onSocialAction} history={workout.history} onOpenAuthor={onOpenAuthor} onNavigate={onNavigate} />;
    case "author": return <ProfileScreen key={authorId} authorId={authorId} social={social} onSocialAction={onSocialAction} history={workout.history} onOpenAuthor={onOpenAuthor} onNavigate={onNavigate} />;
  }
}
function HomeScreen({ workout, onWorkoutAction, onShareWorkout, social, onNavigate }: WorkoutProps & Pick<SocialProps, "social"> & { onNavigate: (tab: TabId) => void }) {
  const duration = useWorkoutDuration(workout);
  const [todayTime, setTodayTime] = useState(Date.now);
  useEffect(() => {
    const update = () => setTodayTime(Date.now());
    const interval = setInterval(update, 60_000);
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") update(); });
    return () => { clearInterval(interval); listener.remove(); };
  }, []);
  const recent = workout.history[0];
  const today = todayWorkoutCount(workout.history, todayTime);
  const post = social.posts[0];
  const author = post ? identityFor(social, post.authorId) : undefined;
  return <View style={ui.stack}>
    <Text accessibilityRole="header" style={type.heading}>Good to see you.</Text>
    <View style={[ui.card, homeStyles.hero]}>
      <View accessible={false} style={homeStyles.stripe} />
      <View style={homeStyles.heroArt} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={homeStyles.arc} /><View style={homeStyles.arcInner} />
      </View>
      <View style={ui.between}><Heading>Make your next move.</Heading><TextButton label="View Progress" onPress={() => onNavigate("progress")} /></View>
      <Text style={type.caption}>{workout.status === "active" ? "Workout in progress" : workout.completed && !workout.saved ? "Workout ready to review" : today ? String(today) + " saved today" : "No saved workout today"}</Text>
      {workout.status === "active" && <Text style={type.metric}>{formatDuration(duration)}</Text>}
      <Button label={workout.status === "active" ? "Continue workout" : workout.completed && !workout.saved ? "Review workout" : "Start workout"} onPress={() => {
        if (workout.status !== "active" && !(workout.completed && !workout.saved)) onWorkoutAction({ type: "start", clock: sampleClock() });
        onNavigate("workouts");
      }} />
    </View>
    {recent ? <View style={ui.stack}>
      <Heading>Last saved workout</Heading>
      <Text style={type.caption}>{relativeWorkoutTime(recent.metrics?.finishedAt, todayTime)}</Text>
      <WorkoutAttachmentView attachment={createWorkoutAttachment(recent)} />
      <WorkoutShareAction social={social} workoutId={recent.id} onShare={onShareWorkout} />
    </View> : workout.status === "idle" ? <Text style={type.caption}>Choose an exercise and make your first entry.</Text> : null}
    {recent && <ActivityChart history={workout.history} now={todayTime} />}
    {recent && <Stats items={[{ value: workout.history.length, label: "saved workouts" }, { value: formatDuration(summarizeHistory(workout.history).durationMs), label: "workout time" }]} />}
    <Heading>Community</Heading>
    {post && author ? <Pressable accessibilityRole="button" accessibilityLabel="Open Feed" onPress={() => onNavigate("feed")} style={({ pressed }) => [ui.card, pressed && { opacity: 0.7 }]}>
      <View style={ui.row}><Avatar initials={author.initials} /><Text style={[type.label, { flexShrink: 1 }]}>@{author.username}</Text></View>
      <Text style={type.caption}>{post.origin === "sample" ? "Sample" : "Your local post"}</Text>
      <Text style={type.body} numberOfLines={2}>{post.text || "Shared a workout"}</Text>
      <Text style={type.caption}>Open Feed</Text>
    </Pressable> : <EmptyState title="Start a conversation"><Button secondary label="Create a post" onPress={() => onNavigate("create")} /></EmptyState>}
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
  hero: { overflow: "hidden", paddingTop: 12, backgroundColor: colors.accentSurface },
  heroArt: { position: "absolute", right: -16, top: 12, width: 80, height: 80, opacity: 0.15 },
  arc: { position: "absolute", width: 78, height: 78, borderRadius: 39, borderColor: colors.accent, borderWidth: 12 },
  arcInner: { position: "absolute", left: 24, top: 24, width: 30, height: 30, borderRadius: 15, borderColor: colors.accent, borderWidth: 8 },
  stripe: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: colors.accent },
});
