import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: string; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚡</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.error} numberOfLines={4}>{this.state.error}</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  error: { color: '#9ca3af', fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  btn: { backgroundColor: '#dc2626', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
