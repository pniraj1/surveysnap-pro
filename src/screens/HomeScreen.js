// src/screens/HomeScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Pressable, Alert, Animated,
  StatusBar, Dimensions, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radii, Shadow } from '../theme';
import SurveySnapLogo, { SnapMark } from '../components/SurveySnapLogo';
import AdBanner from '../components/BannerAd';
import { getProjects, createProject, deleteProject, renameProject, fmtDate, countPhotosInTree } from '../utils/fs';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [projects, setProjects]       = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [search, setSearch]           = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [name, setName]               = useState('');
  const [creating, setCreating]       = useState(false);
  const [photoCounts, setPhotoCounts] = useState({});
  const [refreshing, setRefreshing]   = useState(false);

  // Rename state
  const [renameModal, setRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameName, setRenameName]   = useState('');

  // Action sheet state (replaces accidental long-press delete)
  const [actionSheet, setActionSheet] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);

  const listAnim = useRef(new Animated.Value(0)).current;

  // FIX: parallel photo counting using Promise.all
  const load = useCallback(async () => {
    const data = await getProjects();
    setProjects(data);
    applySearch(data, search);

    const counts = {};
    await Promise.all(
      data.map(async (p) => {
        let total = 0;
        await Promise.all(
          (p.folders || []).map(async (f) => {
            total += await countPhotosInTree(f);
          })
        );
        counts[p.id] = total;
      })
    );
    setPhotoCounts(counts);

    Animated.spring(listAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, []));

  const applySearch = (data, query) => {
    if (!query.trim()) {
      setFiltered(data);
    } else {
      setFiltered(data.filter(p => p.name.toLowerCase().includes(query.toLowerCase())));
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    applySearch(projects, text);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createProject(name.trim());
      setName(''); setShowModal(false); load();
    } catch { Alert.alert('Error', 'Could not create project'); }
    finally { setCreating(false); }
  };

  // FIX: replaced accidental long-press delete with an action sheet
  const openActionSheet = (p) => {
    setActionTarget(p);
    setActionSheet(true);
  };

  const handleDelete = (p) => {
    setActionSheet(false);
    Alert.alert(
      'Delete Project',
      `Delete "${p.name}" and all its photos? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProject(p.id); load(); } },
      ]
    );
  };

  const openRename = (p) => {
    setActionSheet(false);
    setRenameTarget(p);
    setRenameName(p.name);
    setRenameModal(true);
  };

  const handleRename = async () => {
    if (!renameName.trim() || !renameTarget) return;
    try {
      await renameProject(renameTarget.id, renameName.trim());
      setRenameModal(false);
      setRenameTarget(null);
      load();
    } catch { Alert.alert('Error', 'Could not rename project'); }
  };

  const renderProject = ({ item, index }) => {
    const folderCount = (item.folders || []).length;
    const photoCount  = photoCounts[item.id] ?? '…';
    return (
      <Animated.View style={{
        opacity: listAnim,
        transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [20 + index * 8, 0] }) }],
      }}>
        {/* FIX: long press now opens action sheet instead of immediately deleting */}
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.navigate('Project', { project: item })}
          onLongPress={() => openActionSheet(item)}
        >
          <LinearGradient colors={Colors.gradCard} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.cardStripe} />
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <View style={styles.cardIcon}>
                  <Text style={styles.cardIconTxt}>◈</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardDate}>{fmtDate(item.createdAt)}</Text>
                </View>
                {/* FIX: ⋯ opens action sheet instead of directly deleting */}
                <TouchableOpacity onPress={() => openActionSheet(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.moreIcon}>⋯</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardStats}>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{folderCount}</Text>
                  <Text style={styles.statLbl}>Folders</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{photoCount}</Text>
                  <Text style={styles.statLbl}>Photos</Text>
                </View>
                <View style={styles.statSep} />
                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={() => navigation.navigate('Project', { project: item })}
                >
                  <LinearGradient colors={Colors.gradBlue} style={styles.openBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                    <Text style={styles.openBtnTxt}>Open →</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <LinearGradient colors={['#0B1120', Colors.bg]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <SurveySnapLogo size={44} showText={true} textSize="sm" />
            <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.settingsIco}>⚙</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSub}>Field Survey Photography</Text>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.ruler} />

      {/* FIX: search bar */}
      {projects.length > 0 && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={handleSearch}
            selectionColor={Colors.blue}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.searchClear}>
              <Text style={styles.searchClearTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        renderItem={renderProject}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.blue} />}
        ListHeaderComponent={projects.length > 0 ? (
          <View style={styles.listHdr}>
            <Text style={styles.listHdrTxt}>Projects</Text>
            <Text style={styles.listHdrCount}>
              {search ? `${filtered.length} of ${projects.length}` : `${projects.length} total`}
            </Text>
          </View>
        ) : null}
        ListEmptyComponent={() => (
          projects.length > 0 && search ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No Results</Text>
              <Text style={styles.emptySub}>No projects match "{search}"</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <SurveySnapLogo size={80} showText={false} />
              <Text style={styles.emptyTitle}>No Projects Yet</Text>
              <Text style={styles.emptySub}>Create a project to start{'\n'}organising your survey photos</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
                <LinearGradient colors={Colors.gradBlue} style={styles.emptyBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                  <Text style={styles.emptyBtnTxt}>+ New Project</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )
        )}
      />

      {projects.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <LinearGradient colors={Colors.gradBlue} style={styles.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.fabTxt}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <AdBanner />

      {/* ── Create Modal ── */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <LinearGradient colors={['#1A2538', '#0C1220']} style={styles.modalGrad}>
              <View style={styles.modalTopBar} />
              <SnapMark size={38} />
              <Text style={styles.modalTitle}>New Project</Text>
              <Text style={styles.modalSub}>Name this survey project</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g.  Bridge Inspection — March"
                placeholderTextColor={Colors.textMuted}
                value={name} onChangeText={setName}
                autoFocus onSubmitEditing={handleCreate}
                selectionColor={Colors.blue}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setName(''); }}>
                  <Text style={styles.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createBtn, !name.trim() && { opacity: 0.35 }]}
                  onPress={handleCreate} disabled={!name.trim() || creating}
                >
                  <LinearGradient colors={Colors.gradBlue} style={styles.createBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                    <Text style={styles.createTxt}>{creating ? 'Creating…' : 'Create'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Rename Modal ── */}
      <Modal visible={renameModal} transparent animationType="fade" onRequestClose={() => setRenameModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setRenameModal(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <LinearGradient colors={['#1A2538', '#0C1220']} style={styles.modalGrad}>
              <View style={styles.modalTopBar} />
              <Text style={styles.modalTitle}>Rename Project</Text>
              <Text style={styles.modalSub}>Enter a new name</Text>
              <TextInput
                style={styles.input}
                placeholder="Project name"
                placeholderTextColor={Colors.textMuted}
                value={renameName} onChangeText={setRenameName}
                autoFocus onSubmitEditing={handleRename}
                selectionColor={Colors.blue}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setRenameModal(false)}>
                  <Text style={styles.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createBtn, !renameName.trim() && { opacity: 0.35 }]}
                  onPress={handleRename} disabled={!renameName.trim()}
                >
                  <LinearGradient colors={Colors.gradBlue} style={styles.createBtnGrad} start={{ x: 0 }} end={{ x: 1 }}>
                    <Text style={styles.createTxt}>Rename</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Action Sheet ── */}
      <Modal visible={actionSheet} transparent animationType="fade" onRequestClose={() => setActionSheet(false)}>
        <Pressable style={styles.overlay} onPress={() => setActionSheet(false)}>
          <Pressable style={styles.actionSheetWrap} onPress={() => {}}>
            <LinearGradient colors={['#1A2538', '#0C1220']} style={styles.actionSheetGrad}>
              <View style={styles.modalTopBar} />
              <Text style={styles.actionSheetTitle} numberOfLines={1}>{actionTarget?.name}</Text>
              <TouchableOpacity style={styles.actionSheetRow} onPress={() => openRename(actionTarget)}>
                <Text style={styles.actionSheetIco}>✏️</Text>
                <Text style={styles.actionSheetTxt}>Rename Project</Text>
              </TouchableOpacity>
              <View style={styles.actionSheetDivider} />
              <TouchableOpacity style={styles.actionSheetRow} onPress={() => handleDelete(actionTarget)}>
                <Text style={styles.actionSheetIco}>🗑</Text>
                <Text style={[styles.actionSheetTxt, { color: Colors.red }]}>Delete Project</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionSheetRow, styles.actionSheetCancel]} onPress={() => setActionSheet(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header:     { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.sm },
  headerSub:  { ...Typography.label, color: Colors.textMuted, fontSize: 7, textAlign: 'center', letterSpacing: 3, marginTop: 2 },
  settingsBtn:{ width: 38, height: 38, borderRadius: Radii.circle, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  settingsIco:{ color: Colors.blue, fontSize: 15 },

  ruler: { height: 0.5, backgroundColor: Colors.blue, opacity: 0.3, marginHorizontal: Spacing.md },

  searchWrap:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md },
  searchInput:   { flex: 1, height: 40, color: Colors.textPrimary, ...Typography.ui, fontSize: 13 },
  searchClear:   { padding: 4 },
  searchClearTxt:{ color: Colors.textMuted, fontSize: 11 },

  list:      { padding: Spacing.md, paddingBottom: 110 },
  listHdr:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  listHdrTxt:{ ...Typography.heading, color: Colors.textPrimary, fontSize: 17 },
  listHdrCount: { ...Typography.caption, color: Colors.textMuted, fontSize: 10 },

  card:      { borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden', flexDirection: 'row', ...Shadow.dark },
  cardStripe:{ width: 3, backgroundColor: Colors.blue },
  cardBody:  { flex: 1, padding: Spacing.md },
  cardTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  cardIcon:  { width: 34, height: 34, borderRadius: Radii.md, backgroundColor: Colors.blueShimmer, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  cardIconTxt: { color: Colors.blue, fontSize: 14 },
  cardInfo:  { flex: 1 },
  cardName:  { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 15 },
  cardDate:  { ...Typography.caption, color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  moreIcon:  { color: Colors.textMuted, fontSize: 18, padding: 4 },
  cardDivider: { height: 0.5, backgroundColor: Colors.borderSubtle, marginBottom: Spacing.sm },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stat:      { alignItems: 'center' },
  statNum:   { ...Typography.uiBold, color: Colors.textPrimary, fontSize: 17 },
  statLbl:   { ...Typography.caption, color: Colors.textMuted, fontSize: 9, marginTop: 1 },
  statSep:   { width: 0.5, height: 24, backgroundColor: Colors.borderSubtle, marginHorizontal: 4 },
  openBtn:   { marginLeft: 'auto', borderRadius: Radii.pill, overflow: 'hidden' },
  openBtnGrad:{ paddingHorizontal: Spacing.md, paddingVertical: 7 },
  openBtnTxt:{ ...Typography.label, color: '#fff', fontSize: 9 },

  fab:     { position: 'absolute', bottom: 80, right: Spacing.lg, ...Shadow.blue },
  fabGrad: { width: 54, height: 54, borderRadius: Radii.circle, alignItems: 'center', justifyContent: 'center' },
  fabTxt:  { color: '#fff', fontSize: 26, lineHeight: 30 },

  empty:     { alignItems: 'center', paddingTop: 70, paddingHorizontal: Spacing.xl },
  emptyTitle:{ ...Typography.heading, color: Colors.textPrimary, fontSize: 20, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  emptySub:  { ...Typography.uiLight, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  emptyBtn:  { borderRadius: Radii.pill, overflow: 'hidden', ...Shadow.blue },
  emptyBtnGrad: { paddingHorizontal: Spacing.xl, paddingVertical: 13 },
  emptyBtnTxt:  { ...Typography.uiBold, color: '#fff', fontSize: 13 },

  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center' },
  modal:    { width: width - 48, borderRadius: Radii.xl, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border, ...Shadow.blue },
  modalGrad:{ padding: Spacing.xl, alignItems: 'center' },
  modalTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.blue },
  modalTitle:  { ...Typography.heading, color: Colors.textPrimary, fontSize: 20, marginTop: Spacing.md, marginBottom: 4 },
  modalSub:    { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.lg },
  input:    { width: '100%', height: 48, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, color: Colors.textPrimary, ...Typography.ui, fontSize: 14, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn:    { flex: 1, height: 44, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelTxt:    { ...Typography.label, color: Colors.textSecondary, fontSize: 9 },
  createBtn:    { flex: 1, borderRadius: Radii.md, overflow: 'hidden' },
  createBtnGrad:{ height: 44, alignItems: 'center', justifyContent: 'center' },
  createTxt:    { ...Typography.uiBold, color: '#fff', fontSize: 13 },

  actionSheetWrap:   { width: width - 48, borderRadius: Radii.xl, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border, ...Shadow.blue },
  actionSheetGrad:   { paddingTop: Spacing.lg },
  actionSheetTitle:  { ...Typography.uiBold, color: Colors.textSecondary, fontSize: 12, textAlign: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  actionSheetRow:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  actionSheetIco:    { fontSize: 18, width: 28 },
  actionSheetTxt:    { ...Typography.ui, color: Colors.textPrimary, fontSize: 15 },
  actionSheetDivider:{ height: 0.5, backgroundColor: Colors.borderSubtle, marginHorizontal: Spacing.md },
  actionSheetCancel: { justifyContent: 'center', borderTopWidth: 0.5, borderTopColor: Colors.borderSubtle, marginTop: Spacing.sm },
});
