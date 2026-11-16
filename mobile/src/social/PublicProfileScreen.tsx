import { ProfileAvatar } from "./ProfileAvatar";
import { useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, EmptyState } from "../components/ui";
import { colors } from "../theme/colors";
import { feedback, radii, spacing, type, ui } from "../theme/design";
import { AuthorNavigationProps, PostCard, SocialProps } from "./SocialScreens";
import { followStats, postsForAuthor } from "./profileState";
import { LOCAL_AUTHOR_ID } from "./sampleData";
import { identityFor } from "./trainerIdentity";
import { TRAINER_DISCLOSURE } from "./trainerState";

// Illustration only: deliberately independent of activity, rewards and stored state.
export function PublicProfileScreen({ authorId, social, onSocialAction, onOpenAuthor }: SocialProps & AuthorNavigationProps & { authorId: string }) {
  const [trainerOpen, setTrainerOpen] = useState(false);
  const author = identityFor(social, authorId);
  if (!author) return <EmptyState title="Profile unavailable." />;
  const posts = postsForAuthor(social, authorId);
  const follow = followStats(social, authorId);
  const trainer = social.trainers.profiles[authorId];
  const location = authorId === LOCAL_AUTHOR_ID ? social.localProfile.location : trainer?.location;
  const close = () => setTrainerOpen(false);
  return <View testID="public-profile" style={styles.stack}>
    <View testID="public-profile-card" style={styles.profileCard}>
      <View testID="public-profile-identity" style={styles.identity}>
        <ProfileAvatar initials={author.initials} photo={author.photo} size={56} />
        <View style={styles.counts} accessibilityLiveRegion="polite">
          {[{ value: posts.length, label: "Posts" }, { value: follow.followers, label: "Followers" }, { value: follow.following, label: "Following" }].map(({ value, label }) =>
            <View key={label} accessible accessibilityLabel={`${value} ${label}`} style={styles.stat}>
              <Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text>
            </View>)}
        </View>
      </View>
      <View style={styles.bio}>
        <View testID="public-profile-name" style={styles.nameRow}><Text accessibilityRole="header" style={styles.name}>{author.name}</Text>
          {trainer?.enabled && <Text style={styles.trainerBadge}>Trainer · Unverified</Text>}</View>
        <Text style={type.body}>{author.bio || "No bio yet."}</Text>
        {!!location && <View testID="public-profile-location" style={styles.location}>
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.locationIcon}><View style={styles.locationDot} /></View>
          <Text style={styles.locationText}>{location}</Text>
        </View>}
        <Text style={styles.caption}>Fictional profile · Demo identity</Text>
      </View>
      <View testID="public-profile-actions" style={styles.actions}>
        {authorId !== LOCAL_AUTHOR_ID && <ProfileAction label={follow.followedLocally ? "Following" : "Follow"}
          accessibilityLabel={follow.followedLocally ? "Unfollow locally" : "Follow locally"}
          accessibilityHint="Changes this demo session only" selected={follow.followedLocally}
          onPress={() => onSocialAction({ type: "setFollow", authorId, following: !follow.followedLocally })} />}
        {trainer?.enabled && <ProfileAction secondary label="Trainer Info" expanded={trainerOpen} onPress={() => setTrainerOpen(true)} />}
      </View>
      <View testID="demo-account-level" style={styles.level}>
        <View testID="public-profile-level-heading" style={styles.levelHeading}><View style={styles.levelTitle}><Text style={styles.levelNumber}>Level 4</Text><Text style={styles.rank}>Active Mover</Text></View><Text style={styles.demoBadge}>Demo</Text></View>
        <View accessible accessibilityRole="progressbar" accessibilityLabel="Illustrative XP progress, 40 percent. Demo only."
          accessibilityValue={{ min: 0, max: 100, now: 40 }} style={styles.track}><View style={styles.fill} /></View>
        <Text accessibilityLabel="Illustrative XP · Not earned or saved. XP is separate from spendable FitPoints." style={styles.caption}>Illustrative XP · Not earned or saved</Text>
      </View>
    </View>
    <View testID="public-profile-posts-heading" style={styles.postsHeading}><Text accessibilityRole="header" style={type.heading}>Posts</Text><Text style={styles.caption}>{posts.length}</Text></View>
    {!posts.length && <EmptyState title="No posts yet." />}
    {posts.map((post) => <PostCard key={post.id} post={post} social={social} onSocialAction={onSocialAction} onOpenAuthor={onOpenAuthor} />)}
    {trainer?.enabled && <Modal visible={trainerOpen} transparent animationType="none" onRequestClose={close}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={close}>
          <View style={ui.between}><Text accessibilityRole="header" style={type.heading}>Trainer Info</Text><Button secondary label="Close Trainer Info" onPress={close} /></View>
          <ScrollView contentContainerStyle={styles.stack}>
            <Text style={styles.badge}>{trainer.sample ? "Sample · Unverified trainer" : "Unverified trainer"}</Text>
            <Text style={type.caption}>{TRAINER_DISCLOSURE}</Text>
            <Text style={type.label}>Specialties</Text><Text style={type.body}>{trainer.specializations.join(" · ")}</Text>
            <Text style={type.caption}>{trainer.coachingMode}{trainer.location ? " · " + trainer.location : ""}</Text>
            <Text style={type.caption}>{trainer.availability} · Self-reported; inquiries are not connected.</Text>
            <Text style={type.label}>Experience (self-reported)</Text><Text style={type.body}>{trainer.experience || "Not provided"}</Text>
            <Text style={type.label}>Self-reported qualifications</Text><Text style={type.body}>{trainer.qualifications || "Not provided"}</Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>}
  </View>;
}

function ProfileAction({ label, accessibilityLabel = label, accessibilityHint, selected = false, secondary = false, expanded, onPress }: {
  label: string; accessibilityLabel?: string; accessibilityHint?: string; selected?: boolean; secondary?: boolean; expanded?: boolean; onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}
    accessibilityState={{ selected, expanded }} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.action, secondary && styles.secondaryAction, selected && styles.selectedAction,
      focused && styles.focusedAction, pressed && styles.pressedAction]}>
    <Text style={[styles.actionLabel, secondary && styles.secondaryLabel, selected && styles.selectedLabel]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm, minWidth: 0 },
  profileCard: { ...ui.card, minWidth: 0, gap: spacing.sm, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  counts: { flex: 1, minWidth: 0, flexDirection: "row", gap: spacing.xs },
  stat: { flex: 1, minWidth: 0, alignItems: "center", gap: 2 },
  statValue: { ...type.metric, fontSize: 16, lineHeight: 22, textAlign: "center" },
  statLabel: { ...type.caption, fontSize: 11, lineHeight: 16, textAlign: "center", flexShrink: 1 },
  bio: { gap: spacing.xs, minWidth: 0 },
  nameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs },
  name: { ...type.heading, flexShrink: 1 },
  trainerBadge: { ...type.label, fontSize: 10, lineHeight: 14, color: colors.muted, backgroundColor: colors.elevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 1 },
  location: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { ...type.caption, flex: 1, minWidth: 0 },
  locationIcon: { width: 10, height: 12, borderWidth: 1, borderColor: colors.muted, borderRadius: 6, borderBottomRightRadius: 1, transform: [{ rotate: "45deg" }], alignItems: "center", justifyContent: "center", marginHorizontal: 2 },
  locationDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted },
  actions: { flexDirection: "row", alignItems: "stretch", gap: spacing.sm },
  action: { flex: 1, minWidth: 0, minHeight: 48, alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.control, borderWidth: 2, borderColor: "transparent", backgroundColor: colors.accent },
  secondaryAction: { backgroundColor: colors.elevated, borderColor: colors.border },
  selectedAction: { backgroundColor: colors.accentSurface, borderColor: colors.accent },
  focusedAction: { borderColor: colors.text },
  pressedAction: { opacity: feedback.pressedOpacity },
  actionLabel: { ...type.button, color: colors.background, textAlign: "center", flexShrink: 1 },
  secondaryLabel: { color: colors.text },
  selectedLabel: { color: colors.accent },
  caption: { ...type.caption, fontSize: 11, lineHeight: 16 },
  badge: { ...type.label, color: colors.accent, fontSize: 11, lineHeight: 16, flexShrink: 1 },
  level: { ...ui.card, minWidth: 0, gap: spacing.xs, backgroundColor: colors.background },
  levelNumber: { ...type.label, color: colors.accent, flexShrink: 1 },
  levelHeading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  levelTitle: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rank: { ...type.body, fontWeight: "600", flexShrink: 1 },
  demoBadge: { ...type.label, color: colors.accent, fontSize: 10, lineHeight: 14, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.accentSurface, flexShrink: 1 },
  track: { height: 4, marginVertical: spacing.xs, borderRadius: 4, overflow: "hidden", backgroundColor: colors.border },
  fill: { height: "100%", width: "40%", backgroundColor: colors.accent },
  postsHeading: { ...ui.between, paddingTop: spacing.xs },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end", padding: spacing.lg },
  sheet: { ...ui.card, width: "100%", maxWidth: 720, maxHeight: "85%", alignSelf: "center" },
});
