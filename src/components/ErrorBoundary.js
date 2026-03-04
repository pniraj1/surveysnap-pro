// src/components/ErrorBoundary.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../theme';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message} numberOfLines={4}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  icon:    { fontSize: 44, marginBottom: Spacing.lg, color: Colors.amber },
  title:   { ...Typography.heading, color: Colors.textPrimary, fontSize: 20, marginBottom: Spacing.sm, textAlign: 'center' },
  message: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.xl },
  btn: {
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.blue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
  },
  btnTxt: { ...Typography.uiBold, color: Colors.blue, fontSize: 13 },
});
