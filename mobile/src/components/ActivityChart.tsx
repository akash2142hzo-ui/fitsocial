import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radii, spacing, type } from "../theme/design";
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
      {days.map((day, index) => <View key={day.date} accessible accessibilityLabel={(index === days.length - 1 ? "Today, " : "") + new Date(day.date).toLocaleDateString() + ": " + day.count + " saved workouts"} style={styles.column}>
        <Text style={type.caption} importantForAccessibility="no">{day.count}</Text>
        <View style={[styles.track, index === days.length - 1 && styles.todayTrack]} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={[styles.bar, { height: day.count === 0 ? 0 : 44 * day.count / max }]} /></View>
        <Text style={[styles.dayLabel, index === days.length - 1 && styles.todayLabel]} importantForAccessibility="no">{index === days.length - 1 ? "Today" : new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}</Text>
      </View>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  chart: { gap: spacing.md }, columns: { flexDirection: "row", gap: spacing.xs, alignItems: "flex-start" },
  column: { flex: 1, minWidth: 0, alignItems: "center", gap: spacing.sm },
  track: { height: 48, paddingTop: 2, paddingBottom: 2, width: "100%", maxWidth: 28, justifyContent: "flex-end", backgroundColor: colors.surface, borderRadius: radii.control, overflow: "hidden", borderWidth: 1, borderColor: "transparent" },
  todayTrack: { borderColor: colors.accent },
  dayLabel: { ...type.caption, textAlign: "center", maxWidth: "100%" },
  todayLabel: { color: colors.accent, fontWeight: "600" },
  bar: { backgroundColor: colors.accent, width: "100%", borderRadius: 6 },
});
