import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const API_BASE = 'https://geography-doorbell-yin.ngrok-free.dev/api/api';

export default function TelaEditarPerfil({ usuario, aoVoltar, aoSalvarSucesso }) {
  const [nome, setNome] = useState(usuario?.nome_usuario || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [telefone, setTelefone] = useState(usuario?.telefone || '');
  const [carregando, setCarregando] = useState(false);

  const handleSalvar = async () => {
    if (!nome.trim() || !email.trim()) {
      Alert.alert('Atenção', 'O nome e o e-mail são obrigatórios.');
      return;
    }

    setCarregando(true);
    try {
      const resposta = await fetch(`${API_BASE}/usuarios/${usuario.id_usuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_usuario: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim()
        })
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        Alert.alert('Sucesso!', 'Perfil atualizado com sucesso.');
        if (aoSalvarSucesso) {
          aoSalvarSucesso(dados.usuario);
        }
      } else {
        Alert.alert('Erro', dados.erro || 'Não foi possível atualizar o perfil.');
      }
    } catch (erro) {
      console.error('Erro de conexão ao atualizar perfil:', erro);
      Alert.alert('Erro de Conexão', 'Não foi possível ligar ao servidor.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnVoltar} onPress={aoVoltar}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.tituloHeader}>Editar Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Nome Completo *</Text>
        <TextInput 
          style={styles.input}
          placeholder="Seu nome"
          placeholderTextColor="#475569"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>E-mail *</Text>
        <TextInput 
          style={styles.input}
          placeholder="seu.email@exemplo.com"
          placeholderTextColor="#475569"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Telefone</Text>
        <TextInput 
          style={styles.input}
          placeholder="(00) 00000-0000"
          placeholderTextColor="#475569"
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={setTelefone}
        />

        <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBtnSalvar}>Guardar Alterações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090C10' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 16 
  },
  btnVoltar: { padding: 4 },
  tituloHeader: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { 
    backgroundColor: '#121824', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    color: '#FFFFFF', 
    fontSize: 14, 
    borderWidth: 1, 
    borderColor: '#1E293B' 
  },
  btnSalvar: { 
    backgroundColor: '#8B5CF6', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 32 
  },
  textoBtnSalvar: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});