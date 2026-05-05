import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { Screen } from '../components/Screen';
import { useAuthStore } from '../state/authState';
import { colors } from '../theme/colors';

export function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const [account, setAccount] = useState('client');
  const [password, setPassword] = useState('123456');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setSubmitting(true);
    try {
      await login(account.trim(), password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layout}>
        <View>
          <Text style={styles.kicker}>Oil QA</Text>
          <Text style={styles.title}>油井工程智能问答</Text>
          <Text style={styles.desc}>移动端复用 Rust SDK，登录后进入会话列表。</Text>
        </View>
        <AppCard>
          <View style={styles.form}>
            <Text style={styles.label}>账号</Text>
            <TextInput value={account} onChangeText={setAccount} autoCapitalize="none" style={styles.input} />
            <Text style={styles.label}>密码</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            <AppButton loading={submitting} onPress={handleLogin}>
              登录
            </AppButton>
          </View>
        </AppCard>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    justifyContent: 'center',
    gap: 26,
  },
  kicker: {
    color: colors.accentDark,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  desc: {
    marginTop: 10,
    color: colors.muted,
    lineHeight: 22,
  },
  form: {
    gap: 12,
  },
  label: {
    color: colors.text,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
  },
  error: {
    color: colors.danger,
  },
});
