/**
 * @file TelaEventos.js
 * @description Tela principal (Feed) do GatherTech.
 * Exibe a listagem de eventos em destaque, barra de pesquisa textual,
 * filtros combinados (Localização, Modalidade, Preço, Área/Tecnologia e Período),
 * controle de favoritos e navegação inferior.
 */

import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, Modal, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { extrairAreaETechs } from './catalogoTech';

/**
 * Calcula dinamicamente o status temporal do evento comparando
 * as datas de início e término com a data/hora atual do sistema.
 */
const obterStatusEvento = (dataInicio, dataFim) => {
  const hoje = new Date();
  if (dataFim) {
    const fim = new Date(dataFim);
    if (fim < hoje) return { label: 'Encerrado', cor: '#EF4444' };
  }
  if (dataInicio) {
    const inicio = new Date(dataInicio);
    if (inicio > hoje) return { label: 'Em breve', cor: '#3B82F6' };
  }
  return { label: 'Ativo', cor: '#10B981' };
};

export default function TelaEventos({ 
  tipoUsuario, 
  eventos = [], 
  usuarioLogado,
  favoritos = [],
  toggleFavorito,
  qtdNotificacoes = 0,
  aoAtualizar,
  irParaNotificacoes,
  irParaCriarEvento, 
  aoSelecionarEvento, 
  irParaPerfil, 
  irParaFavoritos, 
  irParaAgenda 
}) {
  // Estados de busca e filtros rápidos
  const [busca, setBusca] = useState('');
  const [localizacao, setLocalizacao] = useState('Brasil (Todos)');
  const [atualizando, setAtualizando] = useState(false);
  
  const [filtroModalidade, setFiltroModalidade] = useState(null);
  const [filtroPreco, setFiltroPreco] = useState(null);
  const [filtroTech, setFiltroTech] = useState(null);
  const [filtroData, setFiltroData] = useState(null);
  const [buscaFiltroTech, setBuscaFiltroTech] = useState('');

  // Controle de visibilidade dos modais de filtro
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalModalidadeVisivel, setModalModalidadeVisivel] = useState(false);
  const [modalPrecoVisivel, setModalPrecoVisivel] = useState(false);
  const [modalTechVisivel, setModalTechVisivel] = useState(false);
  const [modalDataVisivel, setModalDataVisivel] = useState(false);

  // Atualiza a lista de eventos ao puxar a tela para baixo (Pull-to-Refresh)
  const onRefresh = async () => {
    if (!aoAtualizar) return;
    setAtualizando(true);
    await aoAtualizar();
    setAtualizando(false);
  };

  // Extrai dinamicamente as cidades únicas presentes nos eventos cadastrados
  const cidadesDisponiveis = useMemo(() => {
    const listaCidades = new Set();
    (eventos || []).forEach((ev) => {
      const nomeCidade = ev.cidade || ev.local;
      if (nomeCidade && nomeCidade.trim() !== '') {
        listaCidades.add(nomeCidade.trim());
      }
    });
    return ['Brasil (Todos)', ...Array.from(listaCidades)];
  }, [eventos]);

  // Extrai todas as Áreas e Tecnologias únicas dos eventos para popular o filtro
  const techsDisponiveis = useMemo(() => {
    const listaOpcoes = new Set();
    (eventos || []).forEach((ev) => {
      const { area, tecnologias } = extrairAreaETechs(ev.tech);
      if (area) listaOpcoes.add(area);
      tecnologias.forEach(t => listaOpcoes.add(t));
    });
    const ordenadas = Array.from(listaOpcoes).sort();
    const filtradas = buscaFiltroTech.trim()
      ? ordenadas.filter(item => item.toLowerCase().includes(buscaFiltroTech.toLowerCase()))
      : ordenadas;
    return ['Todas as Áreas / Techs', ...filtradas];
  }, [eventos, buscaFiltroTech]);

  const opcoesData = ['Todas as Datas', 'Hoje', 'Esta Semana', 'Este Mês'];
  const opcoesModalidade = ['Todas as Modalidades', 'Presencial', 'Online'];
  const opcoesPreco = ['Todos os Preços', 'Gratuito', 'Pago'];

  // Aplica simultaneamente todos os critérios de busca e filtragem selecionados pelo usuário
  const eventosFiltrados = (eventos || []).filter((evento) => {
    const termoBusca = busca.toLowerCase();
    const atendeBusca =
      (evento.nome_evento || evento.titulo || '').toLowerCase().includes(termoBusca) ||
      (evento.descricao_evento || evento.descricao || '').toLowerCase().includes(termoBusca) ||
      (evento.tech || '').toLowerCase().includes(termoBusca);
    
    const atendeLocalizacao = localizacao === 'Brasil (Todos)'
      ? true
      : (evento.cidade || evento.local || '').toLowerCase().includes(localizacao.toLowerCase());

    const atendeModalidade = filtroModalidade 
      ? (evento.modalidade || evento.formato || '').toLowerCase() === filtroModalidade.toLowerCase() 
      : true;

    const atendePreco = filtroPreco 
      ? (filtroPreco === 'Gratuito' ? (evento.tipo_ingresso || evento.preco || '').toLowerCase().includes('gratuit') : !(evento.tipo_ingresso || evento.preco || '').toLowerCase().includes('gratuit')) 
      : true;

    // Verifica correspondência tanto pela Área principal quanto por qualquer Tecnologia do evento
    let atendeTech = true;
    if (filtroTech && filtroTech !== 'Todas as Áreas / Techs') {
      const { area, tecnologias } = extrairAreaETechs(evento.tech);
      const alvo = filtroTech.toLowerCase();
      atendeTech =
        area.toLowerCase() === alvo ||
        tecnologias.some(t => t.toLowerCase() === alvo);
    }

    // Filtra por janela temporal (Hoje, Esta Semana ou Este Mês)
    let atendeData = true;
    if (filtroData && filtroData !== 'Todas as Datas') {
      if (!evento.data_inicio) {
        atendeData = false;
      } else {
        const dataEvento = new Date(evento.data_inicio);
        const hoje = new Date();
        
        if (filtroData === 'Hoje') {
          atendeData = dataEvento.toDateString() === hoje.toDateString();
        } 
        else if (filtroData === 'Esta Semana') {
          const proxSemana = new Date();
          proxSemana.setDate(hoje.getDate() + 7);
          atendeData = dataEvento >= hoje && dataEvento <= proxSemana;
        } 
        else if (filtroData === 'Este Mês') {
          atendeData = dataEvento.getMonth() === hoje.getMonth() && dataEvento.getFullYear() === hoje.getFullYear();
        }
      }
    }

    return atendeBusca && atendeLocalizacao && atendeModalidade && atendePreco && atendeTech && atendeData;
  });

  const avatarUrl = usuarioLogado?.foto_perfil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

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
        
        {/* Cabeçalho com avatar do usuário, logotipo e badge de notificações */}
        <View style={styles.header}>
          <TouchableOpacity onPress={irParaPerfil}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          </TouchableOpacity>

          <Text style={styles.logoGT}>GT</Text>

          <TouchableOpacity style={styles.notifBtn} onPress={irParaNotificacoes} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={26} color="#FFFFFF" />
            {qtdNotificacoes > 0 && (
              <View style={styles.badgeNotif}>
                <Text style={styles.badgeNotifText}>
                  {qtdNotificacoes > 99 ? '99+' : qtdNotificacoes}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Seletor rápido de localização/cidade */}
        <TouchableOpacity style={styles.localizacaoArea} onPress={() => setModalVisivel(true)}>
          <Ionicons name="location-outline" size={18} color="#8B5CF6" />
          <Text style={styles.localizacaoTexto}>{localizacao}</Text>
          <Feather name="chevron-down" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Barra de pesquisa textual por título, descrição, área ou tecnologia */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#8F9CAE" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar eventos, áreas ou tecnologias..."
            placeholderTextColor="#8F9CAE"
            value={busca}
            onChangeText={setBusca}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <Feather name="x" size={18} color="#8F9CAE" />
            </TouchableOpacity>
          )}
        </View>

        {/* Carrossel horizontal de filtros rápidos */}
        <Text style={styles.secaoTitulo}>Filtros rápidos</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.scrollFiltros}
          contentContainerStyle={styles.filtrosContainer}
        >
          <TouchableOpacity style={[styles.filtroItem, filtroModalidade && styles.filtroAtivo]} onPress={() => setModalModalidadeVisivel(true)}>
            <View style={[styles.iconCircle, filtroModalidade && styles.iconCircleAtivo]}>
              <Feather name="shield" size={20} color={filtroModalidade ? '#FFFFFF' : '#8B5CF6'} />
            </View>
            <Text style={styles.filtroLabel}>{filtroModalidade || 'Modalidade'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.filtroItem, filtroPreco && styles.filtroAtivo]} onPress={() => setModalPrecoVisivel(true)}>
            <View style={[styles.iconCircle, filtroPreco && styles.iconCircleAtivo]}>
              <Feather name="layers" size={20} color={filtroPreco ? '#FFFFFF' : '#8B5CF6'} />
            </View>
            <Text style={styles.filtroLabel}>{filtroPreco || 'Preço'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.filtroItem, filtroTech && filtroTech !== 'Todas as Áreas / Techs' && styles.filtroAtivo]} onPress={() => setModalTechVisivel(true)}>
            <View style={[styles.iconCircle, filtroTech && filtroTech !== 'Todas as Áreas / Techs' && styles.iconCircleAtivo]}>
              <Feather name="cpu" size={20} color={filtroTech && filtroTech !== 'Todas as Áreas / Techs' ? '#FFFFFF' : '#8B5CF6'} />
            </View>
            <Text style={styles.filtroLabel} numberOfLines={1}>
              {filtroTech && filtroTech !== 'Todas as Áreas / Techs' ? filtroTech : 'Área / Tech'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.filtroItem, filtroData && filtroData !== 'Todas as Datas' && styles.filtroAtivo]} onPress={() => setModalDataVisivel(true)}>
            <View style={[styles.iconCircle, filtroData && filtroData !== 'Todas as Datas' && styles.iconCircleAtivo]}>
              <Feather name="calendar" size={20} color={filtroData && filtroData !== 'Todas as Datas' ? '#FFFFFF' : '#8B5CF6'} />
            </View>
            <Text style={styles.filtroLabel} numberOfLines={1}>{filtroData && filtroData !== 'Todas as Datas' ? filtroData : 'Data'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.filtroItem}
            onPress={() => { setFiltroModalidade(null); setFiltroPreco(null); setFiltroTech(null); setFiltroData(null); setLocalizacao('Brasil (Todos)'); setBusca(''); }}
          >
            <View style={styles.iconCircle}><Feather name="refresh-cw" size={20} color="#8B5CF6" /></View>
            <Text style={styles.filtroLabel}>Limpar</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Listagem principal dos cards de eventos */}
        <View style={styles.secaoHeader}>
          <Text style={styles.secaoTitulo}>Eventos em destaque</Text>
        </View>

        {eventosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-clear-outline" size={48} color="#334155" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitulo}>Nenhum evento encontrado</Text>
            <Text style={styles.emptyText}>Não há eventos cadastrados para os filtros selecionados.</Text>
          </View>
        ) : (
          eventosFiltrados.map((item) => {
            const idEvento = String(item.id_evento || item.id);
            const isFav = (favoritos || []).map(f => String(f)).includes(idEvento);
            
            const status = obterStatusEvento(item.data_inicio, item.data_fim);
            const mediaAvaliacao = item.avaliacao || '4.8'; 
            const valorEvento = item.preco || item.tipo_ingresso || 'Gratuito';
            const { area, tecnologias } = extrairAreaETechs(item.tech);
            const resumoTech = tecnologias.length > 0
              ? `${tecnologias.slice(0, 2).join(', ')}${tecnologias.length > 2 ? ` +${tecnologias.length - 2}` : ''}`
              : area;

            return (
              <TouchableOpacity 
                key={idEvento} 
                style={styles.cardEvento}
                onPress={() => aoSelecionarEvento && aoSelecionarEvento(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardImageContainer}>
                  <Image 
                    source={{ uri: item.imagem || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600' }} 
                    style={styles.cardImage} 
                  />
                  <View style={[styles.badgeStatus, { backgroundColor: status.cor }]}>
                    <Text style={styles.badgeText}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitulo} numberOfLines={2}>{item.nome_evento || item.titulo}</Text>
                    <TouchableOpacity 
                      onPress={() => toggleFavorito && toggleFavorito(idEvento)} 
                      style={styles.btnFav}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons 
                        name={isFav ? "heart" : "heart-outline"} 
                        size={22} 
                        color={isFav ? "#EF4444" : "#94A3B8"} 
                      />
                    </TouchableOpacity>
                  </View>

                  {resumoTech ? (
                    <View style={styles.cardInfoRow}>
                      <Feather name="cpu" size={12} color="#8B5CF6" />
                      <Text style={styles.cardTechText} numberOfLines={1}>{resumoTech}</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardInfoRow}>
                    <Ionicons name="location-outline" size={13} color="#8F9CAE" />
                    <Text style={styles.cardInfoText}>{item.cidade || item.local || 'Salvador'}</Text>
                  </View>

                  <View style={styles.cardInfoRow}>
                    <Feather name="tag" size={13} color="#8F9CAE" />
                    <Text style={styles.cardInfoText}>{valorEvento}</Text>
                  </View>

                  <View style={styles.cardInfoFooter}>
                    <View style={styles.cardInfoRow}>
                      <Feather name="calendar" size={13} color="#8F9CAE" />
                      <Text style={styles.cardInfoText}>{item.data || 'Em breve'}</Text>
                    </View>
                    
                    <View style={styles.cardAvaliacao}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.cardAvaliacaoTexto}>{mediaAvaliacao}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modais de seleção dos filtros */}
      <Modal visible={modalVisivel} transparent={true} animationType="fade" onRequestClose={() => setModalVisivel(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisivel(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Selecione a Localização</Text>
            {cidadesDisponiveis.map((cidade) => (
              <TouchableOpacity key={cidade} style={[styles.opcaoItem, localizacao === cidade && styles.opcaoSelecionada]} onPress={() => { setLocalizacao(cidade); setModalVisivel(false); }}>
                <Text style={[styles.textoOpcao, localizacao === cidade && styles.textoOpcaoAtivo]}>{cidade}</Text>
                {localizacao === cidade && <Ionicons name="checkmark" size={20} color="#8B5CF6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalModalidadeVisivel} transparent={true} animationType="fade" onRequestClose={() => setModalModalidadeVisivel(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalModalidadeVisivel(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Selecione a Modalidade</Text>
            {opcoesModalidade.map((mod) => (
              <TouchableOpacity key={mod} style={[styles.opcaoItem, filtroModalidade === (mod === 'Todas as Modalidades' ? null : mod) && styles.opcaoSelecionada]} onPress={() => { setFiltroModalidade(mod === 'Todas as Modalidades' ? null : mod); setModalModalidadeVisivel(false); }}>
                <Text style={[styles.textoOpcao, filtroModalidade === (mod === 'Todas as Modalidades' ? null : mod) && styles.textoOpcaoAtivo]}>{mod}</Text>
                {filtroModalidade === (mod === 'Todas as Modalidades' ? null : mod) && <Ionicons name="checkmark" size={20} color="#8B5CF6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalPrecoVisivel} transparent={true} animationType="fade" onRequestClose={() => setModalPrecoVisivel(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalPrecoVisivel(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Selecione o Preço</Text>
            {opcoesPreco.map((prc) => (
              <TouchableOpacity key={prc} style={[styles.opcaoItem, filtroPreco === (prc === 'Todos os Preços' ? null : prc) && styles.opcaoSelecionada]} onPress={() => { setFiltroPreco(prc === 'Todos os Preços' ? null : prc); setModalPrecoVisivel(false); }}>
                <Text style={[styles.textoOpcao, filtroPreco === (prc === 'Todos os Preços' ? null : prc) && styles.textoOpcaoAtivo]}>{prc}</Text>
                {filtroPreco === (prc === 'Todos os Preços' ? null : prc) && <Ionicons name="checkmark" size={20} color="#8B5CF6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalTechVisivel} transparent={true} animationType="fade" onRequestClose={() => setModalTechVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitulo, { marginBottom: 0 }]}>Filtrar por Área ou Tecnologia</Text>
              <TouchableOpacity onPress={() => setModalTechVisivel(false)}>
                <Feather name="x" size={20} color="#8F9CAE" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              placeholder="Buscar área ou tecnologia..."
              placeholderTextColor="#64748B"
              value={buscaFiltroTech}
              onChangeText={setBuscaFiltroTech}
            />

            <ScrollView style={{ maxHeight: 330 }}>
              {techsDisponiveis.map((tech) => {
                const selecionada = filtroTech === (tech === 'Todas as Áreas / Techs' ? null : tech);
                return (
                  <TouchableOpacity
                    key={tech}
                    style={[styles.opcaoItem, selecionada && styles.opcaoSelecionada]}
                    onPress={() => {
                      setFiltroTech(tech === 'Todas as Áreas / Techs' ? null : tech);
                      setBuscaFiltroTech('');
                      setModalTechVisivel(false);
                    }}
                  >
                    <Text style={[styles.textoOpcao, selecionada && styles.textoOpcaoAtivo]}>{tech}</Text>
                    {selecionada && <Ionicons name="checkmark" size={20} color="#8B5CF6" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalDataVisivel} transparent={true} animationType="fade" onRequestClose={() => setModalDataVisivel(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalDataVisivel(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Filtrar por Período</Text>
            {opcoesData.map((dataOpt) => (
              <TouchableOpacity key={dataOpt} style={[styles.opcaoItem, filtroData === (dataOpt === 'Todas as Datas' ? null : dataOpt) && styles.opcaoSelecionada]} onPress={() => { setFiltroData(dataOpt === 'Todas as Datas' ? null : dataOpt); setModalDataVisivel(false); }}>
                <Text style={[styles.textoOpcao, filtroData === (dataOpt === 'Todas as Datas' ? null : dataOpt) && styles.textoOpcaoAtivo]}>{dataOpt}</Text>
                {filtroData === (dataOpt === 'Todas as Datas' ? null : dataOpt) && <Ionicons name="checkmark" size={20} color="#8B5CF6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Botão flutuante exclusivo para administradores criarem novos eventos */}
      {tipoUsuario === 'admin' && (
        <TouchableOpacity style={styles.fabBtn} onPress={irParaCriarEvento}>
          <Feather name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Barra de navegação inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="home" size={22} color="#8B5CF6" />
          <Text style={[styles.tabLabel, styles.tabActive]}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={irParaFavoritos}>
          <Ionicons name="heart-outline" size={22} color="#8F9CAE" />
          <Text style={styles.tabLabel}>Favoritos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={irParaAgenda}>
          <Ionicons name="calendar-outline" size={22} color="#8F9CAE" />
          <Text style={styles.tabLabel}>Agenda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={irParaPerfil}>
          <Ionicons name="person-outline" size={22} color="#8F9CAE" />
          <Text style={styles.tabLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090C10' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  logoGT: { fontSize: 24, fontWeight: '900', color: '#0066FF', letterSpacing: 1 },
  notifBtn: { position: 'relative', padding: 6 },
  badgeNotif: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#090C10'
  },
  badgeNotifText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  localizacaoArea: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  localizacaoTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121824', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#1E293B', marginBottom: 24 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  secaoTitulo: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  scrollFiltros: { marginHorizontal: -20, marginBottom: 28 },
  filtrosContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingRight: 40 },
  filtroItem: { alignItems: 'center', marginRight: 24, maxWidth: 80 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#121824', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B', marginBottom: 8 },
  iconCircleAtivo: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  filtroAtivo: { opacity: 0.9 },
  filtroLabel: { color: '#8F9CAE', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardEvento: { flexDirection: 'row', backgroundColor: '#121824', borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#1E293B' },
  cardImageContainer: { position: 'relative', width: 112, height: 118, borderRadius: 12, overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },
  badgeStatus: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
  cardContent: { flex: 1, marginLeft: 14, justifyContent: 'space-between' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitulo: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 6, lineHeight: 20 },
  btnFav: { padding: 2 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTechText: { color: '#A78BFA', fontSize: 11, fontWeight: '600', flex: 1 },
  cardInfoText: { color: '#8F9CAE', fontSize: 12, fontWeight: '500' },
  cardInfoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAvaliacao: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1E293B', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  cardAvaliacaoTexto: { color: '#F59E0B', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121824', borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', marginTop: 10 },
  emptyTitulo: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  emptyText: { color: '#8F9CAE', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  fabBtn: { position: 'absolute', bottom: 80, right: 20, backgroundColor: '#8B5CF6', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 65, backgroundColor: '#090C10', borderTopWidth: 1, borderTopColor: '#1E293B', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { color: '#8F9CAE', fontSize: 11, marginTop: 4, textAlign: 'center' },
  tabActive: { color: '#8B5CF6', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContent: { width: '100%', backgroundColor: '#121824', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  modalTitulo: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalSearchInput: { backgroundColor: '#090C10', color: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#1E293B', marginBottom: 10, fontSize: 14 },
  opcaoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  opcaoSelecionada: { backgroundColor: '#1A2333', borderRadius: 8, paddingHorizontal: 10 },
  textoOpcao: { color: '#8F9CAE', fontSize: 15, flex: 1, marginRight: 8 },
  textoOpcaoAtivo: { color: '#FFFFFF', fontWeight: 'bold' }
});