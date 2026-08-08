import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import api from '../lib/api';
import VideoCard from '../components/VideoCard';
import { COLORS } from '../lib/utils';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const navigation = useNavigation<any>();

  const { data, isLoading } = useQuery({
    queryKey: ['search', submitted],
    queryFn: async () => {
      if (!submitted) return null;
      const res = await api.get(`/search?q=${encodeURIComponent(submitted)}&limit=20`);
      return res.data.data;
    },
    enabled: !!submitted,
  });

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search videos, movies, creators..."
          placeholderTextColor={COLORS.textDim}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setSubmitted(query)}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setSubmitted(''); }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {!submitted ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>Search for videos, movies, creators, sounds</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      ) : !data?.results?.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>😕</Text>
          <Text style={styles.emptyTitle}>No results for "{submitted}"</Text>
          {data?.missing_content_prompt && (
            <View style={styles.notifyBox}>
              <Text style={styles.notifyText}>{data.missing_content_prompt}</Text>
              <TouchableOpacity style={styles.notifyBtn}>
                <Text style={styles.notifyBtnText}>Yes, notify me</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={data.results}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <VideoCard content={item} />}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {data.results.length} results for "{submitted}"
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, backgroundColor: COLORS.card,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { fontSize: 16 },
  input: { flex: 1, color: COLORS.text, fontSize: 14 },
  clearBtn: { color: COLORS.textDim, fontSize: 16, padding: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 16 },
  notifyBox: {
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)',
    borderRadius: 14, padding: 16, alignItems: 'center', width: '100%',
  },
  notifyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  notifyBtn: { backgroundColor: COLORS.electricDark, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  notifyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  list: { padding: 16, paddingBottom: 80 },
  row: { gap: 16, marginBottom: 16 },
  resultCount: { color: COLORS.textMuted, fontSize: 13, marginBottom: 16 },
});
