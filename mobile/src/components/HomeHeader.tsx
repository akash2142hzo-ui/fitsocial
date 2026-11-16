import { Alert, StyleSheet, Text, View } from "react-native";
import { appName } from "../appInfo";
import { colors } from "../theme/colors";
import { spacing, type } from "../theme/design";
import { IconButton } from "./ui";

export function HomeHeader({ canGoBack, onGoBack }: { canGoBack: boolean; onGoBack: () => void }) {
  return <View testID="home-header" style={styles.header}>
    <View testID="home-header-left" style={styles.slot}>
      {canGoBack && <IconButton label="Back to previous screen" onPress={onGoBack} icon={<View style={styles.back} />} />}
    </View>
    <Text accessibilityRole="header" style={styles.title}>{appName}</Text>
    <View testID="home-header-right" style={styles.slot}>
      <IconButton label="Notifications" onPress={() => Alert.alert("Notifications coming soon", "Notifications are unavailable in this local demo. No device permissions are requested.", [{ text: "OK" }])}
        icon={<View testID="home-notification-bell" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.bell}>
          <View style={styles.bellTop} /><View style={styles.bellBody} /><View style={styles.bellRim} /><View style={styles.clapper} />
        </View>} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, gap: spacing.sm, minHeight: 48 },
  slot: { width: 48, minHeight: 48, flexShrink: 0, justifyContent: "center" },
  title: { ...type.title, flex: 1, minWidth: 0, textAlign: "center", paddingVertical: spacing.sm },
  bell: { width: 24, height: 24 },
  bellTop: { position: "absolute", width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, top: 1, left: 10 },
  bellBody: { position: "absolute", width: 14, height: 15, borderWidth: 1.8, borderColor: colors.accent, borderTopLeftRadius: 8, borderTopRightRadius: 8, top: 3, left: 5 },
  bellRim: { position: "absolute", width: 18, height: 2, borderRadius: 1, backgroundColor: colors.accent, top: 17, left: 3 },
  clapper: { position: "absolute", width: 4, height: 3, borderRadius: 2, backgroundColor: colors.accent, top: 20, left: 10 },
  back: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: colors.accent, transform: [{ rotate: "45deg" }] },
});
