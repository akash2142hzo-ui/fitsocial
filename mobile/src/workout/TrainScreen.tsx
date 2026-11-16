import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { Button, Heading, TextButton } from "../components/ui";
import { spacing, type, ui } from "../theme/design";
import { SocialState } from "../social/socialState";
import { TrainMusclePicker } from "./TrainMusclePicker";
import { TrainIcon } from "./TrainIcon";
import { colors } from "../theme/colors";
import { WorkoutLogger, WorkoutProps, WorkoutSettings } from "./WorkoutLogger";
import { CompletedWorkout, formatWorkoutTotals } from "./workoutState";
import { WorkoutMeasurements, WorkoutSetList } from "./WorkoutSummary";
import { formatDuration, sampleClock } from "./workoutMetrics";
import { useWorkoutDuration } from "./useWorkoutDuration";
import { trainingWeek } from "./trainDashboardPresentation";

export function TrainScreen(props: WorkoutProps & { social: SocialState; settingsOpen?: boolean; onOpenProgress?: () => void; onActiveWorkoutViewChange?: (active: boolean) => void }) {
  // Preserve direct continuation from Home and existing end/review confirmations.
  const [hub, setHub] = useState(props.workout.status === "idle");
  const [details, setDetails] = useState<number | null>(null);
  const selected = props.workout.history.find((entry) => entry.id === details);
  const activeLogger = props.workout.status === "active" && (!hub || props.workout.confirming) && (!selected || props.workout.confirming);
  const onActiveWorkoutViewChange = props.onActiveWorkoutViewChange;
  useEffect(() => {
    onActiveWorkoutViewChange?.(activeLogger);
    return () => onActiveWorkoutViewChange?.(false);
  }, [activeLogger, onActiveWorkoutViewChange]);
  let content;
  if (selected && !props.workout.confirming) content = <View style={ui.stack}>
    <TextButton label="Back to training hub" onPress={() => setDetails(null)} />
    <Heading>Saved workout {selected.id}</Heading>
    <Text style={type.caption}>Saved for this session only</Text>
    <WorkoutMeasurements metrics={selected.metrics} />
    <WorkoutSetList sets={selected.sets} />
  </View>;
  else if (!hub || props.workout.confirming) content = <View style={ui.stack}>
    {!props.workout.confirming && <TextButton label="Training hub" onPress={() => setHub(true)} />}
    <WorkoutLogger {...props} hideSettings />
  </View>;
  else content = <TrainDashboard {...props} onOpenLogger={() => setHub(false)} onOpenDetails={setDetails} />;
  return <View style={styles.page}>
    {!activeLogger && !props.workout.confirming && props.workout.status !== "completed" && (props.settingsOpen || !!props.workout.bodyWeightError) && <View style={ui.card}>
      <Heading>Workout preferences</Heading><WorkoutSettings workout={props.workout} send={props.onWorkoutAction} alwaysOpen />
    </View>}
    {content}
  </View>;
}

function TrainDashboard({ workout, onWorkoutAction, onOpenLogger, onOpenDetails, onOpenProgress }: WorkoutProps & {
  onOpenProgress?: () => void;
  onOpenLogger: () => void; onOpenDetails: (id: number) => void;
}) {
  const duration = useWorkoutDuration(workout);
  const [now, setNow] = useState(Date.now);
  const [allHistory, setAllHistory] = useState(false);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const interval = setInterval(update, 60_000);
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") update(); });
    return () => { clearInterval(interval); listener.remove(); };
  }, []);
  const week = trainingWeek(workout.history, now);
  const pending = workout.status === "completed" && !workout.saved;
  function openWorkout() {
    if (workout.status !== "active" && !pending) onWorkoutAction({ type: "start", clock: sampleClock() });
    onOpenLogger();
  }
  return <View style={styles.page}>
    <View style={[ui.card, styles.hero]}>
      <View style={styles.heroRow}><View style={styles.heroText}>
        <Text style={styles.eyebrow}>{pending ? "READY TO REVIEW?" : "READY TO TRAIN?"}</Text>
        <Text accessibilityRole="header" style={type.title}>{workout.status === "active" ? "Workout in progress" : pending ? "Workout ready to review" : "Make today count."}</Text>
      </View><TrainIcon kind="dumbbell" /></View>
      {workout.status === "active" && <Text accessibilityLabel={"Elapsed workout time " + formatDuration(duration)} style={type.metric}>{formatDuration(duration)} elapsed</Text>}
      <Button label={workout.status === "active" ? "Continue workout" : pending ? "Review workout" : "Start workout"} onPress={openWorkout} />
    </View>
    {pending ? <View style={styles.section}><Heading>Choose your workout</Heading>
      <Text style={type.caption}>Review or save your current workout before starting another.</Text>
    </View> : <TrainMusclePicker onSelect={(exercise) => {
      if (workout.status !== "active") onWorkoutAction({ type: "start", clock: sampleClock() });
      onWorkoutAction({ type: "selectExercise", exercise }); onOpenLogger();
    }} />}
    <View style={styles.section}>
      <View style={ui.between}><Heading>Your activity</Heading>
        {onOpenProgress && <TextButton label="View progress" accessibilityLabel="View training progress" onPress={onOpenProgress} />}
      </View>
      <View testID="train-activity-card" style={ui.card}>
        <View style={ui.between}><View accessible accessibilityLabel={`${week.totals.workoutCount} Workouts this week`}>
          <Text style={type.metric}>{week.totals.workoutCount}</Text><Text style={type.caption}>Workouts this week</Text>
        </View><TrainIcon kind="chart" /></View>
        <View style={styles.days}>{week.days.map((day, index) => <View key={day.date} accessible
          accessibilityLabel={`${new Date(day.date).toLocaleDateString(undefined, { weekday: "long" })}, ${new Date(day.date).toLocaleDateString()}: ${day.count} saved workouts`}
          style={styles.day}>
          <Text style={type.caption} importantForAccessibility="no">{["M", "T", "W", "T", "F", "S", "S"][index]}</Text>
          <View testID={`train-day-${index}`} accessible={false} style={[styles.indicator, day.count > 0 && styles.activeDay]} />
        </View>)}</View>
      </View>
      {workout.history.some((entry) => !entry.metrics || !Number.isFinite(entry.metrics.finishedAt)) && <Text style={type.caption}>Undated workouts are excluded from this week.</Text>}
    </View>
    <View style={styles.section}>
      <Heading>Recent workouts</Heading>
      {workout.history.length ? <>
        {(allHistory ? workout.history : workout.history.slice(0, 3)).map((entry: CompletedWorkout) => <View key={entry.id} style={[ui.card, styles.historyRow]}>
          <View style={styles.historyText}><Text style={type.body}>Workout {entry.id}</Text>
            <Text style={type.caption}>{entry.metrics && Number.isFinite(entry.metrics.finishedAt) ? new Date(entry.metrics.finishedAt).toLocaleString() : "Time unavailable"}</Text>
            <Text style={type.caption}>{formatWorkoutTotals(entry.sets)}</Text>
          </View>
          <TextButton label="View details" accessibilityLabel={`View saved workout ${entry.id}`} onPress={() => onOpenDetails(entry.id)} />
        </View>)}
        {workout.history.length > 3 && <TextButton label={allHistory ? "Show recent workouts" : "Show all saved workouts"} onPress={() => setAllHistory(!allHistory)} />}
      </> : <View style={styles.section}>
        <Text style={type.caption}>Your workout history will appear here after your first session.</Text>
        {workout.status !== "active" && !pending && <Button secondary label="Start your first workout" onPress={openWorkout} />}
      </View>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  page: { gap: spacing.lg }, section: { gap: spacing.sm },
  hero: { gap: spacing.sm }, heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heroText: { flex: 1, minWidth: 0, gap: spacing.xs }, eyebrow: { ...type.label, color: colors.accent },
  days: { flexDirection: "row", gap: spacing.xs, justifyContent: "space-between" },
  day: { flex: 1, minWidth: 0, alignItems: "center", gap: spacing.sm },
  indicator: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.secondaryText },
  activeDay: { backgroundColor: colors.accent, borderColor: colors.accent },
  historyRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  historyText: { flex: 1, minWidth: 120, gap: spacing.xs },
});
