import { validateBodyWeight } from "../workout/workoutMetrics";
import { authors, LOCAL_AUTHOR_ID } from "./sampleData";
import { LocalMedia, mediaValidationError } from "./localMedia";

export const profileLimits = { displayName: 50, username: 24, bio: 160, location: 80 } as const;
export const avatarOptions = ["Initials", "Move", "Strong", "Outdoors"] as const;
export type AvatarChoice = typeof avatarOptions[number];
export type LocalProfile = { displayName: string; username: string; location: string; avatar: AvatarChoice; photo?: LocalMedia | null };
export type FitnessPreferences = { heightCm: string; bodyWeightKg: string; units: "Metric" };
export type FutureVisibility = "Not set" | "Public" | "Private";
export type SettingsValues = LocalProfile & FitnessPreferences & { bio: string; futureVisibility: FutureVisibility };
export type SettingsDraft = { section: "profile" | "fitness" | "privacy"; original: SettingsValues; values: SettingsValues; error: string | null; confirming: boolean; photoPending?: string; photoUnavailableId?: string };
const persona = authors.find((author) => author.id === LOCAL_AUTHOR_ID)!;
export const initialProfile: LocalProfile = { displayName: persona.name, username: persona.username, location: "", avatar: "Initials", photo: null };
export const initialFitness: FitnessPreferences = { heightCm: "", bodyWeightKg: "", units: "Metric" };
export function settingsDirty(draft: SettingsDraft | null): boolean {
  return !!draft && ((draft.values.photo ?? null) !== (draft.original.photo ?? null)
    || (Object.keys(draft.values) as (keyof SettingsValues)[]).some((key) => key !== "photo" && draft.values[key] !== draft.original[key]));
}
export function validateSettings(draft: SettingsDraft, reservedUsernames: readonly string[]): string | null {
  const value = draft.values;
  if (draft.section === "profile") {
    if (!value.displayName.trim()) return "Enter a display name.";
    for (const field of Object.keys(profileLimits) as (keyof typeof profileLimits)[]) {
      if (value[field].length > profileLimits[field]) return `${field} must be ${profileLimits[field]} characters or fewer.`;
      if (/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value[field])) return "Remove unsupported control characters.";
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(value.username.trim())) return "Use 3–24 letters, numbers or underscores for your username.";
    if (reservedUsernames.some((name) => name.toLowerCase() === value.username.trim().toLowerCase())) return "That demo username is already used.";
    if (!avatarOptions.includes(value.avatar)) return "Choose an available avatar.";
    if (value.photo && (value.photo.kind !== "photo" || mediaValidationError(value.photo))) return "Choose another profile photo or remove it.";
    if (value.photo && draft.photoUnavailableId === value.photo.id) return "Profile photo is unavailable. Remove it or choose another photo.";
  } else if (draft.section === "privacy") {
    if (!["Not set", "Public", "Private"].includes(value.futureVisibility)) return "Choose an available future account preference.";
  } else {
    const height = value.heightCm.trim();
    if (height && (!/^\d{2,3}(?:\.\d{1,2})?$/.test(height) || Number(height) < 50 || Number(height) > 250)) return "Enter height from 50 to 250 cm, with up to two decimals, or leave blank.";
    const weight = validateBodyWeight(value.bodyWeightKg);
    if (!weight.valid) return weight.error;
    if (value.units !== "Metric") return "Only metric units are available in this demo.";
  }
  return null;
}
export function avatarInitials(profile: LocalProfile): string {
  if (profile.avatar === "Move") return "MV";
  if (profile.avatar === "Strong") return "ST";
  if (profile.avatar === "Outdoors") return "OD";
  if (profile.displayName === persona.name) return persona.initials;
  return profile.displayName.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] ?? "").join("").toUpperCase();
}
