import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/caminhos.js';
import { HeapMinimo } from '../src/heap.js';

const { Grade, LIVRE, PAREDE, LAMA } = C;

function gradeAleatoria(rng, linhas, colunas, paredes, lama) {
  const g = C.obstaculosAleatorios(linhas, colunas, rng, { paredes, lama });
  return g;
}

function abrir(g, ...celulas) {
  for (const i of celulas) g.celulas[i] = LIVRE;
}

// Confere que o caminho é contínuo, não atravessa paredes nem corta quinas.
function caminhoValido(g, caminho, inicio, fim, diagonal) {
  if (caminho[0] !== inicio || caminho[caminho.length - 1] !== fim) return false;
  for (let k = 1; k < caminho.length; k++) {
    const a = caminho[k - 1];
    const b = caminho[k];
    if (g.bloqueada(b)) return false;
    const vizinho = C.vizinhos(g, a, diagonal).some((v) => v.j === b);
    if (!vizinho) return false;
  }
  return true;
}

test('heap mínimo devolve em ordem', () => {
  const h = new HeapMinimo();
  let s = 1;
  const valores = [];
  for (let i = 0; i < 500; i++) {
    s = (s * 48271) % 2147483647;
    valores.push(s % 1000);
    h.inserir(s % 1000);
  }
  const saida = [];
  while (h.tamanho) saida.push(h.remover());
  assert.deepEqual(saida, valores.sort((a, b) => a - b));
  assert.equal(h.remover(), undefined);
  const m = new HeapMinimo((a, b) => a.p > b.p); // comparador próprio: heap máximo
  [3, 9, 1].forEach((p) => m.inserir({ p }));
  assert.equal(m.topo().p, 9);
});

test('vizinhos: pesos, diagonais e sem cortar quinas', () => {
  const g = new Grade(3, 3);
  const centro = g.indice(1, 1);
  assert.equal(C.vizinhos(g, centro, false).length, 4);
  assert.equal(C.vizinhos(g, centro, true).length, 8);
  g.celulas[g.indice(0, 1)] = PAREDE; // parede em cima
  const v = C.vizinhos(g, centro, true).map((x) => x.j);
  assert.ok(!v.includes(g.indice(0, 0)) && !v.includes(g.indice(0, 2))); // as duas diagonais de cima cortariam a quina
  g.celulas[g.indice(1, 2)] = LAMA;
  const lama = C.vizinhos(g, centro, true).find((x) => x.j === g.indice(1, 2));
  assert.equal(lama.custo, C.PESO_LAMA);
  const diag = C.vizinhos(g, centro, true).find((x) => x.j === g.indice(2, 2));
  assert.ok(Math.abs(diag.custo - Math.SQRT2) < 1e-15);
});

test('heurísticas nunca superestimam (com o vizinho certo)', () => {
  for (let dl = 0; dl < 20; dl++) {
    for (let dc = 0; dc < 20; dc++) {
      const real4 = dl + dc; // custo mínimo sem diagonal
      const real8 = Math.max(dl, dc) + (Math.SQRT2 - 1) * Math.min(dl, dc); // com diagonal
      assert.ok(C.HEURISTICAS.manhattan.f(dl, dc) <= real4 + 1e-12);
      assert.ok(C.HEURISTICAS.euclidiana.f(dl, dc) <= real8 + 1e-12);
      assert.ok(Math.abs(C.HEURISTICAS.octil.f(dl, dc) - real8) < 1e-12);
    }
  }
  // Com diagonais, a Manhattan passa do custo real: não é admissível.
  assert.ok(C.HEURISTICAS.manhattan.f(5, 5) > 5 * Math.SQRT2);
});

test('Dijkstra e A* (heurísticas admissíveis) acham o mesmo custo ótimo', () => {
  const rng = C.criarRng(2024);
  let comparados = 0;
  for (let rodada = 0; rodada < 60; rodada++) {
    const diagonal = rodada % 2 === 1;
    const g = gradeAleatoria(rng, 15 + (rodada % 7), 20 + (rodada % 9), 0.25, 0.2);
    const inicio = 0;
    const fim = g.celulas.length - 1;
    abrir(g, inicio, fim);
    const d = C.executarBusca('dijkstra', g, inicio, fim, { diagonal });
    const heuristicas = diagonal ? ['euclidiana', 'octil'] : ['manhattan', 'euclidiana', 'octil'];
    for (const h of heuristicas) {
      const a = C.executarBusca('astar', g, inicio, fim, { diagonal, heuristica: h });
      assert.equal(a.encontrado, d.encontrado);
      if (d.encontrado) {
        assert.ok(Math.abs(a.custo - d.custo) < 1e-9, `${h}: ${a.custo} vs ${d.custo}`);
        assert.ok(caminhoValido(g, a.caminho, inicio, fim, diagonal));
        // a heurística poupa trabalho
        assert.ok(a.expandidos <= d.expandidos);
        comparados++;
      }
    }
    if (d.encontrado) assert.ok(caminhoValido(g, d.caminho, inicio, fim, diagonal));
  }
  assert.ok(comparados > 50, String(comparados));
});

test('BFS e BFS bidirecional são ótimos em passos numa grade sem pesos', () => {
  const rng = C.criarRng(7);
  let achados = 0;
  for (let rodada = 0; rodada < 60; rodada++) {
    const diagonal = rodada % 3 === 0;
    const g = gradeAleatoria(rng, 12 + (rodada % 10), 18 + (rodada % 6), 0.3, 0);
    const inicio = g.indice(0, 0);
    const fim = g.indice(g.linhas - 1, g.colunas - 1);
    abrir(g, inicio, fim);
    const b = C.executarBusca('bfs', g, inicio, fim, { diagonal });
    const bi = C.executarBusca('bidirecional', g, inicio, fim, { diagonal });
    assert.equal(bi.encontrado, b.encontrado);
    if (!b.encontrado) continue;
    achados++;
    assert.equal(bi.passos, b.passos);
    assert.ok(caminhoValido(g, bi.caminho, inicio, fim, diagonal));
    if (!diagonal) {
      // sem pesos e sem diagonais, passos = custo: BFS empata com Dijkstra
      const d = C.executarBusca('dijkstra', g, inicio, fim, { diagonal });
      assert.equal(b.custo, d.custo);
      assert.equal(b.passos, d.custo);
    }
    // DFS e gulosa acham caminho (não necessariamente o menor)
    for (const id of ['dfs', 'gulosa']) {
      const r = C.executarBusca(id, g, inicio, fim, { diagonal, heuristica: 'euclidiana' });
      assert.ok(r.encontrado && caminhoValido(g, r.caminho, inicio, fim, diagonal), id);
      assert.ok(r.custo >= b.custo - 1e-9);
    }
  }
  assert.ok(achados > 20, String(achados));
});

test('fim inalcançável: todos terminam sem caminho', () => {
  const g = new Grade(9, 9);
  for (let l = 0; l < 9; l++) g.celulas[g.indice(l, 4)] = PAREDE; // muro de cima a baixo
  const inicio = g.indice(4, 0);
  const fim = g.indice(4, 8);
  for (const id of Object.keys(C.BUSCAS)) {
    for (const diagonal of [false, true]) {
      const r = C.executarBusca(id, g, inicio, fim, { diagonal, heuristica: 'octil' });
      assert.equal(r.encontrado, false, id);
      assert.deepEqual(r.caminho, []);
      assert.equal(r.custo, Infinity);
      assert.ok(r.expandidos >= 1);
    }
  }
});

test('início igual ao fim e passos coerentes', () => {
  const g = new Grade(5, 5);
  for (const id of Object.keys(C.BUSCAS)) {
    const r = C.executarBusca(id, g, 12, 12, {});
    assert.ok(r.encontrado, id);
    assert.deepEqual(r.caminho, [12]);
    assert.equal(r.custo, 0);
  }
  // A sequência de passos termina com o caminho, e cada célula visitada foi antes fronteira.
  const it = C.BUSCAS.astar.gerador(g, 0, 24, { heuristica: 'manhattan' });
  const fronteira = new Set();
  let ultimo = null;
  for (let r = it.next(); !r.done; r = it.next()) {
    const p = r.value;
    if (p.tipo === 'fronteira') fronteira.add(p.celula);
    if (p.tipo === 'visitar') assert.ok(fronteira.has(p.celula));
    ultimo = p;
  }
  assert.equal(ultimo.tipo, 'caminho');
  assert.equal(ultimo.celulas.length, 9);
});

test('lama: Dijkstra contorna, BFS atravessa', () => {
  const g = new Grade(3, 7);
  // faixa de lama no meio da linha 1, com desvio livre pela linha 0
  for (let c = 1; c <= 5; c++) g.celulas[g.indice(1, c)] = LAMA;
  for (let c = 0; c < 7; c++) g.celulas[g.indice(2, c)] = PAREDE;
  const inicio = g.indice(1, 0);
  const fim = g.indice(1, 6);
  const b = C.executarBusca('bfs', g, inicio, fim, {});
  const d = C.executarBusca('dijkstra', g, inicio, fim, {});
  assert.equal(b.passos, 6);
  assert.equal(b.custo, 5 * C.PESO_LAMA + 1); // reto pela lama
  assert.equal(d.custo, 8); // sobe, anda pela linha 0 e desce
});

// Labirinto perfeito: as células livres formam uma árvore (conexa e com V - 1 ligações).
function ehArvore(g) {
  const livres = [];
  for (let i = 0; i < g.celulas.length; i++) if (!g.bloqueada(i)) livres.push(i);
  let arestas = 0;
  for (const i of livres) {
    for (const { j } of C.vizinhos(g, i, false)) if (j > i) arestas++;
  }
  const r = C.executarBusca('bfs', g, livres[0], livres[livres.length - 1], {});
  // conta quantas células a BFS alcança a partir da primeira
  let alcancadas = 0;
  const visto = new Uint8Array(g.celulas.length);
  const fila = [livres[0]];
  visto[livres[0]] = 1;
  while (fila.length) {
    const a = fila.pop();
    alcancadas++;
    for (const { j } of C.vizinhos(g, a, false)) if (!visto[j]) {
      visto[j] = 1;
      fila.push(j);
    }
  }
  return r.encontrado && alcancadas === livres.length && arestas === livres.length - 1;
}

test('geradores de labirinto produzem labirintos perfeitos', () => {
  for (const id of ['backtracker', 'prim', 'divisao']) {
    for (let semente = 1; semente <= 6; semente++) {
      const g = C.LABIRINTOS[id].gerar(21, 31, C.criarRng(semente));
      assert.ok(ehArvore(g), `${id} semente ${semente}`);
      assert.ok(!g.bloqueada(g.indice(1, 1)) && !g.bloqueada(g.indice(19, 29)), id);
      const r = C.executarBusca('bfs', g, g.indice(1, 1), g.indice(19, 29), {});
      assert.ok(r.encontrado);
    }
  }
  // mesma semente, mesmo labirinto
  const a = C.labirintoBacktracker(15, 15, C.criarRng(9));
  const b = C.labirintoBacktracker(15, 15, C.criarRng(9));
  assert.deepEqual(a.celulas, b.celulas);
  const o = C.obstaculosAleatorios(30, 30, C.criarRng(1), { paredes: 0.3, lama: 0.2 });
  const paredes = o.celulas.filter((x) => x === PAREDE).length / 900;
  const lamas = o.celulas.filter((x) => x === LAMA).length / 900;
  assert.ok(Math.abs(paredes - 0.3) < 0.05 && Math.abs(lamas - 0.2) < 0.05);
});
