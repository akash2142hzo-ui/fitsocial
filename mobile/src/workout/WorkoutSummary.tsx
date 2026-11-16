import { useContext } from "react";
import { WeightUnitContext } from "./WeightUnitContext";
import { WeightUnit } from "./weightUnits";
import { StyleSheet, Text, View } from "react-native";
import { Heading, IconButton, TextButton } from "../components/ui";
import { TrainIcon } from "./TrainIcon";
import { colors } from "../theme/colors";
import { type, ui } from "../theme/design";
import { CALORIE_DISCLAIMER, calorieStatus, formatDuration, WorkoutMetrics } from "./workoutMetrics";
import { LoggedSet, summarizeWorkout } from "./workoutState";
import { entryDisplay } from "./workoutDisplay";

export function WorkoutMeasurements({ metrics }: { metrics?: WorkoutMetrics }) {
  return <View style={styles.measurements}>
    <Text style={type.body}>Duration {formatDuration(metrics?.durationMs)}</Text>
    <Text style={type.caption}>{calorieStatus(metrics?.bodyWeightKg ?? null, metrics?.durationMs, metrics?.estimatedKcal)}</Text>
    {metrics?.estimatedKcal != null && <Text style={type.caption}>{CALORIE_DISCLAIMER}</Text>}
  </View>;
}
export function WorkoutSetList({ sets, onRemove, cardGroups = false, weightUnit }: { sets: readonly LoggedSet[]; onRemove?: (id: number) => void; cardGroups?: boolean; weightUnit?: WeightUnit }) {
  const selectedUnit = useContext(WeightUnitContext);
  const unit = weightUnit ?? selectedUnit;
  if (cardGroups) return <View style={ui.stack}>{summarizeWorkout(sets).groups.map((group) => <View key={group.exercise} testID={`logged-exercise-${group.exercise}`} style={ui.card}>
    <View style={styles.cardHeader}><TrainIcon kind={group.sets[0].tracking === "cardio" ? "chart" : "dumbbell"} />
      <View style={styles.cardHeading}><Heading>{group.exercise}</Heading><Text style={type.caption}>{group.sets.length} logged {group.sets.length === 1 ? "set" : "sets"}</Text></View>
    </View>
    {group.sets.map((set, index) => <View key={set.id} testID={`logged-set-${set.id}`} style={styles.activeSet}>
      <View style={styles.setFields} accessible accessibilityLabel={group.exercise + ", entry " + (index + 1) + ", " + entryDisplay(set, unit)}>
        <Text style={type.label}>{set.tracking === "cardio" ? "Activity" : "Set"} {index + 1}</Text>
        <View style={styles.values}>{entryDisplay(set, unit).split(" \u00b7 ").map((value, field) => <Text key={field} style={styles.value}>{value}</Text>)}</View>
      </View>
      {onRemove && <IconButton label={`Remove ${group.exercise} ${set.tracking === "cardio" ? "activity" : "set"} ${index + 1}`} onPress={() => onRemove(set.id)}
        icon={<View style={styles.removeGlyph}><View style={[styles.removeStroke, { transform: [{ rotate: "45deg" }] }]} /><View style={[styles.removeStroke, { transform: [{ rotate: "-45deg" }] }]} /></View>} />}
    </View>)}
  </View>)}</View>;
  return <View style={ui.stack}>{summarizeWorkout(sets).groups.map((group) => <View key={group.exercise} style={[styles.group, cardGroups && ui.card]}>
    <Heading>{group.exercise}</Heading>
    {group.sets.map((set, index) => <View key={set.id} style={[ui.between, styles.set]}>
      <Text accessibilityLabel={group.exercise + ", entry " + (index + 1) + ", " + entryDisplay(set, unit)} style={[type.body, styles.setText]}>{set.tracking === "cardio" ? "" : "Set " + (index + 1) + "  "}{entryDisplay(set, unit)}</Text>
      {onRemove && <TextButton label="Remove" accessibilityLabel={`Remove ${group.exercise} ${set.tracking === "cardio" ? "activity" : "set"} ${index + 1}`}
        onPress={() => onRemove(set.id)} />}
    </View>)}
  </View>)}</View>;
}
const styles = StyleSheet.create({
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 }, cardHeading: { flex: 1, minWidth: 0, gap: 4 },
  activeSet: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  setFields: { flex: 1, minWidth: 0, gap: 4 }, values: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  value: { ...type.body, flexShrink: 1, maxWidth: "100%" },
  removeGlyph: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  removeStroke: { position: "absolute", width: 14, height: 1.5, backgroundColor: colors.secondaryText },
  measurements: { gap: 4 }, group: { gap: 4 },
  set: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, minHeight: 48 },
  setText: { flex: 1, minWidth: 112 },
});
