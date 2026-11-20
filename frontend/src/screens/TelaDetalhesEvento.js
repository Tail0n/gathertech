/**
 * @file TelaDetalhesEvento.js
 * @description Tela de visualização detalhada de um evento selecionado.
 * Apresenta banner, datas, localização, Área de Atuação, badges de Tecnologias,
 * redirecionamento externo para inscrição com confirmação automática ao retornar ao app
 * e sistema completo de avaliações (1 a 5 estrelas), comentários aninhados e curtidas.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, TextInput, Alert, ActivityIndicator, AppState, Linking, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { extrairAreaETechs } from './catalogoTech';

// URL base da API REST hospedada via túnel fixo
const API_BASE = 'https://geography-doorbell-yin.ngrok-free.dev/api';

export default function TelaDetalhesEvento({ evento, usuarioLogado, agenda = [], toggleAgenda, aoAtualizar, aoVoltar }) {
  // Estados da seção de comentários e avaliações
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [nota, setNota] = useState(5);
  const [respondendoA, setRespondendoA] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [respostasVisiveis, setRespostasVisiveis] = useState({});

  const idEvento = evento?.id_evento || evento?.id;
  // Separa a Área principal e o array de Tecnologias do evento para exibição estruturada
  const { area: areaEvento, tecnologias: tecnologiasEvento } = extrairAreaETechs(evento?.tech);
  
  // Monitora o ciclo de vida do aplicativo (AppState) para detectar quando o usuário retorna do navegador
  const jaNaAgenda = (agenda || []).map(id => String(id)).includes(String(idEvento));
  const appState = useRef(AppState.currentState);
  const aguardandoConfirmacao = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && aguardandoConfirmacao.current) {
        aguardandoConfirmacao.current = false;

        Alert.alert(
          'Confirmação de Inscrição',
          'Você concluiu a sua inscrição neste evento?',
          [
            { text: 'Não', style: 'cancel' },
            {
              text: 'Sim',
              onPress: () => {
                if (!jaNaAgenda && toggleAgenda) {
                  toggleAgenda(String(idEvento));
                }
              }
            }
          ]
        );
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [jaNaAgenda, idEvento, toggleAgenda]);

  /**
   * Abre o link oficial de inscrição no navegador externo do dispositivo
   * e ativa a flag de aguardando confirmação de retorno.
   */
  const abrirLinkExterno = async () => {
    const linkExterno = evento?.link_oficial || evento?.link_inscricao || evento?.url_inscricao || evento?.link || 'https://google.com';

    try {
      aguardandoConfirmacao.current = true;
      const suportado = await Linking.canOpenURL(linkExterno);
      if (suportado) {
        await Linking.openURL(linkExterno);
      } else {
        await Linking.openURL(`https://${linkExterno.replace(/^https?:\/\//, '')}`);
      }
    } catch (erro) {
      aguardandoConfirmacao.current = false;
      Alert.alert('Erro', 'Não foi possível abrir o link de inscrição.');
    }
  };

  /**
   * Exibe aviso de redirecionamento externo antes de abrir o navegador.
   */
  const handleParticipar = () => {
    Alert.alert(
      'Aviso',
      'Você está sendo direcionado para um link externo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: abrirLinkExterno }
      ]
    );
  };

  /**
   * Busca a lista atualizada de comentários, respostas e notas do evento na API.
   */
  const buscarComentarios = async () => {
    if (!idEvento) return;
    try {
      const res = await fetch(`${API_BASE}/eventos/${idEvento}/comentarios`);
      const texto = await res.text();

      if (!res.ok || texto.trim().startsWith('<')) {
        console.error(`❌ Erro no servidor (${res.status}). Resposta:`, texto.substring(0, 150));
        return;
      }

      const dados = JSON.parse(texto);
      if (Array.isArray(dados)) {
        setComentarios(dados);
      }
    } catch (e) {
      console.error('Erro ao buscar comentários:', e);
    }
  };

  const onRefresh = async () => {
    setAtualizando(true);
    await Promise.all([
      buscarComentarios(),
      aoAtualizar ? aoAtualizar() : Promise.resolve()
    ]);
    setAtualizando(false);
  };

  useEffect(() => {
    buscarComentarios();
  }, [idEvento]);

  /**
   * Envia uma nova avaliação (nota), comentário principal ou resposta encadeada para a API.
   */
  const enviarComentarioOuAvaliacao = async () => {
    if (!usuarioLogado?.id_usuario) {
      Alert.alert('Atenção', 'Faça login para avaliar ou comentar.');
      return;
    }

    if (!idEvento) {
      Alert.alert('Erro', 'ID do evento não encontrado.');
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch(`${API_BASE}/eventos/${idEvento}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuarioLogado.id_usuario,
          texto_comentario: novoComentario.trim(),
          nota_avaliacao: nota,
          id_comentario_pai: respondendoA?.id_comentario || null
        })
      });

      const texto = await res.text();
      
      if (!res.ok || texto.trim().startsWith('<')) {
        console.error('❌ Erro no servidor ao salvar:', texto.substring(0, 150));
        Alert.alert('Erro', 'Não foi possível registrar o comentário/avaliação.');
        return;
      }

      setNovoComentario('');
      if (respondendoA) {
        setRespostasVisiveis(prev => ({ ...prev, [respondendoA.id_comentario]: true }));
      }
      setRespondendoA(null);
      await buscarComentarios();
    } catch (e) {
      console.error('Erro ao enviar:', e);
      Alert.alert('Erro de Conexão', 'Não foi possível ligar ao servidor.');
    } finally {
      setCarregando(false);
    }
  };

  /**
   * Registra ou remove a curtida do usuário logado em um comentário específico.
   */
  const alternarCurtida = async (idComentario) => {
    if (!usuarioLogado?.id_usuario) return;
    try {
      const res = await fetch(`${API_BASE}/comentarios/${idComentario}/curtir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: usuarioLogado.id_usuario })
      });
      if (res.ok) {
        await buscarComentarios();
      }
    } catch (e) {
      console.error('Erro ao curtir:', e);
    }
  };

  const alternarExibicaoRespostas = (idComentario) => {
    setRespostasVisiveis(prev => ({
      ...prev,
      [idComentario]: !prev[idComentario]
    }));
  };

  const formatarDataHora = (dataStr, horaStr) => {
    if (!dataStr) return 'A definir';
    try {
      const dataLimpa = dataStr.split('T')[0];
      const partes = dataLimpa.split('-');
      
      if (partes.length === 3) {
        const [ano, mes, dia] = partes;
        
        let hora = '08:00'; 
        if (horaStr) {
          hora = horaStr.substring(0, 5); 
        }

        return `${dia}/${mes}/${ano} às ${hora}`;
      }
    } catch (e) {
      console.error('Erro na formatação:', e);
    }
    return dataStr;
  };

  const formatarDataComentario = (dataStr) => {
    if (!dataStr) return '';
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return '';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const minuto = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
  };

  /**
   * Calcula a média aritmética das avaliações considerando apenas a nota mais recente
   * de cada usuário único, evitando distorção por múltiplas postagens.
   */
  const calcularMediaEmTempoReal = () => {
    const ultimasNotas = {};
    comentarios.forEach((item) => {
      const valNota = parseFloat(item.nota_avaliacao || item.nota || 0);
      if (valNota > 0) {
        ultimasNotas[item.id_usuario] = valNota;
      }
    });

    const arrayNotas = Object.values(ultimasNotas);
    if (arrayNotas.length === 0) return evento?.avaliacao || 'S/A';
    const soma = arrayNotas.reduce((a, b) => a + b, 0);
    return (soma / arrayNotas.length).toFixed(1);
  };

  const mediaEmTempoReal = calcularMediaEmTempoReal();
  // Filtra apenas comentários raiz (sem comentário pai) para montar a árvore de respostas
  const comentariosPrincipais = comentarios.filter(c => !c.id_comentario_pai);

  /**
   * Renderiza recursivamente um card de comentário e suas respectivas respostas aninhadas.
   */
  const renderCardComentario = (item, ehResposta = false) => {
    const curtiu = item.usuarios_curtiram?.includes(usuarioLogado?.id_usuario);
    const fotoUser = item.foto_perfil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
    const notaUsuario = parseInt(item.nota_avaliacao || item.nota || 0, 10);
    const dataHoraComentario = formatarDataComentario(item.data_comentario || item.data_criacao);

    const respostasDoComentario = comentarios.filter(c => c.id_comentario_pai === item.id_comentario);
    const possuiRespostas = respostasDoComentario.length > 0;
    const mostrandoRespostas = respostasVisiveis[item.id_comentario];

    return (
      <View key={item.id_comentario} style={styles.blocoComentarioContainer}>
        <View style={[styles.cardComentario, ehResposta && styles.cardResposta]}>
          <Image source={{ uri: fotoUser }} style={styles.avatarComentario} />
          <View style={{ flex: 1 }}>
            
            <View style={styles.headerAutorRow}>
              <View>
                <Text style={styles.nomeAutor}>{item.nome_usuario}</Text>
                {dataHoraComentario ? (
                  <Text style={styles.dataComentario}>{dataHoraComentario}</Text>
                ) : null}
              </View>

              {notaUsuario > 0 ? (
                <View style={styles.estrelasComentarioRow}>
                  {[1, 2, 3, 4, 5].map((starIndex) => (
                    <Ionicons 
                      key={starIndex} 
                      name={starIndex <= notaUsuario ? "star" : "star-outline"} 
                      size={13} 
                      color="#F59E0B" 
                    />
                  ))}
                </View>
              ) : null}
            </View>

            {item.texto_comentario && item.texto_comentario.trim() !== '' ? (
              <Text style={styles.textoComentario}>{item.texto_comentario}</Text>
            ) : null}
            
            <View style={styles.acoesComentario}>
              <TouchableOpacity onPress={() => setRespondendoA(item)} style={styles.btnAcao}>
                <Text style={styles.txtAcao}>Responder</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => alternarCurtida(item.id_comentario)} style={styles.btnAcao}>
                <Ionicons name={curtiu ? "heart" : "heart-outline"} size={16} color={curtiu ? "#EF4444" : "#8F9CAE"} />
                <Text style={[styles.txtAcao, curtiu && { color: "#EF4444" }]}>{item.curtidas || 0}</Text>
              </TouchableOpacity>
            </View>

            {possuiRespostas && !ehResposta && (
              <TouchableOpacity 
                style={styles.btnVerRespostas} 
                onPress={() => alternarExibicaoRespostas(item.id_comentario)}
              >
                <Feather 
                  name={mostrandoRespostas ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#8B5CF6" 
                />
                <Text style={styles.txtVerRespostas}>
                  {mostrandoRespostas 
                    ? "Ocultar respostas" 
                    : `Ver ${respostasDoComentario.length} ${respostasDoComentario.length === 1 ? 'resposta' : 'respostas'}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {possuiRespostas && mostrandoRespostas && !ehResposta && (
          <View style={styles.containerRespostasFilhas}>
            {respostasDoComentario.map(resp => renderCardComentario(resp, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
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
        {/* Barra superior com navegação de retorno e compartilhamento */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={aoVoltar} style={styles.btnVoltar}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnShare}>
            <Feather name="share-2" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {evento?.imagem ? (
          <Image source={{ uri: evento.imagem }} style={styles.bannerImage} />
        ) : null}

        {/* Badges de modalidade, valor e nota média */}
        <View style={styles.badgesRow}>
          <View style={styles.badgeModalidade}>
            <Text style={styles.txtBadgeModalidade}>{evento?.modalidade || evento?.formato || 'Online'}</Text>
          </View>

          <View style={styles.badgePreco}>
            <Text style={styles.txtBadgePreco}>{evento?.preco || evento?.tipo_ingresso || 'Gratuito'}</Text>
          </View>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={styles.txtRating}>{mediaEmTempoReal}</Text>
          </View>
        </View>

        <Text style={styles.titulo}>{evento?.nome_evento || evento?.titulo}</Text>

        {/* Card consolidado com cronograma, localização, Área, Tecnologias e Produtor */}
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="calendar" size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Início</Text>
              <Text style={styles.infoValor}>
                {formatarDataHora(evento?.data_inicio || evento?.data, evento?.horario_inicio)}
              </Text>
            </View>
          </View>

          <View style={styles.divisor} />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="calendar" size={18} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Término</Text>
              <Text style={styles.infoValor}>
                {formatarDataHora(evento?.data_fim || evento?.data_inicio, evento?.horario_fim || evento?.horario_inicio)}
              </Text>
            </View>
          </View>

          <View style={styles.divisor} />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="map-pin" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Localização</Text>
              <Text style={styles.infoValor}>{evento?.local || evento?.cidade || 'Online (Transmissão)'}</Text>
            </View>
          </View>

          <View style={styles.divisor} />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="layers" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Área de Atuação</Text>
              <Text style={styles.infoValor}>{areaEvento || 'Tecnologia Geral'}</Text>
            </View>
          </View>

          {tecnologiasEvento.length > 0 && (
            <>
              <View style={styles.divisor} />
              <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                <View style={styles.iconBox}>
                  <Feather name="code" size={18} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Tecnologias e Tópicos</Text>
                  <View style={styles.techBadgesWrap}>
                    {tecnologiasEvento.map((tech) => (
                      <View key={tech} style={styles.techBadge}>
                        <Text style={styles.techBadgeText}>{tech}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </>
          )}

          <View style={styles.divisor} />
          
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="user" size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Produtor do Evento</Text>
              <Text style={styles.infoValor}>{evento?.nome_produtor || 'Não informado'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.subtitulo}>Sobre o Evento</Text>
        <Text style={[styles.textoComentario, { marginBottom: 16 }]}>
          {evento?.descricao_evento || evento?.descricao || 'Nenhuma descrição fornecida.'}
        </Text>

        {/* Botão de ação principal para inscrição externa */}
        <TouchableOpacity 
          style={[styles.btnParticipar, jaNaAgenda && { backgroundColor: '#10B981' }]} 
          onPress={handleParticipar}
        >
          <Text style={styles.txtBtnParticipar}>{jaNaAgenda ? 'Inscrito (Acessar Link)' : 'Participar do Evento'}</Text>
        </TouchableOpacity>

        {/* Seção interativa de avaliação por estrelas */}
        <View style={styles.avaliacaoArea}>
          <Text style={styles.subtitulo}>Avalie este evento:</Text>
          <View style={styles.estrelasRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setNota(star)}>
                <Ionicons name={star <= nota ? "star" : "star-outline"} size={28} color="#F59E0B" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.btnAvaliarApenas} onPress={enviarComentarioOuAvaliacao}>
              <Text style={styles.txtBtnAvaliar}>Enviar Nota</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Indicador de resposta ativa a um comentário existente */}
        {respondendoA && (
          <View style={styles.boxRespondendo}>
            <Text style={styles.txtRespondendo}>Respondendo a: {respondendoA.nome_usuario}</Text>
            <TouchableOpacity onPress={() => setRespondendoA(null)}>
              <Feather name="x" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Campo de entrada para novos comentários */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder={respondendoA ? "Escreva sua resposta..." : "Escreva um comentário (opcional)..."}
            placeholderTextColor="#64748B"
            value={novoComentario}
            onChangeText={setNovoComentario}
          />
          <TouchableOpacity style={styles.btnEnviar} onPress={enviarComentarioOuAvaliacao} disabled={carregando}>
            {carregando ? <ActivityIndicator color="#FFF" /> : <Feather name="send" size={18} color="#FFF" />}
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitulo}>Comentários e Avaliações ({comentarios.length})</Text>
        {comentariosPrincipais.map(item => renderCardComentario(item, false))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090C10' },
  scrollContent: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  btnVoltar: { padding: 8, backgroundColor: '#121824', borderRadius: 20 },
  btnShare: { padding: 8, backgroundColor: '#121824', borderRadius: 20 },
  bannerImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 14 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badgeModalidade: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  txtBadgeModalidade: { color: '#8F9CAE', fontSize: 12, fontWeight: '600' },
  badgePreco: { backgroundColor: '#311B2E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  txtBadgePreco: { color: '#F43F5E', fontSize: 12, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  txtRating: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  titulo: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  cardInfo: { backgroundColor: '#121824', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1E1B2E', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { color: '#64748B', fontSize: 12 },
  infoValor: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 2 },
  techBadgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  techBadge: { backgroundColor: '#1E1B2E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#3B2F63' },
  techBadgeText: { color: '#C4B5FD', fontSize: 12, fontWeight: '600' },
  divisor: { height: 1, backgroundColor: '#1E293B', marginVertical: 12 },
  btnParticipar: { backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 24 },
  txtBtnParticipar: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  avaliacaoArea: { backgroundColor: '#121824', padding: 14, borderRadius: 12, marginBottom: 16 },
  subtitulo: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  estrelasRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnAvaliarApenas: { backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 'auto' },
  txtBtnAvaliar: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  boxRespondendo: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E293B', padding: 8, borderRadius: 8, marginBottom: 8 },
  txtRespondendo: { color: '#8B5CF6', fontSize: 12 },
  inputArea: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: { flex: 1, backgroundColor: '#121824', color: '#FFF', paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#1E293B' },
  btnEnviar: { backgroundColor: '#8B5CF6', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  blocoComentarioContainer: { marginBottom: 10 },
  cardComentario: { flexDirection: 'row', gap: 10, backgroundColor: '#121824', padding: 12, borderRadius: 10 },
  cardResposta: { backgroundColor: '#182030' },
  containerRespostasFilhas: { marginLeft: 24, marginTop: 6, gap: 6 },
  avatarComentario: { width: 36, height: 36, borderRadius: 18 },
  headerAutorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  nomeAutor: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  dataComentario: { color: '#64748B', fontSize: 10, marginTop: 1 },
  estrelasComentarioRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  textoComentario: { color: '#8F9CAE', fontSize: 13, marginTop: 4 },
  acoesComentario: { flexDirection: 'row', gap: 16, marginTop: 8 },
  btnAcao: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txtAcao: { color: '#8F9CAE', fontSize: 12 },
  btnVerRespostas: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  txtVerRespostas: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' }
});