import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importação das Telas
import TelaCriarEvento from './src/screens/TelaCriarEvento';
import TelaFavoritos from './src/screens/TelaFavoritos';
import TelaOnboarding from './src/screens/TelaOnboarding';
import TelaLogin from './src/screens/TelaLogin';
import TelaRecuperarSenha from './src/screens/TelaRecuperarSenha';
import TelaValidarCodigo from './src/screens/TelaValidarCodigo';
import TelaRedefinirSenha from './src/screens/TelaRedefinirSenha';
import TelaCadastro from './src/screens/TelaCadastro';
import TelaEventos from './src/screens/TelaEventos';
import TelaDetalhesEvento from './src/screens/TelaDetalhesEvento';
import TelaPerfil from './src/screens/TelaPerfil';
import TelaEditarPerfil from './src/screens/TelaEditarPerfil';
import TelaAgenda from './src/screens/TelaAgenda';
import TelaAdmin from './src/screens/TelaAdmin';
import TelaAlterarSenha from './src/screens/TelaAlterarSenha';
import TelaNotificacoes from './src/screens/TelaNotificacoes';

const API_BASE = 'https://geography-doorbell-yin.ngrok-free.dev/api';

export default function App() {
  const [telaAtual, setTelaAtual] = useState('Onboarding');
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [tipoUsuario, setTipoUsuario] = useState('aluno');
  
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [codigoValidado, setCodigoValidado] = useState('');

  const [listaEventos, setListaEventos] = useState([]);
  const [carregandoEventos, setCarregandoEventos] = useState(true);

  // ESTADO GLOBAL DE FAVORITOS E AGENDA
  const [favoritos, setFavoritos] = useState([]);
  const [agenda, setAgenda] = useState([]);

  // ESTADO GLOBAL DE NOTIFICAÇÕES
  const [notificacoesServidor, setNotificacoesServidor] = useState([]);
  const [notificacoesLocaisLidas, setNotificacoesLocaisLidas] = useState([]);

  const obterSufixoUsuario = (idParam) => {
    const id = idParam || usuarioLogado?.id_usuario;
    return id ? `_${id}` : '_convidado';
  };

  const toggleFavorito = async (idEvento) => {
    const idStr = String(idEvento);
    const chaveFav = `@GatherTech:favoritos${obterSufixoUsuario()}`;

    setFavoritos((prev) => {
      const ehFavorito = prev.includes(idStr);
      const novaLista = ehFavorito
        ? prev.filter((item) => item !== idStr)
        : [...prev, idStr];

      AsyncStorage.setItem(chaveFav, JSON.stringify(novaLista)).catch((e) =>
        console.error('Erro ao salvar favoritos:', e)
      );

      return novaLista;
    });
  };

  const toggleAgenda = async (idEvento) => {
    const idStr = String(idEvento);
    const chaveAgenda = `@GatherTech:agenda${obterSufixoUsuario()}`;

    setAgenda((prev) => {
      const estaNaAgenda = prev.includes(idStr);
      const novaLista = estaNaAgenda
        ? prev.filter((item) => item !== idStr)
        : [...prev, idStr];

      AsyncStorage.setItem(chaveAgenda, JSON.stringify(novaLista)).catch((e) =>
        console.error('Erro ao salvar agenda:', e)
      );

      return novaLista;
    });
  };

  const carregarDadosSalvos = async (idUsuarioParam) => {
    const sufixo = obterSufixoUsuario(idUsuarioParam);
    try {
      const favSalvos = await AsyncStorage.getItem(`@GatherTech:favoritos${sufixo}`);
      setFavoritos(favSalvos ? JSON.parse(favSalvos).map((id) => String(id)) : []);

      const agendaSalva = await AsyncStorage.getItem(`@GatherTech:agenda${sufixo}`);
      setAgenda(agendaSalva ? JSON.parse(agendaSalva).map((id) => String(id)) : []);

      const lidasSalvas = await AsyncStorage.getItem(`@GatherTech:notificacoesLidas${sufixo}`);
      setNotificacoesLocaisLidas(lidasSalvas ? JSON.parse(lidasSalvas) : []);
    } catch (e) {
      console.error('Erro ao carregar dados salvos:', e);
    }
  };

  const buscarNotificacoesDaAPI = async (idUsuarioParam) => {
    const idUser = idUsuarioParam || usuarioLogado?.id_usuario;
    if (!idUser) return;
    try {
      const res = await fetch(`${API_BASE}/usuarios/${idUser}/notificacoes`);
      if (res.ok) {
        const dados = await res.json();
        if (Array.isArray(dados)) {
          setNotificacoesServidor(dados);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar notificações:', e);
    }
  };

  const notificacoesProximidade = useMemo(() => {
    const alertas = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    (listaEventos || []).forEach((ev) => {
      const idStr = String(ev.id_evento || ev.id);
      const estaNaAgenda = (agenda || []).includes(idStr);
      const ehFavorito = (favoritos || []).includes(idStr);

      if (!estaNaAgenda && !ehFavorito) return;
      if (!ev.data_inicio) return;

      const dataLimpa = ev.data_inicio.split('T')[0];
      const partes = dataLimpa.split('-');
      if (partes.length !== 3) return;

      const [ano, mes, dia] = partes.map(Number);
      const dataEvento = new Date(ano, mes - 1, dia);
      const diffDias = Math.round((dataEvento - hoje) / (1000 * 60 * 60 * 24));

      if (diffDias >= 0 && diffDias <= 15) {
        const hora = ev.horario_inicio ? ev.horario_inicio.substring(0, 5) : '08:00';
        const tipo = estaNaAgenda ? 'proximo_agenda' : 'proximo_favorito';
        const idAlerta = `${tipo}_${idStr}_${dataLimpa}`;

        let tituloAlerta = '';
        let mensagemAlerta = '';

        if (diffDias === 0) {
          tituloAlerta = estaNaAgenda ? 'Seu evento inscrito é HOJE!' : 'Evento favoritado é HOJE!';
          mensagemAlerta = `"${ev.titulo}" começa hoje às ${hora}. Não se atrase!`;
        } else if (diffDias === 1) {
          tituloAlerta = estaNaAgenda ? 'É amanhã! Evento inscrito' : 'É amanhã! Evento favoritado';
          mensagemAlerta = `Falta 1 dia para "${ev.titulo}" (amanhã às ${hora}).`;
        } else {
          tituloAlerta = estaNaAgenda ? 'Evento inscrito se aproximando' : 'Evento favoritado em breve';
          mensagemAlerta = `Faltam ${diffDias} dias para "${ev.titulo}" (${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')} às ${hora}).`;
        }

        alertas.push({
          id: idAlerta,
          id_evento: idStr,
          nome_evento: ev.titulo,
          tipo,
          titulo: tituloAlerta,
          mensagem: mensagemAlerta,
          lida: notificacoesLocaisLidas.includes(idAlerta),
          data_criacao: new Date().toISOString(),
          ehLocal: true
        });
      }
    });

    return alertas;
  }, [listaEventos, agenda, favoritos, notificacoesLocaisLidas]);

  const todasNotificacoes = useMemo(() => {
    const daApiFormatadas = (notificacoesServidor || []).map((n) => ({
      ...n,
      id: `srv_${n.id_notificacao}`,
      ehLocal: false
    }));

    return [...notificacoesProximidade, ...daApiFormatadas].sort((a, b) => {
      if (a.lida !== b.lida) return a.lida ? 1 : -1;
      return new Date(b.data_criacao) - new Date(a.data_criacao);
    });
  }, [notificacoesProximidade, notificacoesServidor]);

  const qtdNotificacoesNaoLidas = useMemo(
    () => todasNotificacoes.filter((n) => !n.lida).length,
    [todasNotificacoes]
  );

  const marcarNotificacaoComoLida = async (notif) => {
    if (notif.ehLocal) {
      const chaveLidas = `@GatherTech:notificacoesLidas${obterSufixoUsuario()}`;
      setNotificacoesLocaisLidas((prev) => {
        if (prev.includes(notif.id)) return prev;
        const atualizadas = [...prev, notif.id];
        AsyncStorage.setItem(chaveLidas, JSON.stringify(atualizadas)).catch(() => {});
        return atualizadas;
      });
    } else if (notif.id_notificacao) {
      setNotificacoesServidor((prev) =>
        prev.map((item) =>
          item.id_notificacao === notif.id_notificacao ? { ...item, lida: true } : item
        )
      );
      try {
        await fetch(`${API_BASE}/notificacoes/${notif.id_notificacao}/ler`, { method: 'PUT' });
      } catch (e) {
        console.error('Erro ao marcar notificação como lida:', e);
      }
    }
  };

  const marcarTodasNotificacoesComoLidas = async () => {
    const idsLocais = notificacoesProximidade.map((n) => n.id);
    const chaveLidas = `@GatherTech:notificacoesLidas${obterSufixoUsuario()}`;
    setNotificacoesLocaisLidas((prev) => {
      const unicos = Array.from(new Set([...prev, ...idsLocais]));
      AsyncStorage.setItem(chaveLidas, JSON.stringify(unicos)).catch(() => {});
      return unicos;
    });

    setNotificacoesServidor((prev) => prev.map((item) => ({ ...item, lida: true })));

    if (usuarioLogado?.id_usuario) {
      try {
        await fetch(`${API_BASE}/usuarios/${usuarioLogado.id_usuario}/notificacoes/ler-todas`, {
          method: 'PUT'
        });
      } catch (e) {
        console.error('Erro ao marcar todas como lidas:', e);
      }
    }
  };

  const buscarEventosDaAPI = async (silencioso = false) => {
    try {
      if (!silencioso) setCarregandoEventos(true);
      const resposta = await fetch(`${API_BASE}/eventos`);
      const dados = await resposta.json();

      if (Array.isArray(dados)) {
        const eventosDaApi = dados.map((item) => {
          let dataExibicao = 'A definir';
          if (item.data_inicio) {
            const dataLimpa = item.data_inicio.split('T')[0];
            const partes = dataLimpa.split('-');
            if (partes.length === 3) {
              const [ano, mes, dia] = partes;
              const horaMin = item.horario_inicio ? item.horario_inicio.substring(0, 5) : '08:00';
              dataExibicao = `${dia}/${mes}/${ano} · ${horaMin}`;
            }
          }

          let galeriaParseada = [item.imagem];
          try {
            if (item.galeria_imagens) {
              galeriaParseada = JSON.parse(item.galeria_imagens);
            }
          } catch (e) {
            galeriaParseada = [item.imagem];
          }

          const mediaFormatada = parseFloat(item.media_avaliacao || 0);
          const avaliacaoExibicao = mediaFormatada > 0 ? mediaFormatada.toFixed(1) : 'S/A';

          return {
            id: item.id_evento?.toString(),
            id_evento: item.id_evento?.toString(),
            titulo: item.nome_evento,
            nome_evento: item.nome_evento,
            nome_produtor: item.nome_produtor,
            link_oficial: item.link_oficial,
            descricao: item.descricao_evento,
            descricao_evento: item.descricao_evento,
            imagem: item.imagem,
            galeria_imagens: galeriaParseada,
            preco: item.tipo_ingresso,
            tipo_ingresso: item.tipo_ingresso,
            formato: item.modalidade,
            modalidade: item.modalidade,
            data: dataExibicao,
            data_inicio: item.data_inicio,
            horario_inicio: item.horario_inicio,
            data_fim: item.data_fim,
            horario_fim: item.horario_fim,
            cidade: item.cidade || 'Salvador',
            estado: item.estado,
            tech: item.tech,
            local: item.rua_numero || item.plataforma_online,
            link_inscricao: item.link_inscricao || item.link,
            avaliacao: avaliacaoExibicao
          };
        });

        setListaEventos(eventosDaApi);

        if (eventoSelecionado?.id_evento) {
          const atualizado = eventosDaApi.find(
            (e) => String(e.id_evento) === String(eventoSelecionado.id_evento)
          );
          if (atualizado) setEventoSelecionado(atualizado);
        }

        return eventosDaApi;
      }
      return [];
    } catch (erro) {
      console.error('Erro ao conectar à API:', erro);
      return [];
    } finally {
      if (!silencioso) setCarregandoEventos(false);
    }
  };

  const recarregarDadosGlobais = async () => {
    await Promise.all([
      buscarEventosDaAPI(true),
      buscarNotificacoesDaAPI(),
      carregarDadosSalvos()
    ]);
  };

  useEffect(() => {
    buscarEventosDaAPI();
  }, []);

  if (telaAtual === 'Onboarding') {
    return <SafeAreaProvider><TelaOnboarding aoContinuar={() => setTelaAtual('Login')} /></SafeAreaProvider>;
  }
  
  if (telaAtual === 'Login') {
    return (
      <SafeAreaProvider>
        <TelaLogin 
          aoEntrar={async (usuario) => {
            setUsuarioLogado(usuario);
            setTipoUsuario(usuario?.tipo_usuario || 'aluno');
            await carregarDadosSalvos(usuario?.id_usuario);
            buscarNotificacoesDaAPI(usuario?.id_usuario);
            setTelaAtual('Feed');
          }} 
          irParaCadastro={() => setTelaAtual('Cadastro')} 
          irParaRecuperarSenha={() => setTelaAtual('RecuperarSenha')} 
        />
      </SafeAreaProvider>
    );
  }

  if (telaAtual === 'RecuperarSenha') {
    return <SafeAreaProvider><TelaRecuperarSenha aoVoltar={() => setTelaAtual('Login')} aoAvancar={(email) => { setEmailRecuperacao(email); setTelaAtual('ValidarCodigo'); }} /></SafeAreaProvider>;
  }
  
  if (telaAtual === 'ValidarCodigo') {
    return <SafeAreaProvider><TelaValidarCodigo email={emailRecuperacao} aoVoltar={() => setTelaAtual('RecuperarSenha')} aoSucesso={(codigo) => { setCodigoValidado(codigo); setTelaAtual('RedefinirSenha'); }} /></SafeAreaProvider>;
  }
  
  if (telaAtual === 'RedefinirSenha') {
    return <SafeAreaProvider><TelaRedefinirSenha email={emailRecuperacao} codigo={codigoValidado} aoConcluir={() => { setEmailRecuperacao(''); setCodigoValidado(''); setTelaAtual('Login'); }} /></SafeAreaProvider>;
  }
  
  if (telaAtual === 'Cadastro') {
    return <SafeAreaProvider><TelaCadastro aoVoltar={() => setTelaAtual('Login')} /></SafeAreaProvider>;
  }

  if (telaAtual === 'Notificacoes') {
    return (
      <SafeAreaProvider>
        <TelaNotificacoes
          notificacoes={todasNotificacoes}
          aoVoltar={() => {
            buscarNotificacoesDaAPI();
            setTelaAtual('Feed');
          }}
          aoMarcarComoLida={marcarNotificacaoComoLida}
          aoMarcarTodasComoLidas={marcarTodasNotificacoesComoLidas}
          aoAtualizar={recarregarDadosGlobais}
          aoSelecionarNotificacao={(notif) => {
            if (notif.id_evento) {
              const eventoAlvo = listaEventos.find(
                (ev) => String(ev.id_evento || ev.id) === String(notif.id_evento)
              );
              if (eventoAlvo) {
                setEventoSelecionado(eventoAlvo);
                setTelaAtual('Detalhes');
              }
            }
          }}
        />
      </SafeAreaProvider>
    );
  }
  
  if (telaAtual === 'Detalhes' && eventoSelecionado) {
    return (
      <SafeAreaProvider>
        <TelaDetalhesEvento 
          evento={eventoSelecionado} 
          usuarioLogado={usuarioLogado} 
          agenda={agenda}
          toggleAgenda={toggleAgenda}
          aoAtualizar={recarregarDadosGlobais}
          aoVoltar={async () => {
            await buscarEventosDaAPI(true);
            await buscarNotificacoesDaAPI();
            setTelaAtual('Feed');
          }} 
        />
      </SafeAreaProvider>
    );
  }

  if (telaAtual === 'Perfil') {
    return (
      <SafeAreaProvider>
        <TelaPerfil 
          usuario={usuarioLogado}
          eventos={listaEventos}
          favoritos={favoritos}
          agenda={agenda}
          aoAtualizar={recarregarDadosGlobais}
          aoSair={() => { 
            setUsuarioLogado(null); 
            setTipoUsuario('aluno'); 
            setFavoritos([]);
            setAgenda([]);
            setNotificacoesLocaisLidas([]);
            setNotificacoesServidor([]); 
            setTelaAtual('Login'); 
          }} 
          irParaAdmin={() => setTelaAtual('Admin')}
          irParaInicio={() => setTelaAtual('Feed')} 
          irParaFavoritos={() => setTelaAtual('Favoritos')}
          irParaAgenda={() => setTelaAtual('Agenda')}
          irParaEditarPerfil={() => setTelaAtual('EditarPerfil')}
          irParaAlterarSenha={() => setTelaAtual('AlterarSenha')}
          aoAtualizarFoto={(novaFoto) => {
            if (usuarioLogado) {
              setUsuarioLogado({ ...usuarioLogado, foto_perfil: novaFoto });
            }
          }}
        />
      </SafeAreaProvider>
    );
  }

  if (telaAtual === 'EditarPerfil') {
    return <SafeAreaProvider><TelaEditarPerfil usuario={usuarioLogado} aoVoltar={() => setTelaAtual('Perfil')} aoSalvarSucesso={(u) => { setUsuarioLogado({ ...u, foto_perfil: u?.foto_perfil || usuarioLogado?.foto_perfil }); setTelaAtual('Perfil'); }} /></SafeAreaProvider>;
  }

  if (telaAtual === 'AlterarSenha') {
    return <SafeAreaProvider><TelaAlterarSenha usuario={usuarioLogado} aoVoltar={() => setTelaAtual('Perfil')} /></SafeAreaProvider>;
  }

  if (telaAtual === 'Admin') {
    return (
      <SafeAreaProvider>
        <TelaAdmin 
          irParaCriarEvento={() => {
            setEventoSelecionado(null);
            setTelaAtual('CriarEvento');
          }} 
          irParaEditarEvento={(evento) => {
            setEventoSelecionado(evento);
            setTelaAtual('CriarEvento');
          }} 
          irParaVoltar={() => {
            buscarEventosDaAPI(true);
            setTelaAtual('Perfil');
          }} 
        />
      </SafeAreaProvider>
    );
  }
  
  if (telaAtual === 'Favoritos') {
    return (
      <SafeAreaProvider>
        <TelaFavoritos 
          eventos={listaEventos}
          favoritos={favoritos}
          toggleFavorito={toggleFavorito}
          aoAtualizar={recarregarDadosGlobais}
          aoSelecionarEvento={(evento) => { setEventoSelecionado(evento); setTelaAtual('Detalhes'); }}
          irParaInicio={() => setTelaAtual('Feed')} 
          irParaAgenda={() => setTelaAtual('Agenda')} 
          irParaPerfil={() => setTelaAtual('Perfil')} 
        />
      </SafeAreaProvider>
    );
  }
  
  if (telaAtual === 'Agenda') {
    return (
      <SafeAreaProvider>
        <TelaAgenda 
          eventos={listaEventos}
          agenda={agenda}
          toggleAgenda={toggleAgenda}
          aoAtualizar={recarregarDadosGlobais}
          aoSelecionarEvento={(evento) => { setEventoSelecionado(evento); setTelaAtual('Detalhes'); }}
          irParaInicio={() => setTelaAtual('Feed')} 
          irParaFavoritos={() => setTelaAtual('Favoritos')} 
          irParaPerfil={() => setTelaAtual('Perfil')} 
        />
      </SafeAreaProvider>
    );
  }

  if (telaAtual === 'CriarEvento') {
    const modoEdicao = Boolean(eventoSelecionado?.id_evento);

    return (
      <SafeAreaProvider>
        <TelaCriarEvento 
          eventoParaEditar={eventoSelecionado}
          aoVoltar={() => {
            setEventoSelecionado(null);
            setTelaAtual(modoEdicao ? 'Admin' : 'Feed');
          }} 
          aoSalvar={async (dadosEvento) => { 
            try {
              const url = modoEdicao 
                ? `${API_BASE}/eventos/${eventoSelecionado.id_evento}` 
                : `${API_BASE}/eventos`;
              const metodo = modoEdicao ? 'PUT' : 'POST';

              await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosEvento)
              });
              
              await buscarEventosDaAPI(true); 
              await buscarNotificacoesDaAPI();
            } catch (error) {
              console.error('Erro ao salvar o evento na API:', error);
            }
            
            setEventoSelecionado(null);
            setTelaAtual(modoEdicao ? 'Admin' : 'Feed'); 
          }} 
        />
      </SafeAreaProvider>
    );
  }

  if (carregandoEventos && telaAtual === 'Feed') {
    return (
      <SafeAreaProvider style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>A carregar eventos do servidor...</Text>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <TelaEventos 
        tipoUsuario={tipoUsuario}
        eventos={listaEventos} 
        usuarioLogado={usuarioLogado}
        favoritos={favoritos}
        toggleFavorito={toggleFavorito}
        qtdNotificacoes={qtdNotificacoesNaoLidas}
        aoAtualizar={recarregarDadosGlobais}
        irParaNotificacoes={() => {
          buscarNotificacoesDaAPI();
          setTelaAtual('Notificacoes');
        }}
        irParaCriarEvento={() => {
          setEventoSelecionado(null);
          setTelaAtual('CriarEvento');
        }}
        aoSelecionarEvento={(evento) => {
          setEventoSelecionado(evento);
          setTelaAtual('Detalhes');
        }} 
        irParaPerfil={() => setTelaAtual('Perfil')}
        irParaFavoritos={() => setTelaAtual('Favoritos')}
        irParaAgenda={() => setTelaAtual('Agenda')}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#090C10', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8F9CAE', marginTop: 12, fontSize: 14 }
});