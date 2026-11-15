import { TrainerDetails } from "./TrainerScreens";
import { identityFor } from "./trainerIdentity";
import { StyleSheet, Text, View } from "react-native";
import { Avatar, Button, EmptyState, Heading, IconButton, Stats, TextButton } from "../components/ui";
import { TabId } from "../navigation/navigationState";
import { sizing, spacing, type, ui } from "../theme/design";
import { CompletedWorkout } from "../workout/workoutState";
import { CALORIE_DISCLAIMER, formatCalories, formatDuration } from "../workout/workoutMetrics";
import { followStats, personalProfileStats, postsForAuthor } from "./profileState";
import { LOCAL_AUTHOR_ID } from "./sampleData";
import { AuthorNavigationProps, PostCard, SocialProps } from "./SocialScreens";

type ProfileProps = SocialProps & AuthorNavigationProps & {
  history: readonly CompletedWorkout[]; authorId?: string; onNavigate: (tab: TabId) => void;
};
export function ProfileScreen({ social, onSocialAction: send, history, authorId = LOCAL_AUTHOR_ID, onOpenAuthor, onNavigate }: ProfileProps) {
  const author = identityFor(social, authorId);
  if (!author) return <EmptyState title="Profile unavailable." />;
  const own = authorId === LOCAL_AUTHOR_ID;
  const posts = postsForAuthor(social, authorId);
  const follow = followStats(social, authorId);
  const stats = personalProfileStats(social, history);
  return <View style={ui.stack}>
    <View style={ui.between}>
      <Heading>{own ? "Profile" : "Fictional profile"}</Heading>
      {own && <IconButton label="Open Settings" onPress={() => onNavigate("settings")} icon={<Text style={type.title}>{"\u2699"}</Text>} />}
    </View>
    <View style={styles.identity}>
      <Avatar initials={author.initials} size={sizing.profileAvatar} />
      <View accessibilityLiveRegion="polite" style={styles.socialStats}><Stats compact items={[
        { value: posts.length, label: "Posts" }, { value: follow.followers, label: "Followers" }, { value: follow.following, label: "Following" },
      ]} /></View>
    </View>
    <View style={styles.identityText}>
      <Heading>{author.name}</Heading>
      <Text style={type.caption}>@{author.username}</Text>
      <Text style={type.caption}>{own ? "Demo identity" : "Fictional profile"}</Text>
      <Text style={type.body}>{own ? social.localBio || "No bio yet." : author.bio}</Text>
      {own && !!social.localProfile.location && <Text style={type.caption}>{social.localProfile.location}</Text>}
    </View>
    {own ? <>
      <View style={ui.row}>
        <Button secondary label="Edit profile" onPress={() => { send({ type: "openSettingsEditor", section: "profile" }); onNavigate("settings"); }} />
        <Button secondary label="Groups" onPress={() => onNavigate("groups")} />
        <TextButton label={`View drafts (${social.drafts.length + (social.composer ? 1 : 0)})`} onPress={() => {
          send({ type: "openDrafts" }); onNavigate("create");
        }} />
      </View>
    </> : <Button secondary={follow.followedLocally} label={follow.followedLocally ? "Unfollow locally" : "Follow locally"} selected={follow.followedLocally}
      onPress={() => send({ type: "setFollow", authorId, following: !follow.followedLocally })} />}
    {own && <View style={ui.card}>
      <View style={ui.between}><Heading>Progress</Heading><TextButton label="View Progress" onPress={() => onNavigate("progress")} /></View>
      {stats.workoutCount > 0 ? <>
        <Stats items={[
          { value: stats.workoutCount, label: "saved workouts" },
          ...(stats.durationMs > 0 ? [{ value: formatDuration(stats.durationMs), label: "total time" }] : []),
          ...(stats.estimatedKcal !== null && stats.estimatedKcal > 0 ? [{ value: formatCalories(stats.estimatedKcal), label: "estimated calories" }] : []),
        ]} />
        {stats.estimatedKcal !== null && stats.estimatedKcal > 0 && <>
          <Text style={type.caption}>Calorie estimates for {stats.estimatedWorkoutCount} of {stats.workoutCount} saved workouts.</Text>
          <Text style={type.caption}>{CALORIE_DISCLAIMER}</Text>
        </>}
      </> : <Text style={type.caption}>No saved workouts yet. Your completed sessions will appear in Progress.</Text>}
    </View>}
    <View style={styles.trainerSection}><TrainerDetails social={social} onSocialAction={send} authorId={authorId} onSetup={() => onNavigate("trainerSetup")} /></View>
    <View style={ui.between}><Heading>{own ? "Your posts" : "Sample posts"}</Heading><Text style={type.caption}>{posts.length}</Text></View>
    {posts.length === 0 && <EmptyState title="No posts yet." detail={own ? "Share a thought or a completed workout to start your story." : "This fictional profile has no published examples yet."}>
      {own && <Button secondary label="Create a post" onPress={() => onNavigate("create")} />}
    </EmptyState>}
    {posts.map((post) => <PostCard key={post.id} post={post} social={social} onSocialAction={send} onOpenAuthor={onOpenAuthor} />)}
  </View>;
}
const styles = StyleSheet.create({
  identity: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.lg },
  identityText: { minWidth: 0, gap: spacing.xs },
  socialStats: { flex: 1, minWidth: 200 },
  trainerSection: { ...ui.divider, paddingBottom: spacing.lg },
});
