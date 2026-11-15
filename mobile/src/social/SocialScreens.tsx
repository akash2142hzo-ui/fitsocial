import { identityFor } from "./trainerIdentity";
import { Dispatch, ReactNode, useState } from "react";
import { Keyboard, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { Input, Avatar as SharedAvatar, Button, EmptyState, Heading, TextButton } from "../components/ui";
import { spacing, type, ui } from "../theme/design";
import { WorkoutProps } from "../workout/WorkoutLogger";
import { WorkoutAttachmentView } from "../workout/WorkoutAttachmentView";
import { formatPostTimestamp, formatSharePreview, postMetaLabel } from "./feedPresentation";
import { Post } from "./models";
import { achievements, groups, LOCAL_AUTHOR_ID } from "./sampleData";
import { SocialIcon } from "./SocialIcon";
import { COMMENT_LIMIT, POST_LIMIT, postCounts, SocialAction, SocialState, visiblePosts, publishedWorkoutPost, workoutDraft } from "./socialState";

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

export function FeedScreen({ social, onSocialAction: send, onOpenAuthor, onCreatePost, onOpenGroups, onOpenTrainers }: SocialProps & AuthorNavigationProps & { onCreatePost: () => void; onOpenGroups: () => void; onOpenTrainers: () => void }) {
  const posts = visiblePosts(social);
  return <View style={styles.stack}>
    {social.shareNotice && <ErrorMessage>{social.shareNotice}</ErrorMessage>}
    {social.discardPrompt ? <DiscardConfirmation social={social} onSocialAction={send} /> : (
      <Pressable accessibilityRole="button" accessibilityLabel={social.composer ? "Continue local post draft" : "Create a local post"} onPress={onCreatePost}
        style={({ pressed }) => [styles.launcher, pressed && styles.dim]}>
        <Avatar initials={identityFor(social, LOCAL_AUTHOR_ID)!.initials} small />
        <Text style={styles.launcherText}>{social.composer ? "Continue your draft..." : "Share a small win..."}</Text>
        <SocialIcon name="plus" color={colors.accent} />
      </Pressable>
    )}
    {!social.discardPrompt && <>
      <View style={styles.filters}>
        <SocialButton label="For You" accessibilityLabel="For You" selected={social.filter === "all"} onPress={() => send({ type: "setFilter", filter: "all" })} />
        <SocialButton label="Following" selected={social.filter === "following"} onPress={() => send({ type: "setFilter", filter: "following" })} />
        <SocialButton label="My Posts" accessibilityLabel="My Posts" selected={social.filter === "local"} onPress={() => send({ type: "setFilter", filter: "local" })} />
      </View>
      <View style={ui.between}>
        <Text style={type.caption}>Newest first</Text>
        <View style={ui.row}><TextButton label="Trainers" onPress={onOpenTrainers} /><TextButton label="Groups" onPress={onOpenGroups} /></View>
      </View>
      <Text style={type.caption}>Fictional sample community. Likes and comments are demo interactions.</Text>
      <Input accessibilityLabel="Search feed posts" placeholder="Search posts, people or exercises" maxLength={80}
        value={social.feedQuery} onChangeText={(query) => send({ type: "searchFeed", query })}
        autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} />
      {!!social.feedQuery.trim() && <View style={ui.between}>
        <Text accessibilityLiveRegion="polite" style={type.caption}>{posts.length} matching {posts.length === 1 ? "post" : "posts"}</Text>
        <TextButton label="Clear feed search" onPress={() => { send({ type: "searchFeed", query: "" }); Keyboard.dismiss(); }} />
      </View>}
      {social.filter === "local" && <TextButton label="Drafts" accessibilityLabel="Open feed drafts" onPress={() => {
        onCreatePost(); send({ type: "openDrafts" });
      }} />}
      {posts.length === 0 && social.feedQuery.trim() ? <EmptyState title="No matching posts." detail="Try another name, exercise or phrase, or clear your search." /> : posts.length === 0 && <EmptyState
        title={social.filter === "following" ? "Your following feed is quiet." : social.filter === "local" ? "No published posts yet." : "No posts to discover yet."}
        detail={social.filter === "following" ? "Follow people from their profiles to see their posts here." : "Share a thought or a completed workout."}>
        {social.filter === "following" ? <Button secondary label="Discover trainers" onPress={onOpenTrainers} />
          : <Button secondary label="Create post" onPress={onCreatePost} />}
      </EmptyState>}
      {posts.map((post) => <PostCard key={post.id} post={post} social={social} onSocialAction={send} onOpenAuthor={onOpenAuthor} />)}
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
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${author.name}, fictional demo profile. Posted ${fullDate}${trainer ? ". Unverified trainer" : ""}`}
      onPress={() => onOpenAuthor(author.id)} style={({ pressed }) => [styles.profile, pressed && styles.dim]}>
      <Avatar initials={author.initials} />
      <View style={styles.profileText}>
        <Text style={styles.author}>{author.name}</Text>
        <Text style={styles.small}>@{author.username}</Text>
        <Text style={styles.small}>{postMetaLabel(post.origin)}{post.origin === "sample" ? " · Fictional" : ""}{trainer ? " · Unverified trainer" : ""}</Text>
      </View>
      <Text style={styles.timestamp}>{formatPostTimestamp(post.createdAt)}</Text>
    </Pressable>
    {!!post.text && <Text style={styles.postText}>{post.text}</Text>}
    {post.workout && <>
      {post.origin === "local" && <Text style={type.caption}>Shared workout {post.workout.workoutId}</Text>}
      <WorkoutAttachmentView attachment={post.workout} />
    </>}
    {achievement && <View style={styles.inset}>
      <Text style={styles.badge}>SAMPLE ACHIEVEMENT</Text>
      <Text style={styles.author}>{achievement.title}</Text>
      <Text style={styles.small}>{achievement.detail}</Text>
    </View>}
    <View style={styles.postActions}>
      <IconAction icon={counts.liked ? "heartFilled" : "heart"} label={String(counts.likes)}
        accessibilityLabel={`${counts.liked ? "Unlike" : "Like"} ${author.name}'s post. ${counts.likes} likes.`}
        selected={counts.liked} onPress={() => send({ type: "toggleLike", postId: post.id })} />
      <IconAction icon="comment" label={String(counts.comments)} accessibilityLabel={`${expanded ? "Hide" : "Show"} ${counts.comments} comments`}
        expanded={expanded} onPress={() => send({ type: "toggleComments", postId: post.id })} />
      <IconAction icon="share" label="" accessibilityLabel="Preview sharing this post. Nothing will be sent."
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
    <Text style={type.caption}>Share publishes to FitSocial&apos;s local demo Feed. Drafts and local posts are lost when the app process resets.</Text>
    {social.shareNotice && <ErrorMessage>{social.shareNotice}</ErrorMessage>}
    {social.discardPrompt ? <DiscardConfirmation social={social} onSocialAction={onSocialAction} />
      : social.viewingDrafts ? <>
        <Heading>Drafts</Heading>
        {social.composer && <View style={ui.card}>
          <Heading>{social.composer.workout ? `Workout ${social.composer.workout.workoutId} draft` : "Text post draft"}</Heading>
          <Text style={type.caption}>Currently editing. Not published</Text>
          <Text style={type.body} numberOfLines={2}>{social.composer.text || "No caption yet"}</Text>
          <TextButton label="Continue editing" onPress={() => onSocialAction({ type: "continueComposer" })} />
          <Button secondary label="Save draft" onPress={() => onSocialAction({ type: "saveDraft" })} />
        </View>}
        {social.drafts.map((draft) => <View key={draft.id} style={ui.card}>
          <Heading>{draft.workout ? `Workout ${draft.workout.workoutId} draft` : "Text post draft"}</Heading>
          <Text style={type.caption}>Not published</Text>
          <Text style={type.body} numberOfLines={2}>{draft.text || "No caption yet"}</Text>
          {draft.workout && <Text style={type.caption}>{draft.workout.totals.exerciseCount} exercises, {draft.workout.totals.setCount} logged entries</Text>}
          <View style={ui.row}>
            <Button secondary label="Resume" accessibilityLabel={`Resume ${draft.id}`} onPress={() => onSocialAction({ type: "resumeDraft", id: draft.id })} />
            <TextButton label="Discard" accessibilityLabel={`Discard ${draft.id}`} onPress={() => onSocialAction({ type: "requestDiscardDraft", id: draft.id })} />
          </View>
        </View>)}
        {count === 0 && <EmptyState title="No drafts yet." detail="Save a post draft to continue it during this app session." />}
        {!social.composer && <Button secondary label="New text post" onPress={() => onSocialAction({ type: "newTextDraft" })} />}
        {pending.length > 0 && <>
          <Heading>Pending share</Heading>
          <Text style={type.caption}>Completed workouts. Not published. Sharing does not save workout history.</Text>
          {pending.map((entry) => <View key={entry.id} style={ui.card}>
            <Text style={type.body}>Workout {entry.id}</Text>
            <Button secondary label="Share workout" accessibilityLabel={`Share pending workout ${entry.id}`} onPress={() => onShareWorkout(entry.id)} />
          </View>)}
        </>}
      </> : social.composer ? <>
        <TextButton label={`Drafts (${count})`} accessibilityLabel="Open Drafts" onPress={() => onSocialAction({ type: "openDrafts" })} />
        <PostComposer key={social.composer.id} social={social} onSocialAction={onSocialAction} />
      </> : <EmptyState title="No drafts yet."><Button secondary label="New text post" onPress={() => onSocialAction({ type: "newTextDraft" })} /></EmptyState>}
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

function PostComposer({ social, onSocialAction: send }: SocialProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const composer = social.composer!;
  const selectedAchievement = achievements.find((entry) => entry.id === composer.achievementId);
  return <View style={styles.composer}>
    <View style={styles.sectionRow}>
      <TextButton label="Cancel" onPress={() => send({ type: "requestDiscard", target: "composer" })} />
      <TextButton label="Save draft" onPress={() => send({ type: "saveDraft" })} />
    </View>
    <View style={styles.profile}>
      <Avatar initials={identityFor(social, LOCAL_AUTHOR_ID)!.initials} small />
      <View style={styles.profileText}>
        <Text style={styles.author}>@{identityFor(social, LOCAL_AUTHOR_ID)?.username}</Text>
        <Text style={styles.small}>Demo identity</Text>
      </View>
    </View>
    <Input accessibilityLabel={`Post text, ${composer.workout ? "optional caption" : "required"}, maximum ${POST_LIMIT} characters`}
      multiline maxLength={POST_LIMIT + 1} value={composer.text}
      onChangeText={(text) => send({ type: "editPost", text })}
      placeholder={composer.workout ? "Add a caption to your workout (optional)..." : "What kept you moving today?"}
      placeholderTextColor={colors.muted} selectionColor={colors.accent} style={styles.input} />
    <View style={styles.sectionRow}>
      <Text style={styles.small}>{composer.workout ? "Caption optional" : "Post text required"}</Text>
      <Text style={composer.text.length > POST_LIMIT ? styles.error : styles.small}>{composer.text.length}/{POST_LIMIT}</Text>
    </View>
    {composer.workout ? <WorkoutAttachmentView key={composer.workout.workoutId} attachment={composer.workout} /> : <>
      <SocialButton label={optionsOpen ? "Hide sample attachments" : "Attach sample achievement"}
        expanded={optionsOpen} onPress={() => setOptionsOpen(!optionsOpen)} />
      {selectedAchievement && !optionsOpen && <View style={styles.inset}>
        <Text style={styles.badge}>FICTIONAL SAMPLE - {selectedAchievement.title}</Text>
        <Text style={styles.small}>{selectedAchievement.detail}</Text>
      </View>}
      {optionsOpen && <View style={styles.stack}>
        <SocialButton label="No attachment" selected={composer.achievementId === null} onPress={() => send({ type: "selectAchievement", achievementId: null })} />
        {achievements.map((achievement) => <View key={achievement.id} style={styles.inset}>
          <SocialButton label={`Sample: ${achievement.title}`} selected={composer.achievementId === achievement.id}
            onPress={() => send({ type: "selectAchievement", achievementId: achievement.id })} />
          <Text style={styles.small}>{achievement.detail}</Text>
        </View>)}
      </View>}
    </>}
    {composer.error && <ErrorMessage>{composer.error}</ErrorMessage>}
    <SocialButton label="Publish" accessibilityLabel="Publish to local feed. Not uploaded or saved." primary
      onPress={() => send({ type: "publishPost", version: social.version, at: Date.now() })} />
  </View>;
}

function Avatar({ initials, small = false }: { initials: string; small?: boolean }) {
  return <SharedAvatar initials={initials} size={small ? 36 : 40} />;
}
function IconAction({ icon, label, accessibilityLabel, onPress, selected = false, expanded }: {
  icon: "heart" | "heartFilled" | "comment" | "share"; label: string; accessibilityLabel: string;
  onPress: () => void; selected?: boolean; expanded?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected, expanded }}
    onPress={onPress} style={({ pressed }) => [styles.iconAction, pressed && styles.dim]}>
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
  stack: { gap: spacing.lg },
  card: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 12, gap: 8 },
  composer: { gap: 12 },
  heading: { ...type.heading, flexShrink: 1 },
  author: { ...type.body, fontWeight: "600", flexShrink: 1 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  postText: { ...type.body },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  timestamp: { color: colors.muted, fontSize: 11, lineHeight: 17, flexShrink: 1, maxWidth: 80, alignSelf: "flex-start", paddingTop: 2 },
  notice: type.caption,
  badge: { color: colors.accent, fontSize: 11, lineHeight: 18, fontWeight: "600", flexShrink: 1 },
  lime: { color: colors.accent },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sectionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  groupFooter: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dim: { opacity: 0.55 },
  profile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  launcher: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12, minHeight: 56 },
  launcherText: { color: colors.muted, flex: 1, fontSize: 15, lineHeight: 23 },
  inset: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.background },
  postActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  iconAction: { flexDirection: "row", minWidth: 56, minHeight: 48, borderRadius: 10, paddingHorizontal: 4, paddingVertical: 8, gap: 5, alignItems: "center", justifyContent: "center" },
  actionLabel: { flexShrink: 1, textAlign: "center" },
  comments: { gap: 12, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 12 },
  comment: { gap: 4, paddingVertical: 4 },
  input: { ...ui.input, minHeight: 96, maxHeight: 220, textAlignVertical: "top" },
  commentInput: { minHeight: 64, maxHeight: 150 },
  error: type.error,
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 16 },
  preview: { width: "100%", maxWidth: 560, maxHeight: "90%", backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
});
