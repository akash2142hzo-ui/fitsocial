import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing, type, ui } from "../theme/design";

export type FeedAdPlacement = Readonly<{ enabled: boolean; afterPostCount: number }>;
export const FEED_AD_PLACEMENT: FeedAdPlacement = Object.freeze({ enabled: false, afterPostCount: 3 });

// One candidate, strictly between organic posts. Feed is the only caller.
export function isSponsoredPosition(index: number, total: number, config = FEED_AD_PLACEMENT): boolean {
  return config.enabled && Number.isInteger(config.afterPostCount) && config.afterPostCount > 0
    && index + 1 === config.afterPostCount && index + 1 < total;
}

// No placeholder ad, SDK, network request, impression or click handling exists.
// Future native SDK-owned content must be provided explicitly after consent gating.
export function SponsoredContent({ enabled = false, renderNativeAd }: { enabled?: boolean; renderNativeAd?: () => ReactNode }) {
  if (!enabled || !renderNativeAd) return null;
  const content = renderNativeAd();
  if (!content) return null;
  return <View testID="sponsored-content" style={styles.slot}>
    <Text style={styles.label}>Sponsored</Text>{content}
  </View>;
}
const styles = StyleSheet.create({
  slot: { ...ui.card, borderWidth: 1, borderColor: colors.border, marginVertical: spacing.md, padding: spacing.lg },
  label: { ...type.caption, color: colors.muted },
});
