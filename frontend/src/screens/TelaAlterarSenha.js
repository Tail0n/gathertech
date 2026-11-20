import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const API_BASE = 'https://geography-doorbell-yin.ngrok-free.dev/api/api';

export default function TelaAlterarSenha({ usuario, aoVoltar }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  
  // Controle de visibilidade das senhas
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  
  const [carregando, setCarregando] = useState(false);

  const handleAlterarSenha = async () => {
    // Validações locais
    if (!senhaAtual.trim() || !novaSenha.trim() || !confirmarNovaSenha.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      Alert.alert('Atenção', 'A nova senha e a confirmação não coincidem.');
      return;
    }

    if (novaSenha.length < 6) {
      Alert.alert('Atenção', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (senhaAtual === novaSenha) {
      Alert.alert('Atenção', 'A nova senha deve ser diferente da senha atual.');
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch(`${API_BASE}/usuarios/${usuario.id_usuario}/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senha_atual: senhaAtual.trim(),
          nova_senha: novaSenha.trim()
        })
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        Alert.alert('Sucesso!', 'Sua palavra-passe foi alterada com sucesso.', [
          { text: 'OK', onPress: aoVoltar }
        ]);
      } else {
        // Exibe erro do servidor (ex: "Senha atual inválida.")
        Alert.alert('Erro', dados.erro || 'Não foi possível alterar a palavra-passe.');
      }
    } catch (erro) {
      console.error('Erro ao alterar senha:', erro);
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
        <Text style={styles.tituloHeader}>Alterar Palavra-passe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* CAMPO: SENHA ATUAL */}
        <Text style={styles.label}>Digite a senha atual *</Text>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            placeholder="Sua senha atual"
            placeholderTextColor="#475569"
            secureTextEntry={!mostrarSenhaAtual}
            value={senhaAtual}
            onChangeText={setSenhaAtual}
          />
          <TouchableOpacity onPress={() => setMostrarSenhaAtual(!mostrarSenhaAtual)} style={styles.btnOlho}>
            <Feather name={mostrarSenhaAtual ? "eye" : "eye-off"} size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* CAMPO: NOVA SENHA */}
        <Text style={styles.label}>Digite a nova senha *</Text>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            placeholder="Nova senha (mínimo 6 caracteres)"
            placeholderTextColor="#475569"
            secureTextEntry={!mostrarNovaSenha}
            value={novaSenha}
            onChangeText={setNovaSenha}
          />
          <TouchableOpacity onPress={() => setMostrarNovaSenha(!mostrarNovaSenha)} style={styles.btnOlho}>
            <Feather name={mostrarNovaSenha ? "eye" : "eye-off"} size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* CAMPO: CONFIRMAR NOVA SENHA */}
        <Text style={styles.label}>Confirme a nova senha *</Text>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            placeholder="Confirme a nova senha"
            placeholderTextColor="#475569"
            secureTextEntry={!mostrarConfirmarSenha}
            value={confirmarNovaSenha}
            onChangeText={setConfirmarNovaSenha}
          />
          <TouchableOpacity onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)} style={styles.btnOlho}>
            <Feather name={mostrarConfirmarSenha ? "eye" : "eye-off"} size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* BOTÃO SALVAR */}
        <TouchableOpacity style={styles.btnSalvar} onPress={handleAlterarSenha} disabled={carregando}>
          {carregando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBtnSalvar}>Confirmar Alteração</Text>
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
  inputContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121824', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#1E293B' 
  },
  input: { 
    flex: 1,
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    color: '#FFFFFF', 
    fontSize: 14 
  },
  btnOlho: { paddingHorizontal: 14 },
  btnSalvar: { 
    backgroundColor: '#8B5CF6', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 32 
  },
  textoBtnSalvar: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});