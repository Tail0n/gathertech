import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Alert, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export default function TelaAgenda({ 
  eventos = [], 
  agenda = [], 
  toggleAgenda,
  aoAtualizar,
  aoSelecionarEvento, 
  irParaInicio, 
  irParaFavoritos, 
  irParaPerfil 
}) {
  const [atualizando, setAtualizando] = useState(false);

  const onRefresh = async () => {
    if (!aoAtualizar) return;
    setAtualizando(true);
    await aoAtualizar();
    setAtualizando(false);
  };

  const idsAgendaString = (agenda || []).map(id => String(id));

  // EXIBE APENAS OS EVENTOS ONDE O USUÁRIO SE INSCREVEU (ESTÃO NA AGENDA DO APP)
  const eventosAgenda = (eventos || []).filter((ev) => {
    const idEv = String(ev.id_evento || ev.id);
    return idsAgendaString.includes(idEv);
  });

  const eventosOrdenados = [...eventosAgenda].sort((a, b) => {
    const dataA = new Date(a.data_inicio || Date.now());
    const dataB = new Date(b.data_inicio || Date.now());
    return dataA - dataB;
  });

  const adicionarAoGoogleCalendar = (evento) => {
    try {
      const dataInicioStr = evento.data_inicio ? evento.data_inicio.split('T')[0] : '2026-11-15';
      const horaInicioStr = evento.horario_inicio ? evento.horario_inicio.substring(0, 5) : '14:00';
      const horaFimStr = evento.horario_fim ? evento.horario_fim.substring(0, 5) : '18:00';

      const [ano, mes, dia] = dataInicioStr.split('-');
      const [hIni, mIni] = horaInicioStr.split(':');
      const [hFim, mFim] = horaFimStr.split(':');

      const startFormatted = `${ano}${mes}${dia}T${hIni}${mIni}00`;
      const endFormatted = `${ano}${mes}${dia}T${hFim}${mFim}00`;

      const titulo = encodeURIComponent(evento.nome_evento || evento.titulo || 'Evento GatherTech');
      const detalhes = encodeURIComponent(evento.descricao || evento.descricao_evento || 'Evento GatherTech');
      const local = encodeURIComponent(evento.local || evento.cidade || 'Online');

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&details=${detalhes}&location=${local}&dates=${startFormatted}/${endFormatted}`;

      Linking.openURL(url).catch(() => {
        Alert.alert('Erro', 'Não foi possível abrir o Google Agenda.');
      });
    } catch (err) {
      console.error('Erro ao gerar URL do Google Calendar:', err);
    }
  };

  const extrairDataLinhaTempo = (dataStr) => {
    if (!dataStr) return { mes: 'NOV', dia: '15' };
    try {
      const dataLimpa = dataStr.split('T')[0];
      const partes = dataLimpa.split('-');
      if (partes.length === 3) {
        const [ano, mesIndex, dia] = partes;
        const mesSigla = MESES[parseInt(mesIndex, 10) - 1] || 'NOV';
        return { mes: mesSigla, dia };
      }
    } catch (e) {}
    return { mes: 'NOV', dia: '15' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minha Agenda</Text>
      </View>

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
        {eventosOrdenados.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.iconBgVazio}>
              <Ionicons name="calendar-outline" size={48} color="#8F9CAE" />
            </View>
            <Text style={styles.emptyTitle}>Sua agenda está vazia</Text>
            <Text style={styles.emptyDesc}>
              Participe dos eventos na tela de detalhes para ver sua linha do tempo de compromissos aqui.
            </Text>
            <TouchableOpacity style={styles.btnExplorar} onPress={irParaInicio}>
              <Text style={styles.textoBtnExplorar}>Explorar Eventos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {eventosOrdenados.map((item, index) => {
              const idCard = String(item.id_evento || item.id);
              const { mes, dia } = extrairDataLinhaTempo(item.data_inicio);
              const formatoModalidade = item.formato || item.modalidade || 'Presencial';
              const ultimoItem = index === eventosOrdenados.length - 1;

              const horaInicio = item.horario_inicio ? item.horario_inicio.substring(0, 5) : '14:00';
              const horaFim = item.horario_fim ? item.horario_fim.substring(0, 5) : '18:00';
              const intervaloHorario = `${horaInicio} - ${horaFim}`;

              return (
                <View key={idCard} style={styles.timelineItem}>
                  <View style={styles.colunaData}>
                    <Text style={styles.mesTexto}>{mes}</Text>
                    <Text style={styles.diaTexto}>{dia}</Text>
                    {!ultimoItem && <View style={styles.linhaVertical} />}
                  </View>

                  <View style={styles.colunaCard}>
                    <TouchableOpacity 
                      style={styles.cardEvento} 
                      activeOpacity={0.85}
                      onPress={() => aoSelecionarEvento && aoSelecionarEvento(item)}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.badgeModalidade, formatoModalidade === 'Presencial' ? styles.bgPresencial : styles.bgOnline]}>
                          <Text style={styles.textoBadgeModalidade}>{formatoModalidade}</Text>
                        </View>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                      </View>

                      <Text style={styles.tituloEvento} numberOfLines={2}>
                        {item.nome_evento || item.titulo}
                      </Text>

                      <View style={styles.infoRow}>
                        <Feather name="clock" size={14} color="#8F9CAE" />
                        <Text style={styles.infoTexto}>{intervaloHorario}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color="#8F9CAE" />
                        <Text style={styles.infoTexto} numberOfLines={1}>
                          {item.local || item.cidade || 'Plataforma Online'}
                        </Text>
                      </View>

                      <TouchableOpacity 
                        style={styles.btnCalendar}
                        onPress={() => adicionarAoGoogleCalendar(item)}
                      >
                        <Feather name="calendar" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.txtBtnCalendar}>Adicionar ao Calendário</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.tabItem} onPress={irParaInicio}>
          <Ionicons name="home-outline" size={22} color="#8F9CAE" />
          <Text style={styles.tabLabel}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={irParaFavoritos}>
          <Ionicons name="heart-outline" size={22} color="#8F9CAE" />
          <Text style={styles.tabLabel}>Favoritos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="calendar" size={22} color="#8B5CF6" />
          <Text style={[styles.tabLabel, styles.tabActive]}>Agenda</Text>
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
  header: { alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E2430' },
  headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 20 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: 40 },
  iconBgVazio: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#121620', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#1E2430' },
  emptyTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  emptyDesc: { color: '#8F9CAE', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  btnExplorar: { backgroundColor: '#8B5CF6', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  textoBtnExplorar: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },

  timelineContainer: { paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  colunaData: { width: 50, alignItems: 'center', marginRight: 12 },
  mesTexto: { color: '#8B5CF6', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  diaTexto: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginTop: 2 },
  linhaVertical: { flex: 1, width: 2, backgroundColor: '#1E293B', marginTop: 10, marginBottom: -20 },

  colunaCard: { flex: 1 },
  cardEvento: { backgroundColor: '#121824', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badgeModalidade: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bgPresencial: { backgroundColor: '#2E1A47' },
  bgOnline: { backgroundColor: '#1E293B' },
  textoBadgeModalidade: { color: '#C4B5FD', fontSize: 11, fontWeight: 'bold' },

  tituloEvento: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoTexto: { color: '#8F9CAE', fontSize: 13 },

  btnCalendar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#8B5CF6', paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  txtBtnCalendar: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 65, backgroundColor: '#090C10', borderTopWidth: 1, borderTopColor: '#1E293B', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { color: '#8F9CAE', fontSize: 11, marginTop: 4, textAlign: 'center' },
  tabActive: { color: '#8B5CF6', fontWeight: 'bold' }
});