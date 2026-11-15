import { Pressable, StyleSheet, Text, View } from "react-native";
import { Heading } from "../components/ui";
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
export function WorkoutSetList({ sets, onRemove }: { sets: readonly LoggedSet[]; onRemove?: (id: number) => void }) {
  return <View style={ui.stack}>{summarizeWorkout(sets).groups.map((group) => <View key={group.exercise} style={styles.group}>
    <Heading>{group.exercise}</Heading>
    {group.sets.map((set, index) => <View key={set.id} style={[ui.between, styles.set]}>
      <Text accessibilityLabel={group.exercise + ", entry " + (index + 1) + ", " + entryDisplay(set)} style={[type.body, styles.setText]}>{set.tracking === "cardio" ? "" : "Set " + (index + 1) + "  "}{entryDisplay(set)}</Text>
      {onRemove && <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${group.exercise} ${set.tracking === "cardio" ? "activity" : "set"} ${index + 1}`}
        onPress={() => onRemove(set.id)} style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}>
        <Text style={type.caption}>Remove</Text>
      </Pressable>}
    </View>)}
  </View>)}</View>;
}
const styles = StyleSheet.create({
  measurements: { gap: 4 }, group: { gap: 4 },
  set: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, minHeight: 48 },
  setText: { flex: 1, minWidth: 112 }, remove: { minWidth: 48, minHeight: 48, justifyContent: "center", alignItems: "center" },
});
