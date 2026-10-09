// Algoritmos de ordenação como geradores (function*). Cada um ordena o vetor no lugar
// e, a cada operação, entrega um passo que diz o que aconteceu e em que linha do
// pseudocódigo. A interface só desenha os passos; os testes os contam.
//
// Tipos de passo:
//   comparar { i, j }    compara A[i] com A[j] (j = -1: compara com o pivô guardado)
//   trocar   { i, j }    A[i] e A[j] trocaram de lugar (já aconteceu)
//   escrever { i }       A[i] recebeu um valor vindo do vetor auxiliar
//   ler      { i }       A[i] foi lido para contar (counting e radix não comparam)
//   pivo     { i }       destaca o pivô
//   ordenado { i }       A[i] chegou à posição final
// Todos trazem `linha`, o número da linha do pseudocódigo.

const identidade = (x) => x;

function trocar(a, i, j) {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
}

function* bolha(a, chave = identidade) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let trocou = false;
    for (let j = 0; j < n - 1 - i; j++) {
      yield { tipo: 'comparar', i: j, j: j + 1, linha: 4 };
      if (chave(a[j]) > chave(a[j + 1])) {
        trocar(a, j, j + 1);
        trocou = true;
        yield { tipo: 'trocar', i: j, j: j + 1, linha: 5 };
      }
    }
    yield { tipo: 'ordenado', i: n - 1 - i, linha: 6 };
    if (!trocou) {
      yield { tipo: 'linha', linha: 7 };
      return;
    }
  }
}

function* insercao(a, chave = identidade) {
  for (let i = 1; i < a.length; i++) {
    yield { tipo: 'linha', linha: 2 };
    let j = i;
    while (j > 0) {
      yield { tipo: 'comparar', i: j - 1, j, linha: 3 };
      if (!(chave(a[j - 1]) > chave(a[j]))) break;
      trocar(a, j - 1, j);
      yield { tipo: 'trocar', i: j - 1, j, linha: 4 };
      j--;
      yield { tipo: 'linha', linha: 5 };
    }
  }
}

function* selecao(a, chave = identidade) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let menor = i;
    yield { tipo: 'pivo', i, linha: 2 };
    for (let j = i + 1; j < n; j++) {
      yield { tipo: 'comparar', i: j, j: menor, linha: 4 };
      if (chave(a[j]) < chave(a[menor])) {
        menor = j;
        yield { tipo: 'pivo', i: menor, linha: 5 };
      }
    }
    if (menor !== i) {
      trocar(a, i, menor);
      yield { tipo: 'trocar', i, j: menor, linha: 6 };
    }
    yield { tipo: 'ordenado', i, linha: 7 };
  }
}

function* mergeSort(a, chave = identidade) {
  const b = new Array(a.length);
  function* ordenar(ini, fim) {
    if (fim - ini < 2) return;
    const meio = (ini + fim) >> 1;
    yield { tipo: 'linha', linha: 3 };
    yield* ordenar(ini, meio);
    yield* ordenar(meio, fim);
    for (let k = ini; k < fim; k++) b[k] = a[k];
    yield { tipo: 'linha', linha: 5 };
    let i = ini;
    let j = meio;
    for (let k = ini; k < fim; k++) {
      let daEsquerda;
      if (i < meio && j < fim) {
        yield { tipo: 'comparar', i, j, linha: 8 };
        daEsquerda = chave(b[i]) <= chave(b[j]); // <= mantém a ordem dos iguais: estável
      } else {
        daEsquerda = i < meio;
      }
      if (daEsquerda) {
        a[k] = b[i++];
        yield { tipo: 'escrever', i: k, linha: 9 };
      } else {
        a[k] = b[j++];
        yield { tipo: 'escrever', i: k, linha: 10 };
      }
    }
  }
  yield* ordenar(0, a.length);
}

function* quickLomuto(a, chave = identidade) {
  function* ordenar(lo, hi) {
    if (lo >= hi) {
      if (lo === hi) yield { tipo: 'ordenado', i: lo, linha: 2 };
      return;
    }
    const pivo = chave(a[hi]);
    yield { tipo: 'pivo', i: hi, linha: 3 };
    let i = lo;
    for (let j = lo; j < hi; j++) {
      yield { tipo: 'comparar', i: j, j: hi, linha: 5 };
      if (chave(a[j]) < pivo) {
        if (i !== j) {
          trocar(a, i, j);
          yield { tipo: 'trocar', i, j, linha: 6 };
        }
        i++;
      }
    }
    if (i !== hi) {
      trocar(a, i, hi);
      yield { tipo: 'trocar', i, j: hi, linha: 7 };
    }
    yield { tipo: 'ordenado', i, linha: 7 };
    yield* ordenar(lo, i - 1);
    yield* ordenar(i + 1, hi);
  }
  yield* ordenar(0, a.length - 1);
}

function* quickHoare(a, chave = identidade) {
  function* ordenar(lo, hi) {
    if (lo >= hi) return;
    const m = (lo + hi) >> 1;
    const pivo = chave(a[m]);
    yield { tipo: 'pivo', i: m, linha: 3 };
    let i = lo - 1;
    let j = hi + 1;
    for (;;) {
      do {
        i++;
        yield { tipo: 'comparar', i, j: -1, linha: 5 };
      } while (chave(a[i]) < pivo);
      do {
        j--;
        yield { tipo: 'comparar', i: j, j: -1, linha: 6 };
      } while (chave(a[j]) > pivo);
      if (i >= j) {
        yield { tipo: 'linha', linha: 7 };
        break;
      }
      trocar(a, i, j);
      yield { tipo: 'trocar', i, j, linha: 8 };
    }
    yield* ordenar(lo, j);
    yield* ordenar(j + 1, hi);
  }
  yield* ordenar(0, a.length - 1);
}

function* heapSort(a, chave = identidade) {
  const n = a.length;
  function* descer(i, tamanho) {
    for (;;) {
      const e = 2 * i + 1;
      if (e >= tamanho) return;
      let filho = e;
      if (e + 1 < tamanho) {
        yield { tipo: 'comparar', i: e, j: e + 1, linha: 7 };
        if (chave(a[e + 1]) > chave(a[e])) filho = e + 1;
      }
      yield { tipo: 'comparar', i, j: filho, linha: 8 };
      if (chave(a[i]) >= chave(a[filho])) return;
      trocar(a, i, filho);
      yield { tipo: 'trocar', i, j: filho, linha: 9 };
      i = filho;
    }
  }
  for (let i = (n >> 1) - 1; i >= 0; i--) {
    yield { tipo: 'linha', linha: 1 };
    yield* descer(i, n);
  }
  for (let fim = n - 1; fim >= 1; fim--) {
    trocar(a, 0, fim);
    yield { tipo: 'trocar', i: 0, j: fim, linha: 3 };
    yield { tipo: 'ordenado', i: fim, linha: 3 };
    yield* descer(0, fim);
  }
}

// Sequência de intervalos de Marcin Ciura (2001), a melhor conhecida na prática.
export function intervalosCiura(n) {
  const h = [1, 4, 10, 23, 57, 132, 301, 701, 1750];
  while (h[h.length - 1] < n) h.push(Math.floor(h[h.length - 1] * 2.25));
  return h.filter((x) => x < n).reverse();
}

function* shellSort(a, chave = identidade) {
  const n = a.length;
  for (const h of intervalosCiura(n)) {
    yield { tipo: 'linha', linha: 1 };
    for (let i = h; i < n; i++) {
      let j = i;
      while (j >= h) {
        yield { tipo: 'comparar', i: j - h, j, linha: 4 };
        if (!(chave(a[j - h]) > chave(a[j]))) break;
        trocar(a, j - h, j);
        yield { tipo: 'trocar', i: j - h, j, linha: 5 };
        j -= h;
      }
    }
  }
}

function exigirInteiros(a, chave) {
  for (const x of a) {
    const k = chave(x);
    if (!Number.isInteger(k) || k < 0) throw new RangeError('counting e radix pedem chaves inteiras não negativas');
  }
}

function* countingSort(a, chave = identidade) {
  exigirInteiros(a, chave);
  const n = a.length;
  if (n === 0) return;
  let k = 0;
  for (const x of a) k = Math.max(k, chave(x));
  const c = new Array(k + 1).fill(0);
  for (let i = 0; i < n; i++) {
    c[chave(a[i])]++;
    yield { tipo: 'ler', i, linha: 3 };
  }
  for (let v = 1; v <= k; v++) c[v] += c[v - 1];
  yield { tipo: 'linha', linha: 4 };
  const b = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    const v = chave(a[i]);
    c[v]--;
    b[c[v]] = a[i]; // de trás para frente: entre iguais, o último vai mais para o fim
    yield { tipo: 'ler', i, linha: 6 };
  }
  for (let i = 0; i < n; i++) {
    a[i] = b[i];
    yield { tipo: 'escrever', i, linha: 7 };
  }
}

function* radixLsd(a, chave = identidade) {
  exigirInteiros(a, chave);
  const n = a.length;
  if (n === 0) return;
  let maior = 0;
  for (const x of a) maior = Math.max(maior, chave(x));
  const b = new Array(n);
  for (let base = 1; base === 1 || base <= maior; base *= 10) {
    yield { tipo: 'linha', linha: 1 };
    const c = new Array(10).fill(0);
    const digito = (x) => Math.floor(chave(x) / base) % 10;
    for (let i = 0; i < n; i++) {
      c[digito(a[i])]++;
      yield { tipo: 'ler', i, linha: 2 };
    }
    for (let d = 1; d < 10; d++) c[d] += c[d - 1];
    yield { tipo: 'linha', linha: 3 };
    for (let i = n - 1; i >= 0; i--) {
      const d = digito(a[i]);
      c[d]--;
      b[c[d]] = a[i];
      yield { tipo: 'ler', i, linha: 4 };
    }
    for (let i = 0; i < n; i++) {
      a[i] = b[i];
      yield { tipo: 'escrever', i, linha: 5 };
    }
    if (base > maior / 10) break; // evita estourar com chaves muito grandes
  }
}

export const ORDENACOES = {
  bolha: {
    nome: 'Bubble sort (bolha)',
    gerador: bolha,
    estavel: true,
    tempo: ['O(n)', 'O(n²)', 'O(n²)'],
    memoria: 'O(1)',
    pseudocodigo: [
      'para i de 0 até n - 2',
      '  trocou = falso',
      '  para j de 0 até n - 2 - i',
      '    se A[j] > A[j + 1]',
      '      troque A[j] e A[j + 1]; trocou = verdadeiro',
      '  A[n - 1 - i] já está no lugar',
      '  se não trocou nada, pare: está ordenado',
    ],
  },
  insercao: {
    nome: 'Insertion sort (inserção)',
    gerador: insercao,
    estavel: true,
    tempo: ['O(n)', 'O(n²)', 'O(n²)'],
    memoria: 'O(1)',
    pseudocodigo: [
      'para i de 1 até n - 1',
      '  j = i',
      '  enquanto j > 0 e A[j - 1] > A[j]',
      '    troque A[j - 1] e A[j]',
      '    j = j - 1',
    ],
  },
  selecao: {
    nome: 'Selection sort (seleção)',
    gerador: selecao,
    estavel: false,
    tempo: ['O(n²)', 'O(n²)', 'O(n²)'],
    memoria: 'O(1)',
    pseudocodigo: [
      'para i de 0 até n - 2',
      '  menor = i',
      '  para j de i + 1 até n - 1',
      '    se A[j] < A[menor]',
      '      menor = j',
      '  troque A[i] e A[menor]',
      '  A[i] já está no lugar',
    ],
  },
  merge: {
    nome: 'Merge sort (intercalação)',
    gerador: mergeSort,
    estavel: true,
    tempo: ['O(n log n)', 'O(n log n)', 'O(n log n)'],
    memoria: 'O(n)',
    pseudocodigo: [
      'ordenar(ini, fim):',
      '  se fim - ini < 2, retorne',
      '  meio = (ini + fim) / 2',
      '  ordenar(ini, meio); ordenar(meio, fim)',
      '  copie A[ini..fim) para o auxiliar B',
      '  i = ini; j = meio',
      '  para k de ini até fim - 1',
      '    se j >= fim ou (i < meio e B[i] <= B[j])',
      '      A[k] = B[i]; i = i + 1',
      '    senão A[k] = B[j]; j = j + 1',
    ],
  },
  quickLomuto: {
    nome: 'Quicksort (partição de Lomuto)',
    gerador: quickLomuto,
    estavel: false,
    tempo: ['O(n log n)', 'O(n log n)', 'O(n²)'],
    memoria: 'O(log n)',
    pseudocodigo: [
      'quicksort(lo, hi):',
      '  se lo >= hi, retorne',
      '  pivô = A[hi]; i = lo',
      '  para j de lo até hi - 1',
      '    se A[j] < pivô',
      '      troque A[i] e A[j]; i = i + 1',
      '  troque A[i] e A[hi]: o pivô chega ao lugar final',
      '  quicksort(lo, i - 1); quicksort(i + 1, hi)',
    ],
  },
  quickHoare: {
    nome: 'Quicksort (partição de Hoare)',
    gerador: quickHoare,
    estavel: false,
    tempo: ['O(n log n)', 'O(n log n)', 'O(n²)'],
    memoria: 'O(log n)',
    pseudocodigo: [
      'quicksort(lo, hi):',
      '  se lo >= hi, retorne',
      '  pivô = A[(lo + hi) / 2]; i = lo - 1; j = hi + 1',
      '  repita',
      '    avance i enquanto A[i] < pivô',
      '    recue j enquanto A[j] > pivô',
      '    se i >= j, a partição termina em j',
      '    troque A[i] e A[j]',
      '  quicksort(lo, j); quicksort(j + 1, hi)',
    ],
  },
  heap: {
    nome: 'Heapsort',
    gerador: heapSort,
    estavel: false,
    tempo: ['O(n log n)', 'O(n log n)', 'O(n log n)'],
    memoria: 'O(1)',
    pseudocodigo: [
      'monte o heap máximo: desça(i, n) para i de n/2 - 1 até 0',
      'para fim de n - 1 até 1',
      '  troque A[0] e A[fim]: o maior vai para o fim',
      '  desça(0, fim)',
      'desça(i, tamanho):',
      '  enquanto i tiver filho',
      '    filho = o maior dos dois filhos',
      '    se A[i] >= A[filho], pare',
      '    troque A[i] e A[filho]; i = filho',
    ],
  },
  shell: {
    nome: 'Shell sort (intervalos de Ciura)',
    gerador: shellSort,
    estavel: false,
    tempo: ['O(n log n)', 'cerca de O(n^1,3)', 'O(n²)'],
    memoria: 'O(1)',
    pseudocodigo: [
      'para cada intervalo h (..., 57, 23, 10, 4, 1) menor que n',
      '  para i de h até n - 1',
      '    j = i',
      '    enquanto j >= h e A[j - h] > A[j]',
      '      troque A[j - h] e A[j]',
      '      j = j - h',
    ],
  },
  counting: {
    nome: 'Counting sort (contagem)',
    gerador: countingSort,
    estavel: true,
    tempo: ['O(n + k)', 'O(n + k)', 'O(n + k)'],
    memoria: 'O(n + k)',
    pseudocodigo: [
      'k = maior valor de A',
      'C = vetor com k + 1 zeros',
      'para cada x de A: C[x] = C[x] + 1',
      'para v de 1 até k: C[v] = C[v] + C[v - 1]',
      'para i de n - 1 até 0 (de trás para frente: estável)',
      '  C[A[i]] = C[A[i]] - 1; B[C[A[i]]] = A[i]',
      'copie B para A',
    ],
  },
  radix: {
    nome: 'Radix sort LSD (base 10)',
    gerador: radixLsd,
    estavel: true,
    tempo: ['O(d·(n + 10))', 'O(d·(n + 10))', 'O(d·(n + 10))'],
    memoria: 'O(n)',
    pseudocodigo: [
      'para cada dígito, das unidades até o mais alto',
      '  conte quantos elementos têm cada dígito (0 a 9)',
      '  transforme as contagens em posições (soma acumulada)',
      '  de trás para frente, ponha cada elemento na posição do seu dígito em B',
      '  copie B para A',
    ],
  },
};

export function novaEstatistica() {
  return { passos: 0, comparacoes: 0, trocas: 0, escritas: 0, leituras: 0 };
}

export function contarPasso(est, passo) {
  est.passos++;
  if (passo.tipo === 'comparar') est.comparacoes++;
  else if (passo.tipo === 'trocar') est.trocas++;
  else if (passo.tipo === 'escrever') est.escritas++;
  else if (passo.tipo === 'ler') est.leituras++;
  return est;
}

// Roda um algoritmo até o fim numa cópia e devolve o vetor ordenado e os contadores.
export function executar(id, valores, chave = identidade) {
  const a = [...valores];
  const est = novaEstatistica();
  for (const passo of ORDENACOES[id].gerador(a, chave)) contarPasso(est, passo);
  return { ordenado: a, est };
}

// ---------------------------------------------------------------------------
// Vetores de entrada
// ---------------------------------------------------------------------------

// Gerador pseudoaleatório pequeno e com semente (mulberry32).
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

function embaralhar(v, rng) {
  for (let i = v.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [v[i], v[j]] = [v[j], v[i]];
  }
  return v;
}

export const PRESETS = {
  aleatorio: 'Aleatório',
  quaseOrdenado: 'Quase ordenado',
  invertido: 'Invertido',
  poucosUnicos: 'Poucos valores únicos',
};

export function gerarVetor(tipo, n, rng) {
  const base = Array.from({ length: n }, (_, i) => i + 1);
  if (n < 2) return base;
  switch (tipo) {
    case 'quaseOrdenado': {
      // ordenado, com uns 5% de trocas entre vizinhos próximos
      for (let k = 0; k < Math.max(1, Math.round(n * 0.05)); k++) {
        const i = Math.floor(rng() * n);
        const j = Math.min(n - 1, i + 1 + Math.floor(rng() * 3));
        [base[i], base[j]] = [base[j], base[i]];
      }
      return base;
    }
    case 'invertido':
      return base.reverse();
    case 'poucosUnicos': {
      const niveis = [0.2, 0.4, 0.6, 0.8, 1].map((f) => Math.max(1, Math.round(f * n)));
      return Array.from({ length: n }, () => niveis[Math.floor(rng() * niveis.length)]);
    }
    default:
      return embaralhar(base, rng);
  }
}
