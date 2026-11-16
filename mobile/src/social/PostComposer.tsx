import { ProfileAvatar } from "./ProfileAvatar";
import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { Input } from "../components/ui";
import { colors } from "../theme/colors";
import { feedback, radii, spacing, type } from "../theme/design";
import { WorkoutAttachmentView } from "../workout/WorkoutAttachmentView";
import { achievements, LOCAL_AUTHOR_ID } from "./sampleData";
import { SocialIcon } from "./SocialIcon";
import type { SocialProps } from "./SocialScreens";
import { POST_LIMIT, postValidationError, publishedWorkoutPost, SocialState } from "./socialState";
import { identityFor } from "./trainerIdentity";
import { MediaPreview, MediaToolbar } from "./MediaAttachments";
import { mediaIsReadable } from "./mediaPicker";

export function canPublishPost(social: SocialState) {
  return !!social.composer && !social.discardPrompt && !social.viewingDrafts && !postValidationError(social)
    && !(social.composer.workout && publishedWorkoutPost(social, social.composer.workout.workoutId));
}

export function ComposerAction({ label, accessibilityLabel = label, onPress, disabled = false, hint, subtle = false, symbol = false, selected }: {
  label: string; accessibilityLabel?: string; onPress: () => void; disabled?: boolean; hint?: string; subtle?: boolean; symbol?: boolean; selected?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={hint}
    accessibilityState={{ disabled, selected }} disabled={disabled} onPress={() => { if (!disabled) onPress(); }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.action, focused && styles.focused, pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
    <Text style={[styles.actionText, subtle && styles.subtleAction, symbol && styles.symbol]}>{selected ? "\u2713 " : ""}{label}</Text>
  </Pressable>;
}

export function ComposerHeader({ social, onSocialAction: send, onBack }: SocialProps & { onBack: () => void }) {
  const allowed = canPublishPost(social);
  return <View style={styles.header}>
    <ComposerAction label={"\u2039"} symbol accessibilityLabel="Back to previous screen" hint="Return without losing your local draft" onPress={onBack} />
    <Text accessibilityRole="header" style={styles.title}>Create Post</Text>
    <ComposerAction label="Post" accessibilityLabel="Publish to local feed. Not uploaded or saved." disabled={!allowed}
      hint={allowed ? "Publish this post only to the local demo Feed" : postValidationError(social) ?? "Posting unavailable while viewing drafts or confirmation"}
      onPress={() => {
        Keyboard.dismiss();
        if (social.composer?.media && !mediaIsReadable(social.composer.media)) {
          send({ type: "mediaUnavailable", id: social.composer.media.id }); return;
        }
        send({ type: "publishPost", version: social.version, at: Date.now() });
      }} />
  </View>;
}

function ToolIcon({ kind, color }: { kind: "drafts" | "save" | "discard"; color: string }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.toolIcon}>
    {kind === "drafts" ? <><View style={[styles.paperBack, { borderColor: color }]} /><View style={[styles.paper, { borderColor: color }]} /><View style={[styles.paperLine, { backgroundColor: color }]} /></>
      : kind === "save" ? <><View style={[styles.disk, { borderColor: color }]} /><View style={[styles.diskTop, { borderColor: color }]} /><View style={[styles.diskBottom, { borderColor: color }]} /></>
      : <><View style={[styles.bin, { borderColor: color }]} /><View style={[styles.binLid, { backgroundColor: color }]} /></>}
  </View>;
}

function DraftAction({ label, accessibilityLabel, icon, onPress, destructive = false, disabled = false }: {
  label: string; accessibilityLabel: string; icon: "drafts" | "save" | "discard"; onPress: () => void; destructive?: boolean; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const color = destructive ? "#CC9292" : colors.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled}
    onPress={() => { if (!disabled) onPress(); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.draftButton, destructive ? styles.discardButton : styles.halfButton, focused && styles.focused,
      pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
    <ToolIcon kind={icon} color={color} /><Text style={[styles.draftButtonText, { color }]}>{label}</Text>
  </Pressable>;
}

export function PostComposer({ social, onSocialAction: send }: SocialProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [attachmentFocused, setAttachmentFocused] = useState(false);
  const composer = social.composer!;
  const identity = identityFor(social, LOCAL_AUTHOR_ID)!;
  const selected = achievements.find((entry) => entry.id === composer.achievementId);
  const error = composer.error ?? (!composer.mediaPending && composer.text.length ? postValidationError(social) : null);
  return <View style={styles.body}>
    <View testID="post-composer-card" style={styles.composerCard}>
    <View style={styles.identity}><ProfileAvatar initials={identity.initials} photo={identity.photo} size={32} /><View style={styles.identityCopy}>
      <Text style={styles.name}>{identity.name}</Text><Text style={type.caption}>@{identity.username}</Text>
    </View><Text style={styles.demo}>Demo</Text></View>
    <Input accessibilityLabel={`Post text, ${composer.workout || composer.media ? "optional caption" : "required"}, maximum ${POST_LIMIT} characters`}
      multiline maxLength={POST_LIMIT + 1} value={composer.text} onChangeText={(text) => send({ type: "editPost", text })}
      placeholder="What's your fitness story today?" selectionColor={colors.accent} style={styles.writingArea} />
    <MediaToolbar social={social} onSocialAction={send} />
    {composer.media && <MediaPreview media={composer.media} onSocialAction={send} editable draftId={composer.id} busy={!!composer.mediaPending} />}
    <View style={styles.counterRow}>{(composer.workout || composer.media) && <Text style={type.caption}>Caption optional</Text>}
      <Text accessibilityLiveRegion="polite" accessibilityLabel={`${composer.text.length} of ${POST_LIMIT} characters`}
        style={[styles.counter, composer.text.length > POST_LIMIT && styles.error]}>{composer.text.length}/{POST_LIMIT}</Text></View>
    {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
    </View>
    <View testID="post-actions-card" style={styles.composerCard}>
    {composer.workout ? <WorkoutAttachmentView attachment={composer.workout} /> : <>
      <Pressable accessibilityRole="button" accessibilityLabel="Add achievement" accessibilityHint="Choose a fictional sample achievement"
        accessibilityState={{ expanded: optionsOpen }} onPress={() => { Keyboard.dismiss(); setOptionsOpen(!optionsOpen); }}
        onFocus={() => setAttachmentFocused(true)} onBlur={() => setAttachmentFocused(false)}
        style={({ pressed }) => [styles.attachmentRow, attachmentFocused && styles.focused, pressed && styles.pressed]}>
        <SocialIcon name="trophy" color={colors.accent} /><View style={styles.identityCopy}><Text style={type.button}>Add achievement</Text>
          <Text style={type.caption}>Attach a workout milestone</Text></View><Text accessible={false} style={styles.plus}>{optionsOpen ? "\u2212" : "+"}</Text>
      </Pressable>
      {selected && <View style={styles.preview}>
        <View style={styles.previewTop}><SocialIcon name="trophy" color={colors.accent} /><Text style={styles.previewTitle}>{selected.title}</Text>
          <ComposerAction label="Remove" accessibilityLabel="Remove sample achievement" onPress={() => send({ type: "selectAchievement", achievementId: null })} /></View>
        <Text style={type.caption}>Fictional sample</Text><Text style={type.caption}>{selected.detail}</Text>
      </View>}
      {optionsOpen && <View style={styles.options}>
        <ComposerAction label="No attachment" selected={composer.achievementId === null} onPress={() => { send({ type: "selectAchievement", achievementId: null }); setOptionsOpen(false); }} />
        {achievements.map((achievement) => <View key={achievement.id} style={styles.option}>
          <ComposerAction label={`Sample: ${achievement.title}`} selected={composer.achievementId === achievement.id} onPress={() => { send({ type: "selectAchievement", achievementId: achievement.id }); setOptionsOpen(false); }} />
          <Text style={type.caption}>{achievement.detail}</Text>
        </View>)}
      </View>}
    </>}
    <View style={styles.tools}>
      <View testID="draft-action-row" style={styles.draftRow}>
        <DraftAction label={`Drafts (${social.drafts.length + 1})`} icon="drafts" accessibilityLabel="Open Drafts" onPress={() => { Keyboard.dismiss(); send({ type: "openDrafts" }); }} />
        <DraftAction label="Save Draft" icon="save" accessibilityLabel="Save draft" disabled={!!composer.mediaPending} onPress={() => { Keyboard.dismiss(); send({ type: "saveDraft" }); }} />
      </View>
      <DraftAction label="Discard Post" icon="discard" destructive accessibilityLabel="Discard post" onPress={() => { Keyboard.dismiss(); send({ type: "requestDiscard", target: "composer" }); }} />
    </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 48 },
  title: { ...type.heading, flex: 1, textAlign: "center", minWidth: 0 },
  action: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: "transparent", borderRadius: radii.control, maxWidth: "100%" },
  actionText: { ...type.button, color: colors.accent, flexShrink: 1, textAlign: "center" },
  subtleAction: { color: colors.muted }, symbol: { color: colors.text, fontSize: 26, lineHeight: 30 },
  focused: { borderColor: colors.text }, pressed: { opacity: feedback.pressedOpacity }, disabled: { opacity: feedback.disabledOpacity },
  body: { gap: spacing.md },
  composerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: spacing.lg, gap: spacing.sm },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  identityCopy: { flex: 1, minWidth: 0 },
  name: { ...type.button },
  demo: { ...type.caption, fontSize: 10, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: colors.surface },
  writingArea: { ...type.body, fontSize: 16, lineHeight: 24, minHeight: 104, maxHeight: 240, paddingHorizontal: 0, paddingVertical: spacing.sm, backgroundColor: "transparent", borderWidth: 0, borderRadius: 0, textAlignVertical: "top" },
  counterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  counter: { ...type.caption, marginLeft: "auto", fontVariant: ["tabular-nums"] }, error: { ...type.error },
  attachmentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1, borderColor: "transparent", borderRadius: radii.control, minHeight: 44 },
  plus: { ...type.heading, fontSize: 24, color: colors.accent, paddingHorizontal: spacing.sm },
  preview: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.md, gap: spacing.xs },
  previewTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, previewTitle: { ...type.button, flex: 1, minWidth: 0 },
  options: { gap: spacing.sm }, option: { padding: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radii.card, alignItems: "flex-start" },
  tools: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  draftRow: { flexDirection: "row", alignItems: "stretch", gap: spacing.md },
  draftButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 44, minWidth: 44, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.control, backgroundColor: colors.elevated },
  halfButton: { flex: 1 },
  discardButton: { alignSelf: "stretch", borderColor: "#684447", backgroundColor: "transparent" },
  draftButtonText: { ...type.button, fontSize: 13, lineHeight: 18, textAlign: "center", flexShrink: 1 },
  toolIcon: { width: 18, height: 18, flexShrink: 0 },
  paperBack: { position: "absolute", top: 1, left: 1, width: 11, height: 13, borderWidth: 1, borderRadius: 2 },
  paper: { position: "absolute", top: 4, left: 5, width: 11, height: 13, borderWidth: 1, borderRadius: 2, backgroundColor: colors.elevated },
  paperLine: { position: "absolute", top: 9, left: 8, width: 5, height: 1 },
  disk: { position: "absolute", top: 1, left: 1, width: 16, height: 16, borderWidth: 1.5, borderRadius: 3 },
  diskTop: { position: "absolute", top: 2, left: 5, width: 8, height: 5, borderWidth: 1 },
  diskBottom: { position: "absolute", top: 10, left: 5, width: 8, height: 6, borderWidth: 1, borderRadius: 1 },
  bin: { position: "absolute", top: 5, left: 4, width: 11, height: 11, borderWidth: 1.5, borderRadius: 2 },
  binLid: { position: "absolute", top: 2, left: 3, width: 13, height: 2, borderRadius: 1 },
});
