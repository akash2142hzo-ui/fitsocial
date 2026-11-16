import { WorkoutShareAction } from "../social/WorkoutShareAction";
import { SocialState } from "../social/socialState";
import { CardioMetric, cardioMetrics } from "./cardio";
import { ComponentRef, Dispatch, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Input, Button, Heading, Stats, TextButton } from "../components/ui";
import { colors } from "../theme/colors";
import { feedback, spacing, type, ui } from "../theme/design";
import { exerciseCatalog } from "./exerciseCatalog";
import { INPUT_COLUMN_GAP, MeasuredSize, weightToggleGeometry, workoutInputLayout } from "./workoutInputLayout";
import { weightDraftDisplay, WeightUnit } from "./weightUnits";
import { TrainIcon } from "./TrainIcon";
import { ExercisePicker } from "./ExercisePicker";
import { useWorkoutDuration } from "./useWorkoutDuration";
import { CALORIE_DISCLAIMER, estimateCalories, formatCalories, formatDuration, MIN_ESTIMATE_DURATION_MS, sampleClock, validateBodyWeight } from "./workoutMetrics";
import { WorkoutMeasurements, WorkoutSetList } from "./WorkoutSummary";
import { summarizeWorkout, WorkoutAction, WorkoutState } from "./workoutState";

export type WorkoutProps = { workout: WorkoutState; onWorkoutAction: Dispatch<WorkoutAction>; onShareWorkout: (id: number) => void };

export function WorkoutLogger({ workout, onWorkoutAction: send, onShareWorkout, social, hideSettings = false }: WorkoutProps & { social: SocialState; hideSettings?: boolean }) {
  const { fontScale } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const [labels, setLabels] = useState<{ key: string; reps: MeasuredSize | null; weight: MeasuredSize | null; toggle: MeasuredSize | null }>({ key: "", reps: null, weight: null, toggle: null });
  const labelIdentity = exerciseCatalog.find((entry) => entry.name === workout.exercise)?.id ?? "no-exercise";
  const labelKey = `${fontScale}:${workout.exercise}`;
  const measured = labels.key === labelKey ? labels : { reps: null, weight: null, toggle: null };
  const defaultToggle = weightToggleGeometry(fontScale);
  const layout = workoutInputLayout(contentWidth, measured.reps, measured.weight,
    measured.toggle ?? { width: defaultToggle.touchWidth * 2, height: defaultToggle.touchHeight }, fontScale);
  function measureLabel(field: "reps" | "weight" | "toggle", size: MeasuredSize) {
    setLabels((previous) => {
      const current = previous.key === labelKey ? previous : { key: labelKey, reps: null, weight: null, toggle: null };
      if (current[field]?.width === size.width && current[field]?.height === size.height) return current;
      return { ...current, [field]: size };
    });
  }
  const actionBasis = 136 * Math.max(1, fontScale || 1);
  const [infoFocused, setInfoFocused] = useState(false);
  const disclosureSession = `${workout.nextWorkoutId}:${workout.clock?.wallMs}`;
  const [disclosure, setDisclosure] = useState({ session: disclosureSession, expanded: false });
  const estimateOpen = disclosure.session === disclosureSession && disclosure.expanded;
  const weightRef = useRef<ComponentRef<typeof TextInput>>(null);
  const repsRef = useRef<ComponentRef<typeof TextInput>>(null);
  const summary = summarizeWorkout(workout.sets);
  const duration = useWorkoutDuration(workout);
  const bodyWeight = validateBodyWeight(workout.bodyWeightInput);
  const selected = exerciseCatalog.find((entry) => entry.name === workout.exercise);
  const timed = selected?.tracking === "duration" || selected?.tracking === "cardio";
  const weightUnit = workout.weightUnit ?? "kg";
  const weightLabel = selected?.tracking === "bodyweight" ? "Added weight" : selected?.tracking === "assisted" ? "Assistance weight" : "Lifted weight";
  const kg = bodyWeight.valid ? bodyWeight.kg : null;
  const calories = estimateCalories(kg, duration);
  const calorieLabel = kg === null ? "Add weight to estimate"
    : duration === null || !Number.isFinite(duration) ? "Time unavailable"
    : duration < MIN_ESTIMATE_DURATION_MS ? "Available after 1 min"
    : `Estimated: ${formatCalories(calories)}`;
  return <View style={ui.stack}>
    {workout.status === "idle" && <View style={styles.weightField}>
      <Heading>Your next workout</Heading>
      <Text style={type.caption}>Choose an exercise after you start.</Text>
      <Button label="Start workout" onPress={() => send({ type: "start", clock: sampleClock() })} />
    </View>}
    {workout.status === "idle" && !workout.confirming && !hideSettings && <WorkoutSettings workout={workout} send={send} />}
    {workout.status === "active" && <>
      <View testID="active-session-card" style={styles.session}>
        <Text style={styles.sessionLabel}>SESSION IN PROGRESS</Text>
        <View style={ui.between}><View style={styles.timerText}>
          <Text testID="active-session-timer" accessibilityLabel={"Elapsed workout time " + formatDuration(duration)} style={styles.timer}>{formatDuration(duration)}</Text>
          <Text style={type.caption}>Elapsed time</Text>
        </View><View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.clock}><View style={styles.clockHand} /></View></View>
        <View style={ui.divider} />
        <View testID="active-session-metrics" style={styles.sessionMetrics}>
          <View testID="active-calories-row" style={styles.metricRow}><SessionMetricIcon kind="flame" /><View style={styles.metricText}>
            <Text style={styles.metricLabel}>Calories</Text>
            <Text testID="active-calorie-status" style={styles.metricStatus}>{calorieLabel}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="About calorie estimates" accessibilityState={{ expanded: estimateOpen }}
            accessibilityHint="Shows or hides how calories are estimated and when an estimate is available"
            onPress={() => setDisclosure({ session: disclosureSession, expanded: !estimateOpen })} onFocus={() => setInfoFocused(true)} onBlur={() => setInfoFocused(false)}
            style={({ pressed }) => [styles.infoButton, infoFocused && styles.infoFocused, pressed && { opacity: feedback.pressedOpacity }]}>
            <Text accessible={false} style={styles.infoIcon}>i</Text>
          </Pressable></View>
          {!workout.confirming && <ActiveBodyWeightEditor value={workout.bodyWeightInput} onSave={(value) => send({ type: "editBodyWeight", value })} />}
          {estimateOpen && <View style={styles.explanation}>
            <Heading>Calorie estimate</Heading>
            <Text accessibilityLiveRegion="polite" style={type.caption}>{CALORIE_DISCLAIMER}</Text>
            <Text style={type.caption}>Optional body weight and at least one minute of elapsed time are required. Reps and lifted weight are not used.</Text>
          </View>}
        </View>
      </View>
      {!workout.confirming && <View style={ui.stack}>
        <ExercisePicker selected={workout.exercise} hideSelectedHeading onSelect={(exercise) => send({ type: "selectExercise", exercise })}
          renderLauncher={(open, expanded) => <View style={ui.stack}>
            <View testID="active-workout-actions" style={styles.actions}>
              <View style={[styles.actionCell, { flexBasis: actionBasis }]}><Button label="Add exercise" expanded={expanded} onPress={() => open()} /></View>
              <View style={[styles.actionCell, { flexBasis: actionBasis }]}><Button secondary label="End workout" onPress={() => send({ type: "requestEnd" })} /></View>
            </View>
            {selected && <View style={ui.between}><Heading>{selected.name}</Heading><TextButton label="Change exercise" onPress={() => open()} /></View>}
          </View>} />
        {selected && <>
        <View testID="workout-input-form" onLayout={!timed ? (event) => setContentWidth(event.nativeEvent.layout.width) : undefined}
          style={[styles.entry, !timed && { flexDirection: layout.twoColumns ? "row" : "column", flexWrap: "nowrap", gap: INPUT_COLUMN_GAP }]}>
          <View testID="workout-reps-column" style={timed ? styles.field : [styles.inputColumn, contentWidth > 0 && { width: layout.fieldWidth }]}>
            <View testID="workout-reps-header" style={!timed ? [styles.entryLabel, layout.twoColumns && { minHeight: layout.headerHeight }] : undefined}>
              <Text key={`${labelIdentity}:reps-label`} onLayout={!timed ? (event) => measureLabel("reps", event.nativeEvent.layout) : undefined} style={type.label}>{timed ? "Duration (seconds), required" : "Reps, required"}</Text>
            </View>
            <Input ref={repsRef} accessibilityLabel={timed ? "Activity duration in seconds, required, 1 to 86400" : "Repetitions, required, 1 to 1000"} value={timed ? workout.durationInput : workout.reps}
              onChangeText={(value) => send({ type: "edit", field: timed ? "durationInput" : "reps", value })}
              keyboardType="number-pad" maxLength={12} returnKeyType={timed ? "done" : "next"} submitBehavior={timed ? "blurAndSubmit" : "submit"}
              onSubmitEditing={() => { if (!timed) weightRef.current?.focus(); }} style={[ui.input, !timed && { height: layout.inputHeight, includeFontPadding: false }]}
              placeholder={timed ? "Seconds" : "Reps"} placeholderTextColor={colors.muted} selectionColor={colors.accent} />
          </View>
          {!timed && <View testID="workout-weight-column" style={[styles.inputColumn, contentWidth > 0 && { width: layout.fieldWidth }]}>
            <View testID="workout-weight-header" style={[styles.weightLabelRow, { flexDirection: layout.inlineWeightHeader ? "row" : "column", alignItems: layout.inlineWeightHeader ? "center" : "flex-start", justifyContent: layout.inlineWeightHeader ? "space-between" : "flex-start" }, layout.twoColumns && { minHeight: layout.headerHeight }]}>
              <Text key={`${labelIdentity}:weight-label`} numberOfLines={1} adjustsFontSizeToFit onLayout={(event) => measureLabel("weight", event.nativeEvent.layout)} style={styles.weightLabel}>{selected.tracking === "external" ? "Total weight" : selected.tracking === "bodyweight" ? "Added weight" : "Assistance"}</Text>
              <WeightUnitToggle key={`${labelIdentity}:weight-unit-toggle`} unit={weightUnit} onLayout={(size) => measureLabel("toggle", size)} onChange={(unit) => send({ type: "setWeightUnit", unit })} />
            </View>
            <Input ref={weightRef} accessibilityLabel={weightLabel + (selected.tracking === "external" ? ", required, in " : ", optional, in ") + (weightUnit === "kg" ? "kilograms, 0 to 1000" : "pounds, 0 to 2204.62")} value={weightDraftDisplay(workout.weight, workout.weightDraft, weightUnit)}
              onChangeText={(value) => send({ type: "edit", field: "weight", value })}
              keyboardType="decimal-pad" maxLength={12} returnKeyType="done" style={[ui.input, { height: layout.inputHeight, includeFontPadding: false }]}
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
      </View>}
      <View testID="active-logged-section" style={ui.stack}>
        <View style={ui.between}><Heading>Logged exercises</Heading><Text accessibilityLabel={`${workout.sets.length} logged entries`} style={type.caption}>{workout.sets.length} {workout.sets.length === 1 ? "entry" : "entries"}</Text></View>
        <View testID="active-workout-stats" style={styles.statTiles}>
          {[{ label: "Exercises completed", value: summary.exerciseCount }, { label: "Total sets", value: summary.setCount }, { label: "Total reps", value: summary.reps }].map(({ label, value }) => <View key={label} accessible accessibilityLabel={`${value} ${label}`} style={styles.statTile}>
            <Text style={styles.statValue}>{value}</Text><Text style={type.caption}>{label}</Text>
          </View>)}
        </View>
        {summary.setCount === 0 ? <View style={ui.card}><TrainIcon kind="dumbbell" /><Heading>No exercises logged yet</Heading><Text style={type.caption}>Tap Add exercise to begin.</Text></View>
          : <WorkoutSetList weightUnit={weightUnit} sets={workout.sets} cardGroups onRemove={!workout.confirming ? (id) => send({ type: "removeSet", id }) : undefined} />}
      </View>
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
    {workout.status === "completed" && <View style={ui.stack}>
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
      <WorkoutSetList weightUnit={weightUnit} sets={workout.sets} />
    </View>}
  </View>;
}
function WeightUnitToggle({ unit, onChange, onLayout }: { unit: WeightUnit; onChange: (unit: WeightUnit) => void; onLayout: (size: MeasuredSize) => void }) {
  const { fontScale } = useWindowDimensions();
  const [textSizes, setTextSizes] = useState<{ scale: number; kg?: MeasuredSize; lb?: MeasuredSize }>({ scale: fontScale });
  const text = textSizes.scale === fontScale && textSizes.kg && textSizes.lb
    ? { width: Math.max(textSizes.kg.width, textSizes.lb.width), height: Math.max(textSizes.kg.height, textSizes.lb.height) } : undefined;
  const geometry = weightToggleGeometry(fontScale, text);
  const [focused, setFocused] = useState<WeightUnit | null>(null);
  return <View accessibilityRole="toolbar" accessibilityLabel="Weight unit" onLayout={(event) => onLayout(event.nativeEvent.layout)} style={styles.unitToggle}>
    <View testID="weight-unit-track" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.unitTrack, { top: geometry.verticalInset, bottom: geometry.verticalInset, left: geometry.horizontalInset, right: geometry.horizontalInset }]} />
    {(["kg", "lb"] as const).map((value, index) => <Pressable key={value} accessibilityRole="button"
      accessibilityLabel={`Weight unit: ${value}`} accessibilityState={{ selected: value === unit }}
      onPress={() => onChange(value)} onFocus={() => setFocused(value)} onBlur={() => setFocused(null)}
      style={({ pressed }) => [styles.unitOption, { width: geometry.touchWidth, minHeight: geometry.touchHeight, alignItems: index === 0 ? "flex-end" : "flex-start" }, focused === value && styles.unitFocused, pressed && { opacity: feedback.pressedOpacity }]}>
      <View testID={`weight-unit-segment-${value}`} style={[styles.unitSegment, { width: geometry.segmentWidth, minHeight: geometry.visualHeight }, value === unit && styles.unitSelected]}>
        <Text onLayout={(event) => {
          const size = event.nativeEvent.layout;
          setTextSizes((previous) => {
            const current = previous.scale === fontScale ? previous : { scale: fontScale };
            return current[value]?.width === size.width && current[value]?.height === size.height ? current : { ...current, [value]: size };
          });
        }} style={[styles.unitText, value === unit && styles.unitSelectedText]}>{value}</Text>
      </View>
    </Pressable>)}
  </View>;
}
function ActiveBodyWeightEditor({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const current = validateBodyWeight(value);
  function open() { setDraft(value); setError(null); setEditing(true); }
  function close() { Keyboard.dismiss(); setEditing(false); setError(null); }
  function save() {
    const checked = validateBodyWeight(draft);
    if (!checked.valid || checked.kg === null) {
      setError(checked.valid ? "Enter body weight from 1 to 500 kg." : checked.error.replace(", or leave blank.", "."));
      return;
    }
    onSave(draft.trim()); close();
  }
  return <View style={styles.weightSection}>
    <View testID="active-body-weight-row" style={styles.metricRow}>
      <SessionMetricIcon kind="scale" /><View style={styles.metricText}>
        <Text style={styles.metricLabel}>Body weight</Text>
        {current.valid && current.kg !== null && <Text style={styles.metricStatus}>{current.kg} kg</Text>}
      </View>
      <View style={styles.weightAction}><TextButton label={current.valid && current.kg !== null ? "Edit" : "+ Add weight"}
        accessibilityLabel={current.valid && current.kg !== null ? "Edit workout body weight" : "Add workout body weight"} expanded={editing} onPress={editing ? close : open} /></View>
    </View>
    {editing && <View testID="active-body-weight-editor" style={styles.weightField}>
      <Text style={type.label}>Body weight (kg)</Text>
      <Input accessibilityLabel="Body weight (kg), workout only, 1 to 500" value={draft} onChangeText={(text) => { setDraft(text); setError(null); }}
        keyboardType="decimal-pad" maxLength={8} autoFocus returnKeyType="done" onSubmitEditing={save} placeholder="Enter kg" />
      <Text style={type.caption}>For this workout only. Profile Settings defaults stay unchanged.</Text>
      {error && <ErrorText text={error} />}
      <View style={ui.row}><Button label="Save" accessibilityLabel="Save workout body weight" onPress={save} /><Button secondary label="Cancel" accessibilityLabel="Cancel workout body weight" onPress={close} /></View>
    </View>}
  </View>;
}

// Small local shapes avoid platform-dependent emoji glyphs and extra icon dependencies.
function SessionMetricIcon({ kind }: { kind: "flame" | "scale" }) {
  return <View testID={`session-${kind}-icon`} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.metricIcon}>
    {kind === "flame" ? <View style={styles.flame}><View style={styles.flameCore} /></View>
      : <View style={styles.scale}><View style={styles.scaleDial}><View style={styles.scaleNeedle} /></View></View>}
  </View>;
}

export function WorkoutSettings({ workout, send, alwaysOpen = false }: { workout: WorkoutState; send: Dispatch<WorkoutAction>; alwaysOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const visible = alwaysOpen || open || !!workout.bodyWeightError;
  return <View style={styles.weightField}>
    {!alwaysOpen && <TextButton label="Workout settings" expanded={visible} onPress={() => setOpen(!visible)} />}
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
  inputColumn: { minWidth: 0, gap: 8, alignSelf: "stretch" },
  entryLabel: { justifyContent: "center", alignItems: "flex-start" },
  weightLabelRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 },
  weightLabel: { ...type.label, flexShrink: 0 },
  unitToggle: { flexDirection: "row" },
  unitTrack: { position: "absolute", borderRadius: 999, backgroundColor: colors.elevated },
  unitOption: { minWidth: 44, justifyContent: "center", borderRadius: 999, borderWidth: 0, borderColor: "transparent" },
  unitSegment: { paddingVertical: 4, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  unitText: { ...type.button, fontSize: 12, lineHeight: 16, fontWeight: "500" },
  unitFocused: { outlineWidth: 2, outlineColor: colors.text, outlineStyle: "solid" },
  unitSelected: { backgroundColor: colors.accent },
  unitSelectedText: { color: colors.background },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCell: { flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: "100%" },
  statTiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statTile: { ...ui.card, flexGrow: 1, flexBasis: 80, minWidth: 0, gap: spacing.xs },
  statValue: { ...type.metric, color: colors.accent },
  sessionLabel: { ...type.label, color: colors.accent }, timerText: { gap: spacing.xs, flexShrink: 1 },
  sessionMetrics: { paddingHorizontal: spacing.xs, gap: spacing.md },
  metricRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metricText: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing.sm, rowGap: spacing.xs },
  metricLabel: { ...type.body, flexShrink: 1, maxWidth: "100%" },
  metricStatus: { ...type.caption, flexShrink: 1, maxWidth: "100%" },
  weightSection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: spacing.sm },
  weightAction: { flexShrink: 1, maxWidth: "55%" },
  metricIcon: { width: 20, height: 24, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  flame: { width: 14, height: 18, borderTopLeftRadius: 12, borderTopRightRadius: 2, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: colors.accent, justifyContent: "flex-end", alignItems: "center" },
  flameCore: { width: 6, height: 9, borderTopLeftRadius: 6, borderTopRightRadius: 1, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: colors.surface },
  scale: { width: 18, height: 18, borderWidth: 1.5, borderColor: colors.accent, borderRadius: 4, alignItems: "center", paddingTop: 2 },
  scaleDial: { width: 10, height: 6, borderWidth: 1, borderColor: colors.accent, borderRadius: 3, alignItems: "center" },
  scaleNeedle: { height: 4, borderLeftWidth: 1, borderColor: colors.accent },
  infoButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 2, borderColor: "transparent" },
  infoFocused: { borderColor: colors.text },
  clock: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  clockHand: { width: 5, height: 8, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.accent },
  infoIcon: { ...type.heading, color: colors.accent },
  explanation: { ...ui.card },
  weightField: { gap: 8 }, session: { ...ui.card, gap: spacing.sm }, timer: { ...type.metric, color: colors.accent, fontSize: 30, lineHeight: 38 },
  entry: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, field: { flex: 1, minWidth: 112, gap: 8 },
});
