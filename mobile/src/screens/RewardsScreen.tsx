import { ReactNode, useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ProductArtwork, RewardArtwork } from "../components/RewardsArtwork";
import { Heading, IconButton } from "../components/ui";
import { colors } from "../theme/colors";
import { feedback, radii, spacing, type, ui } from "../theme/design";

type RewardPreview = { id: string; name: string; description: string; points: string; artwork: "badge" | "frame" };
type ProductPreview = { id: string; name: string; description: string; artwork: "shirt" | "shaker" };
// Display-only fixtures. Future product data can use this presentation model;
// commerce and earning/redemption rules belong outside this screen.
const rewards: readonly RewardPreview[] = [
  { id: "demo-badge", name: "Profile Badge", description: "A distinctive badge concept to give your fitness profile a personal touch.", points: "500 FP", artwork: "badge" },
  { id: "demo-frame", name: "Exclusive Profile Frame", description: "A lime-accented frame concept designed to make your profile stand out.", points: "1,000 FP", artwork: "frame" },
];
const products: readonly ProductPreview[] = [
  { id: "demo-shirt", name: "FitSocial Gym T-shirt", description: "A minimal FitSocial training tee concept for your gym-day look.", artwork: "shirt" },
  { id: "demo-shaker", name: "FitSocial Shaker Bottle", description: "A FitSocial shaker concept to complement your everyday training kit.", artwork: "shaker" },
];

function PreviewCard({ name, points, stacked, onPress, children }: { name: string; points?: string; stacked: boolean; onPress: () => void; children: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessible accessibilityRole="button" accessibilityLabel={`${name}${points ? `, ${points}` : ", illustrative product"}, Coming soon`}
    accessibilityHint="Opens a demo preview. No redemption or purchases available." onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.previewCard, stacked && styles.stackedCard, focused && styles.infoFocused, pressed && styles.cardPressed]}>
    {children}<View style={styles.cardCopy}><Text style={type.button}>{name}</Text>
      {points && <Text style={styles.points}>{points}</Text>}
      <View style={ui.between}><Text style={styles.status}>Coming soon</Text><Text accessible={false} style={styles.status}>{"\u203a"}</Text></View></View>
  </Pressable>;
}

export function RewardsScreen() {
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoFocused, setInfoFocused] = useState(false);
  const [details, setDetails] = useState<RewardPreview | ProductPreview | null>(null);
  function openDetails(item: RewardPreview | ProductPreview) { setInfoOpen(false); setDetails(item); }
  const { width, fontScale } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState<number | null>(null);
  // Measure the actual page for split-screen/tablets. Stack at larger text sizes
  // rather than clipping text or forcing fixed card heights.
  const singleColumn = (contentWidth ?? width - spacing.lg * 2) < 280 || fontScale > 1.35;
  return <View style={styles.screen} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
    <View style={styles.balanceCard}>
      <View style={ui.between}><Text style={type.button}>Your FitPoints</Text>
        <View style={styles.demoBadge}><Text style={styles.demoText}>Demo</Text></View></View>
      <View style={styles.balanceRow}><View accessible accessibilityLabel="Sample balance, 1,250 FitPoints" style={styles.balanceValue}>
        <Text style={styles.balance}>1,250 <Text style={styles.unit}>FP</Text></Text>
      </View><Pressable testID="fitpoints-info-button" accessibilityRole="button" accessibilityLabel="About FitPoints" accessibilityHint="Opens planned ways to earn FitPoints"
          accessibilityState={{ expanded: infoOpen }} onPress={() => { setDetails(null); setInfoOpen(true); }}
          onFocus={() => setInfoFocused(true)} onBlur={() => setInfoFocused(false)}
          style={({ pressed }) => [styles.infoButton, infoFocused && styles.infoFocused, pressed && styles.infoPressed]}>
          <View testID="fitpoints-info-visual" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.infoVisual}>
            <Text style={styles.infoGlyph} maxFontSizeMultiplier={1}>{"\u2139"}</Text>
          </View>
        </Pressable></View>
    </View>
    <View style={ui.stack}>
      <Heading>Reward previews</Heading>
      <View testID="reward-preview-grid" style={[styles.grid, singleColumn && styles.singleColumn]}>
        {rewards.map((reward) => <PreviewCard key={reward.id} name={reward.name} points={reward.points} stacked={singleColumn} onPress={() => openDetails(reward)}>
          <View style={styles.rewardArt}><RewardArtwork kind={reward.artwork} /></View>
        </PreviewCard>)}
      </View>
    </View>
    <View style={ui.stack}>
      <View style={styles.shopHeading}><Heading>FitSocial Shop</Heading><Text style={type.caption}>Gear up. Stand out.</Text></View>
      <View testID="shop-preview-grid" style={[styles.grid, singleColumn && styles.singleColumn]}>
        {products.map((product) => <PreviewCard key={product.id} name={product.name} stacked={singleColumn} onPress={() => openDetails(product)}>
          <View style={styles.productArt}><ProductArtwork kind={product.artwork} /></View>
        </PreviewCard>)}
      </View>
    </View>
    <Text style={styles.disclosure}>FitPoints, rewards and products are examples. Earning, redemption, checkout and purchases are unavailable.</Text>
    <Modal visible={infoOpen} transparent animationType="none" onRequestClose={() => setInfoOpen(false)}>
      <SafeAreaView style={styles.modalBackdrop}>
        <View style={styles.infoSheet} accessibilityViewIsModal onAccessibilityEscape={() => setInfoOpen(false)}>
          <View style={styles.modalHeader}><View style={styles.modalTitle}><Heading>How to earn FitPoints</Heading></View>
            <IconButton label="Close FitPoints information" onPress={() => setInfoOpen(false)} icon={<Text style={type.heading}>{"\u00d7"}</Text>} /></View>
          <ScrollView style={styles.infoScroll} contentContainerStyle={styles.infoContent}>
            <Text style={type.caption}>Planned ways to earn</Text>
            {[
              { icon: "\u2713", title: "Eligible workouts", detail: "Complete eligible workouts." },
              { icon: "\u2197", title: "Daily progress", detail: "Track daily fitness progress." },
              { icon: "\u2691", title: "Weekly challenges", detail: "Complete weekly challenges." },
              { icon: "\u2194", title: "Share your progress", detail: "Share daily or weekly fitness progress to other social media platforms. Sharing verification is not available." },
            ].map((activity) => <View key={activity.title} style={styles.activityRow}>
              <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.activityIcon}><Text style={styles.activityGlyph}>{activity.icon}</Text></View>
              <View style={styles.activityCopy}><Text style={type.button}>{activity.title}</Text><Text style={type.caption}>{activity.detail}</Text></View>
            </View>)}
            <Text style={styles.infoDisclaimer}>FitPoints earning is coming soon. Current balances and rewards are examples.</Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
    <Modal visible={details !== null} transparent animationType="none" onRequestClose={() => setDetails(null)}>
      {details && <SafeAreaView style={styles.modalBackdrop}>
        <View style={styles.infoSheet} accessibilityViewIsModal onAccessibilityEscape={() => setDetails(null)}>
          <View style={styles.modalHeader}><View style={styles.modalTitle}><Heading>{details.name}</Heading></View>
            <IconButton label="Close preview" onPress={() => setDetails(null)} icon={<Text style={type.heading}>{"\u00d7"}</Text>} /></View>
          <ScrollView style={styles.infoScroll} contentContainerStyle={styles.infoContent}>
            <View style={[styles.detailArt, !("points" in details) && styles.productDetailArt]}>
              <View style={"points" in details ? styles.rewardZoom : styles.productZoom}>
                {"points" in details ? <RewardArtwork kind={details.artwork} /> : <ProductArtwork kind={details.artwork} />}
              </View>
            </View>
            {"points" in details && <Text style={styles.points}>Sample requirement: {details.points}</Text>}
            <Text style={type.body}>{details.description}</Text>
            <Text style={styles.status}>Coming soon</Text>
            <Text style={styles.infoDisclaimer}>{"points" in details ? "Demo preview only. Redemption is unavailable." : "Illustrative product only. Checkout and purchases are unavailable."}</Text>
          </ScrollView>
        </View>
      </SafeAreaView>}
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  infoButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control, borderWidth: 1, borderColor: "transparent", flexShrink: 0 },
  infoVisual: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  infoGlyph: { ...type.heading, color: colors.accent, fontSize: 22, lineHeight: 28 },
  infoFocused: { borderColor: colors.text },
  infoPressed: { opacity: feedback.pressedOpacity },
  cardPressed: { opacity: feedback.pressedOpacity, backgroundColor: colors.elevated },
  detailArt: { minHeight: 80, alignItems: "center", justifyContent: "center", backgroundColor: colors.elevated, borderRadius: radii.card },
  productDetailArt: { minHeight: 164 },
  rewardZoom: { transform: [{ scale: 1.4 }] },
  productZoom: { transform: [{ scale: 1.6 }] },
  modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg, backgroundColor: "rgba(0, 0, 0, 0.72)" },
  infoSheet: { width: "100%", maxWidth: 420, maxHeight: "85%", backgroundColor: colors.surface, borderRadius: radii.modal, borderWidth: 1, borderColor: colors.border, overflow: "hidden", flexShrink: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  modalTitle: { flex: 1, minWidth: 0 },
  infoContent: { padding: spacing.lg, gap: spacing.lg },
  infoScroll: { flexGrow: 0, flexShrink: 1 },
  activityRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  activityCopy: { flex: 1, minWidth: 0, gap: 2 },
  activityIcon: { width: 30, height: 30, borderRadius: radii.control, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center" },
  activityGlyph: { ...type.heading, color: colors.accent },
  infoDisclaimer: { ...type.caption, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  balanceCard: { ...ui.card, padding: spacing.lg, backgroundColor: colors.accentSurface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  demoBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, backgroundColor: colors.background },
  demoText: { ...type.caption, fontSize: 10, lineHeight: 16 },
  balanceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  balanceValue: { flex: 1, minWidth: 0 },
  balance: { ...type.title, fontSize: 30, lineHeight: 38, fontVariant: ["tabular-nums"], color: colors.accent },
  unit: { ...type.heading, color: colors.accent },
  grid: { flexDirection: "row", gap: spacing.md, alignItems: "stretch" },
  singleColumn: { flexDirection: "column" },
  previewCard: { ...ui.card, flex: 1, minWidth: 0, padding: 0, gap: 0, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  stackedCard: { flex: 0 },
  cardCopy: { padding: spacing.md, gap: spacing.xs },
  points: { ...type.label, color: colors.accent },
  status: { ...type.caption, fontSize: 11, lineHeight: 16 },
  rewardArt: { height: 58, paddingHorizontal: spacing.md, paddingTop: spacing.md, justifyContent: "center", alignItems: "flex-start" },
  shopHeading: { gap: 2 },
  productArt: { height: 104, alignItems: "center", justifyContent: "center", backgroundColor: colors.elevated },
  disclosure: { ...type.caption, fontSize: 11, lineHeight: 17, paddingHorizontal: spacing.xs },
});
