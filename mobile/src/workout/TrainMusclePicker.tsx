import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CategoryImage } from "../components/CategoryImage";
import { Heading, TextButton } from "../components/ui";
import { colors } from "../theme/colors";
import { feedback, radii, sizing, spacing, type, ui } from "../theme/design";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseName } from "./exerciseCatalog";

export const trainMuscles = ["Biceps", "Triceps", "Chest", "Back"] as const;
type TrainMuscle = typeof trainMuscles[number];
export const trainMuscleViews = {
  Biceps: "Front upper arm", Triceps: "Back upper arm", Chest: "Pectorals", Back: "Back muscles",
} as const;

// Original local anatomical fallback diagrams, not photographs or exercise demonstrations.
function MuscleArtwork({ muscle }: { muscle: TrainMuscle }) {
  const posterior = muscle === "Back" || muscle === "Triceps";
  return <View testID={`train-muscle-art-${muscle}`} pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={styles.art}>
    <View style={styles.figure}>
      <View style={styles.head} /><View style={styles.neck} /><View style={styles.shoulders} /><View style={styles.torso} />
      <View style={[styles.upperArm, { left: "20%" }]} /><View style={[styles.upperArm, { right: "20%" }]} />
      <View style={[styles.forearm, { left: "18%" }]} /><View style={[styles.forearm, { right: "18%" }]} />
      {posterior ? <View style={styles.spine} /> : <View style={styles.sternum} />}
      {muscle === "Biceps" && <>
        <View testID="highlight-biceps-left" style={[styles.biceps, { left: "23%" }]} />
        <View style={[styles.biceps, { right: "23%" }]} />
      </>}
      {muscle === "Triceps" && <>
        <View testID="highlight-triceps-left" style={[styles.triceps, { left: "21%" }]} />
        <View style={[styles.triceps, { right: "21%" }]} />
      </>}
      {muscle === "Chest" && <>
        <View testID="highlight-pectorals-left" style={[styles.pectoral, { left: "35%" }]} />
        <View style={[styles.pectoral, { right: "35%" }]} />
      </>}
      {muscle === "Back" && <>
        <View testID="highlight-back-trapezius" style={styles.trapezius} />
        <View style={[styles.lat, { left: "34%" }]} /><View style={[styles.lat, { right: "34%" }]} />
      </>}
    </View>
  </View>;
}
function MuscleCard({ muscle, onPress }: { muscle: TrainMuscle; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable testID={`train-muscle-card-${muscle}`} accessibilityRole="button"
    accessibilityLabel={`Choose ${muscle}, ${trainMuscleViews[muscle]}`} accessibilityHint="Opens equipment selection for this muscle"
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.card, focused && styles.focused, pressed && styles.pressed]}>
    <CategoryImage category={muscle} fallback={<MuscleArtwork muscle={muscle} />} />
    <Text style={styles.label}>{muscle}</Text>
  </Pressable>;
}
export function TrainMusclePicker({ onSelect }: { onSelect: (exercise: ExerciseName) => void }) {
  return <ExercisePicker selected={null} onSelect={onSelect} renderLauncher={(open) => <View style={styles.section}>
    <View style={ui.between}><Heading>Choose your workout</Heading>
      <TextButton label="See all" accessibilityLabel="See all muscle groups" onPress={() => open()} />
    </View>
    <View style={styles.gridRow}>{trainMuscles.slice(0, 2).map((muscle) => <MuscleCard key={muscle} muscle={muscle} onPress={() => open(muscle)} />)}</View>
    <View style={styles.gridRow}>{trainMuscles.slice(2).map((muscle) => <MuscleCard key={muscle} muscle={muscle} onPress={() => open(muscle)} />)}</View>
  </View>} />;
}
const styles = StyleSheet.create({
  section: { gap: spacing.sm }, gridRow: { flexDirection: "row", gap: spacing.sm },
  card: { flex: 1, minWidth: 0, minHeight: sizing.touch, padding: spacing.md, borderRadius: radii.card,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: "transparent", gap: spacing.sm },
  focused: { borderColor: colors.accent }, pressed: { opacity: feedback.pressedOpacity, backgroundColor: colors.elevated },
  label: { ...type.body, fontWeight: "600" },
  art: { width: "100%", aspectRatio: 5 / 3, backgroundColor: colors.elevated, borderRadius: radii.card, alignItems: "center", justifyContent: "center" },
  figure: { width: "76%", height: "96%" },
  head: { position: "absolute", left: "44%", top: "2%", width: "12%", height: "16%", borderRadius: 12, borderWidth: 1, borderColor: colors.secondaryText },
  neck: { position: "absolute", left: "48%", top: "18%", width: "4%", height: "6%", backgroundColor: colors.secondaryText },
  shoulders: { position: "absolute", left: "20%", top: "24%", width: "60%", height: "14%", borderRadius: 12, borderWidth: 1, borderColor: colors.secondaryText },
  torso: { position: "absolute", left: "32%", top: "26%", width: "36%", height: "62%", borderRadius: 8, borderWidth: 1, borderColor: colors.secondaryText, backgroundColor: colors.elevated },
  upperArm: { position: "absolute", top: "32%", width: "12%", height: "32%", borderRadius: 8, borderWidth: 1, borderColor: colors.secondaryText },
  forearm: { position: "absolute", top: "64%", width: "10%", height: "24%", borderRadius: 6, borderWidth: 1, borderColor: colors.secondaryText },
  sternum: { position: "absolute", left: "49%", top: "32%", width: "1%", height: "22%", backgroundColor: colors.border },
  spine: { position: "absolute", left: "49%", top: "28%", width: "1%", height: "52%", backgroundColor: colors.secondaryText },
  biceps: { position: "absolute", top: "38%", width: "6%", height: "20%", borderRadius: 6, backgroundColor: colors.accent },
  triceps: { position: "absolute", top: "34%", width: "9%", height: "27%", borderRadius: 6, backgroundColor: colors.accent },
  pectoral: { position: "absolute", top: "34%", width: "13%", height: "20%", borderRadius: 4, backgroundColor: colors.accent },
  trapezius: { position: "absolute", left: "36%", top: "27%", width: "28%", height: "12%", borderRadius: 4, backgroundColor: colors.accent },
  lat: { position: "absolute", top: "41%", width: "12%", height: "30%", borderRadius: 6, backgroundColor: colors.accent },
});
