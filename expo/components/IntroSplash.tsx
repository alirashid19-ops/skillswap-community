import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const leftImg = require('@/assets/images/intro-left.png');
const rightImg = require('@/assets/images/intro-right.png');
const sparkImg = require('@/assets/images/intro-spark.png');

const nativeDriver = Platform.OS !== 'web';
const WORD = 'leteski';
const PARTICLE_COLORS = ['#6366F1', '#8B5CF6', '#A78BFA', '#F59E0B', '#FDE68A', '#818CF8'];

interface Particle {
  progress: Animated.Value;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  size: number;
  color: string;
  delay: number;
}

interface IntroSplashProps {
  onFinish: () => void;
}

/**
 * Opening animation: particles stream in from every direction, the two people and the
 * spark of the logo fly in from different sides and snap together, then the name assembles
 * letter by letter.
 */
export default function IntroSplash({ onFinish }: IntroSplashProps) {
  const { width, height } = useWindowDimensions();
  const logoW = Math.min(width * 0.62, 280);
  const logoH = logoW * (493 / 642);
  const finished = useRef(false);

  const leftIn = useRef(new Animated.Value(0)).current;
  const rightIn = useRef(new Animated.Value(0)).current;
  const sparkIn = useRef(new Animated.Value(0)).current;
  const shock = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const letters = useMemo(
    () =>
      WORD.split('').map((char, i) => ({
        char,
        progress: new Animated.Value(0),
        dx: (Math.random() - 0.5) * width * 1.2,
        dy: (Math.random() - 0.5) * 320,
        rot: (Math.random() - 0.5) * 240,
        accent: i >= 4,
      })),
    [width],
  );

  const particles = useMemo<Particle[]>(() => {
    const radius = Math.max(width, height) * 0.75;
    return Array.from({ length: 42 }, (_, i) => {
      const angle = (i / 42) * Math.PI * 2 + Math.random() * 0.4;
      const ring = logoW * (0.15 + Math.random() * 0.3);
      const endAngle = angle + (Math.random() - 0.5) * 0.8;
      return {
        progress: new Animated.Value(0),
        fromX: Math.cos(angle) * radius * (0.7 + Math.random() * 0.5),
        fromY: Math.sin(angle) * radius * (0.7 + Math.random() * 0.5),
        toX: Math.cos(endAngle) * ring,
        toY: Math.sin(endAngle) * ring,
        size: 3 + Math.random() * 6,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        delay: Math.random() * 450,
      };
    });
  }, [width, height, logoW]);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(exit, { toValue: 1, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: nativeDriver }).start(() => onFinish());
  };

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.timing(glow, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      ]),
    );
    glowLoop.start();

    const particleAnims = Animated.parallel(
      particles.map(p =>
        Animated.timing(p.progress, { toValue: 1, duration: 1100, delay: p.delay, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
      ),
    );

    const spring = (v: Animated.Value, delay: number) =>
      Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, friction: 6, tension: 50, useNativeDriver: nativeDriver })]);

    const pieces = Animated.parallel([spring(leftIn, 350), spring(rightIn, 450), spring(sparkIn, 750)]);

    const impact = Animated.parallel([
      Animated.timing(shock, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 140, useNativeDriver: nativeDriver }),
        Animated.spring(pulse, { toValue: 0, friction: 4, useNativeDriver: nativeDriver }),
      ]),
    ]);

    const word = Animated.stagger(
      70,
      letters.map(l => Animated.spring(l.progress, { toValue: 1, friction: 7, tension: 60, useNativeDriver: nativeDriver })),
    );

    const impactTimer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    }, 1450);

    Animated.parallel([particleAnims, pieces]).start(() => {
      impact.start();
      Animated.sequence([
        word,
        Animated.timing(tagline, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
        Animated.delay(900),
      ]).start(() => finish());
    });

    return () => {
      clearTimeout(impactTimer);
      glowLoop.stop();
    };
    // Runs once on mount; animation values are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pieceStyle = (v: Animated.Value, fromX: number, fromY: number, fromRot: string) => ({
    opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] }) },
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }) },
      { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [fromRot, '0deg'] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
    ],
  });

  const logoScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
        },
      ]}
      testID="intro-splash"
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityLabel="Skip intro">
        <LinearGradient colors={['#0B0920', '#16123A', '#0B0920']} style={StyleSheet.absoluteFill} />

        {/* Drifting ambient glows */}
        <Animated.View
          style={[
            s.orb,
            { width: width * 1.1, height: width * 1.1, borderRadius: width, top: -width * 0.35, left: -width * 0.45, backgroundColor: 'rgba(99,102,241,0.22)' },
            { transform: [{ translateY: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) }] },
          ]}
        />
        <Animated.View
          style={[
            s.orb,
            { width: width, height: width, borderRadius: width, bottom: -width * 0.3, right: -width * 0.4, backgroundColor: 'rgba(139,92,246,0.2)' },
            { transform: [{ translateY: glow.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] },
          ]}
        />

        <View style={s.center} pointerEvents="none">
          {/* Particles converging */}
          {particles.map((p, i) => (
            <Animated.View
              key={i}
              style={[
                s.particle,
                {
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size,
                  backgroundColor: p.color,
                  opacity: p.progress.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 0.9, 0] }),
                  transform: [
                    { translateX: p.progress.interpolate({ inputRange: [0, 1], outputRange: [p.fromX, p.toX] }) },
                    { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [p.fromY, p.toY] }) },
                    { scale: p.progress.interpolate({ inputRange: [0, 1], outputRange: [1.6, 0.4] }) },
                  ],
                },
              ]}
            />
          ))}

          {/* Shockwave ring on impact */}
          <Animated.View
            style={[
              s.ring,
              {
                width: logoW,
                height: logoW,
                borderRadius: logoW,
                opacity: shock.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.7, 0] }),
                transform: [{ scale: shock.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.4] }) }],
              },
            ]}
          />

          {/* Logo pieces rejoining */}
          <Animated.View style={{ width: logoW, height: logoH, transform: [{ scale: logoScale }] }}>
            <Animated.Image source={leftImg} style={[s.layer, pieceStyle(leftIn, -width * 0.9, height * 0.25, '-35deg')]} resizeMode="contain" />
            <Animated.Image source={rightImg} style={[s.layer, pieceStyle(rightIn, width * 0.9, -height * 0.25, '35deg')]} resizeMode="contain" />
            <Animated.Image
              source={sparkImg}
              style={[
                s.layer,
                {
                  opacity: sparkIn.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
                  transform: [
                    { translateY: sparkIn.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.5, 0] }) },
                    { rotate: sparkIn.interpolate({ inputRange: [0, 1], outputRange: ['-540deg', '0deg'] }) },
                    { scale: sparkIn.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Wordmark assembling */}
          <View style={s.wordRow}>
            {letters.map((l, i) => (
              <Animated.Text
                key={i}
                style={[
                  s.letter,
                  l.accent && s.letterAccent,
                  {
                    opacity: l.progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
                    transform: [
                      { translateX: l.progress.interpolate({ inputRange: [0, 1], outputRange: [l.dx, 0] }) },
                      { translateY: l.progress.interpolate({ inputRange: [0, 1], outputRange: [l.dy, 0] }) },
                      { rotate: l.progress.interpolate({ inputRange: [0, 1], outputRange: [`${l.rot}deg`, '0deg'] }) },
                    ],
                  },
                ]}
              >
                {l.char}
              </Animated.Text>
            ))}
          </View>

          <Animated.View
            style={{
              opacity: tagline,
              transform: [{ translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            }}
          >
            <Text style={s.tagline}>Teach what you know. Learn what you love.</Text>
          </Animated.View>
        </View>

        <Animated.Text style={[s.skip, { opacity: tagline }]}>Tap to continue</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  orb: { position: 'absolute' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: '#FDE68A' },
  layer: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  wordRow: { flexDirection: 'row', marginTop: 34 },
  letter: { fontSize: 46, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: 0.5 },
  letterAccent: { color: '#F59E0B' },
  tagline: { marginTop: 10, fontSize: 15, fontWeight: '500' as const, color: 'rgba(226,232,240,0.75)', letterSpacing: 0.3 },
  skip: {
    position: 'absolute',
    bottom: 56,
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(226,232,240,0.45)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
