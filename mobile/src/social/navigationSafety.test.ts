import { backIntent, exitIntent } from "./navigationSafety";

const context = { socialDraft: false, socialConfirming: false, workoutActive: false, workoutConfirming: false };
describe("social and workout navigation safety", () => {
  it("keeps ordinary tab back and welcome exit behavior", () => {
    expect(backIntent(context)).toBe("back");
    expect(exitIntent(context)).toBe("exit");
  });
  it("requires social draft confirmation even with a workout in memory", () => {
    const state = { ...context, socialDraft: true, workoutActive: true };
    expect(backIntent(state)).toBe("confirmSocial");
    expect(exitIntent(state)).toBe("confirmSocial");
    expect(backIntent({ ...state, socialConfirming: true })).toBe("cancelSocial");
  });
  it("retains the existing workout end/cancel behavior once social drafts are resolved", () => {
    const state = { ...context, workoutActive: true };
    expect(backIntent(state)).toBe("confirmWorkout");
    expect(exitIntent(state)).toBe("confirmWorkout");
    expect(backIntent({ ...state, workoutConfirming: true })).toBe("cancelWorkout");
  });
});
