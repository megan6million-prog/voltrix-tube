import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../lib/api';
import { COLORS } from '../lib/utils';

const CONTENT_TYPES = [
  { id: 'video', label: '📹 Video' },
  { id: 'short', label: '⚡ Short' },
  { id: 'movie', label: '🎬 Movie' },
];
const CATEGORIES = ['Comedy','Music','Sports','Gaming','Education','News','Drama','Ugandan','Other'];
const VISIBILITY = [
  { id: 'public', label: 'Public' },
  { id: 'unlisted', label: 'Unlisted' },
  { id: 'private', label: 'Private' },
  { id: 'ppv', label: '💰 Pay-Per-View' },
];

export default function UploadScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('video');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [ppvPrice, setPpvPrice] = useState('');
  const [rentalPrice, setRentalPrice] = useState('');
  const [isKidsSafe, setIsKidsSafe] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<any>(null);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFile(asset);
      if (!title) setTitle(asset.uri.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || '');
    }
  };

  const handleUpload = async () => {
    if (!file) { Alert.alert('Select a video first'); return; }
    if (!title.trim()) { Alert.alert('Enter a title'); return; }
    setUploading(true);
    try {
      const fileName = file.uri.split('/').pop() || 'video.mp4';
      const urlRes = await api.post('/content/upload-url', {
        filename: fileName,
        content_type_mime: 'video/mp4',
        file_size: file.fileSize || 0,
      });
      const { upload_url } = urlRes.data.data;

      // Upload to S3
      await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4' },
        body: { uri: file.uri, type: 'video/mp4', name: fileName } as any,
      });

      // Create content record
      await api.post('/content', {
        title: title.trim(),
        description: description.trim() || undefined,
        content_type: contentType,
        category: category || undefined,
        visibility,
        ppv_price_ugx: ppvPrice ? parseInt(ppvPrice) : undefined,
        rental_price_ugx: rentalPrice ? parseInt(rentalPrice) : undefined,
        is_kids_safe: isKidsSafe,
      });

      Alert.alert('✅ Upload complete!', "Processing started. We'll notify you when ready.", [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Upload failed', err.response?.data?.detail || 'Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Video</Text>
        <TouchableOpacity
          style={[styles.uploadBtn, (!file || !title || uploading) && styles.disabled]}
          onPress={handleUpload} disabled={!file || !title || uploading}
        >
          {uploading ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.uploadBtnText}>Upload</Text>}
        </TouchableOpacity>
      </View>

      {/* File picker */}
      <TouchableOpacity style={styles.picker} onPress={pickVideo}>
        {file ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 32 }}>🎬</Text>
            <Text style={styles.fileName} numberOfLines={1}>{file.uri.split('/').pop()}</Text>
            <Text style={styles.fileSize}>{file.fileSize ? `${(file.fileSize/1024/1024).toFixed(1)} MB` : ''}</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 40 }}>⬆️</Text>
            <Text style={styles.pickerText}>Tap to select a video</Text>
            <Text style={styles.pickerHint}>MP4, MOV · Max 10GB</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Type */}
      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {CONTENT_TYPES.map(({ id, label }) => (
          <TouchableOpacity key={id}
            style={[styles.chip, contentType === id && styles.chipActive]}
            onPress={() => setContentType(id)}>
            <Text style={[styles.chipText, contentType === id && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Title */}
      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} placeholder="Enter a title"
        placeholderTextColor={COLORS.textDim} value={title} onChangeText={setTitle} />

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
        placeholder="Describe your video..." placeholderTextColor={COLORS.textDim}
        value={description} onChangeText={setDescription} multiline />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginBottom: 16 }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat}
            style={[styles.chip, category === cat && styles.chipActive, { marginRight: 8 }]}
            onPress={() => setCategory(cat === category ? '' : cat)}>
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Visibility */}
      <Text style={styles.label}>Visibility</Text>
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        {VISIBILITY.map(({ id, label }) => (
          <TouchableOpacity key={id}
            style={[styles.chip, visibility === id && styles.chipActive]}
            onPress={() => setVisibility(id)}>
            <Text style={[styles.chipText, visibility === id && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PPV prices */}
      {visibility === 'ppv' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Rental (UGX)</Text>
            <TextInput style={styles.input} placeholder="e.g. 5000"
              placeholderTextColor={COLORS.textDim} value={rentalPrice}
              onChangeText={setRentalPrice} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Purchase (UGX)</Text>
            <TextInput style={styles.input} placeholder="e.g. 15000"
              placeholderTextColor={COLORS.textDim} value={ppvPrice}
              onChangeText={setPpvPrice} keyboardType="numeric" />
          </View>
        </View>
      )}

      {/* Kids safe */}
      <TouchableOpacity style={styles.toggle} onPress={() => setIsKidsSafe(!isKidsSafe)}>
        <View style={[styles.checkbox, isKidsSafe && styles.checkboxActive]}>
          {isKidsSafe && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
        </View>
        <Text style={styles.toggleLabel}>This content is safe for kids</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancel: { color: COLORS.textMuted, fontSize: 14 },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  uploadBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  disabled: { opacity: 0.4 },
  uploadBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  picker: { margin: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.border, padding: 32, alignItems: 'center' },
  fileName: { color: COLORS.text, fontSize: 13, fontWeight: '500', maxWidth: 250 },
  fileSize: { color: COLORS.textMuted, fontSize: 12 },
  pickerText: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  pickerHint: { color: COLORS.textDim, fontSize: 12 },
  label: { color: COLORS.textMuted, fontSize: 13, marginBottom: 8, paddingHorizontal: 16 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: COLORS.text, fontSize: 14, marginHorizontal: 16, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)' },
  chipActive: { backgroundColor: '#fff' },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  chipTextActive: { color: '#000', fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  toggleLabel: { color: COLORS.text, fontSize: 14 },
});
