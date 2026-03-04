// src/components/SurveySnapLogo.js
// Design: Hexagonal camera aperture with precision crosshair centre
// — references Leica red dot precision + surveying theodolite crosshair
// — The "S" snap is formed by the aperture blades opening

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle, Line, Path, G, Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient, Stop, Polygon, Rect,
} from 'react-native-svg';
import { Colors, Typography } from '../theme';

export default function SurveySnapLogo({ size = 72, showText = true, textSize = 'md' }) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const outerR = s * 0.46;
  const midR   = s * 0.34;
  const innerR = s * 0.16;
  const crossArm = s * 0.44;

  // Hexagon points
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 30) * Math.PI / 180;
    return { x: cx + outerR * Math.cos(angle), y: cy + outerR * Math.sin(angle) };
  });
  const hexStr = hexPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Inner hex (aperture ring)
  const hexInner = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 30) * Math.PI / 180;
    return { x: cx + midR * Math.cos(angle), y: cy + midR * Math.sin(angle) };
  });
  const hexInnerStr = hexInner.map(p => `${p.x},${p.y}`).join(' ');

  // Aperture blade paths — 6 blades, like a real camera aperture
  const blades = Array.from({ length: 6 }, (_, i) => {
    const angle1 = ((i * 60) - 15) * Math.PI / 180;
    const angle2 = ((i * 60) + 45) * Math.PI / 180;
    const angle3 = ((i * 60) + 15) * Math.PI / 180;
    const r1 = midR * 0.95;
    const r2 = midR * 0.55;
    return {
      x1: cx + r1 * Math.cos(angle1), y1: cy + r1 * Math.sin(angle1),
      x2: cx + r2 * Math.cos(angle2), y2: cy + r2 * Math.sin(angle2),
      x3: cx + r1 * Math.cos(angle3), y3: cy + r1 * Math.sin(angle3),
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Defs>
          <SvgLinearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#1D4ED8" />
          </SvgLinearGradient>
          <SvgLinearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#22D3EE" />
            <Stop offset="100%" stopColor="#3B82F6" />
          </SvgLinearGradient>
          <RadialGradient id="centreGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#60A5FA" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#2563EB" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#1D3A6E" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#06080F" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Background glow */}
        <Circle cx={cx} cy={cy} r={outerR + s * 0.08} fill="url(#bgGlow)" />

        {/* Outer hex ring — outer border */}
        <Polygon points={hexStr} fill="none" stroke="url(#blueGrad)" strokeWidth={1.2} strokeOpacity={0.7} />

        {/* Outer hex slight fill */}
        <Polygon points={hexStr} fill="#0C1220" fillOpacity={0.8} />

        {/* Aperture blades */}
        {blades.map((b, i) => (
          <Path
            key={i}
            d={`M ${b.x1} ${b.y1} L ${b.x2} ${b.y2} L ${b.x3} ${b.y3} Z`}
            fill="#2563EB"
            fillOpacity={0.18 + i * 0.02}
            stroke="#3B82F6"
            strokeWidth={0.4}
            strokeOpacity={0.4}
          />
        ))}

        {/* Inner hex ring — aperture outline */}
        <Polygon
          points={hexInnerStr}
          fill="#06080F"
          stroke="url(#blueGrad)"
          strokeWidth={1}
          strokeOpacity={0.9}
        />

        {/* Crosshair — precision surveying lines */}
        {/* Vertical */}
        <Line x1={cx} y1={cy - crossArm / 2} x2={cx} y2={cy - innerR}
          stroke="url(#cyanGrad)" strokeWidth={1} strokeOpacity={0.9} />
        <Line x1={cx} y1={cy + innerR} x2={cx} y2={cy + crossArm / 2}
          stroke="url(#cyanGrad)" strokeWidth={1} strokeOpacity={0.9} />
        {/* Horizontal */}
        <Line x1={cx - crossArm / 2} y1={cy} x2={cx - innerR} y2={cy}
          stroke="url(#cyanGrad)" strokeWidth={1} strokeOpacity={0.9} />
        <Line x1={cx + innerR} y1={cy} x2={cx + crossArm / 2} y2={cy}
          stroke="url(#cyanGrad)" strokeWidth={1} strokeOpacity={0.9} />

        {/* Fine tick marks on crosshair */}
        {[-s * 0.14, -s * 0.08, s * 0.08, s * 0.14].map((offset, i) => (
          <G key={i}>
            <Line x1={cx + offset} y1={cy - 3} x2={cx + offset} y2={cy + 3}
              stroke="#22D3EE" strokeWidth={0.6} strokeOpacity={0.5} />
            <Line x1={cx - 3} y1={cy + offset} x2={cx + 3} y2={cy + offset}
              stroke="#22D3EE" strokeWidth={0.6} strokeOpacity={0.5} />
          </G>
        ))}

        {/* Centre ring */}
        <Circle cx={cx} cy={cy} r={innerR}
          fill="url(#centreGlow)" fillOpacity={0.15}
          stroke="url(#blueGrad)" strokeWidth={1} />

        {/* Centre dot — the "snap" moment */}
        <Circle cx={cx} cy={cy} r={s * 0.045} fill="url(#centreGlow)" />
        <Circle cx={cx} cy={cy} r={s * 0.018} fill="#F0F4FF" fillOpacity={0.9} />

        {/* Corner registry marks — survey precision */}
        {hexPoints.filter((_, i) => i % 2 === 0).map((p, i) => {
          const dirX = (p.x - cx) / outerR;
          const dirY = (p.y - cy) / outerR;
          const tickLen = s * 0.055;
          return (
            <Line key={i}
              x1={p.x} y1={p.y}
              x2={p.x + dirX * tickLen} y2={p.y + dirY * tickLen}
              stroke="#2563EB" strokeWidth={1} strokeOpacity={0.5}
            />
          );
        })}
      </Svg>

      {showText && (
        <View style={styles.wordmark}>
          <Text style={[
            styles.brandName,
            textSize === 'sm' && { fontSize: 16, letterSpacing: 3 },
            textSize === 'lg' && { fontSize: 26, letterSpacing: 5 },
            textSize === 'md' && { fontSize: 20, letterSpacing: 4 },
          ]}>
            SurveySnap
          </Text>
          <View style={styles.proRow}>
            <View style={styles.proLine} />
            <Text style={styles.proLabel}>PRO</Text>
            <View style={styles.proLine} />
          </View>
        </View>
      )}
    </View>
  );
}

export function SnapMark({ size = 32 }) {
  return <SurveySnapLogo size={size} showText={false} />;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  wordmark: { alignItems: 'center', marginTop: 10 },
  brandName: {
    ...Typography.display,
    color: Colors.textPrimary,
    fontSize: 20,
    letterSpacing: 4,
  },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  proLine: { width: 20, height: 0.5, backgroundColor: Colors.blue, opacity: 0.7 },
  proLabel: {
    ...Typography.label,
    color: Colors.blue,
    fontSize: 7,
    letterSpacing: 4,
  },
});
