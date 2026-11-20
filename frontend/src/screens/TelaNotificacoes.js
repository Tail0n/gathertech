import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function TelaNotificacoes({
  notificacoes = [],
  aoVoltar,
  aoMarcarComoLida,
  aoMarcarTodasComoLidas,
  aoSelecionarNotificacao,
  aoAtualizar
}) {
  const [filtro, setFiltro] = useState('Todas');
  const [atualizando, setAtualizando] = useState(false);

  const onRefresh = async () => {
    if (!aoAtualizar) return;
    setAtualizando(true);
    await aoAtualizar();
    setAtualizando(false);
  };

  const notificacoesFiltradas = useMemo(() => {
    return (notificacoes || []).filter((item) => {
      if (filtro === 'Não lidas') return !item.lida;
      if (filtro === 'Eventos') {
        return item.tipo === 'proximo_agenda' || item.tipo === 'proximo_favorito' || item.tipo === 'novo_evento';
      }
      if (filtro === 'Interações') {
        return item.tipo === 'curtida' || item.tipo === 'resposta';
      }
      return true;
    });
  }, [notificacoes, filtro]);

  const qtdNaoLidas = useMemo(
    () => (notificacoes || []).filter((n) => !n.lida).length,
    [notificacoes]
  );

  const obterEstiloVisual = (tipo) => {
    switch (tipo) {
      case 'curtida':
        return { icone: 'heart', cor: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'resposta':
        return { icone: 'chatbubble-ellipses', cor: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'proximo_agenda':
        return { icone: 'calendar', cor: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'proximo_favorito':
        return { icone: 'star', cor: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'novo_evento':
      default:
        return { icone: 'megaphone', cor: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
    }
  };

  const formatarTempo = (dataStr) => {
    if (!dataStr) return 'Agora';
    const data = new Date(dataStr);
    if (isNaN(data.getTime())) return dataStr;

    const agora = new Date();
    const diffMin = Math.floor((agora - data) / 60000);
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Há ${diffHoras}h`;
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={aoVoltar} style={styles.btnIcone}>
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.tituloContainer}>
          <Text style={styles.tituloHeader}>Notificações</Text>
          {qtdNaoLidas > 0 && (
            <View style={styles.pillContador}>
              <Text style={styles.txtPillContador}>{qtdNaoLidas}</Text>
            </View>
          )}
        </View>

        {qtdNaoLidas > 0 ? (
          <TouchableOpacity onPress={aoMarcarTodasComoLidas} style={styles.btnLerTodas}>
            <Ionicons name="checkmark-done" size={20} color="#8B5CF6" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* ABAS DE FILTRO */}
      <View style={styles.filtrosWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosRow}>
          {['Todas', 'Não lidas', 'Eventos', 'Interações'].map((aba) => (
            <TouchableOpacity
              key={aba}
              style={[styles.chipFiltro, filtro === aba && styles.chipFiltroAtivo]}
              onPress={() => setFiltro(aba)}
            >
              <Text style={[styles.txtChipFiltro, filtro === aba && styles.txtChipFiltroAtivo]}>
                {aba}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* LISTA DE NOTIFICAÇÕES */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor="#8B5CF6" />
        }
      >
        {notificacoesFiltradas.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={48} color="#334155" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitulo}>Nenhuma notificação por aqui</Text>
            <Text style={styles.emptyTexto}>
              Quando curtirem ou responderem seus comentários, ou quando um evento favoritado/inscrito estiver próximo, você verá aqui.
            </Text>
          </View>
        ) : (
          notificacoesFiltradas.map((item) => {
            const visual = obterEstiloVisual(item.tipo);
            return (
              <TouchableOpacity
                key={String(item.id)}
                style={[styles.cardNotif, !item.lida && styles.cardNotifNaoLida]}
                activeOpacity={0.8}
                onPress={() => {
                  if (!item.lida && aoMarcarComoLida) {
                    aoMarcarComoLida(item);
                  }
                  if (aoSelecionarNotificacao) {
                    aoSelecionarNotificacao(item);
                  }
                }}
              >
                <View style={[styles.iconeBox, { backgroundColor: visual.bg }]}>
                  <Ionicons name={visual.icone} size={22} color={visual.cor} />
                </View>

                <View style={styles.conteudoCard}>
                  <View style={styles.topoCard}>
                    <Text style={styles.tituloNotif} numberOfLines={1}>{item.titulo}</Text>
                    <Text style={styles.tempoNotif}>{formatarTempo(item.data_criacao)}</Text>
                  </View>

                  <Text style={styles.msgNotif} numberOfLines={3}>{item.mensagem}</Text>

                  {item.nome_evento ? (
                    <View style={styles.tagEvento}>
                      <Feather name="calendar" size={11} color="#8B5CF6" />
                      <Text style={styles.txtTagEvento} numberOfLines={1}>{item.nome_evento}</Text>
                    </View>
                  ) : null}
                </View>

                {!item.lida && <View style={styles.pontoNaoLida} />}
              </TouchableOpacity>
            );
          })
        )}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  btnIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#121824',
    justifyContent: 'center',
    alignItems: 'center'
  },
  btnLerTodas: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#121824',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  tituloContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tituloHeader: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  pillContador: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  txtPillContador: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  filtrosWrapper: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#121824' },
  filtrosRow: { paddingHorizontal: 20, gap: 8 },
  chipFiltro: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  chipFiltroAtivo: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  txtChipFiltro: { color: '#8F9CAE', fontSize: 13, fontWeight: '600' },
  txtChipFiltroAtivo: { color: '#FFFFFF' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  cardNotif: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121824',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12
  },
  cardNotifNaoLida: {
    borderColor: '#8B5CF6',
    backgroundColor: '#151C2C'
  },
  iconeBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  conteudoCard: { flex: 1 },
  topoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6
  },
  tituloNotif: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', flex: 1 },
  tempoNotif: { color: '#64748B', fontSize: 11 },
  msgNotif: { color: '#CBD5E1', fontSize: 13, lineHeight: 18 },
  tagEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: '#090C10',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  txtTagEvento: { color: '#8B5CF6', fontSize: 11, fontWeight: '600', maxWidth: 200 },
  pontoNaoLida: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#8B5CF6'
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121824',
    borderRadius: 16,
    padding: 32,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  emptyTitulo: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  emptyTexto: { color: '#8F9CAE', fontSize: 13, textAlign: 'center', lineHeight: 20 }
});