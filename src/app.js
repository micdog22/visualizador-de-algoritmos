// Interface: animação dos geradores, barras da ordenação, grade dos caminhos,
// pseudocódigo destacado, contadores e tabelas de comparação.
import * as C from './caminhos.js';
import * as O from './ordenacao.js';

const $ = (id) => document.getElementById(id);
const fmt = (n, casas = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: casas });
const corCss = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || '#888';

function semente() {
  const v = new Uint32Array(1);
  crypto.getRandomValues(v);
  return v[0];
}

// Controle deslizante de 0 a 100 em escala log: de 1 a 3000 passos por segundo.
const passosPorSegundo = (v) => Math.max(1, Math.round(10 ** ((Number(v) / 100) * Math.log10(3000))));

function lerPreferencia(chave, padrao) {
  try {
    return localStorage.getItem(chave) ?? padrao;
  } catch {
    return padrao;
  }
}
function gravarPreferencia(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento local: tudo bem, a preferência só não é lembrada
  }
}

// ---------------------------------------------------------------------------
// Animador: puxa passos do gerador no ritmo pedido e desenha uma vez por quadro
// ---------------------------------------------------------------------------

class Animador {
  constructor({ aoPasso, aoTerminar, desenhar, aoMudar, velocidade }) {
    Object.assign(this, { aoPasso, aoTerminar, desenhar, aoMudar, velocidade });
    this.gerador = null;
    this.rodando = false;
    this.terminado = false;
    this.tique = this.tique.bind(this);
  }
  carregar(gerador) {
    this.gerador = gerador;
    this.rodando = false;
    this.terminado = false;
    this.aoMudar();
  }
  alternar() {
    if (this.rodando) this.pausar();
    else this.tocar();
  }
  tocar() {
    if (!this.gerador || this.terminado) return;
    this.rodando = true;
    this.ultimo = performance.now();
    this.acumulado = 1; // o primeiro passo sai na hora
    this.aoMudar();
    requestAnimationFrame(this.tique);
  }
  pausar() {
    this.rodando = false;
    this.aoMudar();
  }
  // Avança k passos; devolve false se o gerador terminou.
  avancar(k) {
    for (let i = 0; i < k; i++) {
      const r = this.gerador.next();
      if (r.done) {
        this.terminado = true;
        this.rodando = false;
        this.aoTerminar(r.value);
        this.desenhar();
        this.aoMudar();
        return false;
      }
      this.aoPasso(r.value);
    }
    return true;
  }
  umPasso() {
    if (!this.gerador || this.terminado) return;
    this.rodando = false;
    this.avancar(1);
    this.desenhar();
    this.aoMudar();
  }
  tique(agora) {
    if (!this.rodando) return;
    this.acumulado += ((agora - this.ultimo) / 1000) * this.velocidade();
    this.ultimo = agora;
    const k = Math.min(20000, Math.floor(this.acumulado));
    this.acumulado -= k;
    if (k > 0) {
      if (!this.avancar(k)) return;
      this.desenhar();
    }
    requestAnimationFrame(this.tique);
  }
}

function tamanhoCanvas(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h, dpr };
}

function preencherPseudocodigo(ol, linhas) {
  ol.replaceChildren(
    ...linhas.map((texto) => {
      const li = document.createElement('li');
      li.textContent = texto;
      return li;
    }),
  );
}

function destacarLinha(ol, linha) {
  [...ol.children].forEach((li, i) => {
    const atual = i + 1 === linha;
    li.classList.toggle('atual', atual);
    if (atual) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
}

function preencherContadores(dl, itens) {
  dl.replaceChildren(
    ...itens.map(([rotulo, valor]) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = rotulo;
      const dd = document.createElement('dd');
      dd.textContent = valor;
      div.append(dt, dd);
      return div;
    }),
  );
}

function preencherTabela(tabela, cabecalho, linhas, destaque) {
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  for (const c of cabecalho) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = c;
    trh.append(th);
  }
  thead.append(trh);
  const tbody = document.createElement('tbody');
  linhas.forEach((linha, i) => {
    const tr = document.createElement('tr');
    linha.forEach((v, j) => {
      const td = document.createElement(j === 0 ? 'th' : 'td');
      if (j === 0) td.scope = 'row';
      td.textContent = v;
      if (destaque && destaque(i, j)) td.className = 'melhor';
      tr.append(td);
    });
    tbody.append(tr);
  });
  tabela.replaceChildren(thead, tbody);
}

// ---------------------------------------------------------------------------
// Abas
// ---------------------------------------------------------------------------

const abas = [$('aba-ordenacao'), $('aba-caminhos')];
function mostrarAba(aba, foco = false) {
  for (const a of abas) {
    const ativa = a === aba;
    a.setAttribute('aria-selected', String(ativa));
    a.tabIndex = ativa ? 0 : -1;
    $(a.getAttribute('aria-controls')).hidden = !ativa;
  }
  if (foco) aba.focus();
  const id = aba === abas[1] ? 'caminhos' : 'ordenacao';
  gravarPreferencia('visualizador.aba', id);
  history.replaceState(null, '', `#${id}`);
  if (id === 'caminhos') camDesenhar();
  else ordDesenhar();
}
abas.forEach((aba, i) => {
  aba.addEventListener('click', () => mostrarAba(aba));
  aba.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      mostrarAba(abas[(i + (ev.key === 'ArrowRight' ? 1 : abas.length - 1)) % abas.length], true);
    }
  });
});

// ---------------------------------------------------------------------------
// Ordenação
// ---------------------------------------------------------------------------

const ordEl = {
  algoritmo: $('ord-algoritmo'),
  preset: $('ord-preset'),
  tamanho: $('ord-tamanho'),
  tamanhoValor: $('ord-tamanho-valor'),
  velocidade: $('ord-velocidade'),
  velocidadeValor: $('ord-velocidade-valor'),
  play: $('ord-play'),
  passo: $('ord-passo'),
  novo: $('ord-novo'),
  comparar: $('ord-comparar'),
  tela: $('ord-tela'),
  contadores: $('ord-contadores'),
  status: $('ord-status'),
  pseudo: $('ord-pseudo'),
  complexidade: $('ord-complexidade'),
  comparacao: $('ord-comparacao'),
  tabela: $('ord-tabela'),
};

const ord = { original: [], valores: [], est: O.novaEstatistica(), ultimo: null, pivo: -1, ordenados: new Set(), terminado: false };

const ordAnim = new Animador({
  velocidade: () => passosPorSegundo(ordEl.velocidade.value),
  aoPasso(p) {
    O.contarPasso(ord.est, p);
    ord.ultimo = p;
    if (p.tipo === 'pivo') ord.pivo = p.i;
    if (p.tipo === 'ordenado') ord.ordenados.add(p.i);
  },
  aoTerminar() {
    ord.terminado = true;
    ord.ultimo = null;
    ord.pivo = -1;
    const e = ord.est;
    ordEl.status.textContent =
      `Ordenado em ${fmt(e.passos)} passos: ${fmt(e.comparacoes)} comparações, ${fmt(e.trocas)} trocas` +
      `${e.escritas ? `, ${fmt(e.escritas)} escritas` : ''}${e.leituras ? `, ${fmt(e.leituras)} leituras` : ''}.`;
  },
  desenhar: () => ordDesenhar(),
  aoMudar: () => ordAtualizarBotoes(),
});

function ordAtualizarBotoes() {
  ordEl.play.textContent = ordAnim.rodando ? 'Pausar' : ord.terminado ? 'Terminado' : ordAnim.gerador && ord.est.passos ? 'Continuar' : 'Iniciar';
  ordEl.play.disabled = ord.terminado;
  ordEl.passo.disabled = ord.terminado;
  if (!ordAnim.rodando && !ord.terminado && ord.ultimo) ordEl.status.textContent = descreverPasso(ord.ultimo);
}

function descreverPasso(p) {
  const v = ord.valores;
  switch (p.tipo) {
    case 'comparar':
      return p.j === -1
        ? `Comparando A[${p.i}] = ${v[p.i]} com o pivô.`
        : `Comparando A[${p.i}] = ${v[p.i]} com A[${p.j}] = ${v[p.j]}.`;
    case 'trocar':
      return `Trocou A[${p.i}] e A[${p.j}]: agora ${v[p.i]} e ${v[p.j]}.`;
    case 'escrever':
      return `Escreveu ${v[p.i]} em A[${p.i}].`;
    case 'ler':
      return `Leu A[${p.i}] = ${v[p.i]}.`;
    case 'pivo':
      return `Destaque em A[${p.i}] = ${v[p.i]}.`;
    case 'ordenado':
      return `A[${p.i}] = ${v[p.i]} chegou ao lugar final.`;
    default:
      return `Linha ${p.linha} do pseudocódigo.`;
  }
}

function ordCarregar(novoVetor) {
  if (novoVetor) {
    const n = Number(ordEl.tamanho.value);
    ord.original = O.gerarVetor(ordEl.preset.value, n, O.criarRng(semente()));
  }
  ord.valores = [...ord.original];
  ord.est = O.novaEstatistica();
  ord.ultimo = null;
  ord.pivo = -1;
  ord.ordenados = new Set();
  ord.terminado = false;
  const info = O.ORDENACOES[ordEl.algoritmo.value];
  ordAnim.carregar(info.gerador(ord.valores));
  preencherPseudocodigo(ordEl.pseudo, info.pseudocodigo);
  ordEl.complexidade.replaceChildren(
    ...[
      ['Melhor caso', info.tempo[0]],
      ['Caso médio', info.tempo[1]],
      ['Pior caso', info.tempo[2]],
      ['Memória extra', info.memoria],
      ['Estável', info.estavel ? 'sim' : 'não'],
    ].flatMap(([t, d]) => {
      const dt = document.createElement('dt');
      dt.textContent = t;
      const dd = document.createElement('dd');
      dd.textContent = d;
      return [dt, dd];
    }),
  );
  ordEl.status.textContent = `${info.nome} pronto com ${ord.valores.length} elementos.`;
  ordDesenhar();
}

function ordDesenhar() {
  if ($('painel-ordenacao').hidden) return;
  const { w, h } = tamanhoCanvas(ordEl.tela);
  const c = ordEl.tela.getContext('2d');
  c.clearRect(0, 0, w, h);
  const v = ord.valores;
  const n = v.length;
  if (!n) return;
  const max = Math.max(...v, 1);
  const largura = w / n;
  const espaco = largura > 4 ? Math.min(2, largura * 0.15) : 0;
  const cores = {
    base: corCss('--barra'),
    comparar: corCss('--comparar'),
    trocar: corCss('--trocar'),
    escrever: corCss('--escrever'),
    pivo: corCss('--pivo'),
    ordenado: corCss('--ordenado'),
  };
  const p = ord.ultimo;
  for (let i = 0; i < n; i++) {
    let cor = cores.base;
    if (ord.terminado || ord.ordenados.has(i)) cor = cores.ordenado;
    if (i === ord.pivo && !ord.terminado) cor = cores.pivo;
    if (p && (p.i === i || p.j === i)) {
      if (p.tipo === 'comparar') cor = cores.comparar;
      else if (p.tipo === 'trocar') cor = cores.trocar;
      else if (p.tipo === 'escrever' || p.tipo === 'ler') cor = cores.escrever;
    }
    const altura = Math.max(1, (v[i] / max) * (h - 4));
    c.fillStyle = cor;
    c.fillRect(i * largura + espaco / 2, h - altura, Math.max(1, largura - espaco), altura);
  }
  const e = ord.est;
  preencherContadores(ordEl.contadores, [
    ['Comparações', fmt(e.comparacoes)],
    ['Trocas', fmt(e.trocas)],
    ['Escritas', fmt(e.escritas)],
    ['Leituras', fmt(e.leituras)],
    ['Passos', fmt(e.passos)],
  ]);
  destacarLinha(ordEl.pseudo, p ? p.linha : 0);
}

function ordCompararTodos() {
  const linhas = [];
  const valores = [];
  for (const [id, info] of Object.entries(O.ORDENACOES)) {
    const { est } = O.executar(id, ord.original);
    valores.push(est);
    linhas.push([info.nome, fmt(est.comparacoes), fmt(est.trocas), fmt(est.escritas), fmt(est.leituras), fmt(est.passos)]);
  }
  const menorPassos = Math.min(...valores.map((e) => e.passos));
  preencherTabela(
    ordEl.tabela,
    ['Algoritmo', 'Comparações', 'Trocas', 'Escritas', 'Leituras', 'Passos'],
    linhas,
    (i, j) => j === 5 && valores[i].passos === menorPassos,
  );
  ordEl.comparacao.hidden = false;
  ordEl.status.textContent = `Os ${linhas.length} algoritmos rodaram no mesmo vetor de ${ord.original.length} elementos.`;
}

function ordIniciar() {
  for (const [id, info] of Object.entries(O.ORDENACOES)) ordEl.algoritmo.append(new Option(info.nome, id));
  for (const [id, nome] of Object.entries(O.PRESETS)) ordEl.preset.append(new Option(nome, id));
  const salvo = lerPreferencia('visualizador.ordenacao', 'quickHoare');
  if (O.ORDENACOES[salvo]) ordEl.algoritmo.value = salvo;
  ordEl.tamanhoValor.textContent = ordEl.tamanho.value;
  ordEl.velocidadeValor.textContent = `${passosPorSegundo(ordEl.velocidade.value)} passos/s`;
  ordEl.algoritmo.addEventListener('change', () => {
    gravarPreferencia('visualizador.ordenacao', ordEl.algoritmo.value);
    ordCarregar(false);
  });
  ordEl.preset.addEventListener('change', () => ordCarregar(true));
  ordEl.tamanho.addEventListener('input', () => {
    ordEl.tamanhoValor.textContent = ordEl.tamanho.value;
    ordCarregar(true);
  });
  ordEl.velocidade.addEventListener('input', () => {
    ordEl.velocidadeValor.textContent = `${passosPorSegundo(ordEl.velocidade.value)} passos/s`;
  });
  ordEl.play.addEventListener('click', () => ordAnim.alternar());
  ordEl.passo.addEventListener('click', () => ordAnim.umPasso());
  ordEl.novo.addEventListener('click', () => ordCarregar(true));
  ordEl.comparar.addEventListener('click', ordCompararTodos);
  ordCarregar(true);
}

// ---------------------------------------------------------------------------
// Caminhos em grade
// ---------------------------------------------------------------------------

const camEl = {
  algoritmo: $('cam-algoritmo'),
  heuristica: $('cam-heuristica'),
  velocidade: $('cam-velocidade'),
  velocidadeValor: $('cam-velocidade-valor'),
  labirinto: $('cam-labirinto'),
  gerar: $('cam-gerar'),
  diagonal: $('cam-diagonal'),
  play: $('cam-play'),
  passo: $('cam-passo'),
  limparBusca: $('cam-limpar-busca'),
  limpar: $('cam-limpar'),
  comparar: $('cam-comparar'),
  aviso: $('cam-aviso'),
  tela: $('cam-tela'),
  contadores: $('cam-contadores'),
  status: $('cam-status'),
  pseudo: $('cam-pseudo'),
  otimo: $('cam-otimo'),
  comparacao: $('cam-comparacao'),
  tabela: $('cam-tabela'),
};

const VAZIO = 0;
const FRONTEIRA = 1;
const VISITADO = 2;
const CAMINHO = 3;

const cam = {
  grade: null,
  inicio: 0,
  fim: 0,
  estado: null,
  linha: 0,
  visitados: 0,
  resultado: null,
};

const camAnim = new Animador({
  velocidade: () => passosPorSegundo(camEl.velocidade.value),
  aoPasso(p) {
    cam.linha = p.linha;
    if (p.tipo === 'fronteira') {
      if (cam.estado[p.celula] === VAZIO) cam.estado[p.celula] = FRONTEIRA;
    } else if (p.tipo === 'visitar') {
      cam.estado[p.celula] = VISITADO;
      cam.visitados++;
    } else if (p.tipo === 'caminho') {
      for (const i of p.celulas) cam.estado[i] = CAMINHO;
    }
  },
  aoTerminar(r) {
    cam.resultado = r;
    camEl.status.textContent = r.encontrado
      ? `Caminho com ${fmt(r.passos)} passos e custo ${fmt(r.custo, r.custo % 1 ? 2 : 0)}, depois de expandir ${fmt(r.expandidos)} células.`
      : `Não há caminho: ${fmt(r.expandidos)} células expandidas sem chegar ao fim.`;
  },
  desenhar: () => camDesenhar(),
  aoMudar: () => camAtualizarBotoes(),
});

function camAtualizarBotoes() {
  camEl.play.textContent = camAnim.rodando ? 'Pausar' : camAnim.terminado ? 'Terminado' : cam.visitados ? 'Continuar' : 'Iniciar';
  camEl.play.disabled = camAnim.terminado;
  camEl.passo.disabled = camAnim.terminado;
}

function opcoesBusca() {
  return { diagonal: camEl.diagonal.checked, heuristica: camEl.heuristica.value };
}

function camLimparBusca() {
  cam.estado = new Uint8Array(cam.grade.celulas.length);
  cam.linha = 0;
  cam.visitados = 0;
  cam.resultado = null;
  const info = C.BUSCAS[camEl.algoritmo.value];
  camAnim.carregar(info.gerador(cam.grade, cam.inicio, cam.fim, opcoesBusca()));
  preencherPseudocodigo(camEl.pseudo, info.pseudocodigo);
  camEl.otimo.textContent = `Garante o menor caminho? ${info.otimo}.`;
  const usaHeuristica = camEl.algoritmo.value === 'astar' || camEl.algoritmo.value === 'gulosa';
  camEl.heuristica.disabled = !usaHeuristica;
  const avisos = [];
  if (usaHeuristica && camEl.diagonal.checked && camEl.heuristica.value === 'manhattan') {
    avisos.push('Com diagonais, a distância Manhattan superestima o custo e o A* pode não achar o menor caminho. Prefira a octil.');
  }
  const temLama = cam.grade.celulas.includes(C.LAMA);
  if (temLama && (camEl.algoritmo.value === 'bfs' || camEl.algoritmo.value === 'bidirecional')) {
    avisos.push('BFS conta passos e ignora pesos: com lama, o caminho dele pode custar mais que o do Dijkstra.');
  }
  camEl.aviso.textContent = avisos.join(' ');
  camEl.aviso.hidden = !avisos.length;
  camEl.status.textContent = '';
  camDesenhar();
}

function camNovaGrade(linhas, colunas) {
  cam.grade = new C.Grade(linhas, colunas);
  const meio = (linhas >> 1) | 1;
  cam.inicio = cam.grade.indice(meio, 3);
  cam.fim = cam.grade.indice(meio, colunas - 4);
  camEl.tela.style.aspectRatio = `${colunas} / ${linhas}`;
  camLimparBusca();
}

function camGerar() {
  const { linhas, colunas } = cam.grade;
  cam.grade = C.LABIRINTOS[camEl.labirinto.value].gerar(linhas, colunas, C.criarRng(semente()));
  cam.inicio = cam.grade.indice(1, 1);
  cam.fim = cam.grade.indice(linhas - 2, colunas - 2);
  cam.grade.celulas[cam.inicio] = C.LIVRE;
  cam.grade.celulas[cam.fim] = C.LIVRE;
  camLimparBusca();
  camEl.status.textContent = `${C.LABIRINTOS[camEl.labirinto.value].nome} gerado.`;
}

let geometria = { s: 1, x0: 0, y0: 0 };

function camDesenhar() {
  if ($('painel-caminhos').hidden || !cam.grade) return;
  const { w, h } = tamanhoCanvas(camEl.tela);
  const c = camEl.tela.getContext('2d');
  const g = cam.grade;
  const s = Math.max(1, Math.floor(Math.min(w / g.colunas, h / g.linhas)));
  const x0 = Math.floor((w - s * g.colunas) / 2);
  const y0 = Math.floor((h - s * g.linhas) / 2);
  geometria = { s, x0, y0 };
  const cores = {
    livre: corCss('--g-livre'),
    linha: corCss('--g-linha'),
    parede: corCss('--g-parede'),
    lama: corCss('--g-lama'),
    fronteira: corCss('--g-fronteira'),
    visitado: corCss('--g-visitado'),
    caminho: corCss('--g-caminho'),
    inicio: corCss('--g-inicio'),
    fim: corCss('--g-fim'),
  };
  c.fillStyle = cores.linha;
  c.fillRect(0, 0, w, h);
  const borda = s >= 8 ? 1 : 0;
  for (let i = 0; i < g.celulas.length; i++) {
    const x = x0 + g.coluna(i) * s;
    const y = y0 + g.linha(i) * s;
    const tipo = g.celulas[i];
    const est = cam.estado[i];
    let cor = tipo === C.PAREDE ? cores.parede : tipo === C.LAMA ? cores.lama : cores.livre;
    if (tipo !== C.PAREDE && est !== VAZIO) cor = est === CAMINHO ? cores.caminho : est === VISITADO ? cores.visitado : cores.fronteira;
    c.fillStyle = cor;
    c.fillRect(x + borda, y + borda, s - borda, s - borda);
    if (tipo === C.LAMA && est !== VAZIO && s >= 6) {
      // a lama continua visível por baixo da busca
      c.fillStyle = cores.lama;
      const m = Math.max(2, Math.floor(s / 3));
      c.fillRect(x + m, y + m, s - 2 * m + borda, s - 2 * m + borda);
    }
  }
  for (const [i, cor] of [[cam.inicio, cores.inicio], [cam.fim, cores.fim]]) {
    const x = x0 + g.coluna(i) * s;
    const y = y0 + g.linha(i) * s;
    c.fillStyle = cor;
    c.beginPath();
    c.arc(x + s / 2 + borda / 2, y + s / 2 + borda / 2, Math.max(2, s * 0.4), 0, 2 * Math.PI);
    c.fill();
  }
  const r = cam.resultado;
  preencherContadores(camEl.contadores, [
    ['Expandidas', fmt(cam.visitados)],
    ['Na fronteira', fmt(cam.estado.reduce((a, e) => a + (e === FRONTEIRA), 0))],
    ['Passos do caminho', r && r.encontrado ? fmt(r.passos) : '...'],
    ['Custo', r ? (r.encontrado ? fmt(r.custo, r.custo % 1 ? 2 : 0) : 'sem caminho') : '...'],
  ]);
  destacarLinha(camEl.pseudo, cam.linha);
}

// Edição com o ponteiro: pinta paredes ou lama, apaga, ou arrasta início e fim.
let edicao = null;

function celulaNoPonto(ev) {
  const r = camEl.tela.getBoundingClientRect();
  const k = camEl.tela.width / r.width;
  const x = (ev.clientX - r.left) * k - geometria.x0;
  const y = (ev.clientY - r.top) * k - geometria.y0;
  const l = Math.floor(y / geometria.s);
  const col = Math.floor(x / geometria.s);
  return cam.grade.dentro(l, col) ? cam.grade.indice(l, col) : -1;
}

function pintar(i) {
  if (i < 0 || i === cam.inicio || i === cam.fim) return;
  cam.grade.celulas[i] = edicao.tipo;
}

function linhaDeCelulas(a, b) {
  // Bresenham entre duas células, para não deixar buracos num arrasto rápido
  const g = cam.grade;
  let l0 = g.linha(a);
  let c0 = g.coluna(a);
  const l1 = g.linha(b);
  const c1 = g.coluna(b);
  const dl = Math.abs(l1 - l0);
  const dc = Math.abs(c1 - c0);
  const sl = l0 < l1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let erro = dc - dl;
  const res = [];
  for (;;) {
    res.push(g.indice(l0, c0));
    if (l0 === l1 && c0 === c1) break;
    const e2 = 2 * erro;
    if (e2 > -dl) {
      erro -= dl;
      c0 += sc;
    }
    if (e2 < dc) {
      erro += dc;
      l0 += sl;
    }
  }
  return res;
}

camEl.tela.addEventListener('pointerdown', (ev) => {
  const i = celulaNoPonto(ev);
  if (i < 0) return;
  try {
    camEl.tela.setPointerCapture(ev.pointerId);
  } catch {
    // sem captura: o arrasto ainda funciona dentro do canvas
  }
  camAnim.pausar();
  if (i === cam.inicio || i === cam.fim) {
    edicao = { mover: i === cam.inicio ? 'inicio' : 'fim', ultima: i };
  } else {
    const ferramenta = document.querySelector('input[name=ferramenta]:checked').value;
    const alvo = ferramenta === 'parede' ? C.PAREDE : ferramenta === 'lama' ? C.LAMA : C.LIVRE;
    // clicar numa célula que já é do tipo da ferramenta apaga (alterna)
    edicao = { tipo: cam.grade.celulas[i] === alvo ? C.LIVRE : alvo, ultima: i };
    pintar(i);
  }
  camLimparBusca();
});

camEl.tela.addEventListener('pointermove', (ev) => {
  if (!edicao) return;
  const i = celulaNoPonto(ev);
  if (i < 0 || i === edicao.ultima) return;
  if (edicao.mover) {
    if (cam.grade.bloqueada(i) || i === cam.inicio || i === cam.fim) return;
    cam[edicao.mover] = i;
  } else {
    for (const j of linhaDeCelulas(edicao.ultima, i)) pintar(j);
  }
  edicao.ultima = i;
  camLimparBusca();
});

const terminarEdicao = () => {
  edicao = null;
};
camEl.tela.addEventListener('pointerup', terminarEdicao);
camEl.tela.addEventListener('pointercancel', terminarEdicao);

function camCompararTodos() {
  const linhas = [];
  const resultados = [];
  const opcoes = opcoesBusca();
  for (const [id, info] of Object.entries(C.BUSCAS)) {
    const variantes = id === 'astar' ? Object.keys(C.HEURISTICAS) : [opcoes.heuristica];
    for (const h of variantes) {
      const r = C.executarBusca(id, cam.grade, cam.inicio, cam.fim, { ...opcoes, heuristica: h });
      resultados.push(r);
      const nome = id === 'astar' || id === 'gulosa' ? `${info.nome} (${C.HEURISTICAS[h].nome})` : info.nome;
      linhas.push([
        nome,
        r.encontrado ? 'sim' : 'não',
        r.encontrado ? fmt(r.passos) : '...',
        r.encontrado ? fmt(r.custo, r.custo % 1 ? 2 : 0) : '...',
        fmt(r.expandidos),
        fmt(r.maiorFronteira),
      ]);
    }
  }
  const menorCusto = Math.min(...resultados.map((r) => r.custo));
  preencherTabela(
    camEl.tabela,
    ['Algoritmo', 'Achou', 'Passos', 'Custo', 'Expandidas', 'Maior fronteira'],
    linhas,
    (i, j) => j === 3 && resultados[i].encontrado && Math.abs(resultados[i].custo - menorCusto) < 1e-9,
  );
  camEl.comparacao.hidden = false;
  camEl.status.textContent = Number.isFinite(menorCusto)
    ? `Menor custo encontrado: ${fmt(menorCusto, menorCusto % 1 ? 2 : 0)} (em verde na tabela).`
    : 'Nenhum algoritmo achou caminho: o fim está isolado.';
}

function camIniciar() {
  for (const [id, info] of Object.entries(C.BUSCAS)) camEl.algoritmo.append(new Option(info.nome, id));
  for (const [id, h] of Object.entries(C.HEURISTICAS)) camEl.heuristica.append(new Option(h.nome, id));
  for (const [id, l] of Object.entries(C.LABIRINTOS)) camEl.labirinto.append(new Option(l.nome, id));
  const salvo = lerPreferencia('visualizador.busca', 'astar');
  if (C.BUSCAS[salvo]) camEl.algoritmo.value = salvo;
  camEl.velocidadeValor.textContent = `${passosPorSegundo(camEl.velocidade.value)} passos/s`;
  camEl.velocidade.addEventListener('input', () => {
    camEl.velocidadeValor.textContent = `${passosPorSegundo(camEl.velocidade.value)} passos/s`;
  });
  camEl.algoritmo.addEventListener('change', () => {
    gravarPreferencia('visualizador.busca', camEl.algoritmo.value);
    camLimparBusca();
  });
  camEl.heuristica.addEventListener('change', camLimparBusca);
  camEl.diagonal.addEventListener('change', camLimparBusca);
  camEl.play.addEventListener('click', () => camAnim.alternar());
  camEl.passo.addEventListener('click', () => camAnim.umPasso());
  camEl.limparBusca.addEventListener('click', camLimparBusca);
  camEl.limpar.addEventListener('click', () => camNovaGrade(cam.grade.linhas, cam.grade.colunas));
  camEl.gerar.addEventListener('click', camGerar);
  camEl.comparar.addEventListener('click', camCompararTodos);
  const estreito = window.matchMedia('(max-width: 640px)').matches;
  camNovaGrade(estreito ? 21 : 23, estreito ? 21 : 51);
}

// ---------------------------------------------------------------------------

function iniciar() {
  ordIniciar();
  camIniciar();
  const inicial = location.hash === '#caminhos' || (!location.hash && lerPreferencia('visualizador.aba', '') === 'caminhos');
  mostrarAba(inicial ? abas[1] : abas[0]);
  new ResizeObserver(() => {
    ordDesenhar();
    camDesenhar();
  }).observe(document.querySelector('main'));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    ordDesenhar();
    camDesenhar();
  });
}

iniciar();
