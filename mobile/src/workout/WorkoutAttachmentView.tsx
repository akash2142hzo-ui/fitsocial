import { ContentTransition } from "../navigation/ContentTransition";
import { formatWorkoutTotals } from "./workoutState";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Heading, TextButton } from "../components/ui";
import { colors } from "../theme/colors";
import { radii, spacing, type } from "../theme/design";
import { CALORIE_DISCLAIMER, calorieStatus, formatDuration } from "./workoutMetrics";
import { WorkoutMeasurements, WorkoutSetList } from "./WorkoutSummary";
import { WorkoutAttachment } from "./workoutSharing";

export function WorkoutAttachmentView({ attachment, initiallyExpanded = false }: {
  attachment: WorkoutAttachment; initiallyExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return <View style={styles.preview}>
    <Heading>Workout {attachment.workoutId}</Heading>
    {expanded ? <WorkoutMeasurements metrics={attachment.metrics} /> : <>
      <Text style={type.caption}>{formatDuration(attachment.metrics?.durationMs)} {"\u00b7"} {attachment.totals.exerciseCount} exercises</Text>
      <Text style={type.caption}>{calorieStatus(attachment.metrics?.bodyWeightKg ?? null, attachment.metrics?.durationMs, attachment.metrics?.estimatedKcal)}</Text>
      {attachment.metrics?.estimatedKcal != null && <Text accessibilityLabel={CALORIE_DISCLAIMER} style={type.caption}>3.5 MET estimate {"\u00b7"} actual calories vary</Text>}
    </>}
    <TextButton label={expanded ? "Hide workout details" : "View workout details"}
      accessibilityLabel={(expanded ? "Hide" : "View") + " workout " + attachment.workoutId + " recorded activity details. Duration " + formatDuration(attachment.metrics?.durationMs)}
      expanded={expanded} onPress={() => setExpanded(!expanded)} />
    <ContentTransition transitionKey={String(expanded)} distance={12} visible={expanded}>
    {expanded && <>
      <Text style={type.caption}>{formatWorkoutTotals(attachment.sets)}</Text>
      <WorkoutSetList sets={attachment.sets} />
    </>}
    </ContentTransition>
  </View>;
}
const styles = StyleSheet.create({
  preview: { backgroundColor: colors.elevated, borderLeftWidth: 2, borderLeftColor: colors.accent, borderRadius: radii.card, padding: spacing.md, gap: spacing.md },
});
