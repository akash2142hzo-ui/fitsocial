import { Equipment, ExerciseId } from "./exerciseCatalog";

type BodyPosition = "standing" | "seated" | "supine-flat" | "supine-incline" | "supine-decline" | "prone" | "hanging" | "kneeling" | "floor-support";
function family<const Id extends string>(id: Id, equipment: Equipment, bodyPosition: BodyPosition,
  movement: string, exerciseIds: readonly ExerciseId[], reviewNotes: string) {
  return { id, equipment, bodyPosition, movement, exerciseIds, reviewNotes } as const;
}

// Artwork planning only. Membership NEVER grants permission to share an image.
// These explicit IDs are conservative candidates; unclassified exercises stay on fallback.
export const proposedIllustrationFamilies = [
  family("machine-horizontal-chest-press", "Machine", "seated", "Bilateral horizontal chest press", ["machine-chest-press"], "Show the seat, back support and horizontal press handles."),
  family("machine-pec-deck-fly", "Machine", "seated", "Bilateral chest fly", ["pec-deck-fly"], "Show the fly arc and pec-deck supports; not chest-press handles."),
  family("machine-incline-chest-press", "Machine", "supine-incline", "Incline chest press", ["incline-machine-chest-press"], "Verify machine support angle and upward press direction."),
  family("machine-decline-chest-press", "Machine", "supine-decline", "Decline chest press", ["decline-machine-chest-press"], "Verify decline body support and press direction for the depicted machine."),
  family("machine-converging-chest-press", "Machine", "seated", "Converging chest press", ["converging-machine-chest-press"], "Both arms press inward along converging machine paths."),
  family("machine-single-arm-chest-press", "Machine", "seated", "Unilateral horizontal chest press", ["single-arm-machine-chest-press"], "Only one working arm; do not reuse bilateral artwork."),
  family("barbell-flat-bench-press", "Barbell", "supine-flat", "Bilateral flat bench press", ["flat-barbell-bench-press", "paused-barbell-bench-press"], "A static movement pose can omit tempo only; verify grip and full bench support for each ID."),
  family("barbell-incline-bench-press", "Barbell", "supine-incline", "Incline bench press", ["incline-barbell-bench-press"], "Inclined bench and press direction must remain visible."),
  family("barbell-decline-bench-press", "Barbell", "supine-decline", "Decline bench press", ["decline-barbell-bench-press"], "Declined bench and leg support must remain visible."),
  family("dumbbell-flat-bench-press", "Dumbbell", "supine-flat", "Bilateral dumbbell bench press", ["flat-dumbbell-bench-press"], "Two dumbbells, supported flat bench; not unilateral or alternating."),
  family("dumbbell-incline-bench-press", "Dumbbell", "supine-incline", "Incline dumbbell bench press", ["incline-dumbbell-bench-press"], "Keep incline support distinct from flat/decline."),
  family("dumbbell-flat-fly", "Dumbbell", "supine-flat", "Dumbbell chest fly", ["dumbbell-chest-fly"], "Wide fly arc with slight elbow bend, not a press."),
  family("bodyweight-standard-push-up", "Bodyweight", "floor-support", "Standard push-up", ["push-up", "paused-push-up"], "Same hand placement/support; static art need not convey a pause. Exclude knee, weighted and wide variants."),
  family("cable-seated-row", "Cable", "seated", "Seated horizontal row", ["seated-cable-row", "neutral-grip-cable-row"], "Sharing requires the actual depicted grip, attachment and seated support to match both IDs."),
  family("cable-wide-lat-pulldown", "Cable", "seated", "Wide-grip vertical pulldown", ["wide-grip-lat-pulldown"], "Wide overhand grip; do not share with reverse/neutral/kneeling variants."),
  family("barbell-bent-row", "Barbell", "standing", "Bent-over bilateral row", ["barbell-bent-over-row"], "Hinged torso; exclude Pendlay, underhand and supported rows."),
  family("bodyweight-overhand-pull-up", "Bodyweight", "hanging", "Overhand pull-up", ["pull-up"], "Overhand grip, full suspended body; exclude chin-up and assisted/weighted variants."),
  family("dumbbell-seated-shoulder-press", "Dumbbell", "seated", "Bilateral overhead press", ["seated-dumbbell-shoulder-press"], "Seated support; not standing, Arnold rotation or single-arm."),
  family("dumbbell-standing-shoulder-press", "Dumbbell", "standing", "Bilateral overhead press", ["standing-dumbbell-shoulder-press"], "No leg drive; distinguish seated and push press."),
  family("dumbbell-standing-hammer-curl", "Dumbbell", "standing", "Neutral-grip elbow flexion", ["hammer-curl"], "Neutral grip; not supinated or cross-body curl."),
  family("barbell-standing-curl", "Barbell", "standing", "Supinated elbow flexion", ["barbell-biceps-curl"], "Standard grip, no preacher pad; exclude reverse and drag curls."),
  family("machine-preacher-curl", "Machine", "seated", "Supported elbow flexion", ["preacher-curl"], "Show machine and upper-arm support."),
  family("cable-rope-pushdown", "Cable", "standing", "Rope elbow extension", ["rope-triceps-pushdown"], "Rope attachment; not straight bar, reverse-grip or overhead."),
  family("barbell-back-squat", "Barbell", "standing", "Bilateral back squat", ["barbell-back-squat", "paused-back-squat", "tempo-back-squat"], "Static art may omit tempo/pause; verify stance/bar placement for each ID. Exclude box, pin, front and explicit high/low-bar variants."),
  family("bodyweight-squat", "Bodyweight", "standing", "Bilateral squat", ["bodyweight-squat", "paused-bodyweight-squat"], "Static art may omit pause; no load, assistance or single-leg stance."),
  family("machine-seated-leg-curl", "Machine", "seated", "Knee flexion", ["seated-leg-curl"], "Seated machine, two working legs; not lying or single-leg."),
  family("machine-lying-leg-curl", "Machine", "prone", "Knee flexion", ["lying-leg-curl"], "Prone machine, two working legs; not seated or standing."),
  family("barbell-romanian-deadlift", "Barbell", "standing", "Bilateral hip hinge", ["romanian-deadlift"], "Slight knee bend; distinguish conventional and stiff-leg deadlift."),
  family("bodyweight-glute-bridge", "Bodyweight", "supine-flat", "Bilateral hip extension", ["glute-bridge"], "Upper back on floor, two feet; not bench-supported hip thrust."),
  family("bodyweight-standing-calf-raise", "Bodyweight", "standing", "Bilateral plantar flexion", ["standing-calf-raise"], "No machine/load, both feet; exclude unilateral variants."),
  family("bodyweight-forearm-plank", "Bodyweight", "floor-support", "Prone anti-extension hold", ["plank", "rkc-plank"], "Verify forearm support for both; static art may omit contraction intensity, not limb position."),
  family("bodyweight-dead-hang", "Bodyweight", "hanging", "Passive hanging hold", ["dead-hang"], "Straight arms; not pull-up or active scapular hold."),
  family("kettlebell-bilateral-swing", "Kettlebell", "standing", "Two-hand hip-hinge swing", ["kettlebell-swing"], "Single bell in two hands; exclude single-arm and double-bell."),
  family("outdoor-walking", "Outdoor", "standing", "Walking gait", ["cardio-outdoor-walking", "cardio-brisk-walking"], "Shared static pose only if walking gait suits both; exclude running, hiking equipment and treadmill."),
  family("outdoor-running", "Outdoor", "standing", "Running gait", ["cardio-outdoor-running", "cardio-jogging"], "Static running pose must suit both; exclude sprint posture, trail terrain and treadmill."),
  family("treadmill-walking", "Treadmill", "standing", "Level treadmill walking", ["cardio-treadmill-walking"], "Show treadmill, level deck; not inclined deck or running gait."),
  family("treadmill-incline-walking", "Treadmill", "standing", "Incline treadmill walking", ["cardio-incline-treadmill-walking"], "Inclined deck must be visible; do not reuse level treadmill artwork."),
  family("rowing-erg", "Rowing machine", "seated", "Seated rowing stroke", ["cardio-rowing-machine"], "Show rowing erg and leg/handle motion; not outdoor boat rowing."),
  family("ski-erg", "Ski erg", "standing", "Standing double-pole pull", ["cardio-ski-erg"], "Show overhead cables and standing pull; not seated rowing."),
] as const;
export type IllustrationFamilyId = (typeof proposedIllustrationFamilies)[number]["id"];
