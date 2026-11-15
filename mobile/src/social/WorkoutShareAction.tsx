import { Text } from "react-native";
import { Button } from "../components/ui";
import { type } from "../theme/design";
import { publishedWorkoutPost, SocialState, workoutDraft } from "./socialState";

export function WorkoutShareAction({ social, workoutId, onShare, secondary = true, identified = false }: {
  social: SocialState; workoutId: number; onShare: (id: number) => void; secondary?: boolean; identified?: boolean;
}) {
  if (publishedWorkoutPost(social, workoutId)) return <Text accessibilityLiveRegion="polite"
    accessibilityLabel={`Workout ${workoutId} shared to local Feed`} style={type.caption}>Shared</Text>;
  const draft = workoutDraft(social, workoutId);
  const label = draft ? "Resume workout draft" : "Share workout";
  return <Button secondary={secondary} label={label} accessibilityLabel={identified ? `${label} ${workoutId}` : label}
    onPress={() => onShare(workoutId)} />;
}
