// src/screens/ProjectScreen.js — Folder Manager
// Key feature: open existing folder → add more photos anytime
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, Pressable, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radii, Shadow } from '../theme';
import AdBanner from '../components/BannerAd';
import { SnapMark } from '../components/SurveySnapLogo';
import { createFolder, getProjects, getPhotos, countPhotosInTree, fmtDate } from '../utils/fs';

const { width } = Dimensions.get('window');

const FOLDER_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#22D3EE'];

export default function ProjectScreen({ route, navigation }) {
  const { project } = route.params;
  const [crumbs, setCrumbs] = useState([{ name: project.name, dir: project.dir, id: project.id, isRoot: true }]);
  const [folders, setFolders] = useState([]);
  const [photoCounts, setPhotoCounts] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [currentDirPhotos, setCurrentDirPhotos] = useState(0);

  const current = crumbs[crumbs.length - 1];

  const load = useCallback(async () => {
    const projects = await getProjects();
    const proj = projects.find(p => p.id === project.id);
    if (!proj) return;

    // Traverse to current folder in tree
    let foldersHere = proj.folders || [];
    for (let i = 1; i < crumbs.length; i++) {
      const target = crumbs[i].dir;
      const found = foldersHere.find(f => f.dir === target);
      foldersHere = found ? (found.subfolders || []) : [];
    }
    setFolders(foldersHere);

    // Count photos per subfolder
    const counts = {};
    for (const f of foldersHere) {
      counts[f.id] = await countPhotosInTree(f);
    }
    setPhotoCounts(counts);

    // Photos directly in this dir
    const dirPhotos = await getPhotos(current.dir);
    setCurrentDirPhotos(dirPhotos.length);
  }, [crumbs, project.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAddFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await createFolder(project.id, current.dir, folderName.trim(), crumbs);
      setFolderName(''); setShowModal(false); load();
    } catch (e) { Alert.alert('Error', 'Could not create folder: ' + e.message); }
  };

  const goInto = (folder) => {
    setCrumbs(prev => [...prev, { name: folder.name, dir: folder.dir, id: folder.id }]);
  };

  const goCrumb = (index) => {
    setCrumbs(prev => prev.slice(0, index + 1));
  };

  const goBack = () => {
    if (crumbs.length > 1) setCrumbs(prev => prev.slice(0, -1));
    else navigation.goBack();
  };

  const openCamera = (dir, name) => {
    navigation.navigate('Camera', {
      folderDir: dir || current.dir,
      folderName: name || current.name,
      projectId: project.id,
      projectName: project.name,
    });
  };

  const openGallery = (dir, name) => {
    navigation.navigate('Gallery', {
      folderDir: dir || current.dir,
      folderName: name || current.name,
      projectName: project.name,
    });
  };

  const renderFolder = ({ item, index }) => {
    const color = FOLDER_COLORS[index % FOLDER_COLORS.length];
    const count = photoCounts[item.id] ?? 0;

    return (
      <View style={styles.folderCard}>
        <LinearGradient colors={Colors.gradCard} style={styles.folderGrad}>
          <View style={[styles.folderTop, { backgroundColor: color }]} />

          <TouchableOpacity style={styles.folderMain} onPress={() => goInto(item)} activeOpacity={0.8}>
            <View style={[styles.folderIconWrap, { borderColor: color + '50' }]}>
              <Text style={[styles.folderIcon, { color }]}>◈</Text>
            </View>
            <Text style={styles.folderName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.folderCount}>{count} photo{count !== 1 ? 's' : ''}</Text>
            <Text style={styles.folderDate}>{fmtDate(item.createdAt)}</Text>
          </TouchableOpacity>

          <View style={styles.folderDivider} />

          {/* Quick actions — the key UX feature */}
          <View style={styles.folderActions}>
            <TouchableOpacity
              style={[styles.folderActionBtn, { borderColor: color + '40' }]}
              onPress={() => openCamera(item.dir, item.name)}
            >
              <Text style={styles.folderActionIco}>📷</Text>
              <Text style={[styles.folderActionTxt, { color }]}>Add Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.folderActionBtn}
              onPress={() => openGallery(item.dir, item.name)}
            >
              <Text style={styles.folderActionIco}>🖼</Text>
              <Text style={styles.folderActionTxt}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.folderActionBtn}
              onPress={() => goInto(item)}
            >
              <Text style={styles.folderActionIco}>📂</Text>
              <Text style={styles.folderActionTxt}>Sub-folders</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0B1120', Colors.bg]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={goBack}>
              <Text style={styles.backIco}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerMid}>
              <Text style={styles.headerTitle} numberOfLines={1}>{current.name}</Text>
              <Text style={styles.headerSub}>{crumbs.length > 1 ? 'Subfolder' : 'Project'}</Text>
            </View>
            <SnapMark size={28} />
          </View>

          {/* Breadcrumb */}
          {crumbs.length > 1 && (
            <View style={styles.breadcrumb}>
              {crumbs.map((c, i) => (
                <TouchableOpacity key={i} style={styles.crumbItem} onPress={() => goCrumb(i)}>
                  {i > 0 && <Text style={styles.crumbSep}>›</Text>}
                  <Text style={[styles.crumbTxt, i === crumbs.length - 1 && styles.crumbActive]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.ruler} />

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowModal(true)}>
          <View style={styles.actionBtnInner}>
            <Text style={styles.actionBtnIco}>+</Text>
            <Text style={styles.actionBtnTxt}>New Folder</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={() => openCamera()}>
          <LinearGradient colors={Colors.gradBlue} style={styles.primaryBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
            <Text style={styles.actionBtnIco}>📷</Text>
            <Text style={[styles.actionBtnTxt, { color: '#fff' }]}>Capture Here</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Current dir photo quick-access bar */}
      {currentDirPhotos > 0 && (
        <TouchableOpacity style={styles.photoPill} onPress={() => openGallery()}>
          <LinearGradient colors={['rgba(37,99,235,0.15)', 'rgba(37,99,235,0.05)']} style={styles.photoPillGrad} start={{ x: 0 }} end={{ x: 1 }}>
            <Text style={styles.photoPillIco}>📸</Text>
            <Text style={styles.photoPillTxt}>
              {currentDirPhotos} photo{currentDirPhotos !== 1 ? 's' : ''} in this folder
            </Text>
            <Text style={styles.photoPillAction}>View & Export →</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Folder list */}
      <FlatList
        data={folders}
        keyExtractor={f => f.id}
        renderItem={renderFolder}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◈</Text>
            <Text style={styles.emptyTitle}>No Subfolders</Text>
            <Text style={styles.emptySub}>
              Add subfolders to organise by area{'\n'}or shoot directly in this folder
            </Text>
          </View>
        )}
      />

      <AdBanner />

      {/* Add folder modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <LinearGradient colors={['#1A2538', '#0C1220']} style={styles.modalGrad}>
              <View style={styles.modalBar} />
              <Text style={styles.modalTitle}>New Folder</Text>
              <Text style={styles.modalSub}>inside · {current.name}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. North Elevation, Level 3, Roof"
                placeholderTextColor={Colors.textMuted}
                value={folderName} onChangeText={setFolderName}
                autoFocus onSubmitEditing={handleAddFolder}
                selectionColor={Colors.blue}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setFolderName(''); }}>
                  <Text style={styles.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.createBtn, !folderName.trim() && { opacity: 0.3 }]} onPress={handleAddFolder} disabled={!folderName.trim()}>
                  <LinearGradient colors={Colors.gradBlue} style={styles.createBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                    <Text style={styles.createTxt}>Create</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: Radii.circle, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  backIco: { color: Colors.blue, fontSize: 18 },
  headerMid: { flex: 1, marginRight: Spacing.sm },
  headerTitle: { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 16 },
  headerSub: { ...Typography.caption, color: Colors.textMuted, fontSize: 9 },

  breadcrumb: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, marginTop: Spacing.sm, paddingBottom: 2 },
  crumbItem: { flexDirection: 'row', alignItems: 'center' },
  crumbSep: { color: Colors.blue, opacity: 0.5, marginHorizontal: 3, fontSize: 11 },
  crumbTxt: { ...Typography.caption, color: Colors.textMuted, fontSize: 10 },
  crumbActive: { color: Colors.cyan },

  ruler: { height: 0.5, backgroundColor: Colors.blue, opacity: 0.3, marginHorizontal: Spacing.md },

  actionBar: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, paddingBottom: Spacing.sm },
  actionBtn: { flex: 1, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden' },
  primaryBtn: { borderColor: Colors.blue, ...Shadow.blue },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: 6 },
  primaryBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: 6 },
  actionBtnIco: { fontSize: 14 },
  actionBtnTxt: { ...Typography.ui, color: Colors.textSecondary, fontSize: 12 },

  photoPill: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radii.pill, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border },
  photoPillGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 9, gap: 6 },
  photoPillIco: { fontSize: 13 },
  photoPillTxt: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11, flex: 1 },
  photoPillAction: { ...Typography.label, color: Colors.blue, fontSize: 8 },

  list: { padding: Spacing.md, paddingTop: 0, paddingBottom: 100 },

  folderCard: { marginBottom: Spacing.md, borderRadius: Radii.lg, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border, ...Shadow.dark },
  folderGrad: {},
  folderTop: { height: 2 },
  folderMain: { padding: Spacing.md, alignItems: 'center' },
  folderIconWrap: { width: 46, height: 46, borderRadius: Radii.md, borderWidth: 0.5, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  folderIcon: { fontSize: 22 },
  folderName: { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 14, textAlign: 'center', marginBottom: 3 },
  folderCount: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11, marginBottom: 2 },
  folderDate: { ...Typography.caption, color: Colors.textMuted, fontSize: 9 },
  folderDivider: { height: 0.5, backgroundColor: Colors.borderSubtle },
  folderActions: { flexDirection: 'row' },
  folderActionBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, gap: 4, borderRightWidth: 0.5, borderRightColor: Colors.borderSubtle },
  folderActionIco: { fontSize: 16 },
  folderActionTxt: { ...Typography.caption, color: Colors.textSecondary, fontSize: 9 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 44, color: Colors.blue, opacity: 0.3, marginBottom: Spacing.lg },
  emptyTitle: { ...Typography.heading, color: Colors.textSecondary, fontSize: 17, marginBottom: Spacing.sm },
  emptySub: { ...Typography.uiLight, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center' },
  modal: { width: width - 48, borderRadius: Radii.xl, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border, ...Shadow.blue },
  modalGrad: { padding: Spacing.xl },
  modalBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.blue },
  modalTitle: { ...Typography.heading, color: Colors.textPrimary, fontSize: 20, marginBottom: 4 },
  modalSub: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.lg },
  input: { width: '100%', height: 48, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, color: Colors.textPrimary, ...Typography.ui, fontSize: 14, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 44, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { ...Typography.label, color: Colors.textSecondary, fontSize: 9 },
  createBtn: { flex: 1, borderRadius: Radii.md, overflow: 'hidden' },
  createBtnGrad: { height: 44, alignItems: 'center', justifyContent: 'center' },
  createTxt: { ...Typography.uiBold, color: '#fff', fontSize: 13 },
});
