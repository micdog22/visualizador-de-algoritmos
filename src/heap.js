// Fila de prioridade com heap binário mínimo: inserir e tirar o menor custam O(log n).
// O heap fica num vetor: os filhos do nó i estão em 2i + 1 e 2i + 2.
export class HeapMinimo {
  // menor(a, b) diz se a vem antes de b
  constructor(menor = (a, b) => a < b) {
    this.itens = [];
    this.menor = menor;
  }

  get tamanho() {
    return this.itens.length;
  }

  inserir(x) {
    const v = this.itens;
    v.push(x);
    let i = v.length - 1;
    while (i > 0) {
      const pai = (i - 1) >> 1;
      if (!this.menor(v[i], v[pai])) break;
      [v[i], v[pai]] = [v[pai], v[i]];
      i = pai;
    }
  }

  topo() {
    return this.itens[0];
  }

  remover() {
    const v = this.itens;
    if (v.length === 0) return undefined;
    const raiz = v[0];
    const ultimo = v.pop();
    if (v.length > 0) {
      v[0] = ultimo;
      let i = 0;
      for (;;) {
        const e = 2 * i + 1;
        const d = e + 1;
        let m = i;
        if (e < v.length && this.menor(v[e], v[m])) m = e;
        if (d < v.length && this.menor(v[d], v[m])) m = d;
        if (m === i) break;
        [v[i], v[m]] = [v[m], v[i]];
        i = m;
      }
    }
    return raiz;
  }
}
