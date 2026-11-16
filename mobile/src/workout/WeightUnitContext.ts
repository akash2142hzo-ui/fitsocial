import { createContext } from "react";
import { WeightUnit } from "./weightUnits";

// Display preference only. Logged weights are always kilograms; no profile setting.
export const WeightUnitContext = createContext<WeightUnit>("kg");
