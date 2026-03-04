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
import { getPhotos, deletePhoto, movePhoto, exportProjectAsZip, parsePhotoMeta, getProjects } from '../utils/fs';
import { generatePDF, sharePDF } from '../utils/pdfReport';
import { showRewarded } from '../utils/admob';
import { coordLabel } from '../utils/location';

const { width, height } = Dimensions.get('window');
const COLS  = 3;
const THUMB = (width - Spacing.md * 2 - 4) / COLS;
const PER_PAGE_OPTIONS = [4, 6, 8];

export default function GalleryScreen({ route, navigation }) {
  const { folderDir, folderName, projectName, projectId } = route.params;

  const [photos, setPhotos]             = useState([]);
  const [viewer, setViewer]             = useState(null);
  const [showExport, setShowExport]     = useState(false);
  const [perPage, setPerPage]           = useState(6);
  const [showLocation, setShowLocation] = useState(true);
  const [showWatermark, setShowWatermark] = useState(false);
  const [generating, setGenerating]     = useState(false);

  // Batch selection
  const [selectMode, setSelectMode]     = useState(false);
  const [selected, setSelected]         = useState(new Set());

  // Move photo
  const [moveModal, setMoveModal]       = useState(false);
  const [moveTarget, setMoveTarget]     = useState(null);
  const [projectFolders, setProjectFolders] = useState([]);

  // ZIP export
  const [zipping, setZipping]           = useState(false);

  const load = useCallback(async () => {
    const data = await getPhotos(folderDir);
    setPhotos(data);
  }, [folderDir]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = (photo) => {
    Alert.alert('Delete Photo', 'Remove this photo permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deletePhoto(photo.uri); setViewer(null); load(); } },
    ]);
  };

  // Batch delete
  const handleBatchDelete = () => {
    if (selected.size === 0) return;
    Alert.alert('Delete Photos', `Delete ${selected.size} selected photo${selected.size > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All', style: 'destructive', onPress: async () => {
          await Promise.all([...selected].map(uri => deletePhoto(uri)));
          setSelected(new Set());
          setSelectMode(false);
          load();
        },
      },
    ]);
  };

  // Batch share
  const handleBatchShare = async () => {
    if (selected.size === 0) return;
    if (selected.size === 1) {
      const uri = [...selected][0];
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
      return;
    }
    Alert.alert('Share', 'Sharing multiple photos opens them one at a time. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share All', onPress: async () => {
          for (const uri of selected) await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
        },
      },
    ]);
  };

  // ── Move photo ───────────────────────────────────────────────────────────
  const openMoveModal = async (photo) => {
    if (!projectId) { Alert.alert('Move', 'Cannot move photos — project ID not available.'); return; }
    setViewer(null);
    const projects  = await getProjects();
    const proj      = projects.find(p => p.id === projectId);
    const flatFolders = [];
    const flatten = (folders, depth = 0) => {
      for (const f of folders) {
        if (f.dir !== folderDir) flatFolders.push({ ...f, depth });
        flatten(f.subfolders || [], depth + 1);
      }
    };
    flatten(proj?.folders || []);
    setProjectFolders(flatFolders);
    setMoveTarget(photo);
    setMoveModal(true);
  };

  const handleMove = async (targetDir) => {
    if (!moveTarget) return;
    try {
      await movePhoto(moveTarget.uri, targetDir);
      setMoveModal(false);
      setMoveTarget(null);
      load();
    } catch (e) { Alert.alert('Error', 'Could not move photo: ' + e.message); }
  };

  // ── Share single ─────────────────────────────────────────────────────────
  const handleShare = async (photo) => {
    const ok = await Sharing.isAvailableAsync();
    if (ok) await Sharing.shareAsync(photo.uri, { mimeType: 'image/jpeg' });
  };

  // ── ZIP export ───────────────────────────────────────────────────────────
  const handleZipExport = async () => {
    if (!projectId) { Alert.alert('ZIP Export', 'Project ID not available.'); return; }
    setZipping(true);
    try {
      const zipUri = await exportProjectAsZip(projectId);
      await Sharing.shareAsync(zipUri, { mimeType: 'application/zip', dialogTitle: `${projectName} — Photos Export` });
    } catch (e) {
      Alert.alert('ZIP Error', e.message || 'Could not create ZIP file.');
    } finally { setZipping(false); }
  };

  // ── PDF generation ───────────────────────────────────────────────────────
  const handleGeneratePDF = () => {
    if (photos.length === 0) { Alert.alert('No photos', 'Add photos to this folder first.'); return; }
    const go = async () => {
      setGenerating(true); setShowExport(false);
      try {
        const pdfUri = await generatePDF({ photos, projectName, folderName, perPage, showLocation, showWatermark, wmText: showWatermark ? `${projectName} · SurveySnap Pro` : '' });
        await sharePDF(pdfUri, projectName);
      } catch (e) { Alert.alert('PDF Error', e.message || 'Could not generate report.'); }
      finally { setGenerating(false); }
    };
    const shown = showRewarded(() => go());
    if (!shown) {
      Alert.alert('Generate PDF Report', `Create a ${Math.ceil(photos.length / perPage)}-page A4 PDF?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: go },
      ]);
    }
  };

  // ── Toggle selection ─────────────────────────────────────────────────────
  const toggleSelect = (uri) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(uri) ? next.delete(uri) : next.add(uri);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === photos.length) setSelected(new Set());
    else setSelected(new Set(photos.map(p => p.uri)));
  };

  const pageCount = Math.ceil(photos.length / perPage);

  const renderThumb = ({ item, index }) => {
    const isSelected = selected.has(item.uri);
    const meta = parsePhotoMeta(item.name);

    return (
      <TouchableOpacity
        style={[styles.thumb, isSelected && styles.thumbSelected]}
        onPress={() => selectMode ? toggleSelect(item.uri) : setViewer(item)}
        onLongPress={() => { setSelectMode(true); toggleSelect(item.uri); }}
        activeOpacity={0.85}
      >
        <Image source={{ uri: item.uri }} style={styles.thumbImg} />
        <LinearGradient colors={['transparent', 'rgba(6,8,15,0.75)']} style={styles.thumbOverlay}>
          <Text style={styles.thumbNum}>{index + 1}</Text>
          {/* FIX: show timestamp on thumbnail */}
          {meta.timestamp && <Text style={styles.thumbTime}>{meta.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>}
        </LinearGradient>
        {selectMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        {meta.lat != null && !selectMode && (
          <View style={styles.gpsPin}><Text style={styles.gpsPinTxt}>📍</Text></View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0B1120', Colors.bg]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => {
              if (selectMode) { setSelectMode(false); setSelected(new Set()); }
              else navigation.goBack();
            }}>
              <Text style={styles.backIco}>{selectMode ? '✕' : '←'}</Text>
            </TouchableOpacity>
            <View style={styles.headerMid}>
              {selectMode
                ? <Text style={styles.headerTitle}>{selected.size} selected</Text>
                : <Text style={styles.headerTitle} numberOfLines={1}>{folderName}</Text>
              }
              <Text style={styles.headerCount}>{photos.length} PHOTO{photos.length !== 1 ? 'S' : ''}</Text>
            </View>
            {selectMode
              ? (
                <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
                  <Text style={styles.selectAllTxt}>{selected.size === photos.length ? 'None' : 'All'}</Text>
                </TouchableOpacity>
              ) : photos.length > 0 && (
                <TouchableOpacity style={styles.pdfBtn} onPress={() => setShowExport(true)}>
                  <LinearGradient colors={Colors.gradBlue} style={styles.pdfBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                    <Text style={styles.pdfBtnTxt}>PDF Report</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )
            }
          </View>

          {/* Batch action bar */}
          {selectMode && selected.size > 0 && (
            <View style={styles.batchBar}>
              <TouchableOpacity style={styles.batchBtn} onPress={handleBatchShare}>
                <Text style={styles.batchBtnIco}>↗</Text>
                <Text style={styles.batchBtnTxt}>Share ({selected.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.batchBtn, styles.batchBtnDanger]} onPress={handleBatchDelete}>
                <Text style={styles.batchBtnIco}>🗑</Text>
                <Text style={[styles.batchBtnTxt, { color: Colors.red }]}>Delete ({selected.size})</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.ruler} />

      {/* ZIP export button */}
      {photos.length > 0 && projectId && !selectMode && (
        <TouchableOpacity style={styles.zipBar} onPress={handleZipExport} disabled={zipping}>
          <LinearGradient colors={['rgba(37,99,235,0.12)', 'rgba(37,99,235,0.04)']} style={styles.zipBarGrad} start={{ x: 0 }} end={{ x: 1 }}>
            {zipping ? <ActivityIndicator size="small" color={Colors.blue} /> : <Text style={styles.zipBarIco}>📦</Text>}
            <Text style={styles.zipBarTxt}>{zipping ? 'Creating ZIP…' : 'Export All as ZIP'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Generating overlay */}
      {generating && (
        <View style={styles.generatingOverlay}>
          <LinearGradient colors={['rgba(11,18,32,0.98)', 'rgba(6,8,15,0.98)']} style={styles.generatingCard}>
            <View style={styles.generatingBar} />
            <ActivityIndicator color={Colors.blue} size="large" />
            <Text style={styles.generatingTitle}>Building PDF Report</Text>
            <Text style={styles.generatingSub}>{photos.length} photos → {pageCount} page{pageCount !== 1 ? 's' : ''} · A4</Text>
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

      {photos.length > 0 && !selectMode && (
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
                  <TouchableOpacity style={styles.viewerAction} onPress={() => openMoveModal(viewer)}>
                    <Text style={styles.viewerActionIco}>↪</Text>
                    <Text style={styles.viewerActionTxt}>Move</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.viewerAction, { borderColor: Colors.red + '50' }]} onPress={() => handleDelete(viewer)}>
                    <Text style={[styles.viewerActionIco, { color: Colors.red }]}>🗑</Text>
                    <Text style={[styles.viewerActionTxt, { color: Colors.red }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>

          {/* FIX: show full metadata in viewer */}
          {viewer && (() => {
            const meta = parsePhotoMeta(viewer.name);
            return (
              <LinearGradient colors={Colors.gradOverlay} style={styles.viewerBottom}>
                <Text style={styles.viewerFilename} numberOfLines={1}>{viewer.name}</Text>
                {meta.timestamp && (
                  <Text style={styles.viewerMeta}>
                    🕐 {meta.timestamp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}  {meta.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </Text>
                )}
                {meta.lat != null && (
                  <Text style={styles.viewerMeta}>
                    📍 {coordLabel(meta.lat, meta.lng)}
                  </Text>
                )}
              </LinearGradient>
            );
          })()}
        </View>
      </Modal>

      {/* ── Move Photo Modal ── */}
      <Modal visible={moveModal} transparent animationType="slide" onRequestClose={() => setMoveModal(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setMoveModal(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <LinearGradient colors={['#1A2538', '#0C1220']} style={styles.sheetGrad}>
              <View style={styles.sheetBar} />
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Move Photo</Text>
              <Text style={styles.sheetSub}>Choose a destination folder</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {projectFolders.length === 0
                  ? <Text style={[styles.sheetSub, { textAlign: 'center', padding: Spacing.lg }]}>No other folders available</Text>
                  : projectFolders.map(f => (
                    <TouchableOpacity key={f.id} style={styles.moveFolderRow} onPress={() => handleMove(f.dir)}>
                      <Text style={styles.moveFolderIco}>{'  '.repeat(f.depth)}📁</Text>
                      <Text style={styles.moveFolderName}>{f.name}</Text>
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
              <TouchableOpacity style={[styles.cancelBtn, { margin: Spacing.md }]} onPress={() => setMoveModal(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── PDF Export Sheet ── */}
      <Modal visible={showExport} transparent animationType="slide" onRequestClose={() => setShowExport(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowExport(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <LinearGradient colors={['#1A2538', '#0C1220']} style={styles.sheetGrad}>
              <View style={styles.sheetBar} />
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>PDF Report Settings</Text>
              <Text style={styles.sheetSub}>{photos.length} photos · {pageCount} page{pageCount !== 1 ? 's' : ''} · A4 printable</Text>

              <Text style={styles.sheetSectionLabel}>Photos per Sheet</Text>
              <View style={styles.perPageRow}>
                {PER_PAGE_OPTIONS.map(n => {
                  const active = perPage === n;
                  const pages  = Math.ceil(photos.length / n);
                  return (
                    <TouchableOpacity key={n} style={[styles.perPageBtn, active && styles.perPageBtnActive]} onPress={() => setPerPage(n)}>
                      {active ? (
                        <LinearGradient colors={Colors.gradBlue} style={styles.perPageBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                          <Text style={styles.perPageNum}>{n}</Text>
                          <Text style={styles.perPagePages}>{pages}pp</Text>
                          <Text style={styles.perPageLayout}>{n === 4 ? '2×2' : n === 6 ? '2×3' : '2×4'}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.perPageBtnInner}>
                          <Text style={styles.perPageNum}>{n}</Text>
                          <Text style={styles.perPagePages}>{pages}pp</Text>
                          <Text style={styles.perPageLayout}>{n === 4 ? '2×2' : n === 6 ? '2×3' : '2×4'}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sheetSectionLabel}>Options</Text>
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleIco}>📍</Text>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Show GPS Coordinates</Text>
                    <Text style={styles.toggleSub}>Display lat/lng under each photo</Text>
                  </View>
                  <Switch value={showLocation} onValueChange={setShowLocation} trackColor={{ false: Colors.borderSubtle, true: Colors.blueDim }} thumbColor={showLocation ? Colors.blue : Colors.textMuted} />
                </View>
                <View style={styles.toggleDivider} />
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleIco}>🏷</Text>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Add Watermark</Text>
                    <Text style={styles.toggleSub}>Project name on each photo</Text>
                  </View>
                  <Switch value={showWatermark} onValueChange={setShowWatermark} trackColor={{ false: Colors.borderSubtle, true: Colors.blueDim }} thumbColor={showWatermark ? Colors.blue : Colors.textMuted} />
                </View>
              </View>

              <View style={styles.layoutPreview}>
                {Array.from({ length: perPage }).map((_, i) => (
                  <View key={i} style={[styles.layoutCell, { width: `${(100 / 2) - 2}%`, aspectRatio: perPage === 4 ? 1.3 : perPage === 6 ? 1.4 : 1.6 }]}>
                    <Text style={styles.layoutCellTxt}>{i + 1}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.layoutHint}>A4 layout preview · {perPage === 4 ? '2×2' : perPage === 6 ? '2×3' : '2×4'} grid</Text>

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
  root:   { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  headerRow:   { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm },
  backBtn:     { width: 36, height: 36, borderRadius: Radii.circle, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  backIco:     { color: Colors.blue, fontSize: 18 },
  headerMid:   { flex: 1 },
  headerTitle: { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 16 },
  headerCount: { ...Typography.label, color: Colors.textMuted, fontSize: 8, marginTop: 2 },
  selectAllBtn:{ paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radii.pill, borderWidth: 0.5, borderColor: Colors.blue },
  selectAllTxt:{ ...Typography.label, color: Colors.blue, fontSize: 9 },
  pdfBtn:      { borderRadius: Radii.pill, overflow: 'hidden' },
  pdfBtnGrad:  { paddingHorizontal: Spacing.md, paddingVertical: 8 },
  pdfBtnTxt:   { ...Typography.label, color: '#fff', fontSize: 9 },

  batchBar:      { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  batchBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border },
  batchBtnDanger:{ borderColor: Colors.red + '50' },
  batchBtnIco:   { fontSize: 14 },
  batchBtnTxt:   { ...Typography.ui, color: Colors.textPrimary, fontSize: 12 },

  ruler: { height: 0.5, backgroundColor: Colors.blue, opacity: 0.3, marginHorizontal: Spacing.md },

  zipBar:    { marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radii.pill, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border },
  zipBarGrad:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 9, gap: 8 },
  zipBarIco: { fontSize: 14 },
  zipBarTxt: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11 },

  generatingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,8,15,0.7)' },
  generatingCard:    { width: width - 64, padding: Spacing.xl, borderRadius: Radii.xl, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden', ...Shadow.blue },
  generatingBar:     { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.blue },
  generatingTitle:   { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 17, marginTop: Spacing.md },
  generatingSub:     { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },

  grid:  { padding: Spacing.md, paddingBottom: 90 },
  thumb: { width: THUMB, height: THUMB, margin: 1, borderRadius: Radii.sm, overflow: 'hidden' },
  thumbSelected: { borderWidth: 2, borderColor: Colors.blue },
  thumbImg:      { width: '100%', height: '100%' },
  thumbOverlay:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, justifyContent: 'flex-end', padding: 3 },
  thumbNum:      { ...Typography.caption, color: Colors.textSecondary, fontSize: 8 },
  thumbTime:     { ...Typography.caption, color: Colors.textMuted, fontSize: 7 },
  checkbox:      { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.blue, backgroundColor: 'rgba(6,8,15,0.6)', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.blue },
  checkmark:     { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  gpsPin:        { position: 'absolute', top: 4, left: 4 },
  gpsPinTxt:     { fontSize: 9 },

  empty:       { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyIco:    { fontSize: 48, color: Colors.blue, opacity: 0.3, marginBottom: Spacing.lg },
  emptyTitle:  { ...Typography.heading, color: Colors.textSecondary, fontSize: 18, marginBottom: Spacing.sm },
  emptySub:    { ...Typography.uiLight, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.xl },
  cameraBtn:   { borderRadius: Radii.pill, overflow: 'hidden', ...Shadow.blue },
  cameraBtnGrad:{ paddingHorizontal: Spacing.xl, paddingVertical: 13 },
  cameraBtnTxt: { ...Typography.uiBold, color: '#fff', fontSize: 13 },

  fab:     { position: 'absolute', bottom: 24, right: Spacing.lg, ...Shadow.blue },
  fabGrad: { width: 54, height: 54, borderRadius: Radii.circle, alignItems: 'center', justifyContent: 'center' },
  fabTxt:  { fontSize: 22 },

  viewer:       { flex: 1, backgroundColor: '#000' },
  viewerImg:    { ...StyleSheet.absoluteFillObject, width, height },
  viewerTop:    { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 50 },
  viewerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md },
  viewerClose:  { color: '#fff', fontSize: 18, padding: 8 },
  viewerActions:{ flexDirection: 'row', gap: 8 },
  viewerAction: { alignItems: 'center', width: 50, padding: 8, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.55)' },
  viewerActionIco: { fontSize: 16, color: '#fff' },
  viewerActionTxt: { ...Typography.caption, color: Colors.textSecondary, fontSize: 8, marginTop: 2 },
  viewerBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.md, paddingBottom: 40, paddingTop: 40 },
  viewerFilename:{ ...Typography.mono, color: Colors.textMuted, fontSize: 9, marginBottom: 4 },
  viewerMeta:   { ...Typography.mono, color: Colors.cyan, fontSize: 9, marginTop: 2 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border },
  sheetGrad:    { padding: Spacing.lg, paddingBottom: 40 },
  sheetBar:     { position: 'absolute', top: 0, left: 40, right: 40, height: 2, backgroundColor: Colors.blue, opacity: 0.8, borderRadius: 99 },
  sheetHandle:  { width: 36, height: 4, backgroundColor: Colors.borderStrong, borderRadius: 99, alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitle:   { ...Typography.heading, color: Colors.textPrimary, fontSize: 20, marginBottom: 4 },
  sheetSub:     { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.md },
  sheetSectionLabel: { ...Typography.label, color: Colors.blue, fontSize: 8, marginBottom: Spacing.sm, marginTop: Spacing.sm },

  moveFolderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.borderSubtle },
  moveFolderIco: { fontSize: 14, marginRight: Spacing.sm },
  moveFolderName:{ ...Typography.ui, color: Colors.textPrimary, fontSize: 14 },
  cancelBtn:    { height: 44, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelTxt:    { ...Typography.label, color: Colors.textSecondary, fontSize: 9 },

  perPageRow:       { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  perPageBtn:       { flex: 1, borderRadius: Radii.md, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border },
  perPageBtnActive: { borderColor: Colors.blue, ...Shadow.blue },
  perPageBtnGrad:   { alignItems: 'center', paddingVertical: Spacing.md },
  perPageBtnInner:  { alignItems: 'center', paddingVertical: Spacing.md },
  perPageNum:       { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 20 },
  perPagePages:     { ...Typography.caption, color: Colors.textSecondary, fontSize: 9, marginTop: 1 },
  perPageLayout:    { ...Typography.label, color: Colors.textMuted, fontSize: 7, marginTop: 2 },

  toggleCard:   { backgroundColor: Colors.card, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.md },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  toggleIco:    { fontSize: 18, width: 26 },
  toggleInfo:   { flex: 1 },
  toggleLabel:  { ...Typography.ui, color: Colors.textPrimary, fontSize: 13 },
  toggleSub:    { ...Typography.caption, color: Colors.textMuted, fontSize: 10 },
  toggleDivider:{ height: 0.5, backgroundColor: Colors.borderSubtle, marginHorizontal: Spacing.md },

  layoutPreview:{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, backgroundColor: Colors.surface, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: 4, borderWidth: 0.5, borderColor: Colors.border },
  layoutCell:   { backgroundColor: Colors.card, borderRadius: 3, borderWidth: 0.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  layoutCellTxt:{ ...Typography.caption, color: Colors.textMuted, fontSize: 9 },
  layoutHint:   { ...Typography.caption, color: Colors.textMuted, fontSize: 9, textAlign: 'center', marginBottom: Spacing.md },

  generateBtn:    { borderRadius: Radii.pill, overflow: 'hidden', ...Shadow.blue, marginBottom: Spacing.sm },
  generateBtnGrad:{ paddingVertical: 15, alignItems: 'center' },
  generateBtnTxt: { ...Typography.uiBold, color: '#fff', fontSize: 15 },
  adNotice:       { ...Typography.caption, color: Colors.textMuted, fontSize: 9, textAlign: 'center', opacity: 0.6 },
});
