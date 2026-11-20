/**
 * @file TelaCriarEvento.js
 * @description Tela administrativa para criação e edição de eventos no GatherTech.
 * Inclui seleção em cascata (Área -> múltiplas Tecnologias), cadastro dinâmico de novas
 * áreas/tecnologias, upload múltiplo de imagens em Base64 e preenchimento automático de endereço via ViaCEP/IBGE.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, Alert, Modal, FlatList, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  CATALOGO_TECH_INICIAL,
  carregarCatalogoCompleto,
  salvarItemNoCatalogo,
  formatarAreaETechs,
  extrairAreaETechs,
  mesclarCatalogos
} from './catalogoTech';

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const PLATAFORMAS_ONLINE = [
  'Google Meet', 'Microsoft Teams', 'Zoom', 'YouTube Live', 'Twitch', 'Outro'
];

const IMAGEM_PADRAO = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600';

/**
 * Converte data ISO ("2026-11-24T00:00:00.000Z") e horário ("14:00:00")
 * para o formato brasileiro exibido no formulário ("24/11/2026 14:00").
 */
const formatarDataHoraParaInput = (dataIso, horaStr) => {
  if (!dataIso) return '';
  const dataLimpa = String(dataIso).split('T')[0];
  const partes = dataLimpa.split('-');
  if (partes.length !== 3) return '';
  const dataBR = `${partes[2]}/${partes[1]}/${partes[0]}`;
  const horaLimpa = horaStr ? String(horaStr).substring(0, 5) : '08:00';
  return `${dataBR} ${horaLimpa}`;
};

export default function TelaCriarEvento({ eventoParaEditar, eventos = [], aoVoltar, aoSalvar }) {
  // Identifica se a tela foi aberta para editar um evento existente ou criar um novo
  const modoEdicao = Boolean(eventoParaEditar?.id_evento || eventoParaEditar?.id);

  // Estados dos dados principais do evento
  const [titulo, setTitulo] = useState('');
  const [nomeProdutor, setNomeProdutor] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [galeriaImagens, setGaleriaImagens] = useState([IMAGEM_PADRAO]);

  // Estados de categorização, formato e ingresso
  const [descricao, setDescricao] = useState('');
  const [formato, setFormato] = useState('Presencial');
  const [precoTipo, setPrecoTipo] = useState('Gratuito');
  const [precoValor, setPrecoValor] = useState('');

  // Estados do seletor em cascata: Área de Atuação -> Tecnologias relacionadas
  const [catalogo, setCatalogo] = useState(CATALOGO_TECH_INICIAL);
  const [areaSelecionada, setAreaSelecionada] = useState('');
  const [techsSelecionadas, setTechsSelecionadas] = useState([]);
  const [buscaArea, setBuscaArea] = useState('');

  // Estados dos modais de inclusão dinâmica de nova Área e nova Tecnologia
  const [modalNovaAreaVisible, setModalNovaAreaVisible] = useState(false);
  const [novaAreaNome, setNovaAreaNome] = useState('');
  const [novaAreaTechsTexto, setNovaAreaTechsTexto] = useState('');

  const [modalNovaTechVisible, setModalNovaTechVisible] = useState(false);
  const [novaTechTexto, setNovaTechTexto] = useState('');

  // Estados de localização (eventos presenciais)
  const [cep, setCep] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [ruaNumero, setRuaNumero] = useState('');
  const [cidadesDoEstado, setCidadesDoEstado] = useState([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  // Estados de transmissão (eventos online) e link de inscrição
  const [plataforma, setPlataforma] = useState('Google Meet');
  const [plataformaOutro, setPlataformaOutro] = useState('');
  const [linkEvento, setLinkEvento] = useState('');
  const [linkOficial, setLinkOficial] = useState(''); 

  // Controle de visibilidade dos modais de seleção e estado de envio
  const [modalEstadoVisible, setModalEstadoVisible] = useState(false);
  const [modalCidadeVisible, setModalCidadeVisible] = useState(false);
  const [modalAreaVisible, setModalAreaVisible] = useState(false);
  const [modalPlataformaVisible, setModalPlataformaVisible] = useState(false);
  const [carregandoSubmit, setCarregandoSubmit] = useState(false);

  // Carrega o catálogo unificado (padrão + itens customizados salvos) ao montar a tela
  useEffect(() => {
    let ativo = true;
    carregarCatalogoCompleto(eventos).then((cat) => {
      if (ativo) setCatalogo(cat);
    });
    return () => { ativo = false; };
  }, [eventos]);

  // Filtra a lista de áreas conforme o termo digitado na busca do modal
  const areasDisponiveis = useMemo(() => {
    const todas = Object.keys(catalogo);
    if (!buscaArea.trim()) return todas;
    return todas.filter(a => a.toLowerCase().includes(buscaArea.toLowerCase()));
  }, [catalogo, buscaArea]);

  // Retorna as tecnologias vinculadas à Área selecionada no momento
  const tecnologiasDaAreaAtual = useMemo(() => {
    if (!areaSelecionada) return [];
    const base = catalogo[areaSelecionada] || [];
    const uniao = [...base];
    techsSelecionadas.forEach(t => {
      if (!uniao.some(item => item.toLowerCase() === t.toLowerCase())) {
        uniao.push(t);
      }
    });
    return uniao;
  }, [catalogo, areaSelecionada, techsSelecionadas]);

  /**
   * Consulta a API pública do IBGE para listar os municípios da UF selecionada.
   */
  const carregarCidadesPorEstado = async (uf) => {
    if (!uf) return;
    setCarregandoCidades(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      const dados = await res.json();
      setCidadesDoEstado(dados.map(c => c.nome).sort());
    } catch (err) {
      console.error('Erro ao buscar cidades:', err);
    } finally {
      setCarregandoCidades(false);
    }
  };

  // Preenche todos os campos do formulário quando a tela é aberta em modo de edição
  useEffect(() => {
    if (!eventoParaEditar) return;

    setTitulo(eventoParaEditar.nome_evento || eventoParaEditar.titulo || '');
    setNomeProdutor(eventoParaEditar.nome_produtor || '');
    setDataInicio(formatarDataHoraParaInput(eventoParaEditar.data_inicio, eventoParaEditar.horario_inicio));
    setDataFim(
      eventoParaEditar.data_fim
        ? formatarDataHoraParaInput(eventoParaEditar.data_fim, eventoParaEditar.horario_fim || '23:59')
        : ''
    );

    // Restaura a galeria de imagens (capa + fotos adicionais)
    let imgs = [eventoParaEditar.imagem || IMAGEM_PADRAO];
    if (eventoParaEditar.galeria_imagens) {
      try {
        const parsed = typeof eventoParaEditar.galeria_imagens === 'string'
          ? JSON.parse(eventoParaEditar.galeria_imagens)
          : eventoParaEditar.galeria_imagens;
        if (Array.isArray(parsed) && parsed.length > 0) {
          imgs = parsed;
        }
      } catch (e) {
        imgs = [eventoParaEditar.imagem || IMAGEM_PADRAO];
      }
    }
    setGaleriaImagens(imgs);

    setDescricao(eventoParaEditar.descricao_evento || eventoParaEditar.descricao || '');
    setFormato(eventoParaEditar.modalidade || eventoParaEditar.formato || 'Presencial');

    // Desserializa a string `tech` para preencher a Área e os chips de Tecnologias
    const { area, tecnologias } = extrairAreaETechs(eventoParaEditar.tech, catalogo);
    if (area) {
      setAreaSelecionada(area);
      setTechsSelecionadas(tecnologias);
      setCatalogo(prev => mesclarCatalogos(prev, { [area]: tecnologias }));
    } else if (tecnologias.length > 0) {
      setAreaSelecionada('Outros / Geral');
      setTechsSelecionadas(tecnologias);
      setCatalogo(prev => mesclarCatalogos(prev, { 'Outros / Geral': tecnologias }));
    } else {
      setAreaSelecionada('');
      setTechsSelecionadas([]);
    }

    // Configura tipo e valor do ingresso
    const precoRaw = String(eventoParaEditar.tipo_ingresso || eventoParaEditar.preco || 'Gratuito');
    if (precoRaw.toLowerCase().includes('gratuit')) {
      setPrecoTipo('Gratuito');
      setPrecoValor('');
    } else {
      setPrecoTipo('Pago');
      setPrecoValor(precoRaw.replace(/^R\$\s*/i, '').trim());
    }

    // Preenche endereço presencial
    setCep(eventoParaEditar.cep || '');
    const ufSalva = eventoParaEditar.estado || '';
    setEstado(ufSalva);
    if (ufSalva) {
      carregarCidadesPorEstado(ufSalva);
    }
    setCidade(eventoParaEditar.cidade === 'Online' ? '' : (eventoParaEditar.cidade || ''));
    setBairro(eventoParaEditar.bairro || '');
    setRuaNumero(eventoParaEditar.rua_numero || '');

    // Preenche dados de transmissão online e link oficial
    const platSalva = eventoParaEditar.plataforma_online || '';
    if (platSalva) {
      if (PLATAFORMAS_ONLINE.includes(platSalva)) {
        setPlataforma(platSalva);
        setPlataformaOutro('');
      } else {
        setPlataforma('Outro');
        setPlataformaOutro(platSalva);
      }
    } else {
      setPlataforma('Google Meet');
      setPlataformaOutro('');
    }

    setLinkEvento(eventoParaEditar.url_inscricao || eventoParaEditar.link_inscricao || '');
    setLinkOficial(eventoParaEditar.link_oficial || '');
  }, [eventoParaEditar]);

  /**
   * Atualiza a Área selecionada e limpa as tecnologias anteriores
   * para evitar inconsistência entre áreas diferentes.
   */
  const selecionarArea = (area) => {
    if (area !== areaSelecionada) {
      setAreaSelecionada(area);
      setTechsSelecionadas([]);
    }
    setBuscaArea('');
    setModalAreaVisible(false);
  };

  /**
   * Alterna a seleção múltipla (marca/desmarca) de uma tecnologia dentro da área atual.
   */
  const toggleTecnologia = (tech) => {
    setTechsSelecionadas((prev) => {
      const existe = prev.some(t => t.toLowerCase() === tech.toLowerCase());
      if (existe) {
        return prev.filter(t => t.toLowerCase() !== tech.toLowerCase());
      }
      return [...prev, tech];
    });
  };

  /**
   * Cadastra uma nova Área de Atuação junto com suas tecnologias iniciais,
   * salvando no catálogo persistente e selecionando-as automaticamente.
   */
  const handleConfirmarNovaArea = async () => {
    const nomeLimpo = novaAreaNome.trim();
    if (!nomeLimpo) {
      Alert.alert('Atenção', 'Digite o nome da nova área.');
      return;
    }

    const listaTechs = novaAreaTechsTexto
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const areaExistente = Object.keys(catalogo).find(
      a => a.toLowerCase() === nomeLimpo.toLowerCase()
    );
    const nomeFinalArea = areaExistente || nomeLimpo;

    setCatalogo(prev => mesclarCatalogos(prev, { [nomeFinalArea]: listaTechs }));
    await salvarItemNoCatalogo(nomeFinalArea, listaTechs);

    setAreaSelecionada(nomeFinalArea);
    setTechsSelecionadas(listaTechs);
    setNovaAreaNome('');
    setNovaAreaTechsTexto('');
    setModalNovaAreaVisible(false);
  };

  /**
   * Adiciona uma ou mais tecnologias customizadas à Área atualmente selecionada.
   */
  const handleConfirmarNovaTech = async () => {
    if (!areaSelecionada) return;
    const novas = novaTechTexto
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (novas.length === 0) {
      Alert.alert('Atenção', 'Digite o nome da tecnologia.');
      return;
    }

    setCatalogo(prev => mesclarCatalogos(prev, { [areaSelecionada]: novas }));
    await salvarItemNoCatalogo(areaSelecionada, novas);

    setTechsSelecionadas(prev => {
      const atualizado = [...prev];
      novas.forEach(n => {
        if (!atualizado.some(t => t.toLowerCase() === n.toLowerCase())) {
          atualizado.push(n);
        }
      });
      return atualizado;
    });

    setNovaTechTexto('');
    setModalNovaTechVisible(false);
  };

  /**
   * Aplica máscara dinâmica no formato "DD/MM/AAAA HH:MM" durante a digitação.
   */
  const aplicarMascaraData = (text) => {
    const limpo = text.replace(/\D/g, '');
    let formatado = limpo;
    if (limpo.length > 2) formatado = `${limpo.slice(0, 2)}/${limpo.slice(2)}`;
    if (limpo.length > 4) formatado = `${limpo.slice(0, 2)}/${limpo.slice(2, 4)}/${limpo.slice(4)}`;
    if (limpo.length > 8) formatado = `${limpo.slice(0, 2)}/${limpo.slice(2, 4)}/${limpo.slice(4, 8)} ${limpo.slice(8)}`;
    if (limpo.length > 10) formatado = `${limpo.slice(0, 2)}/${limpo.slice(2, 4)}/${limpo.slice(4, 8)} ${limpo.slice(8, 10)}:${limpo.slice(10, 12)}`;
    return formatado.slice(0, 16);
  };

  /**
   * Formata o CEP e consulta automaticamente o endereço completo via API ViaCEP
   * ao atingir 8 dígitos numéricos.
   */
  const handleCepChange = async (text) => {
    const limpo = text.replace(/\D/g, '');
    let cepFormatado = limpo;
    if (limpo.length > 5) cepFormatado = `${limpo.slice(0, 5)}-${limpo.slice(5, 8)}`;
    setCep(cepFormatado.slice(0, 9));

    if (limpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setEstado(data.uf);
          setCidade(data.localidade);
          setBairro(data.bairro);
          setRuaNumero(data.logradouro);
          carregarCidadesPorEstado(data.uf);
        } else {
          Alert.alert('CEP Não Encontrado', 'Verifique o número do CEP digitado.');
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      }
    }
  };

  /**
   * Abre a galeria do dispositivo para seleção múltipla de fotos e converte
   * as imagens selecionadas para Data URI (Base64) para envio à API.
   */
  const selecionarImagens = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão Necessária', 'Permita o acesso à galeria do telemóvel.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.5,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
      const imagensConvertidas = resultado.assets.map((asset) => {
        if (asset.base64) {
          const mime = asset.mimeType || 'image/jpeg';
          return `data:${mime};base64,${asset.base64}`;
        }
        return asset.uri;
      });
      setGaleriaImagens(imagensConvertidas);
    }
  };

  /**
   * Valida os campos obrigatórios, converte datas para o padrão ISO do banco (AAAA-MM-DD)
   * e dispara o callback `aoSalvar` com o objeto completo do evento.
   */
  const handlePublicar = async () => {
    if (!titulo.trim() || !dataInicio.trim() || !linkOficial.trim() || !nomeProdutor.trim()) { 
      Alert.alert('Atenção', 'Preencha o Título, Produtor, Data/Horário de Início e o Link Oficial.');
      return;
    }
    if (!areaSelecionada) {
      Alert.alert('Atenção', 'Selecione a Área de Atuação do evento.');
      return;
    }
    if (formato === 'Presencial' && (!cidade.trim() || !estado.trim())) {
      Alert.alert('Atenção', 'Informe o Estado e a Cidade do evento presencial.');
      return;
    }
    if (formato === 'Online' && !linkEvento.trim()) {
      Alert.alert('Atenção', 'Informe o link de acesso para o evento online.');
      return;
    }

    setCarregandoSubmit(true);

    // Separa a string "DD/MM/AAAA HH:MM" em data ISO ("AAAA-MM-DD") e hora ("HH:MM:00")
    const extrairDataEHora = (stringDataHora) => {
      if (!stringDataHora || stringDataHora.length < 16) return { data: null, hora: null };
      const partes = stringDataHora.split(' '); 
      const dataInvertida = partes[0].split('/').reverse().join('-'); 
      return { data: dataInvertida, hora: partes[1] + ':00' }; 
    };

    const formatadoInicio = extrairDataEHora(dataInicio);
    const formatadoFim = extrairDataEHora(dataFim);

    const dadosEvento = {
      id: eventoParaEditar?.id_evento || eventoParaEditar?.id || Date.now().toString(),
      titulo: titulo.trim(),
      nome_produtor: nomeProdutor.trim(),
      data_inicio: formatadoInicio.data || dataInicio,
      horario_inicio: formatadoInicio.hora || '08:00:00',
      data_fim: formatadoFim.data || null,
      horario_fim: formatadoFim.hora || null,
      imagem: galeriaImagens[0],
      galeria_imagens: JSON.stringify(galeriaImagens),
      formato: formato,
      preco: precoTipo === 'Pago' ? `R$ ${precoValor || '0,00'}` : 'Gratuito',
      descricao: descricao.trim(),
      tech: formatarAreaETechs(areaSelecionada, techsSelecionadas),
      cep: formato === 'Presencial' ? cep : null,
      estado: formato === 'Presencial' ? estado : null,
      cidade: formato === 'Presencial' ? cidade : 'Online',
      bairro: formato === 'Presencial' ? bairro : null,
      rua_numero: formato === 'Presencial' ? ruaNumero : null,
      plataforma_online: formato === 'Online' ? (plataforma === 'Outro' ? plataformaOutro : plataforma) : null,
      url_inscricao: formato === 'Online' ? linkEvento : '',
      link_oficial: linkOficial.trim() 
    };

    if (aoSalvar) await aoSalvar(dadosEvento);
    setCarregandoSubmit(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho da tela */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnVoltar} onPress={aoVoltar}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.tituloHeader}>{modoEdicao ? 'Editar Evento' : 'Novo Evento'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Seleção de capa e galeria de imagens */}
        <Text style={styles.label}>Imagens do Evento ({galeriaImagens.length} selecionada(s))</Text>
        <TouchableOpacity style={styles.capaContainer} onPress={selecionarImagens} activeOpacity={0.8}>
          <Image source={{ uri: galeriaImagens[0] }} style={styles.imagemCapa} />
          <View style={styles.capaOverlay}>
            <Feather name="image" size={24} color="#FFFFFF" />
            <Text style={styles.textoTrocarCapa}>Selecionar Fotos (A 1ª será a Capa)</Text>
          </View>
        </TouchableOpacity>

        {/* Campos básicos de identificação e datas */}
        <Text style={styles.label}>Título do Evento *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Workshop de Redes Huawei e Zabbix"
          placeholderTextColor="#475569"
          value={titulo}
          onChangeText={setTitulo}
        />

        <Text style={styles.label}>Data e Horário de Início (DD/MM/AAAA HH:MM) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 24/11/2026 14:00"
          placeholderTextColor="#475569"
          keyboardType="numeric"
          maxLength={16}
          value={dataInicio}
          onChangeText={(t) => setDataInicio(aplicarMascaraData(t))}
        />

        <Text style={styles.label}>Data e Horário de Término (DD/MM/AAAA HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 24/11/2026 18:00"
          placeholderTextColor="#475569"
          keyboardType="numeric"
          maxLength={16}
          value={dataFim}
          onChangeText={(t) => setDataFim(aplicarMascaraData(t))}
        />

        {/* Seletor de Área de Atuação com botão para criação dinâmica */}
        <View style={styles.labelComBotaoRow}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Área de Atuação *</Text>
          <TouchableOpacity
            style={styles.btnMiniAdd}
            onPress={() => setModalNovaAreaVisible(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.txtBtnMiniAdd}>Adicionar Área</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.selectInput} onPress={() => setModalAreaVisible(true)}>
          <Text style={areaSelecionada ? styles.selectText : styles.placeholderText} numberOfLines={1}>
            {areaSelecionada || 'Selecione a Área principal (ex: Networking, DevOps...)'}
          </Text>
          <Feather name="chevron-down" size={18} color="#8F9CAE" />
        </TouchableOpacity>

        {/* Grade dinâmica de chips para seleção múltipla das tecnologias da área */}
        {areaSelecionada !== '' && (
          <View style={styles.boxTechsRelacionadas}>
            <View style={styles.headerBoxTechs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subTituloSecao}>Tecnologias e Tópicos</Text>
                <Text style={styles.helperTechs}>
                  Toque para selecionar uma ou mais opções ({techsSelecionadas.length} selecionada(s))
                </Text>
              </View>
            </View>

            <View style={styles.chipsWrap}>
              {tecnologiasDaAreaAtual.map((tech) => {
                const selecionada = techsSelecionadas.some(
                  t => t.toLowerCase() === tech.toLowerCase()
                );
                return (
                  <TouchableOpacity
                    key={tech}
                    style={[styles.chipTech, selecionada && styles.chipTechAtivo]}
                    onPress={() => toggleTecnologia(tech)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={selecionada ? 'checkmark-circle' : 'add-circle-outline'}
                      size={15}
                      color={selecionada ? '#FFFFFF' : '#8F9CAE'}
                    />
                    <Text style={[styles.chipTechText, selecionada && styles.chipTechTextAtivo]}>
                      {tech}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Botão para cadastrar nova tecnologia na área selecionada */}
              <TouchableOpacity
                style={styles.chipAddTech}
                onPress={() => setModalNovaTechVisible(true)}
                activeOpacity={0.75}
              >
                <Feather name="plus" size={15} color="#8B5CF6" />
                <Text style={styles.chipAddTechText}>Adicionar Tech</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Seletores de Formato (Presencial/Online) e Preço (Gratuito/Pago) */}
        <View style={styles.rowOpcoes}>
          <View style={styles.colOpcao}>
            <Text style={styles.label}>Formato</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, formato === 'Presencial' && styles.toggleBtnAtivo]}
                onPress={() => setFormato('Presencial')}
              >
                <Text style={[styles.toggleText, formato === 'Presencial' && styles.toggleTextAtivo]}>Presencial</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, formato === 'Online' && styles.toggleBtnAtivo]}
                onPress={() => setFormato('Online')}
              >
                <Text style={[styles.toggleText, formato === 'Online' && styles.toggleTextAtivo]}>Online</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.colOpcao}>
            <Text style={styles.label}>Preço</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, precoTipo === 'Gratuito' && styles.toggleBtnAtivo]}
                onPress={() => setPrecoTipo('Gratuito')}
              >
                <Text style={[styles.toggleText, precoTipo === 'Gratuito' && styles.toggleTextAtivo]}>Gratuito</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, precoTipo === 'Pago' && styles.toggleBtnAtivo]}
                onPress={() => setPrecoTipo('Pago')}
              >
                <Text style={[styles.toggleText, precoTipo === 'Pago' && styles.toggleTextAtivo]}>Pago</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {precoTipo === 'Pago' && (
          <View>
            <Text style={styles.label}>Valor do Ingresso (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 49,90"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={precoValor}
              onChangeText={setPrecoValor}
            />
          </View>
        )}

        {/* Renderização condicional: Endereço Presencial vs. Configuração Online */}
        {formato === 'Presencial' ? (
          <View style={styles.boxEndereco}>
            <Text style={styles.subTituloSecao}>Endereço do Evento</Text>
            <Text style={styles.label}>CEP (Preenche tudo automaticamente)</Text>
            <TextInput
              style={styles.input}
              placeholder="00000-000"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              maxLength={9}
              value={cep}
              onChangeText={handleCepChange}
            />
            <View style={styles.rowOpcoes}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Estado (UF) *</Text>
                <TouchableOpacity style={styles.selectInput} onPress={() => setModalEstadoVisible(true)}>
                  <Text style={estado ? styles.selectText : styles.placeholderText}>{estado || 'UF'}</Text>
                  <Feather name="chevron-down" size={16} color="#8F9CAE" />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.label}>Cidade *</Text>
                <TouchableOpacity 
                  style={styles.selectInput} 
                  onPress={() => {
                    if (!estado) Alert.alert('Aviso', 'Selecione o Estado primeiro.');
                    else setModalCidadeVisible(true);
                  }}
                >
                  <Text style={cidade ? styles.selectText : styles.placeholderText} numberOfLines={1}>
                    {cidade || 'Selecione a cidade...'}
                  </Text>
                  <Feather name="chevron-down" size={16} color="#8F9CAE" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.label}>Bairro</Text>
            <TextInput style={styles.input} placeholder="Ex: Pituba" placeholderTextColor="#475569" value={bairro} onChangeText={setBairro} />
            <Text style={styles.label}>Rua / Logradouro e Número</Text>
            <TextInput style={styles.input} placeholder="Ex: Av. Manoel Dias, 1020" placeholderTextColor="#475569" value={ruaNumero} onChangeText={setRuaNumero} />
          </View>
        ) : (
          <View style={styles.boxEndereco}>
            <Text style={styles.subTituloSecao}>Configuração da Transmissão Online</Text>
            <Text style={styles.label}>Plataforma</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setModalPlataformaVisible(true)}>
              <Text style={styles.selectText}>{plataforma}</Text>
              <Feather name="chevron-down" size={18} color="#8F9CAE" />
            </TouchableOpacity>
            {plataforma === 'Outro' && (
              <View>
                <Text style={styles.label}>Nome da Plataforma Customizada</Text>
                <TextInput style={styles.input} placeholder="Ex: Discord, Twitch..." placeholderTextColor="#475569" value={plataformaOutro} onChangeText={setPlataformaOutro} />
              </View>
            )}
            <Text style={styles.label}>Link de Acesso (URL) *</Text>
            <TextInput style={styles.input} placeholder="Ex: https://meet.google.com/..." placeholderTextColor="#475569" autoCapitalize="none" value={linkEvento} onChangeText={setLinkEvento} />
          </View>
        )}

        {/* Campos de inscrição, produtor e descrição */}
        <Text style={styles.label}>Link Oficial de Inscrição *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: https://sympla.com.br/meu-evento"
          placeholderTextColor="#475569"
          autoCapitalize="none"
          value={linkOficial}
          onChangeText={setLinkOficial}
        />

        <Text style={styles.label}>Nome do Produtor / Organizador *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: GatherTech ou Nome da Empresa"
          placeholderTextColor="#475569"
          value={nomeProdutor}
          onChangeText={setNomeProdutor}
        />

        <Text style={styles.label}>Descrição (Opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Detalhes sobre o evento..."
          placeholderTextColor="#475569"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={descricao}
          onChangeText={setDescricao}
        />

        <TouchableOpacity style={styles.btnPublicar} onPress={handlePublicar} disabled={carregandoSubmit}>
          {carregandoSubmit ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBtnPublicar}>
              {modoEdicao ? 'Salvar Alterações' : 'Publicar Evento'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de seleção da Área de Atuação com filtro de busca */}
      <Modal visible={modalAreaVisible} transparent animationType="fade" onRequestClose={() => setModalAreaVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitulo}>Selecione a Área de Atuação</Text>
              <TouchableOpacity onPress={() => setModalAreaVisible(false)}>
                <Feather name="x" size={20} color="#8F9CAE" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginBottom: 12, paddingVertical: 10 }]}
              placeholder="Buscar área..."
              placeholderTextColor="#475569"
              value={buscaArea}
              onChangeText={setBuscaArea}
            />

            <FlatList
              data={areasDisponiveis}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const ativa = item === areaSelecionada;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, ativa && styles.modalItemAtivo]}
                    onPress={() => selecionarArea(item)}
                  >
                    <Text style={[styles.modalItemText, ativa && { color: '#8B5CF6', fontWeight: 'bold' }]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.btnModalNovaArea}
              onPress={() => {
                setModalAreaVisible(false);
                setModalNovaAreaVisible(true);
              }}
            >
              <Feather name="plus-circle" size={16} color="#FFFFFF" />
              <Text style={styles.txtBtnModalNovaArea}>Não encontrou? Adicionar Nova Área</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para cadastro dinâmico de Nova Área e suas tecnologias iniciais */}
      <Modal visible={modalNovaAreaVisible} transparent animationType="fade" onRequestClose={() => setModalNovaAreaVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Nova Área de Atuação</Text>

            <Text style={[styles.label, { marginTop: 4 }]}>Nome da Área *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Computação Quântica"
              placeholderTextColor="#475569"
              value={novaAreaNome}
              onChangeText={setNovaAreaNome}
            />

            <Text style={styles.label}>Tecnologias relacionadas (separadas por vírgula)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Qiskit, Cirq, Criptografia"
              placeholderTextColor="#475569"
              value={novaAreaTechsTexto}
              onChangeText={setNovaAreaTechsTexto}
            />

            <View style={styles.modalBotoesRow}>
              <TouchableOpacity
                style={styles.btnModalCancelar}
                onPress={() => {
                  setNovaAreaNome('');
                  setNovaAreaTechsTexto('');
                  setModalNovaAreaVisible(false);
                }}
              >
                <Text style={styles.txtModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnModalConfirmar} onPress={handleConfirmarNovaArea}>
                <Text style={styles.txtModalConfirmar}>Salvar Área</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para inclusão dinâmica de novas Tecnologias na Área atual */}
      <Modal visible={modalNovaTechVisible} transparent animationType="fade" onRequestClose={() => setModalNovaTechVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Adicionar Tecnologia</Text>
            <Text style={styles.helperModal}>Área: {areaSelecionada}</Text>

            <Text style={[styles.label, { marginTop: 8 }]}>Nome da Tecnologia ou Tópico *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: GPON (ou várias: GPON, OLT, VLAN)"
              placeholderTextColor="#475569"
              value={novaTechTexto}
              onChangeText={setNovaTechTexto}
            />

            <View style={styles.modalBotoesRow}>
              <TouchableOpacity
                style={styles.btnModalCancelar}
                onPress={() => {
                  setNovaTechTexto('');
                  setModalNovaTechVisible(false);
                }}
              >
                <Text style={styles.txtModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnModalConfirmar} onPress={handleConfirmarNovaTech}>
                <Text style={styles.txtModalConfirmar}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modais auxiliares de Estado (UF), Cidade (IBGE) e Plataforma Online */}
      <Modal visible={modalEstadoVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalEstadoVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Selecione o Estado</Text>
            <FlatList data={ESTADOS_BRASIL} keyExtractor={(item) => item} renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setEstado(item); setCidade(''); setModalEstadoVisible(false); carregarCidadesPorEstado(item); }}>
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalCidadeVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalCidadeVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Selecione a Cidade</Text>
            {carregandoCidades ? <ActivityIndicator color="#8B5CF6" style={{ marginVertical: 20 }} /> : (
              <FlatList data={cidadesDoEstado} keyExtractor={(item) => item} renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setCidade(item); setModalCidadeVisible(false); }}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )} />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalPlataformaVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalPlataformaVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Plataforma de Transmissão</Text>
            <FlatList data={PLATAFORMAS_ONLINE} keyExtractor={(item) => item} renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setPlataforma(item); setModalPlataformaVisible(false); }}>
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090C10' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  btnVoltar: { padding: 4 },
  tituloHeader: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  labelComBotaoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  btnMiniAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  txtBtnMiniAdd: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  capaContainer: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  imagemCapa: { width: '100%', height: '100%' },
  capaOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', gap: 6 },
  textoTrocarCapa: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  input: { backgroundColor: '#121824', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 14, borderWidth: 1, borderColor: '#1E293B' },
  selectInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121824', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#1E293B' },
  selectText: { color: '#FFFFFF', fontSize: 14, flex: 1, marginRight: 8 },
  placeholderText: { color: '#475569', fontSize: 14, flex: 1, marginRight: 8 },
  boxTechsRelacionadas: { backgroundColor: '#0F1522', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#1E293B', marginTop: 12 },
  headerBoxTechs: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  helperTechs: { color: '#8F9CAE', fontSize: 11, marginTop: 2 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipTech: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#121824', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#1E293B' },
  chipTechAtivo: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  chipTechText: { color: '#CBD5E1', fontSize: 12, fontWeight: '500' },
  chipTechTextAtivo: { color: '#FFFFFF', fontWeight: 'bold' },
  chipAddTech: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1E1B2E', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#8B5CF6', borderStyle: 'dashed' },
  chipAddTechText: { color: '#8B5CF6', fontSize: 12, fontWeight: 'bold' },
  textArea: { height: 100, paddingTop: 12 },
  rowOpcoes: { flexDirection: 'row', gap: 12 },
  colOpcao: { flex: 1 },
  toggleGroup: { flexDirection: 'row', backgroundColor: '#121824', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#1E293B' },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleBtnAtivo: { backgroundColor: '#8B5CF6' },
  toggleText: { color: '#8F9CAE', fontSize: 12, fontWeight: '600' },
  toggleTextAtivo: { color: '#FFFFFF' },
  boxEndereco: { backgroundColor: '#0F1522', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#1E293B', marginTop: 18 },
  subTituloSecao: { color: '#8B5CF6', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  btnPublicar: { backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 28, marginBottom: 20 },
  textoBtnPublicar: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxHeight: '75%', backgroundColor: '#121824', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitulo: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  helperModal: { color: '#8B5CF6', fontSize: 12, textAlign: 'center', marginBottom: 6 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  modalItemAtivo: { backgroundColor: '#1A2333', borderRadius: 8, paddingHorizontal: 8 },
  modalItemText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
  btnModalNovaArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1E293B', paddingVertical: 12, borderRadius: 10, marginTop: 14 },
  txtBtnModalNovaArea: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  modalBotoesRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnModalCancelar: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center' },
  txtModalCancelar: { color: '#8F9CAE', fontSize: 14, fontWeight: '600' },
  btnModalConfirmar: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#8B5CF6', alignItems: 'center' },
  txtModalConfirmar: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }
});