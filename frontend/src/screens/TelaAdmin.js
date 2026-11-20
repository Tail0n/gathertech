import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

const API_BASE = 'https://geography-doorbell-yin.ngrok-free.dev/api';

export default function TelaAdmin({ irParaCriarEvento, irParaEditarEvento, irParaVoltar }) {
  const [abaAtiva, setAbaAtiva] = useState('Metricas');
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  // Dados do painel
  const [metricas, setMetricas] = useState({
    totalUsuarios: 0,
    totalEventos: 0,
    totalComentarios: 0,
    mediaAvaliacoes: '0.0',
    porModalidade: [],
    topTechs: [],
    statusSistema: 'Online'
  });
  const [usuarios, setUsuarios] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [eventos, setEventos] = useState([]);

  // Buscas
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [buscaComentario, setBuscaComentario] = useState('');

  // Modal de Suporte/Edição de Cadastro de Usuário
  const [modalUsuarioVisivel, setModalUsuarioVisivel] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editTipo, setEditTipo] = useState('aluno');
  const [editNovaSenha, setEditNovaSenha] = useState('');
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);

  // Comunicado Global (Broadcast)
  const [tituloAviso, setTituloAviso] = useState('');
  const [mensagemAviso, setMensagemAviso] = useState('');
  const [enviandoAviso, setEnviandoAviso] = useState(false);

  const carregarTudo = async () => {
    try {
      const [resMetricas, resUsuarios, resComentarios, resEventos] = await Promise.all([
        fetch(`${API_BASE}/admin/metricas`),
        fetch(`${API_BASE}/admin/usuarios`),
        fetch(`${API_BASE}/admin/comentarios`),
        fetch(`${API_BASE}/eventos`)
      ]);

      if (resMetricas.ok) {
        const dadosMetricas = await resMetricas.json();
        setMetricas(dadosMetricas);
      }
      if (resUsuarios.ok) {
        const dadosUsuarios = await resUsuarios.json();
        setUsuarios(Array.isArray(dadosUsuarios) ? dadosUsuarios : []);
      }
      if (resComentarios.ok) {
        const dadosComentarios = await resComentarios.json();
        setComentarios(Array.isArray(dadosComentarios) ? dadosComentarios : []);
      }
      if (resEventos.ok) {
        const dadosEventos = await resEventos.json();
        setEventos(Array.isArray(dadosEventos) ? dadosEventos : []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel admin:', err);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  const onRefresh = () => {
    setAtualizando(true);
    carregarTudo();
  };

  // --- AÇÕES DE SUPORTE A USUÁRIOS ---
  const abrirEdicaoUsuario = (user) => {
    setUsuarioEditando(user);
    setEditNome(user.nome_usuario || '');
    setEditEmail(user.email || '');
    setEditTelefone(user.telefone || '');
    setEditTipo(user.tipo_usuario || 'aluno');
    setEditNovaSenha('');
    setModalUsuarioVisivel(true);
  };

  const salvarEdicaoUsuario = async () => {
    if (!editNome.trim() || !editEmail.trim()) {
      Alert.alert('Atenção', 'Nome e e-mail não podem ficar vazios.');
      return;
    }
    setSalvandoUsuario(true);
    try {
      const res = await fetch(`${API_BASE}/admin/usuarios/${usuarioEditando.id_usuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_usuario: editNome.trim(),
          email: editEmail.trim(),
          telefone: editTelefone.trim(),
          tipo_usuario: editTipo,
          nova_senha: editNovaSenha.trim() || null
        })
      });
      const dados = await res.json();
      if (!res.ok) {
        Alert.alert('Erro', dados.erro || 'Não foi possível atualizar o cadastro.');
        return;
      }
      Alert.alert('Sucesso', 'Cadastro do utilizador atualizado!');
      setModalUsuarioVisivel(false);
      carregarTudo();
    } catch (e) {
      Alert.alert('Erro', 'Falha de ligação com o servidor.');
    } finally {
      setSalvandoUsuario(false);
    }
  };

  const confirmarExcluirUsuario = (user) => {
    Alert.alert(
      'Remover Utilizador',
      `Tem a certeza que deseja apagar a conta de "${user.nome_usuario}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar Conta',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/admin/usuarios/${user.id_usuario}`, { method: 'DELETE' });
              if (res.ok) {
                carregarTudo();
              } else {
                Alert.alert('Erro', 'Não foi possível remover o utilizador.');
              }
            } catch (e) {
              Alert.alert('Erro', 'Falha de ligação.');
            }
          }
        }
      ]
    );
  };

  // --- AÇÕES DE MODERAÇÃO DE COMENTÁRIOS ---
  const confirmarApagarComentario = (coment) => {
    Alert.alert(
      'Apagar Comentário',
      `Remover comentário de ${coment.nome_usuario || 'Utilizador'}?\n\n"${coment.texto_comentario || '(Apenas avaliação)'}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/admin/comentarios/${coment.id_comentario}`, {
                method: 'DELETE'
              });
              if (res.ok) {
                carregarTudo();
              } else {
                Alert.alert('Erro', 'Não foi possível apagar o comentário.');
              }
            } catch (e) {
              Alert.alert('Erro', 'Falha de ligação.');
            }
          }
        }
      ]
    );
  };

  // --- AÇÕES DE GESTÃO DE EVENTOS ---
  const confirmarExcluirEvento = (ev) => {
    Alert.alert(
      'Excluir Evento',
      `Deseja excluir permanentemente o evento "${ev.nome_evento}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/eventos/${ev.id_evento}`, { method: 'DELETE' });
              if (res.ok) {
                carregarTudo();
              } else {
                Alert.alert('Erro', 'Não foi possível excluir o evento.');
              }
            } catch (e) {
              Alert.alert('Erro', 'Falha de ligação.');
            }
          }
        }
      ]
    );
  };

  // --- ENVIAR COMUNICADO GLOBAL ---
  const dispararComunicadoGeral = async () => {
    if (!tituloAviso.trim() || !mensagemAviso.trim()) {
      Alert.alert('Atenção', 'Preencha o título e a mensagem do comunicado.');
      return;
    }
    setEnviandoAviso(true);
    try {
      const res = await fetch(`${API_BASE}/admin/notificacoes/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: tituloAviso.trim(),
          mensagem: mensagemAviso.trim()
        })
      });
      if (res.ok) {
        Alert.alert('Enviado!', 'Todos os utilizadores receberam a notificação.');
        setTituloAviso('');
        setMensagemAviso('');
      } else {
        Alert.alert('Erro', 'Não foi possível enviar o comunicado.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha de ligação com o servidor.');
    } finally {
      setEnviandoAviso(false);
    }
  };

  // Filtros de busca
  const usuariosFiltrados = useMemo(() => {
    const q = buscaUsuario.toLowerCase().trim();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        (u.nome_usuario || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.telefone || '').toLowerCase().includes(q)
    );
  }, [usuarios, buscaUsuario]);

  const comentariosFiltrados = useMemo(() => {
    const q = buscaComentario.toLowerCase().trim();
    if (!q) return comentarios;
    return comentarios.filter(
      (c) =>
        (c.texto_comentario || '').toLowerCase().includes(q) ||
        (c.nome_usuario || '').toLowerCase().includes(q) ||
        (c.nome_evento || '').toLowerCase().includes(q)
    );
  }, [comentarios, buscaComentario]);

  // Cálculo de modalidade para barra visual
  const totalModEventos = (metricas.porModalidade || []).reduce((acc, item) => acc + (item.total || 0), 0) || 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={irParaVoltar} style={styles.btnVoltar}>
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCentro}>
          <Text style={styles.tituloHeader}>Painel Administrativo</Text>
          <View style={styles.statusOnlineRow}>
            <View style={styles.pontoOnline} />
            <Text style={styles.txtStatusOnline}>API {metricas.statusSistema}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.btnVoltar}>
          <Feather name="refresh-cw" size={18} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* MENU DE ABAS */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {[
            { id: 'Metricas', label: 'Métricas', icone: 'bar-chart-2' },
            { id: 'Usuarios', label: `Usuários (${usuarios.length})`, icone: 'users' },
            { id: 'Moderacao', label: `Moderação (${comentarios.length})`, icone: 'message-square' },
            { id: 'Eventos', label: `Eventos (${eventos.length})`, icone: 'calendar' }
          ].map((tab) => {
            const ativo = abaAtiva === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, ativo && styles.tabBtnAtivo]}
                onPress={() => setAbaAtiva(tab.id)}
              >
                <Feather name={tab.icone} size={15} color={ativo ? '#FFFFFF' : '#8F9CAE'} />
                <Text style={[styles.tabTxt, ativo && styles.tabTxtAtivo]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {carregando ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingTxt}>A carregar dados do painel...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor="#8B5CF6" />}
        >
          {/* ==========================================
              ABA 1: MÉTRICAS E COMUNICADO GERAL
             ========================================== */}
          {abaAtiva === 'Metricas' && (
            <View>
              <Text style={styles.secaoTitulo}>Indicadores da Plataforma</Text>

              <View style={styles.gridKpi}>
                <View style={styles.cardKpi}>
                  <View style={[styles.kpiIcone, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                    <Feather name="users" size={20} color="#8B5CF6" />
                  </View>
                  <Text style={styles.kpiValor}>{metricas.totalUsuarios}</Text>
                  <Text style={styles.kpiLabel}>Usuários Ativos</Text>
                </View>

                <View style={styles.cardKpi}>
                  <View style={[styles.kpiIcone, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Feather name="calendar" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.kpiValor}>{metricas.totalEventos}</Text>
                  <Text style={styles.kpiLabel}>Eventos Publicados</Text>
                </View>

                <View style={styles.cardKpi}>
                  <View style={[styles.kpiIcone, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Feather name="message-circle" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.kpiValor}>{metricas.totalComentarios}</Text>
                  <Text style={styles.kpiLabel}>Comentários</Text>
                </View>

                <View style={styles.cardKpi}>
                  <View style={[styles.kpiIcone, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name="star" size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.kpiValor}>{metricas.mediaAvaliacoes}</Text>
                  <Text style={styles.kpiLabel}>Nota Média</Text>
                </View>
              </View>

              {/* DISTRIBUIÇÃO POR MODALIDADE */}
              <View style={styles.cardPainel}>
                <Text style={styles.cardPainelTitulo}>Eventos por Modalidade</Text>
                {(metricas.porModalidade || []).length === 0 ? (
                  <Text style={styles.txtVazio}>Sem dados suficientes.</Text>
                ) : (
                  metricas.porModalidade.map((item) => {
                    const pct = Math.round((item.total / totalModEventos) * 100);
                    return (
                      <View key={item.modalidade} style={styles.barraRow}>
                        <View style={styles.barraHeader}>
                          <Text style={styles.barraLabel}>{item.modalidade}</Text>
                          <Text style={styles.barraValor}>{item.total} ({pct}%)</Text>
                        </View>
                        <View style={styles.barraFundo}>
                          <View style={[styles.barraPreenchida, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {/* TOP TECNOLOGIAS */}
              <View style={styles.cardPainel}>
                <Text style={styles.cardPainelTitulo}>Áreas / Tecnologias em Destaque</Text>
                {(metricas.topTechs || []).length === 0 ? (
                  <Text style={styles.txtVazio}>Nenhuma tecnologia registada.</Text>
                ) : (
                  metricas.topTechs.map((item, idx) => (
                    <View key={item.tech} style={styles.rankingRow}>
                      <View style={styles.rankingPos}>
                        <Text style={styles.rankingPosTxt}>#{idx + 1}</Text>
                      </View>
                      <Text style={styles.rankingNome}>{item.tech}</Text>
                      <Text style={styles.rankingQtd}>{item.total} evento(s)</Text>
                    </View>
                  ))
                )}
              </View>

              {/* COMUNICADO GLOBAL */}
              <View style={styles.cardPainel}>
                <View style={styles.broadcastHeader}>
                  <Ionicons name="megaphone-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.cardPainelTitulo}>Enviar Comunicado Geral</Text>
                </View>
                <Text style={styles.broadcastSub}>
                  Dispara uma notificação imediata para todos os utilizadores cadastrados.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Título do aviso (Ex: Novos workshops disponíveis!)"
                  placeholderTextColor="#64748B"
                  value={tituloAviso}
                  onChangeText={setTituloAviso}
                />

                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                  placeholder="Escreva a mensagem para os alunos..."
                  placeholderTextColor="#64748B"
                  multiline
                  value={mensagemAviso}
                  onChangeText={setMensagemAviso}
                />

                <TouchableOpacity
                  style={styles.btnPrimario}
                  onPress={dispararComunicadoGeral}
                  disabled={enviandoAviso}
                >
                  {enviandoAviso ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Feather name="send" size={16} color="#FFF" />
                      <Text style={styles.txtBtnPrimario}>Notificar Todos os Usuários</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ==========================================
              ABA 2: SUPORTE A CADASTROS (USUÁRIOS)
             ========================================== */}
          {abaAtiva === 'Usuarios' && (
            <View>
              <Text style={styles.secaoTitulo}>Suporte & Gestão de Cadastros</Text>

              <View style={styles.searchBox}>
                <Feather name="search" size={18} color="#8F9CAE" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nome, e-mail ou telefone..."
                  placeholderTextColor="#64748B"
                  value={buscaUsuario}
                  onChangeText={setBuscaUsuario}
                />
                {buscaUsuario.length > 0 && (
                  <TouchableOpacity onPress={() => setBuscaUsuario('')}>
                    <Feather name="x" size={16} color="#8F9CAE" />
                  </TouchableOpacity>
                )}
              </View>

              {usuariosFiltrados.length === 0 ? (
                <Text style={styles.txtVazio}>Nenhum utilizador encontrado.</Text>
              ) : (
                usuariosFiltrados.map((u) => {
                  const ehAdmin = u.tipo_usuario === 'admin';
                  return (
                    <View key={String(u.id_usuario)} style={styles.cardItem}>
                      <View style={styles.cardItemTopo}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitulo}>{u.nome_usuario}</Text>
                          <Text style={styles.itemSub}>{u.email}</Text>
                          <Text style={styles.itemMeta}>
                            Tel: {u.telefone || 'Não informado'} · ID #{u.id_usuario}
                          </Text>
                        </View>
                        <View style={[styles.badgeRole, ehAdmin && styles.badgeRoleAdmin]}>
                          <Text style={[styles.txtBadgeRole, ehAdmin && styles.txtBadgeRoleAdmin]}>
                            {(u.tipo_usuario || 'aluno').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.acoesRow}>
                        <TouchableOpacity
                          style={styles.btnSecundario}
                          onPress={() => abrirEdicaoUsuario(u)}
                        >
                          <Feather name="edit-2" size={14} color="#8B5CF6" />
                          <Text style={styles.txtBtnSecundario}>Corrigir Cadastro / Senha</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnPerigoIcone}
                          onPress={() => confirmarExcluirUsuario(u)}
                        >
                          <Feather name="trash-2" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ==========================================
              ABA 3: MODERAÇÃO DE COMENTÁRIOS
             ========================================== */}
          {abaAtiva === 'Moderacao' && (
            <View>
              <Text style={styles.secaoTitulo}>Moderação de Comentários</Text>

              <View style={styles.searchBox}>
                <Feather name="search" size={18} color="#8F9CAE" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filtrar por texto, autor ou evento..."
                  placeholderTextColor="#64748B"
                  value={buscaComentario}
                  onChangeText={setBuscaComentario}
                />
                {buscaComentario.length > 0 && (
                  <TouchableOpacity onPress={() => setBuscaComentario('')}>
                    <Feather name="x" size={16} color="#8F9CAE" />
                  </TouchableOpacity>
                )}
              </View>

              {comentariosFiltrados.length === 0 ? (
                <Text style={styles.txtVazio}>Nenhum comentário encontrado para moderação.</Text>
              ) : (
                comentariosFiltrados.map((c) => (
                  <View key={String(c.id_comentario)} style={styles.cardItem}>
                    <View style={styles.cardItemTopo}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitulo}>{c.nome_usuario || 'Utilizador'}</Text>
                        <Text style={styles.itemEventoTag} numberOfLines={1}>
                          Evento: {c.nome_evento || `#${c.id_evento}`}
                        </Text>
                      </View>

                      <View style={styles.notaPill}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.txtNotaPill}>{c.nota_avaliacao || 5}</Text>
                      </View>
                    </View>

                    <Text style={styles.textoModeracao}>
                      {c.texto_comentario && c.texto_comentario.trim() !== ''
                        ? `"${c.texto_comentario}"`
                        : '(Avaliação apenas com estrelas, sem texto)'}
                    </Text>

                    <View style={styles.acoesRow}>
                      <TouchableOpacity
                        style={styles.btnApagarComentario}
                        onPress={() => confirmarApagarComentario(c)}
                      >
                        <Feather name="trash-2" size={14} color="#EF4444" />
                        <Text style={styles.txtBtnApagarComentario}>Apagar Comentário Inapropriado</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ==========================================
              ABA 4: GESTÃO DE EVENTOS
             ========================================== */}
          {abaAtiva === 'Eventos' && (
            <View>
              <View style={styles.headerEventosAdmin}>
                <Text style={styles.secaoTitulo}>Eventos Publicados</Text>
                {irParaCriarEvento && (
                  <TouchableOpacity style={styles.btnNovoEvento} onPress={irParaCriarEvento}>
                    <Feather name="plus" size={16} color="#FFF" />
                    <Text style={styles.txtBtnNovoEvento}>Novo Evento</Text>
                  </TouchableOpacity>
                )}
              </View>

              {eventos.length === 0 ? (
                <Text style={styles.txtVazio}>Nenhum evento cadastrado.</Text>
              ) : (
                eventos.map((ev) => (
                  <View key={String(ev.id_evento)} style={styles.cardItem}>
                    <View style={styles.cardItemTopo}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitulo}>{ev.nome_evento}</Text>
                        <Text style={styles.itemSub}>
                          {ev.modalidade || 'Presencial'} · {ev.tech || 'Geral'} · {ev.tipo_ingresso || 'Gratuito'}
                        </Text>
                        <Text style={styles.itemMeta}>Produtor: {ev.nome_produtor || 'Não informado'}</Text>
                      </View>
                    </View>

                    <View style={styles.acoesRow}>
                      {irParaEditarEvento && (
                        <TouchableOpacity
                          style={styles.btnSecundario}
                          onPress={() => irParaEditarEvento(ev)}
                        >
                          <Feather name="edit" size={14} color="#8B5CF6" />
                          <Text style={styles.txtBtnSecundario}>Editar</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.btnPerigoIcone}
                        onPress={() => confirmarExcluirEvento(ev)}
                      >
                        <Feather name="trash-2" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ==========================================
          MODAL: CORRIGIR CADASTRO / RESETAR SENHA
         ========================================== */}
      <Modal
        visible={modalUsuarioVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalUsuarioVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Suporte ao Cadastro</Text>
              <TouchableOpacity onPress={() => setModalUsuarioVisivel(false)}>
                <Feather name="x" size={22} color="#8F9CAE" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput style={styles.input} value={editNome} onChangeText={setEditNome} />

              <Text style={styles.label}>E-mail de Acesso</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Telefone</Text>
              <TextInput style={styles.input} value={editTelefone} onChangeText={setEditTelefone} />

              <Text style={styles.label}>Nível de Permissão</Text>
              <View style={styles.roleToggleRow}>
                {['aluno', 'admin'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleToggleBtn, editTipo === role && styles.roleToggleBtnAtivo]}
                    onPress={() => setEditTipo(role)}
                  >
                    <Text style={[styles.roleToggleTxt, editTipo === role && styles.roleToggleTxtAtivo]}>
                      {role.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Redefinir Palavra-passe (Opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite uma nova senha provisória..."
                placeholderTextColor="#64748B"
                value={editNovaSenha}
                onChangeText={setEditNovaSenha}
              />

              <TouchableOpacity
                style={styles.btnPrimario}
                onPress={salvarEdicaoUsuario}
                disabled={salvandoUsuario}
              >
                {salvandoUsuario ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.txtBtnPrimario}>Salvar Alterações</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  btnVoltar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#121824',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  headerCentro: { alignItems: 'center' },
  tituloHeader: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  statusOnlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  pontoOnline: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  txtStatusOnline: { color: '#10B981', fontSize: 11, fontWeight: '600' },

  tabsWrapper: { borderBottomWidth: 1, borderBottomColor: '#1E293B', paddingVertical: 10 },
  tabsRow: { paddingHorizontal: 20, gap: 8 },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  tabBtnAtivo: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  tabTxt: { color: '#8F9CAE', fontSize: 13, fontWeight: '600' },
  tabTxtAtivo: { color: '#FFFFFF' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTxt: { color: '#8F9CAE', marginTop: 12, fontSize: 14 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  secaoTitulo: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold', marginBottom: 14 },

  // KPI Grid
  gridKpi: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  cardKpi: {
    width: '48%',
    backgroundColor: '#121824',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  kpiIcone: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  kpiValor: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  kpiLabel: { color: '#8F9CAE', fontSize: 12, marginTop: 2 },

  // Cards de Painel
  cardPainel: {
    backgroundColor: '#121824',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  cardPainelTitulo: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  barraRow: { marginBottom: 12 },
  barraHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barraLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  barraValor: { color: '#8F9CAE', fontSize: 12 },
  barraFundo: { height: 8, backgroundColor: '#090C10', borderRadius: 4, overflow: 'hidden' },
  barraPreenchida: { height: '100%', backgroundColor: '#8B5CF6', borderRadius: 4 },

  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 10
  },
  rankingPos: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center'
  },
  rankingPosTxt: { color: '#8B5CF6', fontSize: 11, fontWeight: 'bold' },
  rankingNome: { color: '#FFFFFF', fontSize: 14, flex: 1 },
  rankingQtd: { color: '#8F9CAE', fontSize: 12 },

  broadcastHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  broadcastSub: { color: '#8F9CAE', fontSize: 12, marginBottom: 12 },

  // Busca e Listas
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121824',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
    gap: 10
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  txtVazio: { color: '#64748B', fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  cardItem: {
    backgroundColor: '#121824',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  cardItemTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  itemTitulo: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  itemSub: { color: '#8F9CAE', fontSize: 13, marginTop: 2 },
  itemMeta: { color: '#64748B', fontSize: 11, marginTop: 4 },
  itemEventoTag: { color: '#8B5CF6', fontSize: 12, fontWeight: '600', marginTop: 2 },

  badgeRole: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  badgeRoleAdmin: { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderWidth: 1, borderColor: '#8B5CF6' },
  txtBadgeRole: { color: '#8F9CAE', fontSize: 10, fontWeight: 'bold' },
  txtBadgeRoleAdmin: { color: '#8B5CF6' },

  notaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  txtNotaPill: { color: '#F59E0B', fontSize: 12, fontWeight: 'bold' },
  textoModeracao: {
    color: '#CBD5E1',
    fontSize: 13,
    backgroundColor: '#090C10',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    fontStyle: 'italic'
  },

  acoesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  btnSecundario: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    paddingVertical: 9,
    borderRadius: 10
  },
  txtBtnSecundario: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  btnPerigoIcone: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  btnApagarComentario: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 9,
    borderRadius: 10
  },
  txtBtnApagarComentario: { color: '#EF4444', fontSize: 12, fontWeight: '600' },

  headerEventosAdmin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  btnNovoEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  txtBtnNovoEvento: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  // Inputs e Modais
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#090C10',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10
  },
  btnPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8
  },
  txtBtnPrimario: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },

  roleToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  roleToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#090C10',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center'
  },
  roleToggleBtnAtivo: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  roleToggleTxt: { color: '#8F9CAE', fontSize: 12, fontWeight: 'bold' },
  roleToggleTxtAtivo: { color: '#FFFFFF' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#121824',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  modalTitulo: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});