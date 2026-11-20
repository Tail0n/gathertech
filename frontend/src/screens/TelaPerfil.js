import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, Modal, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://geography-doorbell-yin.ngrok-free.dev/api';

const TECNOLOGIAS_OPCOES = [
  'React Native', 'Node.js', 'Python', 'Java', 'JavaScript', 'TypeScript',
  'Flutter', 'Cloud Computing', 'Cybersecurity', 'Data Science / AI',
  'DevOps', 'Network', 'Gestão', 'Inovação', 'UI/UX Design', 'SQL / PostgreSQL'
];

export default function TelaPerfil({ 
  usuario, 
  eventos = [],
  favoritos = [],
  agenda = [],
  aoAtualizar,
  aoSair, 
  irParaAdmin, 
  irParaInicio, 
  irParaFavoritos, 
  irParaAgenda,
  irParaEditarPerfil,
  irParaAlterarSenha,
  aoAtualizarFoto
}) {
  const nomeUsuario = usuario?.nome_usuario || 'Utilizador GatherTech';
  const emailUsuario = usuario?.email || 'email@gathertech.com';
  const tipoUsuario = usuario?.tipo_usuario || 'aluno';
  
  const [fotoPerfil, setFotoPerfil] = useState(
    usuario?.foto_perfil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
  );
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const [interesses, setInteresses] = useState([]);
  const chaveStorageInteresses = `@GatherTech:interesses_${usuario?.id_usuario || 'geral'}`;

  const [modalInteressesVisivel, setModalInteressesVisivel] = useState(false);
  const [modalHistoricoVisivel, setModalHistoricoVisivel] = useState(false);
  const [modalSobreVisivel, setModalSobreVisivel] = useState(false);
  const [modalAjudaVisivel, setModalAjudaVisivel] = useState(false);

  const onRefresh = async () => {
    if (!aoAtualizar) return;
    setAtualizando(true);
    await aoAtualizar();
    setAtualizando(false);
  };

  useEffect(() => {
    const carregarInteresses = async () => {
      try {
        const salvos = await AsyncStorage.getItem(chaveStorageInteresses);
        if (salvos) {
          setInteresses(JSON.parse(salvos));
        }
      } catch (e) {
        console.error('Erro ao carregar interesses:', e);
      }
    };
    carregarInteresses();
  }, [chaveStorageInteresses]);

  const alternarInteresse = async (tech) => {
    setInteresses((prev) => {
      const existe = prev.includes(tech);
      const novaLista = existe ? prev.filter((item) => item !== tech) : [...prev, tech];
      AsyncStorage.setItem(chaveStorageInteresses, JSON.stringify(novaLista)).catch(() => {});
      return novaLista;
    });
  };

  const qtdInscritos = useMemo(() => {
    const idsAgenda = new Set((agenda || []).map(String));
    return (eventos || []).filter((ev) => idsAgenda.has(String(ev.id_evento || ev.id))).length;
  }, [eventos, agenda]);

  const qtdFavoritos = useMemo(() => {
    const idsFavoritos = new Set((favoritos || []).map(String));
    return (eventos || []).filter((ev) => idsFavoritos.has(String(ev.id_evento || ev.id))).length;
  }, [eventos, favoritos]);

  const eventosParticipados = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const idsAgenda = new Set((agenda || []).map(String));

    return (eventos || []).filter((ev) => {
      const idStr = String(ev.id_evento || ev.id);
      if (!idsAgenda.has(idStr)) return false;

      const dataRef = ev.data_fim || ev.data_inicio;
      if (!dataRef) return false;

      const dataLimpa = dataRef.split('T')[0];
      const partes = dataLimpa.split('-');
      if (partes.length !== 3) return false;

      const [ano, mes, dia] = partes.map(Number);
      const dataEvento = new Date(ano, mes - 1, dia);
      return dataEvento < hoje;
    });
  }, [eventos, agenda]);

  const formatarDataSimples = (dataStr) => {
    if (!dataStr) return 'Data não informada';
    const dataLimpa = dataStr.split('T')[0];
    const partes = dataLimpa.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  };

  const alterarFotoPerfil = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão Necessária', 'Permita o acesso à galeria para alterar a foto de perfil.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
      const asset = resultado.assets[0];
      const fotoFinal = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

      setFotoPerfil(fotoFinal);

      if (aoAtualizarFoto) {
        aoAtualizarFoto(fotoFinal);
      }

      if (usuario?.id_usuario) {
        setCarregandoFoto(true);
        try {
          const resposta = await fetch(`${API_BASE}/usuarios/${usuario.id_usuario}/foto`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ foto_perfil: fotoFinal })
          });

          if (!resposta.ok) {
            Alert.alert('Erro', 'Não foi possível salvar a foto no servidor.');
          }
        } catch (err) {
          console.error('Erro ao atualizar foto no servidor:', err);
          Alert.alert('Erro de Conexão', 'Falha ao enviar a foto para o servidor.');
        } finally {
          setCarregandoFoto(false);
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
            progressBackgroundColor="#121824"
          />
        }
      >
        
        {/* CABEÇALHO E AVATAR */}
        <View style={styles.headerPerfil}>
          {tipoUsuario === 'admin' ? (
            <TouchableOpacity style={styles.btnConfig} onPress={irParaAdmin}>
              <Feather name="settings" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <TouchableOpacity style={styles.avatarContainer} onPress={alterarFotoPerfil} activeOpacity={0.8}>
            {carregandoFoto ? (
              <ActivityIndicator color="#8B5CF6" size="large" style={styles.avatar} />
            ) : (
              <Image source={{ uri: fotoPerfil }} style={styles.avatar} />
            )}
            <View style={styles.badgeCamera}>
              <Feather name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={{ width: 40 }} />
        </View>

        <View style={styles.infoUsuarioContainer}>
          <Text style={styles.nomeUsuario}>{nomeUsuario}</Text>
          <Text style={styles.emailUsuario}>{emailUsuario}</Text>
          <View style={styles.tagTipoUsuario}>
            <Text style={styles.textoTagTipo}>{tipoUsuario.toUpperCase()}</Text>
          </View>
        </View>

        {/* PAINEL DE RESUMO */}
        <View style={styles.metricasRow}>
          <TouchableOpacity style={styles.cardMetrica} onPress={irParaAgenda} activeOpacity={0.8}>
            <Text style={styles.valorMetrica}>{qtdInscritos}</Text>
            <Text style={styles.labelMetrica}>Inscritos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cardMetrica} onPress={irParaFavoritos} activeOpacity={0.8}>
            <Text style={styles.valorMetrica}>{qtdFavoritos}</Text>
            <Text style={styles.labelMetrica}>Favoritos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cardMetrica} onPress={() => setModalHistoricoVisivel(true)} activeOpacity={0.8}>
            <Text style={styles.valorMetrica}>{eventosParticipados.length}</Text>
            <Text style={styles.labelMetrica}>Participados</Text>
          </TouchableOpacity>
        </View>

        {/* MINHAS TECNOLOGIAS / INTERESSES */}
        <View style={styles.secaoBloco}>
          <View style={styles.headerSecaoRow}>
            <Text style={styles.tituloSecao}>Meus Interesses</Text>
            <TouchableOpacity onPress={() => setModalInteressesVisivel(true)}>
              <Text style={styles.linkEditar}>+ Editar</Text>
            </TouchableOpacity>
          </View>

          {interesses.length === 0 ? (
            <TouchableOpacity 
              style={styles.boxInteressesVazio} 
              onPress={() => setModalInteressesVisivel(true)}
              activeOpacity={0.8}
            >
              <Feather name="cpu" size={16} color="#8B5CF6" />
              <Text style={styles.txtInteressesVazio}>Selecionar áreas e tecnologias de interesse</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.chipsWrap}>
              {interesses.map((tech) => (
                <View key={tech} style={styles.chipInteresse}>
                  <Text style={styles.txtChipInteresse}>{tech}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* DEFINIÇÕES DA CONTA E HISTÓRICO */}
        <View style={styles.secaoBloco}>
          <Text style={styles.tituloSecao}>Definições da Conta</Text>

          <TouchableOpacity style={styles.opcaoMenu} onPress={() => irParaEditarPerfil()}>
            <View style={styles.opcaoEsquerda}>
              <Feather name="user" size={18} color="#8B5CF6" />
              <Text style={styles.opcaoTexto}>Editar Perfil</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.opcaoMenu} onPress={irParaAlterarSenha}>
            <View style={styles.opcaoEsquerda}>
              <Feather name="lock" size={18} color="#8B5CF6" />
              <Text style={styles.opcaoTexto}>Alterar Palavra-passe</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.opcaoMenu} onPress={() => setModalHistoricoVisivel(true)}>
            <View style={styles.opcaoEsquerda}>
              <Feather name="clock" size={18} color="#8B5CF6" />
              <Text style={styles.opcaoTexto}>Histórico de Eventos Participados</Text>
            </View>
            <View style={styles.opcaoDireita}>
              {eventosParticipados.length > 0 && (
                <View style={styles.badgeContador}>
                  <Text style={styles.txtBadgeContador}>{eventosParticipados.length}</Text>
                </View>
              )}
              <Feather name="chevron-right" size={18} color="#64748B" />
            </View>
          </TouchableOpacity>
        </View>

        {/* INSTITUCIONAL */}
        <View style={styles.secaoBloco}>
          <Text style={styles.tituloSecao}>Institucional</Text>

          <TouchableOpacity style={styles.opcaoMenu} onPress={() => setModalSobreVisivel(true)}>
            <View style={styles.opcaoEsquerda}>
              <Feather name="info" size={18} color="#8B5CF6" />
              <Text style={styles.opcaoTexto}>Sobre o GatherTech</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.opcaoMenu} onPress={() => setModalAjudaVisivel(true)}>
            <View style={styles.opcaoEsquerda}>
              <Feather name="help-circle" size={18} color="#8B5CF6" />
              <Text style={styles.opcaoTexto}>Central de Ajuda</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* BOTÃO SAIR */}
        <View style={styles.footerAcao}>
          <TouchableOpacity style={styles.btnSair} onPress={aoSair} activeOpacity={0.8}>
            <Feather name="log-out" size={18} color="#EF4444" />
            <Text style={styles.textoBtnSair}>Terminar Sessão</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* MODAIS */}
      <Modal visible={modalInteressesVisivel} transparent animationType="fade" onRequestClose={() => setModalInteressesVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Meus Interesses</Text>
              <TouchableOpacity onPress={() => setModalInteressesVisivel(false)}>
                <Feather name="x" size={22} color="#8F9CAE" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitulo}>Toque nas áreas de tecnologia que mais lhe interessam:</Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <View style={styles.chipsWrapModal}>
                {TECNOLOGIAS_OPCOES.map((tech) => {
                  const selecionado = interesses.includes(tech);
                  return (
                    <TouchableOpacity
                      key={tech}
                      style={[styles.chipModal, selecionado && styles.chipModalAtivo]}
                      onPress={() => alternarInteresse(tech)}
                    >
                      <Text style={[styles.txtChipModal, selecionado && styles.txtChipModalAtivo]}>
                        {tech}
                      </Text>
                      {selecionado && <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnModalFechar} onPress={() => setModalInteressesVisivel(false)}>
              <Text style={styles.txtBtnModalFechar}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalHistoricoVisivel} transparent animationType="fade" onRequestClose={() => setModalHistoricoVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Histórico de Participação</Text>
              <TouchableOpacity onPress={() => setModalHistoricoVisivel(false)}>
                <Feather name="x" size={22} color="#8F9CAE" />
              </TouchableOpacity>
            </View>

            {eventosParticipados.length === 0 ? (
              <View style={styles.historicoVazio}>
                <Feather name="calendar" size={36} color="#334155" style={{ marginBottom: 10 }} />
                <Text style={styles.txtHistoricoVazioTitulo}>Nenhum evento concluído ainda</Text>
                <Text style={styles.txtHistoricoVazioSub}>
                  Os eventos inscritos na sua Agenda aparecerão aqui automaticamente após a data de realização.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {eventosParticipados.map((ev) => (
                  <View key={String(ev.id_evento || ev.id)} style={styles.itemHistorico}>
                    <View style={styles.iconeHistorico}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tituloHistorico} numberOfLines={1}>{ev.nome_evento || ev.titulo}</Text>
                      <Text style={styles.metaHistorico}>
                        {formatarDataSimples(ev.data_inicio)} · {ev.modalidade || ev.formato || 'Online'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.btnModalFechar} onPress={() => setModalHistoricoVisivel(false)}>
              <Text style={styles.txtBtnModalFechar}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalSobreVisivel} transparent animationType="fade" onRequestClose={() => setModalSobreVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Sobre o GatherTech</Text>
              <TouchableOpacity onPress={() => setModalSobreVisivel(false)}>
                <Feather name="x" size={22} color="#8F9CAE" />
              </TouchableOpacity>
            </View>

            <View style={styles.sobreLogoBox}>
              <Text style={styles.sobreLogo}>GT</Text>
              <Text style={styles.sobreVersao}>Versão 1.0.0</Text>
            </View>

            <Text style={styles.sobreTexto}>
              O GatherTech é uma plataforma criada para conectar estudantes, desenvolvedores e entusiastas aos melhores eventos, workshops e encontros de tecnologia, gestão e inovação.
            </Text>

            <TouchableOpacity style={styles.btnModalFechar} onPress={() => setModalSobreVisivel(false)}>
              <Text style={styles.txtBtnModalFechar}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalAjudaVisivel} transparent animationType="fade" onRequestClose={() => setModalAjudaVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Central de Ajuda</Text>
              <TouchableOpacity onPress={() => setModalAjudaVisivel(false)}>
                <Feather name="x" size={22} color="#8F9CAE" />
              </TouchableOpacity>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqPergunta}>Como salvo um evento na minha Agenda?</Text>
              <Text style={styles.faqResposta}>
                Abra os detalhes do evento, toque em "Participar do Evento" para aceder ao link oficial e confirme a sua inscrição ao voltar ao aplicativo.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqPergunta}>Precisa de suporte técnico?</Text>
              <Text style={styles.faqResposta}>
                Entre em contacto com a nossa equipa pelo e-mail: suporte@gathertech.com
              </Text>
            </View>

            <TouchableOpacity style={styles.btnModalFechar} onPress={() => setModalAjudaVisivel(false)}>
              <Text style={styles.txtBtnModalFechar}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BARRA INFERIOR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.tabItem} onPress={irParaInicio}>
          <Ionicons name="home-outline" size={22} color="#8F9CAE" />
          <Text style={styles.tabLabel}>Início</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={irParaFavoritos}>
          <Ionicons name="heart-outline" size={22} color="#8F9CAE" />
          <Text style={styles.tabLabel}>Favoritos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={irParaAgenda}>
          <Ionicons name="calendar-outline" size={22} color="#8F9CAE" />
          <Text style={styles.tabLabel}>Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="person" size={22} color="#8B5CF6" />
          <Text style={[styles.tabLabel, styles.tabActive]}>Perfil</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090C10' },
  scrollContent: { paddingBottom: 100 },
  headerPerfil: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10, marginBottom: 10 },
  btnConfig: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#121824', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  avatarContainer: { position: 'relative', alignSelf: 'center' },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#8B5CF6' },
  badgeCamera: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8B5CF6', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#090C10' },
  infoUsuarioContainer: { alignItems: 'center', marginBottom: 20, paddingHorizontal: 20 },
  nomeUsuario: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  emailUsuario: { color: '#8F9CAE', fontSize: 13, marginTop: 4, textAlign: 'center' },
  tagTipoUsuario: { backgroundColor: '#121824', borderWidth: 1, borderColor: '#1E293B', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  textoTagTipo: { color: '#8B5CF6', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  metricasRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  cardMetrica: { flex: 1, backgroundColor: '#121824', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  valorMetrica: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  labelMetrica: { color: '#8F9CAE', fontSize: 12, marginTop: 4 },
  secaoBloco: { paddingHorizontal: 20, marginBottom: 20 },
  headerSecaoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tituloSecao: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  linkEditar: { color: '#8B5CF6', fontSize: 13, fontWeight: 'bold', marginBottom: 12 },
  boxInteressesVazio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#121824', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#1E293B', borderStyle: 'dashed' },
  txtInteressesVazio: { color: '#8F9CAE', fontSize: 13 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipInteresse: { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderWidth: 1, borderColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  txtChipInteresse: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  opcaoMenu: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121824', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  opcaoEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  opcaoDireita: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opcaoTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  badgeContador: { backgroundColor: '#1E293B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  txtBadgeContador: { color: '#8B5CF6', fontSize: 12, fontWeight: 'bold' },
  footerAcao: { paddingHorizontal: 20, marginTop: 6 },
  btnSair: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444', borderRadius: 14, paddingVertical: 14 },
  textoBtnSair: { color: '#EF4444', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#121824', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitulo: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  modalSubtitulo: { color: '#8F9CAE', fontSize: 13, marginBottom: 14 },
  chipsWrapModal: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 10 },
  chipModal: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#090C10', borderWidth: 1, borderColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  chipModalAtivo: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  txtChipModal: { color: '#8F9CAE', fontSize: 13, fontWeight: '500' },
  txtChipModalAtivo: { color: '#FFFFFF', fontWeight: 'bold' },
  btnModalFechar: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  txtBtnModalFechar: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  historicoVazio: { alignItems: 'center', paddingVertical: 20 },
  txtHistoricoVazioTitulo: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  txtHistoricoVazioSub: { color: '#8F9CAE', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  itemHistorico: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#090C10', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1E293B' },
  iconeHistorico: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center' },
  tituloHistorico: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  metaHistorico: { color: '#8F9CAE', fontSize: 12, marginTop: 2 },
  sobreLogoBox: { alignItems: 'center', marginVertical: 12 },
  sobreLogo: { fontSize: 32, fontWeight: '900', color: '#0066FF', letterSpacing: 1 },
  sobreVersao: { color: '#8F9CAE', fontSize: 12, marginTop: 4 },
  sobreTexto: { color: '#CBD5E1', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  faqItem: { backgroundColor: '#090C10', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  faqPergunta: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  faqResposta: { color: '#8F9CAE', fontSize: 13, lineHeight: 18 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 65, backgroundColor: '#090C10', borderTopWidth: 1, borderTopColor: '#1E293B', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { color: '#8F9CAE', fontSize: 11, marginTop: 4, textAlign: 'center' },
  tabActive: { color: '#8B5CF6', fontWeight: 'bold' }
});