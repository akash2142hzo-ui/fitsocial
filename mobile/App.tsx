import { useCallback, useEffect, useReducer, useRef } from "react";
import { BackHandler } from "react-native";

import { PrototypeNavigator } from "./src/navigation/PrototypeNavigator";
import { initialNavigation, navigationReducer, selectedPrimaryTab } from "./src/navigation/navigationState";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { initialWorkout, WorkoutAction, workoutReducer } from "./src/workout/workoutState";
import { settingsDirty } from "./src/social/settingsState";
import { createInitialSocialState, hasSocialDraft, publishedWorkoutPost, socialReducer } from "./src/social/socialState";
import { backIntent, exitIntent } from "./src/social/navigationSafety";
import { findShareableWorkout } from "./src/workout/workoutSharing";
import { authors, LOCAL_AUTHOR_ID } from "./src/social/sampleData";

export default function App() {
  const [navigation, dispatch] = useReducer(navigationReducer, initialNavigation);
  const [workout, sendWorkout] = useReducer(workoutReducer, initialWorkout);
  const [social, sendSocial] = useReducer(socialReducer, undefined, createInitialSocialState);
  const pendingSettingsNavigation = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!social.settingsDraft && pendingSettingsNavigation.current) {
      const navigate = pendingSettingsNavigation.current;
      pendingSettingsNavigation.current = null;
      navigate();
    } else if (social.settingsDraft && !social.settingsDraft.confirming) pendingSettingsNavigation.current = null;
  }, [social.settingsDraft]);
  function guardSettings(navigate: () => void) {
    if (settingsDirty(social.settingsDraft)) {
      pendingSettingsNavigation.current = navigate;
      sendSocial({ type: "confirmSettingsDiscard" });
    } else {
      if (social.settingsDraft) sendSocial({ type: "closeSettingsEditor" });
      navigate();
    }
  }
  const settingsBack = useCallback(() => {
    if (social.settingsDraft?.confirming) sendSocial({ type: "keepSettingsEditing" });
    else if (social.settingsDraft) sendSocial({ type: settingsDirty(social.settingsDraft) ? "confirmSettingsDiscard" : "closeSettingsEditor" });
    else dispatch({ type: "back" });
  }, [social.settingsDraft]);
  function workoutAction(action: WorkoutAction) {
    sendWorkout(action);
    // A new session gets the saved personal default only when no idle override exists.
    // The workout reducer still owns all validation, session values and frozen metrics.
    if (action.type === "start" && workout.status !== "active" && !(workout.completed && !workout.saved)
      && (workout.status === "completed" || !workout.bodyWeightInput.trim()) && social.fitness.bodyWeightKg) {
      sendWorkout({ type: "editBodyWeight", value: social.fitness.bodyWeightKg });
    }
  }
  const socialDraft = hasSocialDraft(social);
  const socialConfirming = social.discardPrompt !== null;
  useEffect(() => {
    if (navigation.screen === "prototype" && navigation.tab === "create" && !social.composer && !social.discardPrompt && !social.viewingDrafts) {
      dispatch({ type: "selectTab", tab: "feed" });
    }
  }, [navigation, social.composer, social.discardPrompt, social.viewingDrafts]);

  function shareWorkout(id: number) {
    const completed = workout.completed?.id === id ? workout.completed : findShareableWorkout(workout.history, id);
    if (!completed || publishedWorkoutPost(social, id)) return;
    sendSocial({ type: "shareWorkout", workout: completed });
    dispatch({ type: "selectTab", tab: "create" });
  }

  function requestExit() {
    const intent = exitIntent({ socialDraft, socialConfirming, workoutActive: (workout.status === "active" || (workout.completed !== null && !workout.saved)), workoutConfirming: workout.confirming });
    if (intent === "confirmSocial") {
      dispatch({ type: "selectTab", tab: "create" });
      sendSocial({ type: "requestDiscard", target: "all" });
    } else if (intent === "confirmWorkout") {
      dispatch({ type: "selectTab", tab: "workouts" });
      sendWorkout({ type: "requestEnd" });
    } else dispatch({ type: "exitPrototype" });
  }

  useEffect(() => {
    if (navigation.screen !== "prototype") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigation.tab === "settings") { settingsBack(); return true; }
      if (social.trainers.disabling && (navigation.tab === "profile" || navigation.tab === "author" && navigation.authorId === LOCAL_AUTHOR_ID)) {
        sendSocial({ type: "trainer", action: { type: "cancelDisable", authorId: LOCAL_AUTHOR_ID } });
        return true;
      }
      if (navigation.backStack?.length) {
        dispatch({ type: "back" });
        return true;
      }
      const intent = backIntent({ socialDraft, socialConfirming, workoutActive: (workout.status === "active" || (workout.completed !== null && !workout.saved)), workoutConfirming: workout.confirming });
      if (intent === "cancelSocial") sendSocial({ type: "cancelDiscard" });
      else if (intent === "confirmSocial") {
        dispatch({ type: "selectTab", tab: "create" });
        sendSocial({ type: "requestDiscard", target: "all" });
      } else if (intent === "confirmWorkout" || intent === "cancelWorkout") {
        dispatch({ type: "selectTab", tab: "workouts" });
        sendWorkout({ type: intent === "cancelWorkout" ? "cancelEnd" : "requestEnd" });
      } else dispatch({ type: "back" });
      return true;
    });
    return () => subscription.remove();
  }, [navigation, workout.status, workout.completed, workout.saved, workout.confirming, socialDraft, socialConfirming, social.trainers.disabling, settingsBack]);

  return navigation.screen === "welcome" ? (
    <WelcomeScreen onExplorePrototype={() => dispatch({ type: "openPrototype" })} />
  ) : (
    <PrototypeNavigator
      activeTab={navigation.tab}
      authorId={navigation.authorId}
      selectedTab={selectedPrimaryTab(navigation)}
      canGoBack={!!navigation.backStack?.length}
      onGoBack={() => { if (navigation.tab === "settings") settingsBack(); else dispatch({ type: "back" }); }}
      onOpenAuthor={(authorId) => {
        if (authors.some((author) => author.id === authorId)) guardSettings(() => dispatch({ type: "openAuthor", authorId }));
      }}
      onSelectTab={(tab) => {
        guardSettings(() => {
          if (socialConfirming) sendSocial({ type: "cancelDiscard" });
          if (tab === "create") sendSocial({ type: "openComposer" });
          dispatch({ type: "selectTab", tab });
        });
      }}
      onExit={() => guardSettings(requestExit)}
      workout={workout}
      onWorkoutAction={workoutAction}
      onShareWorkout={shareWorkout}
      social={social}
      onSocialAction={sendSocial}
    />
  );
}
