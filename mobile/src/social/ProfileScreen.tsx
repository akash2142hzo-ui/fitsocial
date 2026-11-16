import { ProfileAvatar } from "./ProfileAvatar";
import { visiblePosts } from "./socialState";
import { TrainerDetails } from "./TrainerScreens";
import { identityFor } from "./trainerIdentity";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, EmptyState, Heading } from "../components/ui";
import { TabId } from "../navigation/navigationState";
import { feedback, spacing, type, ui } from "../theme/design";
import { colors } from "../theme/colors";
import { CompletedWorkout } from "../workout/workoutState";
import { followStats } from "./profileState";
import { LOCAL_AUTHOR_ID } from "./sampleData";
import { AuthorNavigationProps, PostCard, SocialProps } from "./SocialScreens";
import { PublicProfileScreen } from "./PublicProfileScreen";

type ProfileProps = SocialProps & AuthorNavigationProps & {
  history: readonly CompletedWorkout[]; authorId?: string; publicView?: boolean; onNavigate: (tab: TabId) => void;
};
export function ProfileScreen({ social, onSocialAction: send, authorId = LOCAL_AUTHOR_ID, publicView = false, onOpenAuthor, onNavigate }: ProfileProps) {
  if (publicView || authorId !== LOCAL_AUTHOR_ID) return <PublicProfileScreen authorId={authorId} social={social} onSocialAction={send} onOpenAuthor={onOpenAuthor} />;
  const author = identityFor(social, authorId);
  if (!author) return <EmptyState title="Profile unavailable." />;
  const posts = visiblePosts({ ...social, filter: "local", feedQuery: "" });
  const follow = followStats(social, authorId);
  return <View testID="personal-profile" style={styles.stack}>
    <View testID="personal-profile-header" style={styles.profileHeader}>
      <View testID="personal-profile-identity" style={styles.identity}>
        <ProfileAvatar initials={author.initials} photo={author.photo} size={66} />
        <View accessibilityLiveRegion="polite" style={styles.socialStats}>
          {[{ value: posts.length, label: "Posts" }, { value: follow.followers, label: "Followers" }, { value: follow.following, label: "Following" }].map(({ value, label }) =>
            <View key={label} accessible accessibilityLabel={`${value} ${label}`} style={styles.stat}>
              <Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text>
            </View>)}
        </View>
      </View>
      <View style={styles.identityText}>
        <Heading>{author.name}</Heading>
        <Text style={type.caption}>@{author.username}</Text>
        <Text style={type.body}>{social.localBio || "No bio yet."}</Text>
        {!!social.localProfile.location && <Text style={type.caption}>{social.localProfile.location}</Text>}
      </View>
      <ProfileControls onEdit={() => { send({ type: "openSettingsEditor", section: "profile" }); onNavigate("settings"); }} />
    </View>
    <QuickAccess social={social} onSocialAction={send} onNavigate={onNavigate} />
    <View style={ui.between}><Heading>My Posts</Heading><Text style={type.caption}>{posts.length}</Text></View>
    {posts.length === 0 && <EmptyState title="No posts yet.">
      <Button secondary label="Create a post" onPress={() => onNavigate("create")} />
    </EmptyState>}
    {posts.map((post) => <PostCard key={post.id} post={post} social={social} onSocialAction={send} onOpenAuthor={onOpenAuthor} />)}
  </View>;
}

function ProfileControls({ onEdit }: { onEdit: () => void }) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.controls}>
    <View testID="personal-profile-controls" style={styles.controlRow}>
      <View testID="personal-profile-level" style={styles.level}>
        <Text accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" maxFontSizeMultiplier={1} style={styles.lightning}>{"\u26a1\ufe0e"}</Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.levelTitle}>Lv. 4</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2} style={styles.levelRank}>Active Mover</Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.demoBadge}>Demo</Text>
        <View accessible accessibilityRole="progressbar" accessibilityLabel="Level 4, Active Mover. Illustrative XP progress, 40 percent. Demo only. Not earned or saved. XP is separate from spendable FitPoints."
          accessibilityValue={{ min: 0, max: 100, now: 40 }} style={styles.track}><View style={styles.fill} /></View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={onEdit}
        hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={({ pressed }) => [styles.editButton, focused && styles.focused, pressed && styles.pressed]}>
        <Text accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" maxFontSizeMultiplier={1} style={styles.pencil}>{"\u270e"}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={styles.editLabel}>Edit</Text>
      </Pressable>
    </View>
  </View>;
}

function QuickAccess({ social, onSocialAction, onNavigate }: SocialProps & { onNavigate: (tab: TabId) => void }) {
  const [open, setOpen] = useState(false);
  const drafts = social.drafts.length + (social.composer ? 1 : 0);
  return <View testID="personal-profile-quick-access" style={styles.quickAccess}>
    <Text accessibilityRole="header" style={styles.quickHeading}>Quick Access</Text>
    <View testID="personal-profile-tile-row" style={styles.tileRow}>
      <QuickTile label="Progress" accessibilityLabel="View Progress" icon="↗" onPress={() => onNavigate("progress")} />
      <QuickTile label="Groups" icon="◉" onPress={() => onNavigate("groups")} />
    </View>
    <View testID="personal-profile-tile-row" style={styles.tileRow}>
      <QuickTile label={`Drafts (${drafts})`} accessibilityLabel={`View drafts (${drafts})`} icon="▤" onPress={() => {
        onSocialAction({ type: "openDrafts" }); onNavigate("create");
      }} />
      <QuickTile label="Trainer" accessibilityLabel="Trainer Profile" icon="◇" expanded={open} onPress={() => setOpen(!open)} />
    </View>
    {open && <View testID="personal-trainer-details" style={styles.trainerSection}><TrainerDetails social={social} onSocialAction={onSocialAction} authorId={LOCAL_AUTHOR_ID} onSetup={() => onNavigate("trainerSetup")} /></View>}
  </View>;
}

function QuickTile({ label, accessibilityLabel = label, icon, expanded, onPress }: {
  label: string; accessibilityLabel?: string; icon: string; expanded?: boolean; onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ expanded }} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.tile, focused && styles.focused, pressed && styles.pressed]}>
    <Text accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.rowIcon}>{icon}</Text>
    <Text style={styles.rowLabel}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm, minWidth: 0 },
  profileHeader: { gap: spacing.sm, minWidth: 0 },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  identityText: { minWidth: 0, gap: spacing.xs },
  socialStats: { flex: 1, minWidth: 0, flexDirection: "row", gap: spacing.xs },
  stat: { flex: 1, minWidth: 0, alignItems: "center" },
  statValue: { ...type.metric, fontSize: 16, lineHeight: 22, textAlign: "center" },
  statLabel: { ...type.caption, fontSize: 11, lineHeight: 16, textAlign: "center", flexShrink: 1 },
  controls: { gap: spacing.xs, minWidth: 0 },
  controlRow: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: spacing.sm },
  level: { flex: 1, height: 40, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, gap: spacing.xs, minWidth: 0, backgroundColor: colors.accentSurface, borderWidth: 1, borderColor: "rgba(198,242,107,0.28)", borderRadius: 8 },
  lightning: { ...type.label, fontSize: 14, lineHeight: 18, width: 12, textAlign: "center", color: colors.accent },
  levelTitle: { ...type.label, color: colors.text, fontSize: 11, lineHeight: 16, flexShrink: 0 },
  levelRank: { ...type.caption, fontSize: 10, lineHeight: 16, flex: 1, minWidth: 0 },
  editButton: { width: 70, height: 40, flexShrink: 0, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: "transparent", backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  editLabel: { ...type.button, color: colors.background, fontSize: 12, lineHeight: 18, textAlign: "center", flexShrink: 1 },
  pencil: { ...type.body, fontSize: 14, color: colors.background },
  demoBadge: { ...type.label, color: colors.accent, fontSize: 8, lineHeight: 12, flexShrink: 0 },
  track: { width: 14, height: 3, flexShrink: 0, borderRadius: 3, overflow: "hidden", backgroundColor: colors.border },
  fill: { height: "100%", width: "40%", backgroundColor: colors.accent },
  quickAccess: { gap: spacing.sm, minWidth: 0 },
  quickHeading: { ...type.heading, fontSize: 14, lineHeight: 20 },
  tileRow: { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  tile: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 10, padding: spacing.sm },
  rowIcon: { ...type.body, fontSize: 16, color: colors.accent, width: 20, textAlign: "center" },
  rowLabel: { ...type.body, fontSize: 13, lineHeight: 18, flex: 1, minWidth: 0 },
  focused: { borderColor: colors.text },
  pressed: { opacity: feedback.pressedOpacity },
  trainerSection: { minWidth: 0, paddingTop: spacing.xs },
});
