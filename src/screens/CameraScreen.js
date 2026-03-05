// src/screens/CameraScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, Dimensions, StatusBar, Switch,
} from 'react-native';
// expo-camera v16 (Expo 52): Camera → CameraView, CameraType/FlashMode removed
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radii, Shadow } from '../theme';
import { PRESETS, DEFAULT_PRESET, compressImage } from '../utils/compress';
import { getLocation, coordLabel } from '../utils/location';
import { savePhoto } from '../utils/fs';
import { onPhotoCaptured } from '../utils/admob';
import { loadSettings } from '../utils/settings';

const { width, height } = Dimensions.get('window');

// Flash cycles: off → on → auto
const FLASH_CYCLE = { off: 'on', on: 'auto', auto: 'off' };
const FLASH_LABEL = { off: '⚡ Off', on: '⚡ On', auto: '⚡ Auto' };
const FLASH_COLOR = (flash, Colors) => ({
  off: Colors.textMuted, on: Colors.amber, auto: Colors.cyan,
}[flash]);

export default function CameraScreen({ route, navigation }) {
  const { folderDir, folderName, projectId, projectName } = route.params;
  const camRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [preset, setPreset]             = useState(DEFAULT_PRESET);
  const [showPresets, setShowPresets]   = useState(false);
  const [flash, setFlash]               = useState('off');   // 'off' | 'on' | 'auto'
  const [facing, setFacing]             = useState('back');  // 'back' | 'front'
  const [capturing, setCapturing]       = useState(false);
  const [photoCount, setPhotoCount]     = useState(0);
  const [locationOn, setLocationOn]     = useState(true);
  const [watermarkOn, setWatermarkOn]   = useState(false);
  const [currentLoc, setCurrentLoc]     = useState(null);
  const [showOptions, setShowOptions]   = useState(false);

  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const settings = await loadSettings();
      const savedPreset = PRESETS.find(p => p.id === settings.defaultPreset) || DEFAULT_PRESET;
      setPreset(savedPreset);
      setLocationOn(settings.locationDefault);
      setWatermarkOn(settings.watermarkDefault);

      if (!permission?.granted) await requestPermission();

      if (settings.locationDefault) {
        const loc = await getLocation();
        setCurrentLoc(loc);
      }
    })();
  }, []);

  const refreshLocation = async () => {
    if (locationOn) {
      const loc = await getLocation();
      setCurrentLoc(loc);
    }
  };

  const triggerFlash = () => {
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 40,  useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(shutterScale, { toValue: 0.87, duration: 70,  useNativeDriver: true }),
      Animated.timing(shutterScale, { toValue: 1,    duration: 160, useNativeDriver: true }),
    ]).start();
  };

  const capture = async () => {
    if (!camRef.current || capturing) return;
    setCapturing(true);
    triggerFlash();
    await refreshLocation();

    try {
      const raw        = await camRef.current.takePictureAsync({ quality: 1, skipProcessing: false });
      const compressed = await compressImage(raw.uri, preset);
      const opts = {
        lat:       locationOn && currentLoc ? currentLoc.lat : undefined,
        lng:       locationOn && currentLoc ? currentLoc.lng : undefined,
        watermark: watermarkOn,
      };
      await savePhoto(folderDir, compressed.uri, opts);
      setPhotoCount(c => c + 1);
      onPhotoCaptured();
    } catch (e) {
      Alert.alert('Capture Failed', 'Please try again.');
      console.error(e);
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) return <View style={styles.noPerm} />;

  if (!permission.granted) {
    return (
      <View style={styles.noPerm}>
        <Text style={styles.noPermTxt}>Camera permission denied.</Text>
        <Text style={styles.noPermSub}>Enable in Settings → Apps → SurveySnap Pro</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnTxt}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const flashColor = FLASH_COLOR(flash, Colors);
  const flashLabel = FLASH_LABEL[flash];

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {/* expo-camera v16: CameraView with facing/flash string props */}
      <CameraView
        ref={camRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
      >
        <Animated.View style={[styles.flashOverlay, { opacity: flashOpacity }]} pointerEvents="none" />

        {/* ── Top bar ── */}
        <LinearGradient colors={Colors.gradCamera} style={styles.topBar}>
          <SafeAreaView edges={['top']}>
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.topBtnTxt}>✕</Text>
              </TouchableOpacity>
              <View style={styles.topMid}>
                <Text style={styles.topFolder} numberOfLines={1}>{folderName}</Text>
                <Text style={styles.topCount}>{photoCount} captured this session</Text>
              </View>
              <TouchableOpacity style={styles.topBtn} onPress={() => setFlash(f => FLASH_CYCLE[f])}>
                <Text style={[styles.topBtnTxt, { color: flashColor }]}>{flashLabel}</Text>
              </TouchableOpacity>
            </View>
            {locationOn && (
              <View style={styles.locPill}>
                <Text style={styles.locDot}>●</Text>
                <Text style={styles.locTxt}>
                  {currentLoc ? coordLabel(currentLoc.lat, currentLoc.lng) : 'Acquiring GPS…'}
                </Text>
              </View>
            )}
          </SafeAreaView>
        </LinearGradient>

        {/* Survey crosshair */}
        <View style={styles.crosshair} pointerEvents="none">
          {['TL', 'TR', 'BL', 'BR'].map(pos => (
            <View key={pos} style={[styles.corner,
              pos.includes('T') ? { top: '30%' } : { bottom: '30%' },
              pos.includes('L') ? { left: '20%' } : { right: '20%' },
              pos.includes('T') && pos.includes('L') && { borderTopWidth: 1.5, borderLeftWidth: 1.5 },
              pos.includes('T') && pos.includes('R') && { borderTopWidth: 1.5, borderRightWidth: 1.5 },
              pos.includes('B') && pos.includes('L') && { borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
              pos.includes('B') && pos.includes('R') && { borderBottomWidth: 1.5, borderRightWidth: 1.5 },
            ]} />
          ))}
          <View style={styles.crossH} />
          <View style={styles.crossV} />
          <View style={styles.centreDot} />
        </View>

        {/* ── Bottom controls ── */}
        <LinearGradient colors={Colors.gradCameraBot} style={styles.bottomBar}>
          <TouchableOpacity style={styles.presetBar} onPress={() => setShowPresets(v => !v)}>
            <LinearGradient colors={['rgba(11,18,32,0.92)', 'rgba(6,8,15,0.92)']} style={styles.presetBarGrad}>
              <View style={[styles.presetDot, { backgroundColor: preset.color }]} />
              <Text style={styles.presetName}>{preset.label}</Text>
              <Text style={[styles.presetTag, { color: preset.color }]}>{preset.tag}</Text>
              <Text style={styles.presetSub}>{preset.sub}</Text>
              <Text style={styles.presetArrow}>{showPresets ? '▲' : '▼'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {showPresets && (
            <View style={styles.presetsDropdown}>
              {PRESETS.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.presetOpt, preset.id === p.id && { backgroundColor: Colors.blueTrace }]}
                  onPress={() => { setPreset(p); setShowPresets(false); }}
                >
                  <View style={[styles.presetOptDot, { backgroundColor: p.color }]} />
                  <View style={styles.presetOptInfo}>
                    <Text style={styles.presetOptLabel}>{p.label}</Text>
                    <Text style={[styles.presetOptTag, { color: p.color }]}>{p.tag}</Text>
                    <Text style={styles.presetOptSub}>{p.sub}</Text>
                  </View>
                  {preset.id === p.id && <Text style={[styles.presetCheck, { color: p.color }]}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showOptions && (
            <View style={styles.optionsPanel}>
              <View style={styles.optRow}>
                <Text style={styles.optIcon}>📍</Text>
                <View style={styles.optInfo}>
                  <Text style={styles.optLabel}>Location Tagging</Text>
                  <Text style={styles.optSub}>Embed GPS in filename</Text>
                </View>
                <Switch
                  value={locationOn}
                  onValueChange={async (v) => {
                    setLocationOn(v);
                    if (v) { const loc = await getLocation(); setCurrentLoc(loc); }
                    else setCurrentLoc(null);
                  }}
                  trackColor={{ false: Colors.borderSubtle, true: Colors.blueDim }}
                  thumbColor={locationOn ? Colors.blue : Colors.textMuted}
                />
              </View>
              <View style={styles.optDivider} />
              <View style={styles.optRow}>
                <Text style={styles.optIcon}>🏷</Text>
                <View style={styles.optInfo}>
                  <Text style={styles.optLabel}>Watermark in PDF</Text>
                  <Text style={styles.optSub}>Show date + GPS on report photos</Text>
                </View>
                <Switch
                  value={watermarkOn}
                  onValueChange={setWatermarkOn}
                  trackColor={{ false: Colors.borderSubtle, true: Colors.blueDim }}
                  thumbColor={watermarkOn ? Colors.blue : Colors.textMuted}
                />
              </View>
            </View>
          )}

          <View style={styles.controls}>
            <TouchableOpacity style={styles.sideBtn} onPress={() => setShowOptions(v => !v)}>
              <Text style={[styles.sideBtnIco, showOptions && { color: Colors.blue }]}>⚙</Text>
              <Text style={styles.sideBtnTxt}>Options</Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: shutterScale }], ...Shadow.blue }}>
              <TouchableOpacity style={styles.shutter} onPress={capture} disabled={capturing} activeOpacity={1}>
                <LinearGradient
                  colors={capturing ? ['#444', '#222'] : Colors.gradBlue}
                  style={styles.shutterGrad}
                >
                  <View style={styles.shutterRing} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity style={styles.sideBtn}
              onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
              <Text style={styles.sideBtnIco}>⟳</Text>
              <Text style={styles.sideBtnTxt}>Flip</Text>
            </TouchableOpacity>
          </View>
          <SafeAreaView edges={['bottom']} />
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const CORNER_SIZE = 22;
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  noPerm:    { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  noPermTxt: { ...Typography.heading, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  noPermSub: { ...Typography.uiLight, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  permBtn:   { borderRadius: Radii.pill, borderWidth: 1, borderColor: Colors.blue, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnTxt:{ ...Typography.uiBold, color: Colors.blue, fontSize: 13 },

  flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 100 },

  topBar: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm },
  topBtn: { minWidth: 56, alignItems: 'center' },
  topBtnTxt: { color: Colors.textPrimary, fontSize: 13, ...Typography.ui },
  topMid: { flex: 1, alignItems: 'center' },
  topFolder: { ...Typography.label, color: Colors.cyan, fontSize: 9, letterSpacing: 2 },
  topCount:  { ...Typography.caption, color: Colors.textSecondary, fontSize: 10, marginTop: 2 },

  locPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: Spacing.sm, backgroundColor: 'rgba(6,8,15,0.65)', borderRadius: Radii.pill, borderWidth: 0.5, borderColor: Colors.cyan + '40', paddingHorizontal: 12, paddingVertical: 5, gap: 5 },
  locDot: { color: Colors.cyan, fontSize: 7 },
  locTxt: { ...Typography.mono, color: Colors.cyan, fontSize: 9 },

  crosshair: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  corner:    { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: Colors.cyan, borderWidth: 0 },
  crossH:    { position: 'absolute', top: '50%', left: '20%', right: '20%', height: 0.5, backgroundColor: Colors.cyan, opacity: 0.4 },
  crossV:    { position: 'absolute', left: '50%', top: '30%', bottom: '30%', width: 0.5, backgroundColor: Colors.cyan, opacity: 0.4 },
  centreDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: Colors.cyan, opacity: 0.7 },

  bottomBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.md },
  presetBar:    { borderRadius: Radii.pill, overflow: 'hidden', alignSelf: 'center', borderWidth: 0.5, borderColor: Colors.border, marginBottom: Spacing.sm },
  presetBarGrad:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 7 },
  presetDot:    { width: 8, height: 8, borderRadius: 99 },
  presetName:   { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 12 },
  presetTag:    { ...Typography.label, fontSize: 8 },
  presetSub:    { ...Typography.caption, color: Colors.textMuted, fontSize: 9 },
  presetArrow:  { color: Colors.textMuted, fontSize: 8, marginLeft: 2 },

  presetsDropdown: { backgroundColor: 'rgba(11,18,32,0.97)', borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, marginBottom: Spacing.sm, overflow: 'hidden' },
  presetOpt:       { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.borderSubtle },
  presetOptDot:    { width: 10, height: 10, borderRadius: 99 },
  presetOptInfo:   { flex: 1 },
  presetOptLabel:  { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 13 },
  presetOptTag:    { ...Typography.caption, fontSize: 10 },
  presetOptSub:    { ...Typography.caption, color: Colors.textMuted, fontSize: 9 },
  presetCheck:     { fontSize: 14 },

  optionsPanel: { backgroundColor: 'rgba(11,18,32,0.97)', borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, marginBottom: Spacing.sm, overflow: 'hidden' },
  optRow:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  optIcon:  { fontSize: 18, width: 28 },
  optInfo:  { flex: 1 },
  optLabel: { ...Typography.ui, color: Colors.textPrimary, fontSize: 13 },
  optSub:   { ...Typography.caption, color: Colors.textMuted, fontSize: 10 },
  optDivider:{ height: 0.5, backgroundColor: Colors.borderSubtle, marginHorizontal: Spacing.md },

  controls:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.lg },
  sideBtn:    { alignItems: 'center', width: 60 },
  sideBtnIco: { color: Colors.textSecondary, fontSize: 20 },
  sideBtnTxt: { ...Typography.caption, color: Colors.textMuted, fontSize: 9, marginTop: 3 },
  shutter:    { borderRadius: Radii.circle, overflow: 'hidden' },
  shutterGrad:{ width: 74, height: 74, borderRadius: Radii.circle, alignItems: 'center', justifyContent: 'center' },
  shutterRing:{ width: 60, height: 60, borderRadius: Radii.circle, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.1)' },
});
