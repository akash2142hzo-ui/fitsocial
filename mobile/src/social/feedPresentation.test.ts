import { createWorkoutAttachment } from "../workout/workoutSharing";
import { formatPostTimestamp, formatSharePreview } from "./feedPresentation";
import { Post } from "./models";
import { LOCAL_AUTHOR_ID, samplePosts } from "./sampleData";

function workoutPost(caption = "A little momentum"): Post {
  return {
    id: "local-preview", authorId: LOCAL_AUTHOR_ID, text: caption, createdAt: Date.UTC(2026, 10, 14, 12), origin: "local", achievementId: null,
    workout: createWorkoutAttachment({ id: 7, sets: [
      { id: 1, exerciseId: "dumbbell-row", exercise: "Row", reps: 8, weight: 20.5 },
      { id: 2, exerciseId: "dumbbell-row", exercise: "Row", reps: 10, weight: 0 },
      { id: 3, exerciseId: "push-up", exercise: "Push-up", reps: 12, weight: null },
    ] }),
  };
}
describe("local share preview presentation", () => {
  it("labels fictional sample posts and achievements without implying a real workout", () => {
    const preview = formatSharePreview(samplePosts[0]);
    expect(preview).toContain("Fictional sample post");
    expect(preview).toContain("Fictional sample:");
    expect(preview).toContain("Nothing is sent, uploaded, or saved.");
    expect(preview).not.toContain("Actual completed local workout");
  });
  it("includes the actual workout, totals and weights, preserving zero versus unrecorded", () => {
    const preview = formatSharePreview(workoutPost());
    expect(preview).toContain("Actual completed local workout 7");
    expect(preview).toContain("2 exercises · 3 rep sets · 30 reps");
    expect(preview).toContain("Row");
    expect(preview).toContain("Push-up");
    expect(preview).toContain("Set 1: 8 reps · 20.5 kg");
    expect(preview).toContain("Set 2: 10 reps · 0 kg");
    expect(preview).toContain("Set 1: 12 reps · weight not recorded");
    expect(preview).toContain("A little momentum");
  });
  it("supports caption-free workout posts without mutating the post or mixing fictional achievements", () => {
    const post = { ...workoutPost(""), achievementId: "sample-session" };
    const before = JSON.stringify(post);
    const preview = formatSharePreview(post);
    expect(preview).toContain("Your local post");
    expect(preview).toContain("2026-11-14T12:00:00.000Z");
    expect(preview).not.toContain("Fictional sample:");
    expect(JSON.stringify(post)).toBe(before);
  });
  it("preserves plain post text without inventing attachments", () => {
    const { workout: attachment, ...post } = workoutPost("Plain post\nSecond line");
    expect(attachment).toBeDefined();
    const preview = formatSharePreview(post);
    expect(preview).toContain("Plain post\nSecond line");
    expect(preview).not.toContain("Actual completed local workout");
    expect(preview).not.toContain("Fictional sample:");
  });
});

describe("compact post timestamps", () => {
  const now = Date.UTC(2026, 10, 14, 12);
  it.each([[0, "Now"], [59_999, "Now"], [60_000, "1m"], [3_599_999, "59m"], [3_600_000, "1h"], [86_399_999, "23h"]] as const)("formats age %s", (age, expected) => {
    expect(formatPostTimestamp(now - age, now)).toBe(expected);
  });
  it("uses calendar dates for older or future sample posts without inventing recent activity", () => {
    expect(formatPostTimestamp(now + 86_400_000, now)).not.toBe("Now");
    expect(formatPostTimestamp(now - 86_400_000, now)).not.toContain("h");
    expect(formatPostTimestamp(Date.UTC(2025, 0, 1), now)).toContain("2025");
  });
  it.each([NaN, Infinity, -1])("handles invalid post timestamps %s", (at) => {
    expect(formatPostTimestamp(at, now)).toBe("Time unavailable");
  });
});
