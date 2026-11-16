import { ImageSourcePropType } from "react-native";
import { PickerCategory } from "../workout/exercisePickerModel";

type CategoryImageAsset = { source: ImageSourcePropType; width: number; height: number };
// Prepared copies of owner-supplied JPEGs; original files remain in assets/photos.
// Exact canonical category keys; all Metro require paths are static.
export const categoryImages = {
  Chest: { source: require("../../assets/muscles/chest.jpg"), width: 753, height: 768 },
  Triceps: { source: require("../../assets/muscles/triceps.jpg"), width: 683, height: 768 },
  Back: { source: require("../../assets/muscles/back.jpg"), width: 726, height: 768 },
  Biceps: { source: require("../../assets/muscles/biceps.jpg"), width: 710, height: 768 },
  Forearms: { source: require("../../assets/muscles/forearms.jpg"), width: 556, height: 768 },
  Legs: { source: require("../../assets/muscles/legs.jpg"), width: 581, height: 768 },
  Cardio: { source: require("../../assets/muscles/cardio.jpg"), width: 585, height: 768 },
  Shoulders: { source: require("../../assets/muscles/shoulders.jpg"), width: 768, height: 720 },
  Core: { source: require("../../assets/muscles/abs.jpg"), width: 750, height: 768 },
  "Full Body": { source: require("../../assets/muscles/full_body.jpg"), width: 442, height: 768 },
} as const satisfies Record<PickerCategory, CategoryImageAsset>;
// Equal 5:3 Train crops; thumbnail sources above remain unchanged for all ten categories.
export const trainCategoryImages = {
  Chest: { source: require("../../assets/muscles/train/chest.jpg"), width: 800, height: 480 },
  Back: { source: require("../../assets/muscles/train/back.jpg"), width: 800, height: 480 },
  Biceps: { source: require("../../assets/muscles/train/biceps.jpg"), width: 800, height: 480 },
  Triceps: { source: require("../../assets/muscles/train/triceps.jpg"), width: 800, height: 480 },
} as const satisfies Partial<Record<PickerCategory, CategoryImageAsset>>;
export function categoryImageFor(category: string, presentation: "thumbnail" | "train" = "thumbnail"): CategoryImageAsset | undefined {
  if (presentation === "train" && Object.prototype.hasOwnProperty.call(trainCategoryImages, category)) {
    return trainCategoryImages[category as keyof typeof trainCategoryImages];
  }
  return Object.prototype.hasOwnProperty.call(categoryImages, category) ? categoryImages[category as PickerCategory] : undefined;
}
