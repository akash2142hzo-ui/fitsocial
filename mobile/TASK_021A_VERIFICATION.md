# Task 021A: self-declared trainers

Trainer identity is an optional, in-memory extension keyed by the existing author
ID. It has no authorization meaning and creates no account, backend role or
credential verification system. Existing posts, comments, follows, workouts,
drafts and personal statistics retain their original identities and state.

## Model and workflow

Trainer profiles include enabled status, display name, username, bio,
specializations, experience, self-reported qualifications, coaching mode, optional
broad location and availability. Limits are 50 characters for display name, 24 for
username, 160 for bio, 400 each for experience/qualifications and 80 for location.
Usernames require 3–24 letters, digits or underscores and cannot collide with other
demo identities (case-insensitive). Select 1–4 supported specializations.

Profile exposes Become a trainer. Setup starts with an unchecked acknowledgment:
“I understand that FitSocial has not verified my trainer qualifications.” Activation
requires explicit acknowledgment, valid fields and an explicit Enable action.
Opening a fresh edit form also starts unchecked; navigating with an existing draft
preserves the user's actual acknowledgment choice and edits. Save updates public
identity fields on the same author ID. Ordinary bio edits and trainer bio stay in
sync. Control/bidirectional override characters are stripped on Save; text is
rendered through native Text/TextInput, never interpreted as HTML or executed.

Disable requires confirmation. It hides the trainer label/listing while retaining
saved trainer information, identity, bio, posts, workouts and follows. Pending
trainer edits remain available, with acknowledgment reset. Android Back cancels a
visible disable prompt. Returning from setup or switching tabs keeps drafts; Back
to welcome also retains root in-memory state. Reload/process death may clear it.

## Discovery and trust

Feed adds Trainers alongside its existing post filters and Groups entry. Discovery
is a secondary destination: the five primary tabs are unchanged. Search supports
display name, username and specialization; filters support specialization and
coaching mode. Online/In person filters include profiles offering Both. Filter
state survives tab switches and returning from an author profile.

Trainer cards open the existing author profile, including normal posts and the
same local Follow/Unfollow controls. Own profiles prevent self-follow. The one
interactive local persona remains the current viewer; no other accounts, incoming
notifications or remote follows are simulated.

Trainer views clearly state **Unverified trainer** and:
“FitSocial has not verified this trainer's qualifications or experience.”
Experience and qualifications are self-reported. Availability is a status only;
contact and booking are not connected. There are no ratings, reviews, invented
clients, certifications or verified badges. Setup asks for no documents, health
data, payment details, phone numbers or home addresses.

Two fictional samples extend the existing Maya and Alex demo author IDs. They are
labeled **Sample · Unverified**, use existing initials, and explicitly supply no
qualifications. No real people, photos, credentials or endorsements are implied.

## Validation and limitations

TypeScript and ESLint passed without warnings. All 350 tests passed across 18
suites: 27 trainer model/regression cases, 3 app-level trainer flows and 2 additional
shared route-reset cases bring the previous 318 to 350. No tests were deleted.
Existing workout and social regressions remain covered.

All data is temporary. There is no verification, authentication, persistence,
messaging, coaching request, booking, payment, subscription or client-management
feature. Native appearance, keyboard movement, screen readers and system bars still
need device checks. Existing Android inset limitations remain. No emulator was
launched and no network requests or dependency installation were performed.

## Android checklist (manual verification outstanding)

1. Fully reload. Open the demo, visit Profile, and select Become a trainer. Check
   the current compact header, temporary notice and five tabs remain unchanged.
2. Confirm the acknowledgment starts unchecked. Attempt Enable without it, with
   invalid usernames and without a specialization. Check accessible error messages.
3. Enter display name, username, bio, specialization(s), experience and optional
   self-reported qualifications. Exercise coaching modes, broad location and
   availability. Use a city/region only. Check limits, large text and keyboard scrolling.
4. Acknowledge and Enable explicitly. Confirm the same personal profile now shows
   Unverified trainer, the disclosure and public fields, with no verified symbol.
5. Publish a normal post and share a workout. Check the same local author ID/name
   appears in Feed, Profile, comments, composer and local share preview.
6. Open Edit trainer profile. Change fields, press Android Back, switch tabs, and
   return through Continue trainer setup. Check draft text, selection and acknowledgment
   state survive, alongside an active workout and ordinary post/comment drafts.
7. Save edited fields. Check Disable trainer status -> Keep trainer status. Repeat
   with Android Back, then explicitly Confirm disable. Verify trainer discovery
   excludes the profile while bio, posts, follows, workout history and identity remain.
8. Open Feed -> Trainers. Search names, usernames and specializations. Combine
   specialization/coaching filters, test Both behavior, no matches and Reset filters.
9. Open a sample trainer. Check Sample/Unverified labels, fictional qualifications
   text, posts and local Follow/Unfollow counts. Back should restore discovery filters.
10. Re-enable a disabled local trainer; acknowledgment must be explicit again. Verify
    that duplicate taps do not create identities or duplicate posts.
11. Exercise existing Progress, Groups, bio edits, likes/comments, workout Save/Share
    and discard safeguards. Check small screens, long names, TalkBack, large fonts,
    keyboard dismissal and system navigation. Repeat platform-specific checks on iOS.

No phases requiring backend, network or new dependencies were necessary. There are
no implementation blockers; native verification remains outstanding.

## Files changed

Created:

- `TASK_021A_VERIFICATION.md`
- `src/social/TrainerScreens.tsx`
- `src/social/trainerIdentity.ts`
- `src/social/trainerState.test.ts`
- `src/social/trainerState.ts`

Modified:

- `src/navigation/navigationState.ts`
- `src/screens/PrototypeScreens.tsx`
- `src/screens/mobileExperience.test.tsx`
- `src/social/ProfileScreen.tsx`
- `src/social/SocialScreens.tsx`
- `src/social/feedPresentation.ts`
- `src/social/socialState.ts`
- `App.tsx`
- `README.md`
