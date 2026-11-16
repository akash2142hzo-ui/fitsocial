import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { type } from "../theme/design";

// Original native-shape placeholder illustrations; no photos or image fetching.
// Decoration is hidden within the labelled, noninteractive preview cards.
function Decoration({ children }: { children: ReactNode }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">{children}</View>;
}
export function CoinArtwork() {
  return <Decoration><View style={styles.coin}><View style={styles.coinInner}><Text style={styles.coinLetter}>F</Text></View></View></Decoration>;
}
export function RewardArtwork({ kind }: { kind: "badge" | "frame" }) {
  return <Decoration>{kind === "badge" ? <View style={styles.badgeFrame}>
    <View style={[styles.ribbon, styles.ribbonLeft]} /><View style={[styles.ribbon, styles.ribbonRight]} />
    <View style={styles.medal}><Text style={styles.sparkle}>{"\u2726"}</Text></View>
  </View> : <View style={styles.profileFrame}>
    <View style={styles.frameHead} /><View style={styles.frameShoulders} />
    <View style={styles.frameAccent} />
  </View>}</Decoration>;
}
export function ProductArtwork({ kind }: { kind: "shirt" | "shaker" }) {
  return <Decoration><View style={styles.productFrame}><View style={styles.halo} />
    {kind === "shirt" ? <>
      <View style={[styles.sleeve, styles.sleeveLeft]} /><View style={[styles.sleeve, styles.sleeveRight]} />
      <View style={styles.shirtBody}><View style={styles.collar} /><Text style={styles.shirtMark}>FS</Text><View style={styles.hem} /></View>
    </> : <>
      <View style={styles.bottleBody}><View style={styles.bottleShine} /><View style={styles.bottleBand}><Text style={styles.bottleMark}>FS</Text></View></View>
      <View style={styles.bottleLid} /><View style={styles.bottleSpout} /><View style={styles.bottleLoop} />
    </>}
  </View></Decoration>;
}
const styles = StyleSheet.create({
  coin: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: colors.accent, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-12deg" }] },
  coinInner: { width: 32, height: 32, borderWidth: 1, borderColor: colors.accent, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  coinLetter: { ...type.heading, color: colors.accent, fontStyle: "italic" },
  badgeFrame: { width: 40, height: 40 },
  ribbon: { position: "absolute", width: 10, height: 16, top: 22, backgroundColor: colors.accentSurface },
  ribbonLeft: { left: 9, transform: [{ rotate: "22deg" }] },
  ribbonRight: { right: 9, transform: [{ rotate: "-22deg" }] },
  medal: { position: "absolute", top: 0, left: 4, width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center" },
  sparkle: { ...type.heading, color: colors.accent, fontSize: 22, lineHeight: 28 },
  profileFrame: { width: 36, height: 36, borderWidth: 2, borderColor: colors.accent, borderRadius: 12, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center", gap: 2 },
  frameHead: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.muted },
  frameShoulders: { width: 20, height: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: colors.muted },
  frameAccent: { position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: 2, backgroundColor: colors.accent, transform: [{ rotate: "45deg" }] },
  productFrame: { width: 112, height: 90, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 78, height: 78, borderRadius: 39, backgroundColor: colors.accentSurface, opacity: 0.6 },
  shirtBody: { position: "absolute", top: 19, left: 34, width: 44, height: 56, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.mutedText, borderRadius: 4, alignItems: "center" },
  sleeve: { position: "absolute", top: 18, width: 24, height: 24, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.mutedText, borderRadius: 3 },
  sleeveLeft: { left: 19, transform: [{ rotate: "28deg" }] },
  sleeveRight: { right: 19, transform: [{ rotate: "-28deg" }] },
  collar: { width: 16, height: 9, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 2, borderTopWidth: 0, borderColor: colors.mutedText, backgroundColor: colors.elevated, marginTop: -1 },
  shirtMark: { ...type.label, fontSize: 9, lineHeight: 14, color: colors.accent, marginTop: 7 },
  hem: { position: "absolute", bottom: 4, left: 4, right: 4, height: 1, backgroundColor: colors.border },
  bottleBody: { position: "absolute", top: 24, width: 34, height: 53, borderWidth: 1, borderColor: colors.mutedText, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: colors.background, overflow: "hidden" },
  bottleShine: { position: "absolute", top: 4, bottom: 4, left: 4, width: 3, backgroundColor: colors.border, borderRadius: 2 },
  bottleBand: { marginTop: 17, backgroundColor: colors.accentSurface, paddingVertical: 3, alignItems: "center" },
  bottleMark: { ...type.label, color: colors.accent, fontSize: 10, lineHeight: 14 },
  bottleLid: { position: "absolute", top: 18, width: 38, height: 9, backgroundColor: colors.accent, borderRadius: 3 },
  bottleSpout: { position: "absolute", top: 11, left: 47, width: 14, height: 9, backgroundColor: colors.accent, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  bottleLoop: { position: "absolute", top: 13, left: 68, width: 9, height: 15, borderWidth: 2, borderColor: colors.accent, borderRadius: 5 },
});
