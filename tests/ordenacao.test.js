import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDENACOES, PRESETS, contarPasso, criarRng, executar, gerarVetor, intervalosCiura, novaEstatistica } from '../src/ordenacao.js';

const IDS = Object.keys(ORDENACOES);
const ordenadoCopia = (v) => [...v].sort((a, b) => a - b);

function inversoes(v) {
  let n = 0;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (v[i] > v[j]) n++;
  return n;
}

test('todos os algoritmos ordenam qualquer entrada', () => {
  const rng = criarRng(2026);
  const entradas = [[], [1], [2, 1], [1, 1, 1], [3, 1, 2, 3, 1]];
  for (let n = 0; n <= 60; n += 3) {
    for (const preset of Object.keys(PRESETS)) entradas.push(gerarVetor(preset, n, rng));
    entradas.push(Array.from({ length: n }, () => Math.floor(rng() * 1000))); // valores grandes e repetidos
  }
  for (const id of IDS) {
    for (const v of entradas) {
      const { ordenado } = executar(id, v);
      assert.deepEqual(ordenado, ordenadoCopia(v), `${id} com ${JSON.stringify(v)}`);
    }
  }
});

test('cada passo traz uma linha válida do pseudocódigo', () => {
  const v = gerarVetor('aleatorio', 25, criarRng(5));
  for (const id of IDS) {
    const a = [...v];
    const linhas = ORDENACOES[id].pseudocodigo.length;
    for (const passo of ORDENACOES[id].gerador(a)) {
      assert.ok(Number.isInteger(passo.linha) && passo.linha >= 1 && passo.linha <= linhas, `${id}: ${JSON.stringify(passo)}`);
      if (passo.tipo === 'comparar' || passo.tipo === 'trocar') {
        assert.ok(passo.i >= 0 && passo.i < a.length);
        assert.ok(passo.j === -1 || (passo.j >= 0 && passo.j < a.length));
      }
    }
  }
});

test('contagens conhecidas: bolha, inserção e seleção', () => {
  for (const n of [1, 2, 10, 33]) {
    const invertido = gerarVetor('invertido', n, criarRng(1));
    const ordenado = ordenadoCopia(invertido);
    const pares = (n * (n - 1)) / 2;
    // Bolha no pior caso: todas as comparações e todas as trocas.
    let r = executar('bolha', invertido).est;
    assert.equal(r.comparacoes, pares);
    assert.equal(r.trocas, pares);
    // Bolha num vetor já ordenado: uma passada (n - 1 comparações) e para.
    r = executar('bolha', ordenado).est;
    assert.equal(r.comparacoes, Math.max(0, n - 1));
    assert.equal(r.trocas, 0);
    // Inserção no melhor caso: n - 1 comparações.
    r = executar('insercao', ordenado).est;
    assert.equal(r.comparacoes, Math.max(0, n - 1));
    // Seleção compara sempre n(n - 1)/2 e troca no máximo n - 1 vezes.
    r = executar('selecao', invertido).est;
    assert.equal(r.comparacoes, pares);
    assert.ok(r.trocas <= Math.max(0, n - 1));
  }
});

test('bolha e inserção fazem exatamente uma troca por inversão', () => {
  const rng = criarRng(77);
  for (let k = 0; k < 40; k++) {
    const v = Array.from({ length: 1 + Math.floor(rng() * 40) }, () => Math.floor(rng() * 20));
    const inv = inversoes(v);
    assert.equal(executar('bolha', v).est.trocas, inv);
    assert.equal(executar('insercao', v).est.trocas, inv);
    // e a inserção compara no máximo inversões + n - 1 vezes
    assert.ok(executar('insercao', v).est.comparacoes <= inv + v.length - 1);
  }
});

test('limites de comparações dos algoritmos O(n log n)', () => {
  const rng = criarRng(11);
  for (const n of [16, 64, 200]) {
    const v = gerarVetor('aleatorio', n, rng);
    const lg = Math.ceil(Math.log2(n));
    // merge: no pior caso n·lg n - 2^lg n + 1 comparações; cada intercalação escreve
    // todos os elementos do trecho: E(n) = n + E(piso(n/2)) + E(teto(n/2))
    const escritas = (k) => (k < 2 ? 0 : k + escritas(Math.floor(k / 2)) + escritas(Math.ceil(k / 2)));
    const m = executar('merge', v).est;
    assert.ok(m.comparacoes <= n * lg - 2 ** lg + 1, `merge ${m.comparacoes}`);
    assert.equal(m.escritas, escritas(n));
    assert.equal(m.trocas, 0);
    const h = executar('heap', v).est;
    assert.ok(h.comparacoes <= 2 * n * lg + 2 * n, `heap ${h.comparacoes}`);
    for (const id of ['quickLomuto', 'quickHoare', 'shell']) {
      const q = executar(id, v).est;
      assert.ok(q.comparacoes < 4 * n * lg, `${id} ${q.comparacoes}`);
    }
    // contagem e radix não comparam: só leem e escrevem
    for (const id of ['counting', 'radix']) {
      const c = executar(id, v).est;
      assert.equal(c.comparacoes, 0);
      assert.equal(c.escritas % n, 0);
      assert.ok(c.leituras >= 2 * n);
    }
  }
});

test('o contador soma cada tipo de passo', () => {
  const est = novaEstatistica();
  for (const tipo of ['comparar', 'comparar', 'trocar', 'escrever', 'ler', 'ler', 'ler', 'pivo', 'linha']) {
    contarPasso(est, { tipo });
  }
  assert.deepEqual(est, { passos: 9, comparacoes: 2, trocas: 1, escritas: 1, leituras: 3 });
});

test('estabilidade: os estáveis preservam a ordem dos iguais', () => {
  const rng = criarRng(99);
  const chave = (x) => x.k;
  let instaveisPegos = 0;
  for (let rodada = 0; rodada < 30; rodada++) {
    const itens = Array.from({ length: 40 }, (_, id) => ({ k: Math.floor(rng() * 5), id }));
    for (const id of IDS) {
      const { ordenado } = executar(id, itens, chave);
      for (let i = 1; i < ordenado.length; i++) assert.ok(ordenado[i - 1].k <= ordenado[i].k, id);
      const estavel = ordenado.every((x, i) => i === 0 || ordenado[i - 1].k !== x.k || ordenado[i - 1].id < x.id);
      if (ORDENACOES[id].estavel) assert.ok(estavel, `${id} deveria ser estável`);
      else if (!estavel) instaveisPegos++;
    }
  }
  // Os instáveis de fato trocam a ordem de iguais em algum momento.
  assert.ok(instaveisPegos > 30);
  for (const id of ['bolha', 'insercao', 'merge', 'counting', 'radix']) assert.equal(ORDENACOES[id].estavel, true);
  for (const id of ['selecao', 'quickLomuto', 'quickHoare', 'heap', 'shell']) assert.equal(ORDENACOES[id].estavel, false);
});

test('contagem e radix recusam chaves negativas ou fracionárias', () => {
  assert.throws(() => executar('counting', [3, -1, 2]), /inteiras não negativas/);
  assert.throws(() => executar('radix', [1.5, 2]), /inteiras não negativas/);
  assert.deepEqual(executar('radix', [0, 0, 0]).ordenado, [0, 0, 0]);
  assert.deepEqual(executar('radix', [100, 9, 10, 99, 1000, 1]).ordenado, [1, 9, 10, 99, 100, 1000]);
});

test('vetores de entrada', () => {
  const rng = criarRng(3);
  const n = 50;
  const a = gerarVetor('aleatorio', n, rng);
  assert.deepEqual(ordenadoCopia(a), Array.from({ length: n }, (_, i) => i + 1)); // permutação de 1..n
  assert.deepEqual(gerarVetor('invertido', 5, rng), [5, 4, 3, 2, 1]);
  const quase = gerarVetor('quaseOrdenado', 100, rng);
  assert.ok(inversoes(quase) > 0 && inversoes(quase) < 30);
  const poucos = gerarVetor('poucosUnicos', 100, rng);
  assert.ok(new Set(poucos).size <= 5);
  // mesma semente, mesmo vetor
  assert.deepEqual(gerarVetor('aleatorio', 20, criarRng(8)), gerarVetor('aleatorio', 20, criarRng(8)));
  assert.deepEqual(intervalosCiura(200), [132, 57, 23, 10, 4, 1]);
  assert.deepEqual(intervalosCiura(1), []);
  assert.ok(intervalosCiura(5000)[0] > 1750);
});
