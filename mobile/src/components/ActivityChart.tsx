import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { type } from "../theme/design";
import { sevenDayActivity } from "../workout/activityChart";
import { CompletedWorkout } from "../workout/workoutState";
import { Heading } from "./ui";

export function ActivityChart({ history, now }: { history: readonly CompletedWorkout[]; now: number }) {
  const days = sevenDayActivity(history, now);
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  if (total === 0) return null;
  return <View style={styles.chart}>
    <Heading>Your activity</Heading>
    <Text style={type.caption}>Last 7 days {"\u00b7"} {total} saved workouts</Text>
    <View style={styles.columns}>
      {days.map((day) => <View key={day.date} accessible accessibilityLabel={new Date(day.date).toLocaleDateString() + ": " + day.count + " saved workouts"} style={styles.column}>
        <Text style={type.caption} importantForAccessibility="no">{day.count}</Text>
        <View style={styles.track} accessible={false}><View style={[styles.bar, { height: day.count === 0 ? 0 : 40 * day.count / max }]} /></View>
        <Text style={type.caption} importantForAccessibility="no">{new Date(day.date).toLocaleDateString(undefined, { weekday: "narrow" })}</Text>
      </View>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  chart: { gap: 8 }, columns: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  column: { flex: 1, minWidth: 0, alignItems: "center", gap: 8 },
  track: { height: 40, width: "100%", maxWidth: 28, justifyContent: "flex-end", backgroundColor: colors.surface, borderRadius: 6, overflow: "hidden" },
  bar: { backgroundColor: colors.accent, width: "100%", borderRadius: 6 },
});
