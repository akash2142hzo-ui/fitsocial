import { ProfileAvatar } from "./ProfileAvatar";
import { ComposerAction, PostComposer } from "./PostComposer";
import { MediaPreview } from "./MediaAttachments";
import { FeedComposerEntry } from "./FeedControls";
import { FEED_AD_PLACEMENT, isSponsoredPosition, SponsoredContent } from "./SponsoredContent";
import { identityFor } from "./trainerIdentity";
import { Dispatch, Fragment, ReactNode, useState } from "react";
import { Keyboard, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { Input, Avatar as SharedAvatar, Button, EmptyState, Heading, IconButton, TextButton } from "../components/ui";
import { feedback, radii, spacing, type, ui } from "../theme/design";
import { WorkoutProps } from "../workout/WorkoutLogger";
import { WorkoutAttachmentView } from "../workout/WorkoutAttachmentView";
import { formatPostTimestamp, formatSharePreview, postMetaLabel } from "./feedPresentation";
import { Post } from "./models";
import { achievements, groups, LOCAL_AUTHOR_ID } from "./sampleData";
import { SocialIcon } from "./SocialIcon";
import { COMMENT_LIMIT, postCounts, SocialAction, SocialState, visiblePosts, publishedWorkoutPost, workoutDraft } from "./socialState";

export type SocialProps = { social: SocialState; onSocialAction: Dispatch<SocialAction> };
export type AuthorNavigationProps = { onOpenAuthor: (id: string) => void };

export function GroupsScreen({ social, onSocialAction: send }: SocialProps) {
  return <View style={styles.stack}>
    <View style={styles.sectionRow}>
      <Text style={styles.small}>Sample groups</Text>
      <Text accessibilityLiveRegion="polite" style={styles.badge}>{social.joinedGroupIds.length} joined</Text>
    </View>
    {groups.map((group) => {
      const joined = social.joinedGroupIds.includes(group.id);
      return <View key={group.id} style={styles.card}>
        <View style={styles.profile}>
          <Avatar initials={group.name.split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase()} />
          <View style={styles.profileText}>
            <Text accessibilityRole="header" style={styles.heading}>{group.name}</Text>
          </View>
        </View>
        <Text style={styles.body}>{group.description}</Text>
        <View style={styles.groupFooter}>
          <View style={styles.profileText}>
            <Text style={styles.small}>{group.sampleMemberCount} sample members</Text>
            <Text style={[styles.small, joined && styles.lime]}>{joined
              ? `Joined locally \u00b7 ${group.sampleMemberCount + 1} demo total`
              : "Not joined locally"}</Text>
          </View>
          <SocialButton label={joined ? "Leave locally" : "Join locally"}
            accessibilityLabel={`${joined ? "Leave" : "Join"} ${group.name} locally`}
            primary={!joined} selected={joined}
            onPress={() => send({ type: "setMembership", groupId: group.id, joined: !joined })} />
        </View>
      </View>;
    })}
  </View>;
}

export function FeedScreen({ social, onSocialAction: send, onOpenAuthor, onCreatePost }: SocialProps & AuthorNavigationProps & { onCreatePost: () => void; onOpenGroups: () => void; onOpenTrainers: () => void }) {
  const posts = visiblePosts({ ...social, filter: "all" });
  const [searchOpen, setSearchOpen] = useState(!!social.feedQuery);
  return <View style={styles.feedStack}>
    {social.shareNotice && <ErrorMessage>{social.shareNotice}</ErrorMessage>}
    {social.discardPrompt ? <DiscardConfirmation social={social} onSocialAction={send} /> : (
      <FeedComposerEntry photo={social.localProfile.photo} initials={identityFor(social, LOCAL_AUTHOR_ID)!.initials} draft={!!social.composer} onPress={onCreatePost} />
    )}
    {!social.discardPrompt && <>
      <View style={styles.feedToolbar}><Text style={styles.feedDisclosure}>Fictional sample community. Likes and comments are demo interactions.</Text>
        <IconButton label="Search Feed" icon={<Text style={styles.searchGlyph}>{"\u2315"}</Text>} onPress={() => { setSearchOpen(!searchOpen); Keyboard.dismiss(); }} /></View>
      {searchOpen && <Input accessibilityLabel="Search feed posts" placeholder="Search posts, people or exercises" maxLength={80}
        value={social.feedQuery} onChangeText={(query) => send({ type: "searchFeed", query })}
        placeholderTextColor={colors.secondaryText} selectionColor={colors.accent} style={styles.feedSearch}
        autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} />}
      {!!social.feedQuery.trim() && <View style={ui.between}>
        <Text accessibilityLiveRegion="polite" style={type.caption}>{posts.length} matching {posts.length === 1 ? "post" : "posts"}</Text>
        <TextButton label="Clear feed search" onPress={() => { send({ type: "searchFeed", query: "" }); Keyboard.dismiss(); }} />
      </View>}
      {posts.length === 0 && social.feedQuery.trim() ? <EmptyState title="No matching posts." detail="Try another name, exercise or phrase, or clear your search." /> : posts.length === 0 && <EmptyState title="No posts to discover yet." detail="Share a thought or a completed workout.">
        <Button secondary label="Create post" onPress={onCreatePost} />
      </EmptyState>}
      {posts.map((post, index) => <Fragment key={post.id}>
        <PostCard post={post} social={social} onSocialAction={send} onOpenAuthor={onOpenAuthor} />
        {!social.feedQuery.trim() && isSponsoredPosition(index, posts.length) && <SponsoredContent enabled={FEED_AD_PLACEMENT.enabled} />}
      </Fragment>)}
    </>}
  </View>;
}

export function PostCard({ post, social, onSocialAction: send, onOpenAuthor }: SocialProps & AuthorNavigationProps & { post: Post }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const author = identityFor(social, post.authorId)!;
  const counts = postCounts(social, post.id);
  const expanded = social.expandedComments.includes(post.id);
  const achievement = achievements.find((entry) => entry.id === post.achievementId);
  const draft = social.commentDrafts[post.id];
  const trainer = social.trainers.profiles[post.authorId]?.enabled;
  const fullDate = new Date(post.createdAt).toLocaleString();
  return <View testID="social-post-card" style={styles.postCard}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${author.name}, fictional demo profile. Posted ${fullDate}${trainer ? ". Unverified trainer" : ""}`}
      onPress={() => onOpenAuthor(author.id)} style={({ pressed }) => [styles.postProfile, pressed && styles.dim]}>
      <ProfileAvatar initials={author.initials} photo={author.photo} size={32} />
      <View style={styles.profileText}>
        <Text style={styles.author}>{author.name}</Text>
        <View style={styles.postIdentity}><Text style={styles.postMeta}>@{author.username}</Text><Text style={styles.postMeta}>{"\u00b7"} {formatPostTimestamp(post.createdAt)}</Text></View>
        <Text style={styles.postMeta}>{postMetaLabel(post.origin)}{post.origin === "sample" ? " · Fictional" : ""}{trainer ? " · Unverified trainer" : ""}</Text>
      </View>
    </Pressable>
    {!!post.text && <Text style={styles.postText}>{post.text}</Text>}
    {post.media && <MediaPreview media={post.media} onSocialAction={send} />}
    {post.workout && <>
      {post.origin === "local" && <Text style={type.caption}>Shared workout {post.workout.workoutId}</Text>}
      <WorkoutAttachmentView attachment={post.workout} />
    </>}
    {achievement && <View style={styles.achievementPreview}>
      <View style={styles.achievementHeading}><SocialIcon name="trophy" color={colors.accent} /><Text style={styles.achievementLabel}>WORKOUT ACHIEVEMENT</Text></View>
      <Text style={styles.author}>{achievement.title}</Text>
      <Text style={styles.small}>{achievement.detail.replace(/^Sample achievement: /, "Sample \u00b7 ")}</Text>
    </View>}
    <View style={styles.postActions}>
      <IconAction icon={counts.liked ? "heartFilled" : "heart"} label={String(counts.likes)}
        accessibilityLabel={`${counts.liked ? "Unlike" : "Like"} ${author.name}'s post. ${counts.likes} likes.`}
        selected={counts.liked} onPress={() => send({ type: "toggleLike", postId: post.id })} />
      <IconAction icon="comment" label={String(counts.comments)} accessibilityLabel={`${expanded ? "Hide" : "Show"} ${counts.comments} comments`}
        expanded={expanded} onPress={() => send({ type: "toggleComments", postId: post.id })} />
      <IconAction icon="share" label="Share" accessibilityLabel="Preview sharing this post. Nothing will be sent."
        onPress={() => setPreviewOpen(true)} />
    </View>
    {!expanded && !!draft?.text && <Text style={styles.small}>Comment draft</Text>}
    {expanded && <View style={styles.comments}>
      {counts.comments === 0 && <Text style={styles.body}>No comments yet.</Text>}
      {social.comments.filter((comment) => comment.postId === post.id).map((comment) => <View key={comment.id} style={styles.comment}>
        <Text style={styles.author}>{identityFor(social, comment.authorId)?.name}</Text>
        <Text style={styles.body}>{comment.text}</Text>
        <Text style={styles.small}>{comment.origin === "sample" ? "Sample" : "Local"}{" \u00b7 "}{formatPostTimestamp(comment.createdAt)}</Text>
      </View>)}
      <Input accessibilityLabel={`Comment on ${author.name}'s post, maximum ${COMMENT_LIMIT} characters`}
        multiline maxLength={COMMENT_LIMIT + 1} value={draft?.text ?? ""}
        onChangeText={(text) => send({ type: "editComment", postId: post.id, text })}
        placeholder="Add encouragement..." placeholderTextColor={colors.muted}
        selectionColor={colors.accent} style={[styles.input, styles.commentInput]} />
      <View style={styles.sectionRow}>
        <Text style={styles.small}>{draft?.text.length ?? 0}/{COMMENT_LIMIT}</Text>
        <SocialButton label="Comment" accessibilityLabel="Add local comment" onPress={() => send({ type: "addComment", postId: post.id, version: social.version, at: Date.now() })} />
      </View>
      {draft?.error && <ErrorMessage>{draft.error}</ErrorMessage>}
    </View>}
    <Modal visible={previewOpen} transparent animationType="none" onRequestClose={() => setPreviewOpen(false)}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.preview} accessibilityViewIsModal onAccessibilityEscape={() => setPreviewOpen(false)}>
          <View style={styles.sectionRow}>
            <Text accessibilityRole="header" style={styles.heading}>Share preview</Text>
            <SocialButton label="Close" onPress={() => setPreviewOpen(false)} />
          </View>
          <Text style={styles.notice}>Preview only {"\u00b7"} nothing is sent</Text>
          <ScrollView><Text selectable style={styles.body}>{formatSharePreview(post, author)}</Text></ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}

export function CreatePostScreen({ social, onSocialAction, workout, onShareWorkout }: SocialProps & Pick<WorkoutProps, "workout" | "onShareWorkout">) {
  const count = social.drafts.length + (social.composer ? 1 : 0);
  const completed = [...(workout.completed ? [workout.completed] : []), ...workout.history];
  const pending = completed.filter((entry, index) => completed.findIndex((other) => other.id === entry.id) === index
    && !publishedWorkoutPost(social, entry.id) && !workoutDraft(social, entry.id));
  return <View style={styles.stack}>
    {social.shareNotice && <ErrorMessage>{social.shareNotice}</ErrorMessage>}
    {social.discardPrompt ? <DiscardConfirmation social={social} onSocialAction={onSocialAction} />
      : social.viewingDrafts ? <>
        <Heading>Drafts</Heading>
        {social.composer && <View style={ui.card}>
          <Heading>{social.composer.workout ? `Workout ${social.composer.workout.workoutId} draft` : "Text post draft"}</Heading>
          <Text style={type.caption}>Currently editing. Not published</Text>
          {social.composer.media && <Text style={type.caption}>Local {social.composer.media.kind}{social.composer.media.unavailable ? " unavailable" : " attached"}</Text>}
          <Text style={type.body} numberOfLines={2}>{social.composer.text || "No caption yet"}</Text>
          <TextButton label="Continue editing" onPress={() => onSocialAction({ type: "continueComposer" })} />
          <ComposerAction label="Save draft" onPress={() => onSocialAction({ type: "saveDraft" })} />
        </View>}
        {social.drafts.map((draft) => <View key={draft.id} style={ui.card}>
          <Heading>{draft.workout ? `Workout ${draft.workout.workoutId} draft` : "Text post draft"}</Heading>
          <Text style={type.caption}>Not published</Text>
          {draft.media && <Text style={type.caption}>Local {draft.media.kind}{draft.media.unavailable ? " unavailable" : " attached"}</Text>}
          <Text style={type.body} numberOfLines={2}>{draft.text || "No caption yet"}</Text>
          {draft.workout && <Text style={type.caption}>{draft.workout.totals.exerciseCount} exercises, {draft.workout.totals.setCount} logged entries</Text>}
          <View style={ui.row}>
            <ComposerAction label="Resume" accessibilityLabel={`Resume ${draft.id}`} onPress={() => onSocialAction({ type: "resumeDraft", id: draft.id })} />
            <ComposerAction label="Discard" accessibilityLabel={`Discard ${draft.id}`} onPress={() => onSocialAction({ type: "requestDiscardDraft", id: draft.id })} />
          </View>
        </View>)}
        {count === 0 && <EmptyState title="No drafts yet." detail="Save a post draft to continue it during this app session." />}
        {!social.composer && <ComposerAction label="New text post" onPress={() => onSocialAction({ type: "newTextDraft" })} />}
        {pending.length > 0 && <>
          <Heading>Pending share</Heading>
          <Text style={type.caption}>Completed workouts. Not published. Sharing does not save workout history.</Text>
          {pending.map((entry) => <View key={entry.id} style={ui.card}>
            <Text style={type.body}>Workout {entry.id}</Text>
            <ComposerAction label="Share workout" accessibilityLabel={`Share pending workout ${entry.id}`} onPress={() => onShareWorkout(entry.id)} />
          </View>)}
        </>}
      </> : social.composer ? <>
        <PostComposer key={social.composer.id} social={social} onSocialAction={onSocialAction} />
      </> : <EmptyState title="No drafts yet."><ComposerAction label="New text post" onPress={() => onSocialAction({ type: "newTextDraft" })} /></EmptyState>}
    <Text style={styles.small}>{"Demo only \u00b7 Posts and drafts aren't permanently saved."}</Text>
  </View>;
}
function DiscardConfirmation({ social, onSocialAction: send }: SocialProps) {
  if (social.discardPrompt === "draft") return <View style={ui.card}>
    <Heading>Discard this draft?</Heading>
    <Text style={type.body}>Remove only this unpublished draft and its attachment. Workout history and published posts remain.</Text>
    <Button secondary label="Keep draft" onPress={() => send({ type: "cancelDiscard" })} />
    <Button secondary danger label="Discard draft" onPress={() => send({ type: "confirmDiscard" })} />
  </View>;
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.heading}>Discard unfinished {social.discardPrompt === "all" ? "post and comment drafts" : "post draft"}?</Text>
    <Text style={styles.body}>Only unfinished drafts and their attachments are removed. Workout history and published local entries stay in memory.</Text>
    {social.discardPrompt === "all" && social.drafts.length > 0 && <Text style={type.caption}>{social.drafts.length} saved drafts will also be removed.</Text>}
    <View style={styles.actions}>
      <SocialButton label="Keep editing" primary onPress={() => send({ type: "cancelDiscard" })} />
      <SocialButton label="Discard drafts" danger onPress={() => send({ type: "confirmDiscard" })} />
    </View>
  </View>;
}


function Avatar({ initials, small = false }: { initials: string; small?: boolean }) {
  return <SharedAvatar initials={initials} size={small ? 36 : 40} />;
}
function IconAction({ icon, label, accessibilityLabel, onPress, selected = false, expanded }: {
  icon: "heart" | "heartFilled" | "comment" | "share"; label: string; accessibilityLabel: string;
  onPress: () => void; selected?: boolean; expanded?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected, expanded }}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.iconAction, focused && { borderColor: colors.text }, pressed && styles.dim]}>
    <SocialIcon name={icon} color={selected ? colors.accent : colors.text} />
    {!!label && <Text style={[styles.small, styles.actionLabel, selected && styles.lime]}>{label}</Text>}
  </Pressable>;
}
function ErrorMessage({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{children}</Text>;
}
function SocialButton({ label, onPress, selected = false, expanded, disabled = false, primary = false, danger = false, accessibilityLabel }: {
  label: string; onPress: () => void; selected?: boolean; expanded?: boolean; disabled?: boolean;
  primary?: boolean; danger?: boolean; accessibilityLabel?: string;
}) {
  return <Button label={label} accessibilityLabel={accessibilityLabel} selected={selected} expanded={expanded}
    disabled={disabled} onPress={onPress} secondary={!primary} danger={danger} />;
}
const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  feedStack: { gap: spacing.sm },
  searchGlyph: { ...type.heading, color: colors.muted, fontSize: 22 },
  achievementHeading: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  achievementLabel: { ...type.label, color: colors.accent, fontSize: 10, lineHeight: 16, flexShrink: 1 },
  card: { ...ui.card, gap: spacing.sm },
  composer: { gap: spacing.md, minWidth: 0, maxWidth: "100%" },
  feedToolbar: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  feedDisclosure: { ...type.caption, flex: 1, fontSize: 11, lineHeight: 16 },
  feedSearch: { minHeight: 44, paddingVertical: spacing.sm, fontSize: 13, borderColor: colors.border },
  postCard: { ...ui.card, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  postIdentity: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: spacing.xs },
  postMeta: { ...type.caption, fontSize: 11, lineHeight: 16 },
  postProfile: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44 },
  achievementPreview: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.xs, borderLeftWidth: 2, borderLeftColor: colors.accent, backgroundColor: colors.accentSurface, borderRadius: 6 },
  heading: { ...type.heading, flexShrink: 1 },
  author: { ...type.body, fontWeight: "600", flexShrink: 1 },
  body: { ...type.body, color: colors.muted },
  postText: { ...type.body },
  small: { ...type.caption },
  timestamp: { ...type.caption, flexShrink: 1, maxWidth: "100%", alignSelf: "flex-start", paddingTop: 2 },
  notice: type.caption,
  badge: { ...type.label, color: colors.accent, flexShrink: 1 },
  lime: { color: colors.accent },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sectionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  groupFooter: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  dim: { opacity: feedback.pressedOpacity },
  profile: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md, minHeight: 48 },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  inset: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.background },
  postActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  iconAction: { flexDirection: "row", flexGrow: 1, flexBasis: 0, minWidth: 72, minHeight: 44, borderRadius: radii.control, borderWidth: 2, borderColor: "transparent", paddingHorizontal: spacing.xs, paddingVertical: spacing.xs, gap: spacing.xs, alignItems: "center", justifyContent: "center" },
  actionLabel: { flexShrink: 1, textAlign: "center" },
  comments: { gap: 12, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 12 },
  comment: { gap: 4, paddingVertical: 4 },
  input: { ...ui.input, minHeight: 96, maxHeight: 220, textAlignVertical: "top" },
  commentInput: { minHeight: 64, maxHeight: 150 },
  error: type.error,
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 16 },
  preview: { width: "100%", maxWidth: 560, maxHeight: "90%", backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
});
