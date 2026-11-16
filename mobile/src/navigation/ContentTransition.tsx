import { ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, useAnimatedValue } from "react-native";

export function useReducedMotion() {
  // Do not animate before the device preference is known, or if querying fails.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    let updated = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => { updated = true; if (alive) setReduced(value); });
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled()).then((value) => {
      if (alive && !updated && typeof value === "boolean") setReduced(value);
    }).catch(() => {});
    return () => { alive = false; subscription.remove(); };
  }, []);
  return reduced;
}

// Incoming content only: no outgoing clones, navigation delay or keyed remount.
export function ContentTransition({ children, transitionKey, direction = 1, distance = 10, duration = 220, order, visible = true }: {
  children: ReactNode; transitionKey: string; direction?: number; distance?: number; duration?: number; order?: string; visible?: boolean;
}) {
  const reduced = useReducedMotion();
  const progress = useAnimatedValue(1);
  const offset = useAnimatedValue(0);
  const previousKey = useRef(transitionKey);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    const previous = previousKey.current;
    const changed = previous !== transitionKey;
    previousKey.current = transitionKey;
    animation.current?.stop();
    progress.stopAnimation();
    offset.stopAnimation();
    if (reduced || !changed || !visible) { progress.setValue(1); offset.setValue(0); return; }
    progress.setValue(0);
    const keys = order?.split(",");
    const sign = keys ? (keys.indexOf(transitionKey) < keys.indexOf(previous) ? -1 : 1) : direction;
    offset.setValue(sign * distance);
    const options = { duration, easing: Easing.out(Easing.cubic), useNativeDriver: true };
    animation.current = Animated.parallel([Animated.timing(progress, { ...options, toValue: 1 }), Animated.timing(offset, { ...options, toValue: 0 })]);
    animation.current.start();
    return () => { animation.current?.stop(); };
  }, [transitionKey, reduced, progress, offset, duration, direction, distance, order, visible]);
  return <Animated.View testID="content-transition" style={!visible ? { display: "none" } : reduced ? undefined : {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
    transform: [{ translateX: offset }],
  }}>{children}</Animated.View>;
}
