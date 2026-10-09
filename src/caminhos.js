// Busca de caminhos numa grade como geradores. Cada algoritmo entrega passos
// (fronteira, visitar, caminho) e, no fim, devolve o resultado pelo `return`.
//
// Custo: entrar numa célula custa o peso dela (1 livre, 5 lama); na diagonal, vezes raiz(2).
// Diagonais não podem "cortar quina": só valem se as duas células ortogonais vizinhas
// não forem parede.
import { HeapMinimo } from './heap.js';

export const LIVRE = 0;
export const PAREDE = 1;
export const LAMA = 2;
export const PESO_LAMA = 5;
const RAIZ2 = Math.SQRT2;

export class Grade {
  constructor(linhas, colunas) {
    this.linhas = linhas;
    this.colunas = colunas;
    this.celulas = new Uint8Array(linhas * colunas);
  }
  indice(l, c) {
    return l * this.colunas + c;
  }
  linha(i) {
    return Math.floor(i / this.colunas);
  }
  coluna(i) {
    return i % this.colunas;
  }
  dentro(l, c) {
    return l >= 0 && c >= 0 && l < this.linhas && c < this.colunas;
  }
  peso(i) {
    return this.celulas[i] === LAMA ? PESO_LAMA : 1;
  }
  bloqueada(i) {
    return this.celulas[i] === PAREDE;
  }
  clonar() {
    const g = new Grade(this.linhas, this.colunas);
    g.celulas.set(this.celulas);
    return g;
  }
}

const ORTOGONAIS = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];
const DIAGONAIS = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
];

// Vizinhos alcançáveis de i, com o custo de cada passo.
export function vizinhos(g, i, diagonal) {
  const l = g.linha(i);
  const c = g.coluna(i);
  const res = [];
  for (const [dl, dc] of ORTOGONAIS) {
    const nl = l + dl;
    const nc = c + dc;
    if (!g.dentro(nl, nc)) continue;
    const j = g.indice(nl, nc);
    if (!g.bloqueada(j)) res.push({ j, custo: g.peso(j) });
  }
  if (diagonal) {
    for (const [dl, dc] of DIAGONAIS) {
      const nl = l + dl;
      const nc = c + dc;
      if (!g.dentro(nl, nc)) continue;
      const j = g.indice(nl, nc);
      if (g.bloqueada(j) || g.bloqueada(g.indice(l + dl, c)) || g.bloqueada(g.indice(l, c + dc))) continue;
      res.push({ j, custo: g.peso(j) * RAIZ2 });
    }
  }
  return res;
}

// Heurísticas em "passos": todas multiplicadas pelo menor peso (1), então nunca
// superestimam. A Manhattan só é admissível sem diagonais.
export const HEURISTICAS = {
  manhattan: { nome: 'Manhattan', f: (dl, dc) => dl + dc },
  euclidiana: { nome: 'Euclidiana', f: (dl, dc) => Math.sqrt(dl * dl + dc * dc) },
  octil: { nome: 'Octil', f: (dl, dc) => Math.max(dl, dc) + (RAIZ2 - 1) * Math.min(dl, dc) },
};

function estimativa(g, i, fim, heuristica) {
  const dl = Math.abs(g.linha(i) - g.linha(fim));
  const dc = Math.abs(g.coluna(i) - g.coluna(fim));
  return HEURISTICAS[heuristica].f(dl, dc);
}

function reconstruir(pai, fim) {
  const caminho = [];
  for (let i = fim; i !== -1; i = pai[i]) caminho.push(i);
  return caminho.reverse();
}

// Custo real de um caminho (soma dos passos), para comparar algoritmos.
export function custoDoCaminho(g, caminho) {
  let custo = 0;
  for (let k = 1; k < caminho.length; k++) {
    const a = caminho[k - 1];
    const b = caminho[k];
    const diagonal = g.linha(a) !== g.linha(b) && g.coluna(a) !== g.coluna(b);
    custo += g.peso(b) * (diagonal ? RAIZ2 : 1);
  }
  return custo;
}

function resultado(g, encontrado, caminho, expandidos, maiorFronteira) {
  return {
    encontrado,
    caminho,
    passos: Math.max(0, caminho.length - 1),
    custo: encontrado ? custoDoCaminho(g, caminho) : Infinity,
    expandidos,
    maiorFronteira,
  };
}

function* bfs(g, inicio, fim, { diagonal = false } = {}) {
  const n = g.celulas.length;
  const pai = new Int32Array(n).fill(-1);
  const visto = new Uint8Array(n);
  const fila = [inicio];
  let cabeca = 0;
  visto[inicio] = 1;
  let expandidos = 0;
  let maior = 1;
  yield { tipo: 'fronteira', celula: inicio, linha: 1 };
  while (cabeca < fila.length) {
    const atual = fila[cabeca++];
    expandidos++;
    yield { tipo: 'visitar', celula: atual, linha: 3 };
    if (atual === fim) {
      const caminho = reconstruir(pai, fim);
      yield { tipo: 'caminho', celulas: caminho, linha: 4 };
      return resultado(g, true, caminho, expandidos, maior);
    }
    for (const { j } of vizinhos(g, atual, diagonal)) {
      if (visto[j]) continue;
      visto[j] = 1;
      pai[j] = atual;
      fila.push(j);
      yield { tipo: 'fronteira', celula: j, linha: 6 };
    }
    maior = Math.max(maior, fila.length - cabeca);
  }
  yield { tipo: 'linha', linha: 7 };
  return resultado(g, false, [], expandidos, maior);
}

function* dfs(g, inicio, fim, { diagonal = false } = {}) {
  const n = g.celulas.length;
  const pai = new Int32Array(n).fill(-1);
  const visitado = new Uint8Array(n);
  const pilha = [[inicio, -1]];
  let expandidos = 0;
  let maior = 1;
  yield { tipo: 'fronteira', celula: inicio, linha: 1 };
  while (pilha.length) {
    const [atual, de] = pilha.pop();
    if (visitado[atual]) continue;
    visitado[atual] = 1;
    pai[atual] = de;
    expandidos++;
    yield { tipo: 'visitar', celula: atual, linha: 5 };
    if (atual === fim) {
      const caminho = reconstruir(pai, fim);
      yield { tipo: 'caminho', celulas: caminho, linha: 5 };
      return resultado(g, true, caminho, expandidos, maior);
    }
    // empilha ao contrário para explorar na ordem cima, direita, baixo, esquerda
    const viz = vizinhos(g, atual, diagonal);
    for (let k = viz.length - 1; k >= 0; k--) {
      const { j } = viz[k];
      if (visitado[j]) continue;
      pilha.push([j, atual]);
      yield { tipo: 'fronteira', celula: j, linha: 6 };
    }
    maior = Math.max(maior, pilha.length);
  }
  yield { tipo: 'linha', linha: 7 };
  return resultado(g, false, [], expandidos, maior);
}

// Dijkstra, A* e gulosa diferem só na prioridade de cada célula na fila:
//   Dijkstra: g (custo desde o início)
//   A*:       g + h (custo até aqui mais a estimativa até o fim)
//   gulosa:   h (só a estimativa: rápida, mas sem garantia de menor caminho)
function* buscaComPrioridade(g, inicio, fim, modo, { diagonal = false, heuristica = 'manhattan' } = {}) {
  const n = g.celulas.length;
  const dist = new Float64Array(n).fill(Infinity);
  const pai = new Int32Array(n).fill(-1);
  const fechado = new Uint8Array(n);
  const h = (i) => (modo === 'dijkstra' ? 0 : estimativa(g, i, fim, heuristica));
  // desempate: entre prioridades iguais, a de menor h (mais perto do fim) primeiro
  const fila = new HeapMinimo((a, b) => a.p < b.p - 1e-12 || (Math.abs(a.p - b.p) <= 1e-12 && a.h < b.h));
  dist[inicio] = 0;
  const hi = h(inicio);
  fila.inserir({ i: inicio, p: hi, h: hi, g: 0 });
  let expandidos = 0;
  let maior = 1;
  yield { tipo: 'fronteira', celula: inicio, linha: 1 };
  while (fila.tamanho) {
    const { i: atual, g: custoAtual } = fila.remover();
    if (fechado[atual] || custoAtual > dist[atual]) continue; // entrada velha na fila
    fechado[atual] = 1;
    expandidos++;
    yield { tipo: 'visitar', celula: atual, linha: 4 };
    if (atual === fim) {
      const caminho = reconstruir(pai, fim);
      yield { tipo: 'caminho', celulas: caminho, linha: 5 };
      return resultado(g, true, caminho, expandidos, maior);
    }
    for (const { j, custo } of vizinhos(g, atual, diagonal)) {
      if (fechado[j]) continue;
      const novo = dist[atual] + custo;
      if (modo === 'gulosa' ? dist[j] !== Infinity : novo >= dist[j]) continue;
      dist[j] = novo;
      pai[j] = atual;
      const hj = h(j);
      const p = modo === 'dijkstra' ? novo : modo === 'astar' ? novo + hj : hj;
      fila.inserir({ i: j, p, h: hj, g: novo });
      yield { tipo: 'fronteira', celula: j, linha: 7 };
    }
    maior = Math.max(maior, fila.tamanho);
  }
  yield { tipo: 'linha', linha: 8 };
  return resultado(g, false, [], expandidos, maior);
}

function* bfsBidirecional(g, inicio, fim, { diagonal = false } = {}) {
  const n = g.celulas.length;
  if (inicio === fim) {
    yield { tipo: 'caminho', celulas: [inicio], linha: 6 };
    return resultado(g, true, [inicio], 1, 1);
  }
  const lados = [
    { dist: new Int32Array(n).fill(-1), pai: new Int32Array(n).fill(-1), fila: [inicio] },
    { dist: new Int32Array(n).fill(-1), pai: new Int32Array(n).fill(-1), fila: [fim] },
  ];
  lados[0].dist[inicio] = 0;
  lados[1].dist[fim] = 0;
  let expandidos = 0;
  let maior = 2;
  yield { tipo: 'fronteira', celula: inicio, linha: 1 };
  yield { tipo: 'fronteira', celula: fim, linha: 1 };
  while (lados[0].fila.length && lados[1].fila.length) {
    // expande a camada inteira do lado com menos células na fila
    const s = lados[0].fila.length <= lados[1].fila.length ? 0 : 1;
    const lado = lados[s];
    const outro = lados[1 - s];
    const proxima = [];
    let encontro = -1;
    let melhor = Infinity;
    for (const atual of lado.fila) {
      expandidos++;
      yield { tipo: 'visitar', celula: atual, linha: 3 };
      for (const { j } of vizinhos(g, atual, diagonal)) {
        if (lado.dist[j] !== -1) continue;
        lado.dist[j] = lado.dist[atual] + 1;
        lado.pai[j] = atual;
        proxima.push(j);
        yield { tipo: 'fronteira', celula: j, linha: 4 };
        if (outro.dist[j] !== -1 && lado.dist[j] + outro.dist[j] < melhor) {
          melhor = lado.dist[j] + outro.dist[j];
          encontro = j;
          yield { tipo: 'linha', linha: 5 };
        }
      }
    }
    lado.fila = proxima;
    maior = Math.max(maior, lados[0].fila.length + lados[1].fila.length);
    if (encontro !== -1) {
      // meio caminho do início até o encontro, mais o do encontro até o fim
      const ida = reconstruir(lados[0].pai, encontro);
      const volta = reconstruir(lados[1].pai, encontro).reverse();
      const caminho = ida.concat(volta.slice(1));
      yield { tipo: 'caminho', celulas: caminho, linha: 6 };
      return resultado(g, true, caminho, expandidos, maior);
    }
  }
  yield { tipo: 'linha', linha: 7 };
  return resultado(g, false, [], expandidos, maior);
}

export const BUSCAS = {
  bfs: {
    nome: 'Busca em largura (BFS)',
    gerador: bfs,
    otimo: 'Sim, em número de passos (ignora os pesos)',
    pseudocodigo: [
      'fila = [início]; marque o início como visto',
      'enquanto a fila não estiver vazia',
      '  atual = tire da frente da fila',
      '  se atual é o fim, reconstrua o caminho e pare',
      '  para cada vizinho v de atual que não é parede',
      '    se v não foi visto: marque, anote o pai e ponha na fila',
      'a fila esvaziou: não há caminho',
    ],
  },
  dfs: {
    nome: 'Busca em profundidade (DFS)',
    gerador: dfs,
    otimo: 'Não',
    pseudocodigo: [
      'pilha = [início]',
      'enquanto a pilha não estiver vazia',
      '  atual = tire do topo da pilha',
      '  se atual já foi visitado, pule',
      '  marque atual; se é o fim, reconstrua o caminho e pare',
      '  para cada vizinho v não visitado: anote o pai e empilhe',
      'a pilha esvaziou: não há caminho',
    ],
  },
  dijkstra: {
    nome: 'Dijkstra',
    gerador: (g, a, b, o) => buscaComPrioridade(g, a, b, 'dijkstra', o),
    otimo: 'Sim, considerando os pesos',
    pseudocodigo: [
      'dist[início] = 0; fila de prioridade = [início]',
      'enquanto a fila não estiver vazia',
      '  atual = tire o de menor dist',
      '  se atual já foi fechado, pule; senão feche',
      '  se atual é o fim, reconstrua o caminho e pare',
      '  para cada vizinho v, com custo c do passo',
      '    se dist[atual] + c < dist[v]: atualize dist[v] e o pai; ponha v na fila',
      'não há caminho',
    ],
  },
  astar: {
    nome: 'A*',
    gerador: (g, a, b, o) => buscaComPrioridade(g, a, b, 'astar', o),
    otimo: 'Sim, se a heurística nunca superestimar',
    pseudocodigo: [
      'g[início] = 0; fila = [início] com prioridade h(início)',
      'enquanto a fila não estiver vazia',
      '  atual = tire o de menor g + h',
      '  se atual já foi fechado, pule; senão feche',
      '  se atual é o fim, reconstrua o caminho e pare',
      '  para cada vizinho v, com custo c do passo',
      '    se g[atual] + c < g[v]: atualize g[v] e o pai; ponha v com prioridade g[v] + h(v)',
      'não há caminho',
    ],
  },
  gulosa: {
    nome: 'Busca gulosa (melhor primeiro)',
    gerador: (g, a, b, o) => buscaComPrioridade(g, a, b, 'gulosa', o),
    otimo: 'Não',
    pseudocodigo: [
      'fila = [início] com prioridade h(início)',
      'enquanto a fila não estiver vazia',
      '  atual = tire o de menor h (o que parece mais perto do fim)',
      '  se atual já foi fechado, pule; senão feche',
      '  se atual é o fim, reconstrua o caminho e pare',
      '  para cada vizinho v ainda não visto',
      '    anote o pai e ponha v com prioridade h(v)',
      'não há caminho',
    ],
  },
  bidirecional: {
    nome: 'BFS bidirecional',
    gerador: bfsBidirecional,
    otimo: 'Sim, em número de passos (ignora os pesos)',
    pseudocodigo: [
      'uma fila a partir do início e outra a partir do fim',
      'enquanto as duas filas tiverem células',
      '  expanda uma camada inteira do lado com a fila menor',
      '  para cada vizinho v novo deste lado',
      '    se o outro lado já viu v: é um encontro; guarde o melhor da camada',
      '  se houve encontro, junte as duas metades do caminho e pare',
      'uma fila esvaziou: não há caminho',
    ],
  },
};

// Roda até o fim e devolve o resultado (sem desenhar nada).
export function executarBusca(id, g, inicio, fim, opcoes = {}) {
  const it = BUSCAS[id].gerador(g, inicio, fim, opcoes);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}

// ---------------------------------------------------------------------------
// Labirintos e obstáculos
// ---------------------------------------------------------------------------

export function criarRng(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cheia(linhas, colunas) {
  const g = new Grade(linhas, colunas);
  g.celulas.fill(PAREDE);
  return g;
}

// Backtracker recursivo (busca em profundidade aleatória): corredores longos e sinuosos.
// As "salas" ficam nas coordenadas ímpares; abrir a parede entre duas salas liga as duas.
export function labirintoBacktracker(linhas, colunas, rng) {
  const g = cheia(linhas, colunas);
  const pilha = [[1, 1]];
  g.celulas[g.indice(1, 1)] = LIVRE;
  while (pilha.length) {
    const [l, c] = pilha[pilha.length - 1];
    const opcoes = ORTOGONAIS.map(([dl, dc]) => [l + 2 * dl, c + 2 * dc, l + dl, c + dc]).filter(
      ([nl, nc]) => nl > 0 && nc > 0 && nl < linhas - 1 && nc < colunas - 1 && g.celulas[g.indice(nl, nc)] === PAREDE,
    );
    if (!opcoes.length) {
      pilha.pop();
      continue;
    }
    const [nl, nc, pl, pc] = opcoes[Math.floor(rng() * opcoes.length)];
    g.celulas[g.indice(pl, pc)] = LIVRE;
    g.celulas[g.indice(nl, nc)] = LIVRE;
    pilha.push([nl, nc]);
  }
  return g;
}

// Prim aleatório: cresce a árvore a partir de uma sala, sorteando paredes da borda.
export function labirintoPrim(linhas, colunas, rng) {
  const g = cheia(linhas, colunas);
  const borda = [];
  const abrir = (l, c) => {
    g.celulas[g.indice(l, c)] = LIVRE;
    for (const [dl, dc] of ORTOGONAIS) {
      const nl = l + 2 * dl;
      const nc = c + 2 * dc;
      if (nl > 0 && nc > 0 && nl < linhas - 1 && nc < colunas - 1 && g.celulas[g.indice(nl, nc)] === PAREDE) {
        borda.push([nl, nc, l + dl, c + dc]);
      }
    }
  };
  abrir(1, 1);
  while (borda.length) {
    const k = Math.floor(rng() * borda.length);
    const [nl, nc, pl, pc] = borda[k];
    borda[k] = borda[borda.length - 1];
    borda.pop();
    if (g.celulas[g.indice(nl, nc)] !== PAREDE) continue;
    g.celulas[g.indice(pl, pc)] = LIVRE;
    abrir(nl, nc);
  }
  return g;
}

// Divisão recursiva: começa vazio e levanta paredes com uma passagem cada.
export function divisaoRecursiva(linhas, colunas, rng) {
  const g = new Grade(linhas, colunas);
  for (let c = 0; c < colunas; c++) {
    g.celulas[g.indice(0, c)] = PAREDE;
    g.celulas[g.indice(linhas - 1, c)] = PAREDE;
  }
  for (let l = 0; l < linhas; l++) {
    g.celulas[g.indice(l, 0)] = PAREDE;
    g.celulas[g.indice(l, colunas - 1)] = PAREDE;
  }
  const par = (a, b) => a + 2 * Math.floor(rng() * ((b - a) / 2 + 1)); // par entre a e b
  const impar = (a, b) => a + 2 * Math.floor(rng() * ((b - a) / 2 + 1)); // ímpar entre a e b
  // região de salas (coordenadas ímpares) de (l0, c0) a (l1, c1)
  const pilha = [[1, 1, linhas - 2, colunas - 2]];
  while (pilha.length) {
    const [l0, c0, l1, c1] = pilha.pop();
    const altura = l1 - l0;
    const largura = c1 - c0;
    if (altura < 2 || largura < 2) continue;
    const horizontal = altura > largura || (altura === largura && rng() < 0.5);
    if (horizontal) {
      const l = par(l0 + 1, l1 - 1);
      const passagem = impar(c0, c1);
      for (let c = c0; c <= c1; c++) if (c !== passagem) g.celulas[g.indice(l, c)] = PAREDE;
      pilha.push([l0, c0, l - 1, c1], [l + 1, c0, l1, c1]);
    } else {
      const c = par(c0 + 1, c1 - 1);
      const passagem = impar(l0, l1);
      for (let l = l0; l <= l1; l++) if (l !== passagem) g.celulas[g.indice(l, c)] = PAREDE;
      pilha.push([l0, c0, l1, c - 1], [l0, c + 1, l1, c1]);
    }
  }
  return g;
}

export function obstaculosAleatorios(linhas, colunas, rng, { paredes = 0.28, lama = 0 } = {}) {
  const g = new Grade(linhas, colunas);
  for (let i = 0; i < g.celulas.length; i++) {
    const r = rng();
    g.celulas[i] = r < paredes ? PAREDE : r < paredes + lama ? LAMA : LIVRE;
  }
  return g;
}

export const LABIRINTOS = {
  backtracker: { nome: 'Labirinto (backtracker recursivo)', gerar: labirintoBacktracker },
  prim: { nome: 'Labirinto (Prim aleatório)', gerar: labirintoPrim },
  divisao: { nome: 'Labirinto (divisão recursiva)', gerar: divisaoRecursiva },
  paredes: { nome: 'Paredes aleatórias', gerar: (l, c, r) => obstaculosAleatorios(l, c, r, { paredes: 0.28 }) },
  lama: { nome: 'Paredes e lama aleatórias', gerar: (l, c, r) => obstaculosAleatorios(l, c, r, { paredes: 0.2, lama: 0.25 }) },
};
