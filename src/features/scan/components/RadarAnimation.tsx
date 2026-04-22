import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@theme/index';

interface RadarAnimationProps {
  size?: number;
  color?: string;
  pulseCount?: number;
}

const RING_DURATION_MS = 1500;
const RING_PHASE_OFFSET_MS = 500;

export function RadarAnimation({
  size = 200,
  color = colors.primary,
  pulseCount = 3,
}: RadarAnimationProps) {
  const ring0 = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);

  const rings = [ring0, ring1, ring2].slice(0, pulseCount);

  useEffect(() => {
    rings.forEach((sv, index) => {
      sv.value = withDelay(
        index * RING_PHASE_OFFSET_MS,
        withRepeat(
          withTiming(1, { duration: RING_DURATION_MS, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      );
    });

    return () => {
      rings.forEach(sv => cancelAnimation(sv));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle0 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + ring0.value * 0.6 }],
    opacity: (1 - ring0.value) * 0.6,
  }));

  const animStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + ring1.value * 0.6 }],
    opacity: (1 - ring1.value) * 0.6,
  }));

  const animStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + ring2.value * 0.6 }],
    opacity: (1 - ring2.value) * 0.6,
  }));

  const animStyles = [animStyle0, animStyle1, animStyle2].slice(0, pulseCount);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {animStyles.map((style, index) => (
        <Animated.View
          key={index}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: color,
            },
            style,
          ]}
        />
      ))}
      {/* Static center dot */}
      <View
        style={[
          styles.centerDot,
          {
            width: size * 0.15,
            height: size * 0.15,
            borderRadius: (size * 0.15) / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  centerDot: {
    position: 'absolute',
  },
});
