import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons'; 

export default function TelaFavoritos({ 
  eventos = [], 
  favoritos = [], 
  toggleFavorito,
  aoAtualizar,
  aoSelecionarEvento,
  irParaInicio, 
  irParaAgenda, 
  irParaPerfil 
}) {
  const [atualizando, setAtualizando] = useState(false);

  const onRefresh = async () => {
    if (!aoAtualizar) return;
    setAtualizando(true);
    await aoAtualizar();
    setAtualizando(false);
  };

  const idsFavoritosString = (favoritos || []).map(id => String(id));

  // Filtra os eventos da API cujos IDs estão na lista global de favoritos
  const eventosFavoritados = (eventos || []).filter((item) => {
    const idEv = String(item.id_evento || item.id);
    return idsFavoritosString.includes(idEv);
  });

  return (
    <SafeAreaView style={styles.container}>
      
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Favoritos ({eventosFavoritados.length})</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
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
        
        {eventosFavoritados.length === 0 ? (
          /* ESTADO VAZIO */
          <View style={styles.emptyState}>
            <View style={styles.iconBgVazio}>
              <Ionicons name="heart-dislike-outline" size={48} color="#8F9CAE" />
            </View>
            <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
            <Text style={styles.emptyDesc}>Os eventos que você marcar com o coração aparecerão aqui para acesso rápido.</Text>
            
            <TouchableOpacity style={styles.btnExplorar} onPress={irParaInicio}>
              <Text style={styles.textoBtnExplorar}>Explorar Eventos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* LISTA DE FAVORITOS */
          <View style={styles.listaCards}>
            {eventosFavoritados.map((item) => {
              const idCard = String(item.id_evento || item.id);
              const formatoModalidade = item.formato || item.modalidade || 'Presencial';

              return (
                <TouchableOpacity 
                  key={idCard} 
                  style={styles.cardEvento} 
                  activeOpacity={0.85}
                  onPress={() => aoSelecionarEvento && aoSelecionarEvento(item)}
                >
                  <View style={styles.boxImagemCard}>
                    <Image source={{ uri: item.imagem || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600' }} style={styles.imgCard} />
                    <View style={[styles.badgeModalidade, formatoModalidade === 'Presencial' ? styles.bgPresencial : styles.bgOnline]}>
                      <Text style={styles.textoBadgeModalidade}>{formatoModalidade}</Text>
                    </View>
                  </View>

                  <View style={styles.infoCard}>
                    <View style={styles.topCardInfo}>
                      <Text style={styles.tituloEventoCard} numberOfLines={2}>{item.nome_evento || item.titulo}</Text>
                      <TouchableOpacity 
                        onPress={() => toggleFavorito && toggleFavorito(idCard)} 
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="heart" size={22} color="#8B5CF6" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.rowSubInfo}>
                      <Feather name="map-pin" size={12} color="#8F9CAE" />
                      <Text style={styles.subInfoCard}>{item.cidade || item.local || 'Salvador'}</Text>
                    </View>
                    <View style={styles.rowSubInfo}>
                      <Feather name="calendar" size={12} color="#8F9CAE" />
                      <Text style={styles.subInfoCard}>{item.data || 'Em breve'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MENU INFERIOR FIXO */}
      <View style={styles.menuInferior}>
        <TouchableOpacity style={styles.menuItem} onPress={irParaInicio}>
          <Ionicons name="home-outline" size={24} color="#8F9CAE" />
          <Text style={styles.menuTexto}>Início</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="heart" size={24} color="#8B5CF6" />
          <Text style={[styles.menuTexto, { color: '#8B5CF6' }]}>Favoritos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={irParaAgenda}>
          <Feather name="calendar" size={24} color="#8F9CAE" />
          <Text style={styles.menuTexto}>Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={irParaPerfil}>
          <Feather name="user" size={24} color="#8F9CAE" />
          <Text style={styles.menuTexto}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090C10' },
  header: { alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E2430', marginBottom: 16 },
  headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: 40 },
  iconBgVazio: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#121620', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#1E2430' },
  emptyTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  emptyDesc: { color: '#8F9CAE', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  btnExplorar: { backgroundColor: '#8B5CF6', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  textoBtnExplorar: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  listaCards: { gap: 16, paddingHorizontal: 20 },
  cardEvento: { flexDirection: 'row', backgroundColor: '#121620', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#1E2430' },
  boxImagemCard: { position: 'relative', width: 110, height: 100, borderRadius: 12, overflow: 'hidden' },
  imgCard: { width: '100%', height: '100%' },
  badgeModalidade: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgPresencial: { backgroundColor: '#7C3AED' },
  bgOnline: { backgroundColor: '#2563EB' },
  textoBadgeModalidade: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  infoCard: { flex: 1, marginLeft: 14, justifyContent: 'space-between', paddingVertical: 2 },
  topCardInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  tituloEventoCard: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8, lineHeight: 20 },
  rowSubInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  subInfoCard: { color: '#94A3B8', fontSize: 13 },
  menuInferior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#090C10', paddingVertical: 12, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: '#1E2430' },
  menuItem: { alignItems: 'center', justifyContent: 'center' },
  menuTexto: { fontSize: 11, marginTop: 4, color: '#8F9CAE', fontWeight: '500' }
});