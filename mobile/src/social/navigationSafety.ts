type NavigationContext = {
  socialDraft: boolean;
  socialConfirming: boolean;
  workoutActive: boolean;
  workoutConfirming: boolean;
};
export function backIntent(context: NavigationContext) {
  if (context.socialConfirming) return "cancelSocial";
  if (context.socialDraft) return "confirmSocial";
  if (context.workoutActive) return context.workoutConfirming ? "cancelWorkout" : "confirmWorkout";
  return "back";
}
export function exitIntent(context: NavigationContext) {
  if (context.socialDraft) return "confirmSocial";
  if (context.workoutActive) return "confirmWorkout";
  return "exit";
}
