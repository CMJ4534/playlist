import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import { captureException } from '@/observability/sentry';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * React 트리 크래시 포착 — Sentry 연동 준비.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureException(error, {
      extra: { componentStack: info.componentStack },
      tags: { boundary: 'AppErrorBoundary' },
    });
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>문제가 발생했어요</Text>
          <Text style={styles.message}>
            앱을 다시 시도해 주세요. 문제가 계속되면 재시작이 필요할 수 있어요.
          </Text>
          {typeof __DEV__ !== 'undefined' && __DEV__ ?
            <Text style={styles.debug} selectable>
              {this.state.error.message}
            </Text>
          : null}
          <Pressable onPress={this.handleRetry} style={styles.btn}>
            <Text style={styles.btnLabel}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: moodTheme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: moodTheme.text,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: moodTheme.textMuted,
    textAlign: 'center',
  },
  debug: {
    fontSize: 12,
    color: moodTheme.textDim,
    marginTop: 8,
  },
  btn: {
    marginTop: 16,
    backgroundColor: moodTheme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
