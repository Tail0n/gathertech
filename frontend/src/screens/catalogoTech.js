/**
 * @file catalogoTech.js
 * @description Módulo responsável pelo gerenciamento hierárquico de Áreas de Atuação
 * e Tecnologias/Tópicos do GatherTech. Realiza a serialização dos dados para compatibilidade
 * com o banco de dados e mantém persistência híbrida (catálogo base + armazenamento local + eventos da API).
 */

let AsyncStorage = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

// Chave utilizada para persistir áreas e tecnologias adicionadas manualmente pelo administrador
const STORAGE_KEY = '@gathertech_catalogo_custom_v1';

/**
 * Catálogo padrão pré-definido agrupando Áreas de Atuação (chaves)
 * e suas respectivas Tecnologias ou Tópicos relacionados (valores em array).
 */
export const CATALOGO_TECH_INICIAL = {
  'Networking & Infraestrutura de Redes': [
    'Cisco', 'Huawei', 'MikroTik', 'Juniper', 'Fortinet', 'Aruba', 'Ubiquiti',
    'Zabbix', 'BGP / OSPF', 'VLAN', 'Switching & Routing', 'TCP/IP',
    'DNS / DHCP', 'VPN', 'Wi-Fi Corporativo', 'Cabeamento Estruturado'
  ],
  'Telecomunicações': [
    'Fibra Óptica (GPON / FTTH)', '5G / Redes Móveis', 'Radiofrequência',
    'VoIP / Telefonia IP', 'Redes Ópticas (DWDM)', 'Transmissão de Dados', 'Satélite'
  ],
  'DevOps & SRE': [
    'Docker', 'Kubernetes', 'Linux', 'Git', 'GitHub', 'GitLab',
    'CI/CD', 'Jenkins', 'Terraform', 'Ansible', 'Nginx', 'Prometheus / Grafana'
  ],
  'Cloud Computing': [
    'AWS', 'Microsoft Azure', 'Google Cloud (GCP)', 'Oracle Cloud',
    'Serverless', 'Cloudflare', 'Arquitetura Cloud', 'FinOps'
  ],
  'Desenvolvimento Front-end & Web': [
    'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js',
    'Angular', 'Vue.js', 'Tailwind CSS', 'Bootstrap', 'APIs REST', 'GraphQL'
  ],
  'Desenvolvimento Back-end': [
    'Node.js', 'Python', 'Java', 'Spring Boot', 'PHP', 'Laravel',
    'C# / .NET', 'Django', 'FastAPI', 'Go', 'Ruby on Rails', 'Microsserviços'
  ],
  'Desenvolvimento Mobile': [
    'React Native', 'Expo', 'Flutter', 'Android (Kotlin / Java)',
    'iOS (Swift)', 'Android Studio', 'Publicação nas Lojas'
  ],
  'Banco de Dados': [
    'PostgreSQL', 'MySQL', 'SQL Server', 'MongoDB', 'Redis',
    'Oracle', 'SQLite', 'Modelagem de Dados', 'SQL'
  ],
  'Inteligência Artificial & Machine Learning': [
    'ChatGPT / OpenAI', 'LLMs / IA Generativa', 'LangChain', 'TensorFlow',
    'PyTorch', 'Scikit-learn', 'Machine Learning', 'Deep Learning', 'Visão Computacional'
  ],
  'Ciência, Engenharia & Análise de Dados': [
    'Python', 'Pandas', 'Polars', 'NumPy', 'Jupyter Notebook',
    'Power BI', 'Tableau', 'Big Data', 'Pipelines / ETL', 'Apache Spark'
  ],
  'Cibersegurança': [
    'Firewall', 'Fortinet', 'OWASP', 'Kali Linux', 'Wireshark',
    'Metasploit', 'Burp Suite', 'Pentest', 'SOC', 'LGPD', 'Criptografia', 'Hardening'
  ],
  'Automação de Processos (RPA)': [
    'n8n', 'Power Automate', 'Selenium', 'UiPath',
    'Python', 'Bots & Webhooks', 'Integração de APIs'
  ],
  'IoT, Hardware & Robótica': [
    'Arduino', 'ESP32', 'Raspberry Pi', 'MQTT',
    'Sensores', 'Robótica', 'Sistemas Embarcados', 'Eletrônica'
  ],
  'UI/UX Design': [
    'Figma', 'Adobe XD', 'Photoshop', 'Illustrator',
    'Prototipação', 'Design System', 'Pesquisa UX', 'Acessibilidade'
  ],
  'Arquitetura de Software & QA': [
    'Arquitetura Limpa', 'DDD', 'Design Patterns', 'Testes Automatizados',
    'Cypress', 'Jest', 'Testes de Carga', 'Qualidade de Software'
  ],
  'Desenvolvimento de Jogos & Blockchain': [
    'Unity', 'Unreal Engine', 'Godot', 'C#',
    'Solidity', 'Ethereum', 'Hyperledger', 'Smart Contracts', 'Web3'
  ],
  'Gestão, Governança, Ideias & Carreira': [
    'Gestão de Projetos de TI', 'Scrum / Ágil', 'Kanban',
    'Governança de TI (ITIL / COBIT)', 'Ideias & Startups',
    'Product Management', 'Liderança Tech', 'Carreira em Tech'
  ]
};

/**
 * Serializa a Área e a lista de Tecnologias selecionadas em uma única string
 * padronizada ("Área: Tech1, Tech2") para armazenamento na coluna `tech` do PostgreSQL.
 * @param {string} area - Área principal do evento.
 * @param {string[]} tecnologias - Lista de tecnologias selecionadas.
 * @returns {string} String formatada para persistência.
 */
export const formatarAreaETechs = (area, tecnologias = []) => {
  const areaLimpa = (area || '').trim();
  const techsLimpas = (tecnologias || []).map(t => t.trim()).filter(Boolean);

  if (areaLimpa && techsLimpas.length > 0) {
    return `${areaLimpa}: ${techsLimpas.join(', ')}`;
  }
  if (areaLimpa) {
    return areaLimpa;
  }
  if (techsLimpas.length > 0) {
    return techsLimpas.join(', ');
  }
  return 'Geral';
};

/**
 * Desserializa a string armazenada no banco de dados de volta para objetos estruturados
 * (`area` e array de `tecnologias`), mantendo retrocompatibilidade com registros antigos.
 * @param {string} techStr - Valor bruto vindo da coluna `tech` do evento.
 * @param {Object} catalogo - Catálogo de referência para inferência de área em registros legados.
 * @returns {{ area: string, tecnologias: string[] }}
 */
export const extrairAreaETechs = (techStr, catalogo = CATALOGO_TECH_INICIAL) => {
  const texto = (techStr || '').trim();
  if (!texto || texto === 'Geral') {
    return { area: '', tecnologias: [] };
  }

  // Formato padrão estruturado ("Área: Tech1, Tech2")
  const idxDoisPontos = texto.indexOf(':');
  if (idxDoisPontos !== -1) {
    const area = texto.slice(0, idxDoisPontos).trim();
    const resto = texto.slice(idxDoisPontos + 1).trim();
    const tecnologias = resto
      ? resto.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    return { area, tecnologias };
  }

  // Retrocompatibilidade: verifica se o registro legado corresponde diretamente a uma Área
  const areaEncontrada = Object.keys(catalogo).find(
    a => a.toLowerCase() === texto.toLowerCase()
  );
  if (areaEncontrada) {
    return { area: areaEncontrada, tecnologias: [] };
  }

  // Retrocompatibilidade: infere a Área caso o registro legado contenha apenas o nome de uma Tecnologia
  for (const [areaNome, listaTechs] of Object.entries(catalogo)) {
    const techMatch = listaTechs.find(t => t.toLowerCase() === texto.toLowerCase());
    if (techMatch) {
      return { area: areaNome, tecnologias: [techMatch] };
    }
  }

  return { area: '', tecnologias: [texto] };
};

/**
 * Realiza a união sem duplicatas (case-insensitive) entre o catálogo base
 * e áreas/tecnologias adicionais.
 * @param {Object} base - Catálogo base.
 * @param {Object} extras - Novas áreas e tecnologias a serem incorporadas.
 * @returns {Object} Catálogo consolidado.
 */
export const mesclarCatalogos = (base, extras) => {
  const resultado = {};
  Object.keys(base).forEach(area => {
    resultado[area] = [...base[area]];
  });

  Object.entries(extras || {}).forEach(([area, techs]) => {
    const areaLimpa = area.trim();
    if (!areaLimpa) return;
    if (!resultado[areaLimpa]) {
      resultado[areaLimpa] = [];
    }
    (techs || []).forEach(tech => {
      const techLimpa = tech.trim();
      if (
        techLimpa &&
        !resultado[areaLimpa].some(t => t.toLowerCase() === techLimpa.toLowerCase())
      ) {
        resultado[areaLimpa].push(techLimpa);
      }
    });
  });

  return resultado;
};

/**
 * Carrega o catálogo completo combinando:
 * 1. Catálogo padrão em memória;
 * 2. Itens customizados salvos no AsyncStorage;
 * 3. Áreas/tecnologias customizadas extraídas dos eventos já cadastrados no banco.
 * @param {Array} eventos - Lista de eventos retornados pela API.
 * @returns {Promise<Object>}
 */
export const carregarCatalogoCompleto = async (eventos = []) => {
  let extrasStorage = {};
  if (AsyncStorage) {
    try {
      const salvo = await AsyncStorage.getItem(STORAGE_KEY);
      if (salvo) extrasStorage = JSON.parse(salvo);
    } catch (e) {
      console.error('Erro ao ler catálogo salvo:', e);
    }
  }

  let catalogo = mesclarCatalogos(CATALOGO_TECH_INICIAL, extrasStorage);

  // Reconstrói automaticamente categorias criadas em outros dispositivos a partir dos eventos do banco
  const extrasEventos = {};
  (eventos || []).forEach(ev => {
    const { area, tecnologias } = extrairAreaETechs(ev?.tech, catalogo);
    if (area) {
      if (!extrasEventos[area]) extrasEventos[area] = [];
      tecnologias.forEach(t => extrasEventos[area].push(t));
    }
  });

  return mesclarCatalogos(catalogo, extrasEventos);
};

/**
 * Persiste uma nova Área ou novas Tecnologias no armazenamento local do dispositivo
 * para reutilização em cadastros futuros.
 * @param {string} area - Nome da área.
 * @param {string[]} novasTechs - Lista de tecnologias associadas.
 */
export const salvarItemNoCatalogo = async (area, novasTechs = []) => {
  if (!AsyncStorage) return;
  try {
    const salvo = await AsyncStorage.getItem(STORAGE_KEY);
    const atual = salvo ? JSON.parse(salvo) : {};
    const atualizado = mesclarCatalogos(atual, { [area]: novasTechs });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(atualizado));
  } catch (e) {
    console.error('Erro ao salvar no catálogo:', e);
  }
};