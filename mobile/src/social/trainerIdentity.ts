import { authors, LOCAL_AUTHOR_ID } from "./sampleData";
import { SocialState } from "./socialState";
import { avatarInitials } from "./settingsState";

// Trainer attributes never change the author ID used by posts, comments or follows.
export function identityFor(state: SocialState, authorId: string) {
  const author = authors.find((entry) => entry.id === authorId);
  if (!author) return undefined;
  if (authorId === LOCAL_AUTHOR_ID) return { ...author, name: state.localProfile.displayName, username: state.localProfile.username,
    bio: state.localBio, initials: avatarInitials(state.localProfile), location: state.localProfile.location };
  const extension = state.trainers.profiles[authorId];
  return { ...author, name: extension?.displayName ?? author.name, username: extension?.username ?? author.username,
    bio: extension?.bio ?? author.bio };
}
