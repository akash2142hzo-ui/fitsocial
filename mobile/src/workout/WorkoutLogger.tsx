import { WorkoutShareAction } from "../social/WorkoutShareAction";
import { SocialState } from "../social/socialState";
import { CardioMetric, cardioMetrics } from "./cardio";
import { ComponentRef, Dispatch, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Input, Button, Heading, Stats, TextButton } from "../components/ui";
import { colors } from "../theme/colors";
import { type, ui } from "../theme/design";
import { exerciseCatalog } from "./exerciseCatalog";
import { ExercisePicker } from "./ExercisePicker";
import { useWorkoutDuration } from "./useWorkoutDuration";
import { CALORIE_DISCLAIMER, calorieStatus, estimateCalories, formatDuration, sampleClock, validateBodyWeight } from "./workoutMetrics";
import { WorkoutMeasurements, WorkoutSetList } from "./WorkoutSummary";
import { summarizeWorkout, WorkoutAction, WorkoutState } from "./workoutState";

export type WorkoutProps = { workout: WorkoutState; onWorkoutAction: Dispatch<WorkoutAction>; onShareWorkout: (id: number) => void };

export function WorkoutLogger({ workout, onWorkoutAction: send, onShareWorkout, social }: WorkoutProps & { social: SocialState }) {
  const [estimateOpen, setEstimateOpen] = useState(false);
  const weightRef = useRef<ComponentRef<typeof TextInput>>(null);
  const repsRef = useRef<ComponentRef<typeof TextInput>>(null);
  const summary = summarizeWorkout(workout.sets);
  const duration = useWorkoutDuration(workout);
  const bodyWeight = validateBodyWeight(workout.bodyWeightInput);
  const selected = exerciseCatalog.find((entry) => entry.name === workout.exercise);
  const timed = selected?.tracking === "duration" || selected?.tracking === "cardio";
  const weightLabel = selected?.tracking === "bodyweight" ? "Added weight" : selected?.tracking === "assisted" ? "Assistance weight" : "Lifted weight";
  const kg = bodyWeight.valid ? bodyWeight.kg : null;
  return <View style={ui.stack}>
    {workout.status === "idle" && <View style={styles.weightField}>
      <Heading>Your next workout</Heading>
      <Text style={type.caption}>Choose an exercise after you start.</Text>
      <Button label="Start workout" onPress={() => send({ type: "start", clock: sampleClock() })} />
    </View>}
    {workout.status === "idle" && !workout.confirming && <WorkoutSettings workout={workout} send={send} />}
    {workout.status === "active" && <>
      <View style={styles.session}>
        <View style={ui.between}><Text style={type.label}>Workout</Text>
        <Text accessibilityLabel={"Elapsed workout time " + formatDuration(duration)} style={styles.timer}>{formatDuration(duration)} elapsed</Text></View>
        <Text style={type.caption}>{calorieStatus(kg, duration, estimateCalories(kg, duration))}</Text>
        {kg !== null && <>
          <Text style={type.caption}>General estimate; may not reflect cardio.</Text>
        </>}
        <View style={styles.estimateControl}><Button secondary label="About calorie estimates" expanded={estimateOpen}
          accessibilityHint="Shows or hides how calories are estimated and when an estimate is available"
          icon={<Text style={styles.infoIcon}>{"\u24D8"}</Text>} onPress={() => setEstimateOpen(!estimateOpen)} /></View>
        {estimateOpen && <View style={styles.explanation}>
          <Heading>Calorie estimate</Heading>
          <Text accessibilityLiveRegion="polite" style={type.caption}>{CALORIE_DISCLAIMER}</Text>
          <Text style={type.caption}>Optional body weight and at least one minute of elapsed time are required. Reps and lifted weight are not used.</Text>
        </View>}
      </View>
    {workout.status === "active" && !workout.confirming && <WorkoutSettings workout={workout} send={send} />}
      {!workout.confirming && <View style={ui.stack}>
        <ExercisePicker selected={workout.exercise} onSelect={(exercise) => send({ type: "selectExercise", exercise })} />
        {selected && <>
        <View style={styles.entry}>
          <View style={styles.field}>
            <Text style={type.label}>{timed ? "Duration (seconds), required" : "Reps, required"}</Text>
            <Input ref={repsRef} accessibilityLabel={timed ? "Activity duration in seconds, required, 1 to 86400" : "Repetitions, required, 1 to 1000"} value={timed ? workout.durationInput : workout.reps}
              onChangeText={(value) => send({ type: "edit", field: timed ? "durationInput" : "reps", value })}
              keyboardType="number-pad" maxLength={12} returnKeyType={timed ? "done" : "next"} submitBehavior={timed ? "blurAndSubmit" : "submit"}
              onSubmitEditing={() => { if (!timed) weightRef.current?.focus(); }} style={ui.input}
              placeholder={timed ? "Seconds" : "Reps"} placeholderTextColor={colors.muted} selectionColor={colors.accent} />
          </View>
          {!timed && <View style={styles.field}>
            <Text style={type.label}>{selected.tracking === "external" ? "Weight (kg), required" : selected.tracking === "bodyweight" ? "Added weight (kg)" : "Assistance (kg)"}{selected.tracking !== "external" ? " (optional)" : ""}</Text>
            <Input ref={weightRef} accessibilityLabel={weightLabel + (selected.tracking === "external" ? ", required, in kilograms, 0 to 1000" : " in kilograms, optional, 0 to 1000")} value={workout.weight}
              onChangeText={(value) => send({ type: "edit", field: "weight", value })}
              keyboardType="decimal-pad" maxLength={12} returnKeyType="done" style={ui.input}
              placeholder={selected?.tracking === "bodyweight" ? "No additional weight" : "Unrecorded"} placeholderTextColor={colors.muted} selectionColor={colors.accent} />
          </View>}
        </View>
        {selected.tracking === "cardio" && selected.supportedMetrics.map((key: CardioMetric) => <View key={key} style={styles.field}>
          <Text style={type.label}>{cardioMetrics[key].label} {"\u00b7"} optional</Text>
          <Input accessibilityLabel={cardioMetrics[key].label + ", optional"} keyboardType={cardioMetrics[key].integer ? "number-pad" : "decimal-pad"}
            value={workout.cardioDraft[key] ?? ""} onChangeText={(value) => send({ type: "editCardio", field: key, value })}
            maxLength={12} placeholder="Not recorded" placeholderTextColor={colors.muted} style={ui.input} selectionColor={colors.accent} />
        </View>)}
        <Button label={selected.tracking === "cardio" ? "Log activity" : "Log set"} disabled={!(timed ? workout.durationInput : workout.reps).trim()} onPress={() => {
          send({ type: "addSet", revision: workout.revision }); repsRef.current?.focus();
        }} />
        </>}
        <Button secondary label="End workout" onPress={() => send({ type: "requestEnd" })} />
      </View>}
    </>}
    {workout.error && <ErrorText text={workout.error} />}
    {workout.confirming && workout.status === "active" && <View style={ui.card}>
      <Heading>End workout?</Heading>
      <Text style={type.body}>Finish freezes logged entries for review; Save adds them to temporary history. Discard removes this session. Unlogged inputs are dropped; saved workouts remain.</Text>
      <Button label="Finish workout" disabled={summary.setCount === 0} onPress={() => send({ type: "finish", clock: sampleClock() })} />
      {summary.setCount === 0 && <Text style={type.caption}>Log at least one entry to finish.</Text>}
      <Button secondary label="Keep logging" onPress={() => send({ type: "cancelEnd" })} />
      <Button secondary danger label="Discard workout" onPress={() => send({ type: "discard" })} />
    </View>}
    {workout.status === "completed" && workout.confirming && <View style={ui.card}>
      <Heading>Unsaved workout</Heading>
      <Text style={type.body}>Save for this session or explicitly discard this summary. Sharing does not save it.</Text>
      <Button label="Save for this session" onPress={() => send({ type: "save" })} />
      <Button secondary label="Keep reviewing" onPress={() => send({ type: "cancelEnd" })} />
      <Button secondary danger label="Discard unsaved workout" onPress={() => send({ type: "discardCompleted" })} />
    </View>}
    {workout.status !== "idle" && <View style={ui.stack}>
      <Heading>{workout.status === "completed" ? "Workout complete" : "Logged entries"}</Heading>
      {workout.status === "completed" && <WorkoutMeasurements metrics={workout.completed?.metrics} />}
      {summary.setCount > 0 && <Stats items={[{ value: summary.exerciseCount, label: "exercises" }, ...(summary.repSetCount ? [{ value: summary.repSetCount, label: "rep sets" }, { value: summary.reps, label: "reps" }] : []), ...(summary.durationSeconds ? [{ value: summary.durationSeconds, label: "logged activity seconds" }] : [])]} />}
      {summary.setCount === 0 && <Text style={type.caption}>No entries yet.</Text>}
      {workout.status === "completed" && <>
        <Text style={type.caption}>{workout.saved ? "Saved for this session only" : "Not saved"}</Text>
        {!workout.saved && !workout.confirming && <Button label="Save for this session" onPress={() => send({ type: "save" })} />}
        {workout.completed && <WorkoutShareAction social={social} workoutId={workout.completed.id} onShare={onShareWorkout} secondary={!workout.saved} />}
        <Button secondary label="Start new workout" onPress={() => send({ type: "start", clock: sampleClock() })} />
      </>}
      <WorkoutSetList sets={workout.sets} onRemove={workout.status === "active" && !workout.confirming ? (id) => send({ type: "removeSet", id }) : undefined} />
    </View>}
  </View>;
}
function WorkoutSettings({ workout, send }: { workout: WorkoutState; send: Dispatch<WorkoutAction> }) {
  const [open, setOpen] = useState(false);
  const visible = open || !!workout.bodyWeightError;
  return <View style={styles.weightField}>
    <TextButton label="Workout settings" expanded={visible} onPress={() => setOpen(!visible)} />
    {visible && <View style={styles.weightField}>
      <Text style={type.label}>Body weight (kg), optional</Text>
      <Input accessibilityLabel="Body weight in kilograms for calorie estimates, optional, 1 to 500. Separate from lifting weight."
        value={workout.bodyWeightInput} onChangeText={(value) => send({ type: "editBodyWeight", value })}
        keyboardType="decimal-pad" maxLength={8} placeholder="Add for calorie estimates" placeholderTextColor={colors.muted}
        selectionColor={colors.accent} style={ui.input} />
      <Text style={type.caption}>For this workout only. Personal defaults are in Profile Settings.</Text>
      {workout.bodyWeightError && <ErrorText text={workout.bodyWeightError} />}
    </View>}
  </View>;
}
function ErrorText({ text }: { text: string }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={type.error}>{text}</Text>;
}
const styles = StyleSheet.create({
  estimateControl: { alignSelf: "flex-start", maxWidth: "100%" },
  infoIcon: { ...type.heading, color: colors.accent },
  explanation: { ...ui.card },
  weightField: { gap: 8 }, session: { gap: 4, paddingVertical: 4 }, timer: { ...type.metric, color: colors.accent, fontSize: 20, lineHeight: 28 },
  entry: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, field: { flex: 1, minWidth: 112, gap: 8 },
});
