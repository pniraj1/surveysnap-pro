// src/screens/SettingsScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, StatusBar, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radii } from '../theme';
import SurveySnapLogo from '../components/SurveySnapLogo';
import { PRESETS } from '../utils/compress';

export default function SettingsScreen({ navigation }) {
  const [defaultPreset, setDefaultPreset] = useState('balanced');
  const [locationDefault, setLocationDefault] = useState(true);
  const [watermarkDefault, setWatermarkDefault] = useState(false);

  const Block = ({ children }) => (
    <View style={styles.block}>{children}</View>
  );

  const RowToggle = ({ icon, label, sub, value, onChange }) => (
    <View style={styles.row}>
      <Text style={styles.rowIco}>{icon}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: Colors.borderSubtle, true: Colors.blueDim }}
        thumbColor={value ? Colors.blue : Colors.textMuted}
      />
    </View>
  );

  const RowLink = ({ icon, label, sub, onPress }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowIco}>{icon}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const Sep = () => <View style={styles.divider} />;
  const Section = ({ title }) => (
    <View style={styles.section}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTxt}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0B1120', Colors.bg]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backIco}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
      <View style={styles.ruler} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.logoArea}>
          <SurveySnapLogo size={62} showText={true} textSize="md" />
          <Text style={styles.version}>Version 1.0.0  ·  com.surveysnap.pro</Text>
        </View>

        <Section title="Camera Defaults" />
        <Block>
          <Text style={styles.blockLabel}>Default Image Quality</Text>
          <Text style={styles.blockSub}>Applied when opening camera</Text>
          {PRESETS.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.presetRow, defaultPreset === p.id && styles.presetRowActive, i > 0 && { borderTopWidth: 0.5, borderTopColor: Colors.borderSubtle }]}
              onPress={() => setDefaultPreset(p.id)}
            >
              <View style={[styles.presetDot, { backgroundColor: p.color }]} />
              <View style={styles.presetInfo}>
                <Text style={styles.presetLabel}>{p.label}</Text>
                <Text style={[styles.presetTag, { color: p.color }]}>{p.tag} · {p.sub}</Text>
              </View>
              {defaultPreset === p.id && <Text style={[styles.checkmark, { color: p.color }]}>✓</Text>}
            </TouchableOpacity>
          ))}
        </Block>

        <Section title="Photo Options" />
        <Block>
          <RowToggle icon="📍" label="Location Tagging" sub="GPS embed in filename (default)" value={locationDefault} onChange={setLocationDefault} />
          <Sep />
          <RowToggle icon="🏷" label="Watermark in PDF" sub="Project name on exported photos" value={watermarkDefault} onChange={setWatermarkDefault} />
        </Block>

        <Section title="Legal & Support" />
        <Block>
          <RowLink icon="📋" label="Privacy Policy" onPress={() => Linking.openURL('https://yoursite.com/privacy')} />
          <Sep />
          <RowLink icon="📄" label="Terms of Service" onPress={() => Linking.openURL('https://yoursite.com/terms')} />
          <Sep />
          <RowLink icon="⭐" label="Rate SurveySnap Pro" sub="Help us grow on Play Store" onPress={() => Linking.openURL('market://details?id=com.surveysnap.pro')} />
          <Sep />
          <RowLink icon="💬" label="Contact Support" onPress={() => Linking.openURL('mailto:support@surveysnappro.com')} />
        </Block>

        <Text style={styles.adNote}>
          SurveySnap Pro is supported by non-intrusive ads. This helps us keep the app free for surveyors worldwide.
        </Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, gap: Spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: Radii.circle, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  backIco: { color: Colors.blue, fontSize: 18 },
  headerTitle: { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 17 },
  ruler: { height: 0.5, backgroundColor: Colors.blue, opacity: 0.3, marginHorizontal: Spacing.md },
  logoArea: { alignItems: 'center', paddingVertical: Spacing.xl },
  version: { ...Typography.caption, color: Colors.textMuted, fontSize: 9, marginTop: Spacing.sm },

  section: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginVertical: Spacing.md, gap: 10 },
  sectionLine: { flex: 1, height: 0.5, backgroundColor: Colors.border },
  sectionTxt: { ...Typography.label, color: Colors.blue, fontSize: 8, opacity: 0.8 },

  block: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.card, overflow: 'hidden' },
  blockLabel: { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 13, padding: Spacing.md, paddingBottom: 2 },
  blockSub: { ...Typography.caption, color: Colors.textMuted, fontSize: 10, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },

  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  rowIco: { fontSize: 18, width: 26 },
  rowInfo: { flex: 1 },
  rowLabel: { ...Typography.ui, color: Colors.textPrimary, fontSize: 14 },
  rowSub: { ...Typography.caption, color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  chevron: { color: Colors.blue, fontSize: 18 },
  divider: { height: 0.5, backgroundColor: Colors.borderSubtle, marginHorizontal: Spacing.md },

  presetRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  presetRowActive: { backgroundColor: Colors.blueTrace },
  presetDot: { width: 10, height: 10, borderRadius: 99 },
  presetInfo: { flex: 1 },
  presetLabel: { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 13 },
  presetTag: { ...Typography.caption, fontSize: 10, marginTop: 2 },
  checkmark: { fontSize: 14 },

  adNote: { ...Typography.caption, color: Colors.textMuted, fontSize: 9, textAlign: 'center', paddingHorizontal: Spacing.xl, lineHeight: 15, opacity: 0.5 },
});
