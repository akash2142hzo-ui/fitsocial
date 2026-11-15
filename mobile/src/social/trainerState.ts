export const specializations = ["Strength training", "Bodyweight", "Endurance", "Mobility", "General fitness", "Powerlifting", "Running", "Cycling"] as const;
export const coachingModes = ["Online", "In person", "Both", "Not specified"] as const;
export const availabilityOptions = ["Open to inquiries", "Not accepting inquiries"] as const;
export const TRAINER_DISCLOSURE = "FitSocial has not verified this trainer's qualifications or experience.";
export const TRAINER_ACKNOWLEDGMENT = "I understand that FitSocial has not verified my trainer qualifications.";
export const trainerLimits = { displayName: 50, username: 24, bio: 160, experience: 400, qualifications: 400, location: 80 } as const;
export type TrainerTextField = keyof typeof trainerLimits;
export type TrainerProfile = Record<TrainerTextField, string> & {
  authorId: string; enabled: boolean; specializations: string[];
  coachingMode: typeof coachingModes[number]; availability: typeof availabilityOptions[number]; sample: boolean;
};
export type TrainerDraft = Omit<TrainerProfile, "authorId" | "enabled" | "sample"> & { acknowledged: boolean };
export type TrainerState = {
  profiles: Record<string, TrainerProfile>; draft: TrainerDraft | null; error: string | null; disabling: boolean;
  query: string; specialization: string; coachingMode: string;
};
export function createTrainerState(): TrainerState {
  return { profiles: {
    maya: { authorId: "maya", enabled: true, sample: true, displayName: "Maya R.", username: "maya_moves_demo", bio: "Morning walks and small wins.", specializations: ["Mobility", "General fitness"], experience: "Fictional sample: enjoys planning simple movement routines.", qualifications: "No qualifications supplied. Fictional example only.", coachingMode: "Online", location: "Sample region", availability: "Not accepting inquiries" },
    alex: { authorId: "alex", enabled: true, sample: true, displayName: "Alex T.", username: "alex_trains_demo", bio: "Trying new routines. Cheering on friends.", specializations: ["Strength training", "Bodyweight"], experience: "Fictional sample: interested in strength and bodyweight training.", qualifications: "No qualifications supplied. Fictional example only.", coachingMode: "Both", location: "", availability: "Not accepting inquiries" },
  }, draft: null, error: null, disabling: false, query: "", specialization: "All", coachingMode: "All" };
}
export type TrainerAction =
  | { type: "open"; authorId: string; displayName: string; username: string; bio: string }
  | { type: "edit"; field: TrainerTextField; value: string }
  | { type: "specialization"; value: string }
  | { type: "mode"; value: TrainerProfile["coachingMode"] }
  | { type: "availability"; value: TrainerProfile["availability"] }
  | { type: "acknowledge"; value: boolean }
  | { type: "save"; authorId: string; reservedUsernames: readonly string[] }
  | { type: "requestDisable" | "cancelDisable" | "confirmDisable"; authorId: string }
  | { type: "filter"; field: "query" | "specialization" | "coachingMode"; value: string };
export const cleanTrainerText = (text: string) => text.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "").trim();
export function validateTrainer(draft: TrainerDraft, reservedUsernames: readonly string[]): string | null {
  if (!draft.acknowledged) return "Acknowledge that your qualifications have not been verified.";
  for (const field of Object.keys(trainerLimits) as TrainerTextField[]) {
    if (draft[field].length > trainerLimits[field]) return field + " must be " + trainerLimits[field] + " characters or fewer.";
  }
  if (!cleanTrainerText(draft.displayName)) return "Enter a display name.";
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(draft.username.trim())) return "Use 3–24 letters, numbers or underscores for your username.";
  if (reservedUsernames.some((value) => value.toLowerCase() === draft.username.trim().toLowerCase())) return "That demo username is already used.";
  if (draft.specializations.length < 1 || draft.specializations.length > 4 || new Set(draft.specializations).size !== draft.specializations.length
    || draft.specializations.some((value) => !specializations.includes(value as typeof specializations[number]))) return "Choose 1 to 4 specializations.";
  if (!coachingModes.includes(draft.coachingMode) || !availabilityOptions.includes(draft.availability)) return "Choose a coaching mode and availability.";
  return null;
}
export function trainerReducer(state: TrainerState, action: TrainerAction): TrainerState {
  switch (action.type) {
    case "open": {
      if (state.draft) return state;
      const profile = state.profiles[action.authorId];
      return { ...state, error: null, draft: { displayName: profile?.displayName ?? action.displayName, username: profile?.username ?? action.username,
        bio: action.bio, experience: profile?.experience ?? "", qualifications: profile?.qualifications ?? "", location: profile?.location ?? "",
        specializations: [...(profile?.specializations ?? [])], coachingMode: profile?.coachingMode ?? "Not specified",
        availability: profile?.availability ?? "Not accepting inquiries", acknowledged: false } };
    }
    case "edit": return state.draft ? { ...state, error: null, draft: { ...state.draft, [action.field]: action.value } } : state;
    case "acknowledge": return state.draft ? { ...state, error: null, draft: { ...state.draft, acknowledged: action.value } } : state;
    case "specialization": {
      if (!state.draft || !specializations.includes(action.value as typeof specializations[number])) return state;
      const values = state.draft.specializations;
      if (!values.includes(action.value) && values.length >= 4) return { ...state, error: "Choose up to 4 specializations." };
      return { ...state, error: null, draft: { ...state.draft, specializations: values.includes(action.value) ? values.filter((v) => v !== action.value) : [...values, action.value] } };
    }
    case "mode": return state.draft && coachingModes.includes(action.value) ? { ...state, error: null, draft: { ...state.draft, coachingMode: action.value } } : state;
    case "availability": return state.draft && availabilityOptions.includes(action.value) ? { ...state, error: null, draft: { ...state.draft, availability: action.value } } : state;
    case "save": {
      if (!state.draft) return state;
      const error = validateTrainer(state.draft, action.reservedUsernames);
      if (error) return { ...state, error };
      const { acknowledged, ...draft } = state.draft;
      const fields = Object.fromEntries((Object.keys(trainerLimits) as TrainerTextField[]).map((field) => [field, cleanTrainerText(draft[field])])) as Record<TrainerTextField, string>;
      return { ...state, draft: null, error: null, disabling: false, profiles: { ...state.profiles, [action.authorId]: {
        ...draft, ...fields, specializations: [...draft.specializations], authorId: action.authorId, enabled: true, sample: false,
      } } };
    }
    case "requestDisable": return state.profiles[action.authorId]?.enabled ? { ...state, disabling: true } : state;
    case "cancelDisable": return { ...state, disabling: false };
    case "confirmDisable": return state.disabling && state.profiles[action.authorId] ? {
      ...state, disabling: false, draft: state.draft ? { ...state.draft, acknowledged: false } : null,
      profiles: { ...state.profiles, [action.authorId]: { ...state.profiles[action.authorId], enabled: false } },
    } : state;
    case "filter": {
      if (action.field === "query" && action.value.length > 80) return state;
      if (action.field === "specialization" && action.value !== "All" && !specializations.includes(action.value as typeof specializations[number])) return state;
      if (action.field === "coachingMode" && action.value !== "All" && !coachingModes.includes(action.value as typeof coachingModes[number])) return state;
      return { ...state, [action.field]: action.value };
    }
  }
}
export function discoverTrainers(state: TrainerState): TrainerProfile[] {
  const tokens = state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return Object.values(state.profiles).filter((profile) => profile.enabled
    && (state.specialization === "All" || profile.specializations.includes(state.specialization))
    && (state.coachingMode === "All" || profile.coachingMode === state.coachingMode || profile.coachingMode === "Both" && (state.coachingMode === "Online" || state.coachingMode === "In person"))
    && tokens.every((token) => [profile.displayName, profile.username, ...profile.specializations].join(" ").toLowerCase().includes(token)));
}
