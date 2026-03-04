// src/screens/GalleryScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Modal, Alert, Dimensions, StatusBar, ActivityIndicator,
  Switch, Pressable, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { Colors, Typography, Spacing, Radii, Shadow } from '../theme';
import { getPhotos, deletePhoto } from '../utils/fs';
import { generatePDF, sharePDF } from '../utils/pdfReport';
import { showRewarded } from '../utils/admob';

const { width, height } = Dimensions.get('window');
const COLS = 3;
const THUMB = (width - Spacing.md * 2 - 4) / COLS;

const PER_PAGE_OPTIONS = [4, 6, 8];

export default function GalleryScreen({ route, navigation }) {
  const { folderDir, folderName, projectName } = route.params;
  const [photos, setPhotos] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [perPage, setPerPage] = useState(6);
  const [showLocation, setShowLocation] = useState(true);
  const [showWatermark, setShowWatermark] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const data = await getPhotos(folderDir);
    setPhotos(data);
  }, [folderDir]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (photo) => {
    Alert.alert('Delete Photo', 'Remove this photo permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deletePhoto(photo.uri); setViewer(null); load(); } },
    ]);
  };

  const handleShare = async (photo) => {
    const ok = await Sharing.isAvailableAsync();
    if (ok) await Sharing.shareAsync(photo.uri, { mimeType: 'image/jpeg' });
  };

  // PDF generation — gated by rewarded ad
  const handleGeneratePDF = () => {
    if (photos.length === 0) { Alert.alert('No photos', 'Add photos to this folder first.'); return; }

    const go = async () => {
      setGenerating(true);
      setShowExport(false);
      try {
        const pdfUri = await generatePDF({
          photos,
          projectName,
          folderName,
          perPage,
          showLocation,
          showWatermark,
          wmText: showWatermark ? `${projectName} · SurveySnap Pro` : '',
        });
        await sharePDF(pdfUri, projectName);
      } catch (e) {
        Alert.alert('PDF Error', e.message || 'Could not generate report.');
        console.error(e);
      } finally {
        setGenerating(false);
      }
    };

    // Show rewarded ad to unlock PDF
    const shown = showRewarded(() => go());
    if (!shown) {
      // Ad not ready — offer to generate anyway (graceful fallback)
      Alert.alert(
        'Generate PDF Report',
        `Create a ${Math.ceil(photos.length / perPage)}-page A4 PDF with ${perPage} photos per sheet?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Generate', onPress: go },
        ]
      );
    }
  };

  const pageCount = Math.ceil(photos.length / perPage);

  const renderThumb = ({ item, index }) => (
    <TouchableOpacity style={styles.thumb} onPress={() => setViewer(item)} activeOpacity={0.85}>
      <Image source={{ uri: item.uri }} style={styles.thumbImg} />
      <LinearGradient colors={['transparent', 'rgba(6,8,15,0.7)']} style={styles.thumbOverlay}>
        <Text style={styles.thumbNum}>{index + 1}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0B1120', Colors.bg]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backIco}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerMid}>
              <Text style={styles.headerTitle} numberOfLines={1}>{folderName}</Text>
              <Text style={styles.headerCount}>{photos.length} PHOTO{photos.length !== 1 ? 'S' : ''}</Text>
            </View>
            {photos.length > 0 && (
              <TouchableOpacity style={styles.pdfBtn} onPress={() => setShowExport(true)}>
                <LinearGradient colors={Colors.gradBlue} style={styles.pdfBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                  <Text style={styles.pdfBtnTxt}>PDF Report</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.ruler} />

      {/* Generating overlay */}
      {generating && (
        <View style={styles.generatingOverlay}>
          <LinearGradient colors={['rgba(11,18,32,0.98)', 'rgba(6,8,15,0.98)']} style={styles.generatingCard}>
            <View style={styles.generatingBar} />
            <ActivityIndicator color={Colors.blue} size="large" />
            <Text style={styles.generatingTitle}>Building PDF Report</Text>
            <Text style={styles.generatingSub}>
              {photos.length} photos → {pageCount} page{pageCount !== 1 ? 's' : ''} · A4
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Grid */}
      <FlatList
        data={photos}
        keyExtractor={p => p.uri}
        renderItem={renderThumb}
        numColumns={COLS}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIco}>◎</Text>
            <Text style={styles.emptyTitle}>No Photos Yet</Text>
            <Text style={styles.emptySub}>Use the camera to capture survey photos</Text>
            <TouchableOpacity style={styles.cameraBtn} onPress={() => navigation.navigate('Camera', { folderDir, folderName, projectName })}>
              <LinearGradient colors={Colors.gradBlue} style={styles.cameraBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                <Text style={styles.cameraBtnTxt}>📷  Open Camera</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* FAB camera */}
      {photos.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Camera', { folderDir, folderName, projectName })}>
          <LinearGradient colors={Colors.gradBlue} style={styles.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.fabTxt}>📷</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── Viewer modal ── */}
      <Modal visible={!!viewer} transparent={false} animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewer}>
          <StatusBar hidden />
          {viewer && <Image source={{ uri: viewer.uri }} style={styles.viewerImg} resizeMode="contain" />}

          <LinearGradient colors={Colors.gradCamera} style={styles.viewerTop}>
            <SafeAreaView edges={['top']}>
              <View style={styles.viewerTopRow}>
                <TouchableOpacity onPress={() => setViewer(null)}>
                  <Text style={styles.viewerClose}>✕</Text>
                </TouchableOpacity>
                <View style={styles.viewerActions}>
                  <TouchableOpacity style={styles.viewerAction} onPress={() => handleShare(viewer)}>
                    <Text style={styles.viewerActionIco}>↗</Text>
                    <Text style={styles.viewerActionTxt}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.viewerAction, { borderColor: Colors.red + '50' }]} onPress={() => handleDelete(viewer)}>
                    <Text style={[styles.viewerActionIco, { color: Colors.red }]}>🗑</Text>
                    <Text style={[styles.viewerActionTxt, { color: Colors.red }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>

          <LinearGradient colors={Colors.gradOverlay} style={styles.viewerBottom}>
            <Text style={styles.viewerFilename} numberOfLines={1}>{viewer?.name}</Text>
          </LinearGradient>
        </View>
      </Modal>

      {/* ── PDF Export Sheet ── */}
      <Modal visible={showExport} transparent animationType="slide" onRequestClose={() => setShowExport(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowExport(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <LinearGradient colors={['#1A2538', '#0C1220']} style={styles.sheetGrad}>
              <View style={styles.sheetBar} />
              <View style={styles.sheetHandle} />

              <Text style={styles.sheetTitle}>PDF Report Settings</Text>
              <Text style={styles.sheetSub}>
                {photos.length} photos · {pageCount} page{pageCount !== 1 ? 's' : ''} · A4 printable
              </Text>

              {/* Photos per sheet */}
              <Text style={styles.sheetSectionLabel}>Photos per Sheet</Text>
              <View style={styles.perPageRow}>
                {PER_PAGE_OPTIONS.map(n => {
                  const active = perPage === n;
                  const pages = Math.ceil(photos.length / n);
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.perPageBtn, active && styles.perPageBtnActive]}
                      onPress={() => setPerPage(n)}
                    >
                      {active ? (
                        <LinearGradient colors={Colors.gradBlue} style={styles.perPageBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                          <Text style={styles.perPageNum}>{n}</Text>
                          <Text style={styles.perPagePages}>{pages}pp</Text>
                          <Text style={styles.perPageLayout}>
                            {n === 4 ? '2×2' : n === 6 ? '2×3' : '2×4'}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.perPageBtnInner}>
                          <Text style={styles.perPageNum}>{n}</Text>
                          <Text style={styles.perPagePages}>{pages}pp</Text>
                          <Text style={styles.perPageLayout}>
                            {n === 4 ? '2×2' : n === 6 ? '2×3' : '2×4'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Options toggles */}
              <Text style={styles.sheetSectionLabel}>Options</Text>
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleIco}>📍</Text>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show GPS Coordinates</Text>
                    <Text style={styles.toggleSub}>Display lat/lng under each photo</Text>
                  </View>
                  <Switch
                    value={showLocation} onValueChange={setShowLocation}
                    trackColor={{ false: Colors.borderSubtle, true: Colors.blueDim }}
                    thumbColor={showLocation ? Colors.blue : Colors.textMuted}
                  />
                </View>
                <View style={styles.toggleDivider} />
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleIco}>🏷</Text>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Add Watermark</Text>
                    <Text style={styles.toggleSub}>Project name on each photo</Text>
                  </View>
                  <Switch
                    value={showWatermark} onValueChange={setShowWatermark}
                    trackColor={{ false: Colors.borderSubtle, true: Colors.blueDim }}
                    thumbColor={showWatermark ? Colors.blue : Colors.textMuted}
                  />
                </View>
              </View>

              {/* Preview layout visual */}
              <View style={styles.layoutPreview}>
                {Array.from({ length: perPage }).map((_, i) => (
                  <View key={i} style={[styles.layoutCell, {
                    width: `${(100 / 2) - 2}%`,
                    aspectRatio: perPage === 4 ? 1.3 : perPage === 6 ? 1.4 : 1.6,
                  }]}>
                    <Text style={styles.layoutCellTxt}>{i + 1}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.layoutHint}>A4 layout preview · {perPage === 4 ? '2×2' : perPage === 6 ? '2×3' : '2×4'} grid</Text>

              {/* Generate button */}
              <TouchableOpacity style={styles.generateBtn} onPress={handleGeneratePDF}>
                <LinearGradient colors={Colors.gradBlue} style={styles.generateBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                  <Text style={styles.generateBtnTxt}>📄  Generate & Share PDF</Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.adNotice}>Watch a short ad to unlock export</Text>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: Radii.circle, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  backIco: { color: Colors.blue, fontSize: 18 },
  headerMid: { flex: 1 },
  headerTitle: { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 16 },
  headerCount: { ...Typography.label, color: Colors.textMuted, fontSize: 8, marginTop: 2 },
  pdfBtn: { borderRadius: Radii.pill, overflow: 'hidden' },
  pdfBtnGrad: { paddingHorizontal: Spacing.md, paddingVertical: 8 },
  pdfBtnTxt: { ...Typography.label, color: '#fff', fontSize: 9 },

  ruler: { height: 0.5, backgroundColor: Colors.blue, opacity: 0.3, marginHorizontal: Spacing.md },

  generatingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,8,15,0.7)' },
  generatingCard: { width: width - 64, padding: Spacing.xl, borderRadius: Radii.xl, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden', ...Shadow.blue },
  generatingBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.blue },
  generatingTitle: { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 17, marginTop: Spacing.md },
  generatingSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },

  grid: { padding: Spacing.md, paddingBottom: 90 },
  thumb: { width: THUMB, height: THUMB, margin: 1, borderRadius: Radii.sm, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  thumbOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, justifyContent: 'flex-end', padding: 3 },
  thumbNum: { ...Typography.caption, color: Colors.textSecondary, fontSize: 8 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyIco: { fontSize: 48, color: Colors.blue, opacity: 0.3, marginBottom: Spacing.lg },
  emptyTitle: { ...Typography.heading, color: Colors.textSecondary, fontSize: 18, marginBottom: Spacing.sm },
  emptySub: { ...Typography.uiLight, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.xl },
  cameraBtn: { borderRadius: Radii.pill, overflow: 'hidden', ...Shadow.blue },
  cameraBtnGrad: { paddingHorizontal: Spacing.xl, paddingVertical: 13 },
  cameraBtnTxt: { ...Typography.uiBold, color: '#fff', fontSize: 13 },

  fab: { position: 'absolute', bottom: 24, right: Spacing.lg, ...Shadow.blue },
  fabGrad: { width: 54, height: 54, borderRadius: Radii.circle, alignItems: 'center', justifyContent: 'center' },
  fabTxt: { fontSize: 22 },

  // Viewer
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerImg: { ...StyleSheet.absoluteFillObject, width, height },
  viewerTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 50 },
  viewerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md },
  viewerClose: { color: '#fff', fontSize: 18, padding: 8 },
  viewerActions: { flexDirection: 'row', gap: 8 },
  viewerAction: { alignItems: 'center', width: 50, padding: 8, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.55)' },
  viewerActionIco: { fontSize: 16, color: '#fff' },
  viewerActionTxt: { ...Typography.caption, color: Colors.textSecondary, fontSize: 8, marginTop: 2 },
  viewerBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.md, paddingBottom: 40, paddingTop: 40 },
  viewerFilename: { ...Typography.mono, color: Colors.textMuted, fontSize: 9 },

  // Export Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border },
  sheetGrad: { padding: Spacing.lg, paddingBottom: 40 },
  sheetBar: { position: 'absolute', top: 0, left: 40, right: 40, height: 2, backgroundColor: Colors.blue, opacity: 0.8, borderRadius: 99 },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.borderStrong, borderRadius: 99, alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitle: { ...Typography.heading, color: Colors.textPrimary, fontSize: 20, marginBottom: 4 },
  sheetSub: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.md },

  sheetSectionLabel: { ...Typography.label, color: Colors.blue, fontSize: 8, marginBottom: Spacing.sm, marginTop: Spacing.sm },

  perPageRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  perPageBtn: { flex: 1, borderRadius: Radii.md, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border },
  perPageBtnActive: { borderColor: Colors.blue, ...Shadow.blue },
  perPageBtnGrad: { alignItems: 'center', paddingVertical: Spacing.md },
  perPageBtnInner: { alignItems: 'center', paddingVertical: Spacing.md },
  perPageNum: { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 20 },
  perPagePages: { ...Typography.caption, color: Colors.textSecondary, fontSize: 9, marginTop: 1 },
  perPageLayout: { ...Typography.label, color: Colors.textMuted, fontSize: 7, marginTop: 2 },

  toggleCard: { backgroundColor: Colors.card, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  toggleIco: { fontSize: 18, width: 26 },
  toggleInfo: { flex: 1 },
  toggleLabel: { ...Typography.ui, color: Colors.textPrimary, fontSize: 13 },
  toggleSub: { ...Typography.caption, color: Colors.textMuted, fontSize: 10 },
  toggleDivider: { height: 0.5, backgroundColor: Colors.borderSubtle, marginHorizontal: Spacing.md },

  layoutPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, backgroundColor: Colors.surface, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: 4, borderWidth: 0.5, borderColor: Colors.border },
  layoutCell: { backgroundColor: Colors.card, borderRadius: 3, borderWidth: 0.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  layoutCellTxt: { ...Typography.caption, color: Colors.textMuted, fontSize: 9 },
  layoutHint: { ...Typography.caption, color: Colors.textMuted, fontSize: 9, textAlign: 'center', marginBottom: Spacing.md },

  generateBtn: { borderRadius: Radii.pill, overflow: 'hidden', ...Shadow.blue, marginBottom: Spacing.sm },
  generateBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  generateBtnTxt: { ...Typography.uiBold, color: '#fff', fontSize: 15 },
  adNotice: { ...Typography.caption, color: Colors.textMuted, fontSize: 9, textAlign: 'center', opacity: 0.6 },
});
