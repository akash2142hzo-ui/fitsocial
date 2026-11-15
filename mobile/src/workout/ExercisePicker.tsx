import { ComponentRef, useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, EmptyState, Heading, Input, TextButton } from "../components/ui";
import { colors } from "../theme/colors";
import { feedback, radii, sizing, spacing, type, ui } from "../theme/design";
import { exerciseCatalog, ExerciseName } from "./exerciseCatalog";
import { categoryForMuscle, equipmentForCategory, equipmentLabel, guidedExercises, PickerCategory, pickerCategories, PickerEquipment } from "./exercisePickerModel";

type Step = 1 | 2 | 3;
export function ExercisePicker({ selected, onSelect }: { selected: ExerciseName | null; onSelect: (exercise: ExerciseName) => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<PickerCategory | null>(null);
  const [equipment, setEquipment] = useState<PickerEquipment>("All");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(8);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const equipmentOptions = category ? equipmentForCategory(category) : [];
  const results = category ? guidedExercises(category, equipment, query) : [];
  useEffect(() => {
    if (!open) return;
    Keyboard.dismiss();
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [open, step]);
  function close() { Keyboard.dismiss(); setOpen(false); }
  function back() {
    Keyboard.dismiss();
    if (step === 1) close();
    else setStep(step === 3 ? 2 : 1);
  }
  function chooseCategory(value: PickerCategory) {
    setCategory(value);
    if (equipment !== "All" && !equipmentForCategory(value).includes(equipment)) setEquipment("All");
    setLimit(8);
  }
  function launch() {
    // Seed Change exercise from the actual selection, without changing the workout.
    const entry = exerciseCatalog.find((exercise) => exercise.name === selected);
    setCategory(entry ? categoryForMuscle[entry.muscle] : null);
    setEquipment(entry ? entry.equipment : "All");
    setStep(1); setQuery(""); setLimit(8); setOpen(true);
  }
  return <View style={styles.stack}>
    {selected && <Heading>{selected}</Heading>}
    <Button label={selected ? "Change exercise" : "Add exercise"} secondary={!!selected} expanded={open} onPress={launch} />
    <Modal visible={open} animationType="none" onRequestClose={back}>
      <SafeAreaView style={styles.modal} accessibilityViewIsModal onAccessibilityEscape={close}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.navigation}>
            <View style={[styles.page, ui.between]}>
              <TextButton label="Back" accessibilityLabel={step === 1 ? "Back to workout" : step === 2 ? "Back to categories" : "Back to equipment"} onPress={back} />
              <TextButton label="Cancel" accessibilityLabel="Cancel exercise selection" onPress={close} />
            </View>
          </View>
          <ScrollView ref={scrollRef} key={step} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <View style={styles.page}>
              <Text accessibilityLiveRegion="polite" style={type.caption}>Step {step} of 3</Text>
              <Heading>{step === 1 ? "Muscle group / activity" : step === 2 ? "Available equipment" : "Choose an exercise"}</Heading>
              <View style={styles.progress} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {([1, 2, 3] as const).map((value) => <View key={value} style={[styles.segment, value <= step && styles.complete]} />)}
              </View>
              {step === 1 && <>
                <View style={styles.options}>
                  {pickerCategories.map((value) => <Button key={value} secondary label={value} accessibilityLabel={`Muscle category: ${value}`}
                    selected={category === value} onPress={() => chooseCategory(value)} />)}
                </View>
                <Button label="Continue" accessibilityLabel="Continue to equipment" disabled={!category} onPress={() => { if (category) setStep(2); }} />
              </>}
              {step === 2 && <>
                <Text style={type.caption}>{category}</Text>
                <View style={styles.options}>
                  {(["All", ...equipmentOptions] as const).map((value) => <Button key={value} secondary label={equipmentLabel(value)}
                    accessibilityLabel={`Equipment option: ${equipmentLabel(value)}`} selected={equipment === value}
                    onPress={() => { setEquipment(value); setLimit(8); }} />)}
                </View>
                <Button label="Continue" accessibilityLabel="Continue to exercises" onPress={() => setStep(3)} />
              </>}
              {step === 3 && category && <>
                <View style={ui.row}>
                  <TextButton label={category} accessibilityLabel={`Change category: ${category}`} onPress={() => setStep(1)} />
                  <TextButton label={equipmentLabel(equipment)} accessibilityLabel={`Change equipment: ${equipmentLabel(equipment)}`} onPress={() => setStep(2)} />
                </View>
                <Input accessibilityLabel="Search exercise names" value={query} onChangeText={(text) => { setQuery(text); setLimit(8); }}
                  maxLength={80} autoCorrect={false} placeholder="Search exercises" placeholderTextColor={colors.muted} selectionColor={colors.accent} returnKeyType="search" />
                <Text accessibilityLiveRegion="polite" style={type.caption}>{results.length} exercises match; showing {Math.min(limit, results.length)}</Text>
                {results.length === 0 && <EmptyState title="No matching exercises." detail="Clear your search or change the category or equipment.">
                  <Button secondary label={`Show all ${category} exercises`} onPress={() => {
                    setEquipment("All"); setQuery(""); setLimit(8); Keyboard.dismiss();
                  }} />
                </EmptyState>}
                {!!query && <TextButton label="Clear search" onPress={() => { setQuery(""); setLimit(8); Keyboard.dismiss(); }} />}
                {results.slice(0, limit).map((exercise) => <Pressable key={exercise.id} accessibilityRole="radio"
                  accessibilityLabel={`${exercise.name}, ${exercise.muscle}, ${exercise.equipment}`}
                  accessibilityHint="Select exercise and return to workout logging"
                  accessibilityState={{ checked: selected === exercise.name }} onPress={() => { onSelect(exercise.name); close(); }}
                  style={({ pressed }) => [styles.choice, selected === exercise.name && styles.selected, pressed && styles.pressed]}>
                  <Text style={type.heading}>{exercise.name}</Text>
                  <Text style={type.caption}>{exercise.muscle} / {exercise.equipment}{exercise.cardioCategory ? ` / ${exercise.cardioCategory}` : ""}</Text>
                  {categoryForMuscle[exercise.muscle] !== category && <Text style={type.caption}>Also targets {category}</Text>}
                  {selected === exercise.name && <Text style={styles.selectedLabel}>Selected</Text>}
                </Pressable>)}
                {results.length > limit && <Button secondary label="Show more exercises" onPress={() => setLimit((value) => value + 8)} />}
              </>}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  stack: { gap: spacing.sm }, fill: { flex: 1 },
  modal: { flex: 1, backgroundColor: colors.background },
  navigation: { alignItems: "center", paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  content: { flexGrow: 1, alignItems: "center", padding: spacing.lg, paddingBottom: Platform.OS === "android" ? sizing.touch : spacing.xl },
  page: { width: "100%", maxWidth: 720, gap: spacing.lg },
  progress: { flexDirection: "row", gap: spacing.xs },
  segment: { flex: 1, height: spacing.xs, borderRadius: 2, backgroundColor: colors.border }, complete: { backgroundColor: colors.accent },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: { minHeight: sizing.touch, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.border, justifyContent: "center", gap: spacing.xs },
  pressed: { opacity: feedback.pressedOpacity }, selected: { backgroundColor: colors.accentSurface, borderColor: colors.accent },
  selectedLabel: { ...type.label, color: colors.accent },
});
