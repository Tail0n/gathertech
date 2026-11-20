import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, Image, ActivityIndicator, AppState, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BASE_API_URL = 'https://geography-doorbell-yin.ngrok-free.dev';
const API_URL_LOGIN = `${BASE_API_URL}/api/login`;
const API_URL_GOOGLE = `${BASE_API_URL}/api/auth/google/iniciar`;
const STORAGE_KEY_CREDENCIAIS = '@gathertech_credenciais';
const STORAGE_KEY_TICKET_GOOGLE = '@gathertech_google_ticket';

export default function TelaLogin({ aoEntrar, irParaCadastro, irParaRecuperarSenha }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvarSenha, setSalvarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const verificarTicketGoogle = useCallback(async () => {
    try {
      const ticketSalvo = await AsyncStorage.getItem(STORAGE_KEY_TICKET_GOOGLE);
      if (!ticketSalvo) return;

      const res = await fetch(`${BASE_API_URL}/api/auth/google/resultado/${ticketSalvo}`);
      if (res.ok) {
        const dados = await res.json();
        if (dados.usuario) {
          await AsyncStorage.removeItem(STORAGE_KEY_TICKET_GOOGLE);
          setCarregando(false);
          aoEntrar(dados.usuario);
        }
      }
    } catch (_) {
      // Ignora erro enquanto o usuário ainda está escolhendo a conta
    }
  }, [aoEntrar]);

  useEffect(() => {
    const carregarCredenciaisSalvas = async () => {
      try {
        const dadosSalvos = await AsyncStorage.getItem(STORAGE_KEY_CREDENCIAIS);
        if (dadosSalvos) {
          const { emailSalvo, senhaSalva } = JSON.parse(dadosSalvos);
          setEmail(emailSalvo || '');
          setSenha(senhaSalva || '');
          setSalvarSenha(true);
        }
      } catch (erro) {
        console.error('Erro ao carregar credenciais salvas:', erro);
      }
    };

    carregarCredenciaisSalvas();
    verificarTicketGoogle();

    const subAppState = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        verificarTicketGoogle();
      }
    });

    const subLinking = Linking.addEventListener('url', () => {
      verificarTicketGoogle();
    });

    return () => {
      subAppState.remove();
      subLinking.remove();
    };
  }, [verificarTicketGoogle]);

  const handleLoginGoogle = async () => {
    try {
      setCarregando(true);

      const ticket = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(STORAGE_KEY_TICKET_GOOGLE, ticket);

      const hostUri = Constants.expoConfig?.hostUri;
      const urlRetornoApp = hostUri ? `exp://${hostUri}/--/auth` : 'gathertech://auth';
      const urlAutenticacao = `${API_URL_GOOGLE}?ticket=${ticket}&app_redirect=${encodeURIComponent(urlRetornoApp)}`;

      await Linking.openURL(urlAutenticacao);
    } catch (erro) {
      await AsyncStorage.removeItem(STORAGE_KEY_TICKET_GOOGLE);
      setCarregando(false);
      console.error('Erro no Google Auth:', erro);
      Alert.alert('Erro de Conexão', 'Não foi possível abrir o navegador para login com o Google.');
    }
  };

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Por favor, preencha o e-mail e a senha.');
      return;
    }

    try {
      setCarregando(true);
      const emailTratado = email.toLowerCase().trim();

      const resposta = await fetch(API_URL_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTratado, senha }),
      });

      const dados = await resposta.json();

      if (resposta.ok && dados.usuario) {
        if (salvarSenha) {
          await AsyncStorage.setItem(
            STORAGE_KEY_CREDENCIAIS,
            JSON.stringify({ emailSalvo: emailTratado, senhaSalva: senha })
          );
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY_CREDENCIAIS);
        }

        aoEntrar(dados.usuario);
      } else {
        Alert.alert('Falha no Login', dados.erro || 'E-mail ou senha incorretos.');
      }
    } catch (erro) {
      console.error('Erro no login:', erro);
      Alert.alert('Erro de Conexão', 'Não foi possível ligar ao servidor da API. Verifique o seu IP.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.containerAuth}>
      <ScrollView contentContainerStyle={styles.authBody} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerAuthArea}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logoLogin} 
            resizeMode="contain"
          />
          <Text style={styles.welcomeTitle}>Que bom te ver de novo! 👋</Text>
          <Text style={styles.welcomeSub}>
            Faça login para continuar a explorar e gerir eventos de tecnologia.
          </Text>
        </View>

        <View style={styles.formArea}>
          <Text style={styles.labelInput}>E-mail</Text>
          <TextInput
            style={styles.inputAuth}
            placeholder="Digite o seu e-mail"
            placeholderTextColor="#8F9CAE"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.labelInput}>Senha</Text>
          <View style={styles.senhaContainer}>
            <TextInput
              style={styles.inputSenha}
              placeholder="Digite a sua senha"
              placeholderTextColor="#8F9CAE"
              secureTextEntry={!mostrarSenha}
              value={senha}
              onChangeText={setSenha}
            />
            <TouchableOpacity
              style={styles.btnOlho}
              onPress={() => setMostrarSenha((prev) => !prev)}
            >
              <Feather name={mostrarSenha ? 'eye-off' : 'eye'} size={20} color="#8F9CAE" />
            </TouchableOpacity>
          </View>

          <View style={styles.opcoesLoginRow}>
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => setSalvarSenha((prev) => !prev)}
            >
              <View style={[styles.checkboxBox, salvarSenha && styles.checkboxBoxAtivo]}>
                {salvarSenha && <Feather name="check" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Salvar senha</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={irParaRecuperarSenha}>
              <Text style={styles.textoEsqueciSenha}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnPrimarioAuth} onPress={handleLogin} disabled={carregando}>
            {carregando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.textoBtnPrimario}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={irParaCadastro} style={styles.linkCadastro}>
          <Text style={styles.textoLink}>
            Ainda não tem uma conta? <Text style={styles.textDestaque}>Cadastre-se</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou continue com</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity 
            style={styles.btnSocial} 
            onPress={handleLoginGoogle}
            disabled={carregando}
          >
            <Image 
              source={{ uri: 'https://img.icons8.com/color/48/google-logo.png' }} 
              style={styles.iconeSocial} 
            />
            <Text style={styles.textoSocial}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.btnSocial} 
            onPress={() => Alert.alert('Apple', 'Login via Apple ID em breve!')}
          >
            <Image 
              source={{ uri: 'https://img.icons8.com/ios-filled/50/ffffff/mac-os.png' }} 
              style={styles.iconeSocial} 
            />
            <Text style={styles.textoSocial}>Apple</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  containerAuth: { flex: 1, backgroundColor: '#0B0E14', paddingHorizontal: 24 },
  authBody: { paddingTop: 40, paddingBottom: 40 },
  headerAuthArea: { alignItems: 'center', marginBottom: 24 },
  logoLogin: { width: 90, height: 90, marginBottom: 16 },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: '#8F9CAE', textAlign: 'center', lineHeight: 20 },
  formArea: { marginBottom: 20 },
  labelInput: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  inputAuth: { backgroundColor: '#121824', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#1E293B', color: '#FFFFFF', fontSize: 15 },
  senhaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121824',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  inputSenha: {
    flex: 1,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  btnOlho: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  opcoesLoginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: '#121824',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxAtivo: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  checkboxLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
  textoEsqueciSenha: { color: '#7C3AED', fontSize: 13, fontWeight: '600' },
  btnPrimarioAuth: { backgroundColor: '#0066FF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  textoBtnPrimario: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E293B' },
  dividerText: { color: '#8F9CAE', paddingHorizontal: 12, fontSize: 12 },
  socialButtonsContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  btnSocial: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    backgroundColor: '#121824', 
    borderWidth: 1, 
    borderColor: '#1E293B', 
    paddingVertical: 14, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  iconeSocial: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  textoSocial: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  linkCadastro: { alignItems: 'center' },
  textoLink: { color: '#8F9CAE', fontSize: 14 },
  textDestaque: { color: '#7C3AED', fontWeight: 'bold' },
});