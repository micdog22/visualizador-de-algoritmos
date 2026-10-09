# Visualizador de Algoritmos

Veja dez algoritmos de ordenação e seis buscas em grafos acontecendo passo a passo, com o pseudocódigo destacando a linha atual e contadores de comparações, trocas e células visitadas. Cada algoritmo é um gerador (`function*`) de verdade, então o mesmo código que anima a tela é testado no Node.

**Acesse online:** https://micdog22.github.io/visualizador-de-algoritmos/

## Recursos

**Ordenação**

- Bubble, insertion, selection, merge, quicksort com partição de **Lomuto** e de **Hoare**, heapsort, shell sort (intervalos de Ciura), counting e radix LSD.
- Barras animadas com cores para comparação, troca, escrita, pivô e posição final.
- Iniciar, pausar, um passo por vez e velocidade de 1 a 3000 passos por segundo.
- Contadores de comparações, trocas, escritas e leituras, e o pseudocódigo com a linha atual destacada.
- Entradas: aleatória, quase ordenada, invertida e com poucos valores únicos, de 8 a 200 elementos.
- **Comparar todos**: roda os dez algoritmos no mesmo vetor e monta uma tabela com as contagens.

**Caminhos em grade**

- BFS, DFS, Dijkstra, **A\*** (heurísticas Manhattan, Euclidiana e octil), busca gulosa e BFS bidirecional.
- Paredes e células de **lama** (custo 5) desenhadas com o mouse ou o dedo; início e fim arrastáveis.
- Movimento em diagonal opcional, sem cortar quinas de paredes.
- Geradores de labirinto (backtracker recursivo, Prim aleatório, divisão recursiva) e de obstáculos aleatórios.
- Cores para fronteira, visitados e caminho; contadores de células expandidas, fronteira, passos e custo.
- **Comparar todos**: os algoritmos na mesma grade, com o menor custo destacado.

## Como usar

1. Escolha o algoritmo e a entrada, ajuste o tamanho e a velocidade e clique em **Iniciar**. Em **Um passo**, a linha do status descreve exatamente o que aconteceu ("Comparando A[3] = 17 com A[4] = 9").
2. Na aba **Caminhos em grade**, desenhe paredes (ou lama) arrastando sobre a grade, ou gere um labirinto, e rode a busca. Clicar numa célula que já é parede apaga.
3. Use **Comparar todos** para ver lado a lado quanto trabalho cada algoritmo fez.

Experiências que mostram a teoria abaixo:

- Insertion sort numa entrada **quase ordenada** termina rapidíssimo; selection sort faz as mesmas comparações que faria numa aleatória.
- Quicksort de Lomuto numa entrada **invertida** ou **quase ordenada** cai no pior caso (com 200 elementos, 19.900 comparações), porque o pivô é o último elemento; o de Hoare, com o pivô no meio, fica abaixo de 2.000. Com **poucos valores únicos**, o Lomuto também perde feio.
- Com **lama**, a BFS atravessa o lamaçal (menos passos), o Dijkstra contorna (menor custo) e o A* chega ao mesmo custo do Dijkstra expandindo menos células.
- Ligue as diagonais e escolha a heurística **Manhattan**: o A* pode devolver um caminho mais caro, porque a heurística deixa de ser admissível.

## Como rodar localmente

```
python3 -m http.server 8000
```

e abra http://localhost:8000.

## Testes

```
node --test
```

Node 18 ou mais novo, sem dependências. São 18 testes:

- **Ordenação**: os dez algoritmos ordenam centenas de vetores (vazios, unitários, repetidos, valores grandes e os quatro tipos de entrada); todo passo aponta uma linha válida do pseudocódigo.
- **Contagens conhecidas**: bubble no pior caso faz n(n - 1)/2 comparações e trocas e, num vetor ordenado, só n - 1 comparações; selection sempre compara n(n - 1)/2; **bubble e insertion fazem exatamente uma troca por inversão**; merge respeita o limite de n·lg n - 2^lg n + 1 comparações e escreve E(n) = n + E(piso(n/2)) + E(teto(n/2)) vezes; counting e radix não comparam nada.
- **Estabilidade**: bubble, insertion, merge, counting e radix preservam a ordem de chaves iguais; os outros cinco são flagrados trocando iguais de ordem.
- **Caminhos**: em 60 grades aleatórias com paredes e lama, Dijkstra e A* (com heurísticas admissíveis) dão o mesmo custo, e o A* expande no máximo o que o Dijkstra expande; BFS e BFS bidirecional dão o mesmo número de passos, e sem pesos nem diagonais esse número é o custo do Dijkstra; caminhos são contínuos, sem paredes e sem cortar quinas; destino inalcançável termina em todos os algoritmos.
- **Heurísticas**: nenhuma superestima o custo real (exceto a Manhattan com diagonais, como esperado).
- **Labirintos**: os três geradores produzem labirintos perfeitos, conferidos como árvores (conexos e com exatamente V - 1 ligações entre V células livres).

## Como funciona

### Algoritmos como geradores

Um gerador (`function*`) é uma função que pode pausar no meio: a cada `yield` ele entrega um valor e congela, e só continua quando alguém pede o próximo. Isso é perfeito para animação. O bubble sort daqui é o bubble sort de sempre, com um `yield` antes de cada comparação e depois de cada troca:

```js
function* bolha(a) {
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < a.length - 1 - i; j++) {
      yield { tipo: 'comparar', i: j, j: j + 1, linha: 4 };
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        yield { tipo: 'trocar', i: j, j: j + 1, linha: 5 };
      }
    }
  }
}
```

A tela pede passos no ritmo escolhido (vários por quadro em velocidade alta) e desenha uma vez por quadro. Os testes pedem todos os passos de uma vez, contam e conferem. Como as funções recursivas (merge, quick) usam `yield*` para delegar às chamadas internas, nem a recursão precisa mudar.

### Ordenação

| Algoritmo | Melhor | Médio | Pior | Memória extra | Estável |
|---|---|---|---|---|---|
| Bubble | O(n) | O(n²) | O(n²) | O(1) | sim |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | sim |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | não |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | sim |
| Quicksort (Lomuto ou Hoare) | O(n log n) | O(n log n) | O(n²) | O(log n) | não |
| Heapsort | O(n log n) | O(n log n) | O(n log n) | O(1) | não |
| Shell (Ciura) | O(n log n) | cerca de O(n^1,3) | O(n²) | O(1) | não |
| Counting | O(n + k) | O(n + k) | O(n + k) | O(n + k) | sim |
| Radix LSD (base 10) | O(d·(n + 10)) | O(d·(n + 10)) | O(d·(n + 10)) | O(n) | sim |

(k é o maior valor; d é o número de dígitos.)

- **Inversões**: um par fora de ordem (i < j com A[i] > A[j]). Trocar dois vizinhos fora de ordem desfaz exatamente uma inversão, por isso bubble e insertion fazem uma troca por inversão: de 0 (vetor ordenado) a n(n - 1)/2 (invertido). É também por isso que o insertion voa em entradas quase ordenadas.
- **Selection** procura o menor do resto e o põe no lugar: sempre n(n - 1)/2 comparações, mas no máximo n - 1 trocas, o que importa quando escrever é caro.
- **Merge** divide ao meio, ordena as metades e intercala. São log2(n) níveis, cada um com trabalho linear. Ao intercalar, em caso de empate pega da metade esquerda (`<=`), e isso o torna estável.
- **Quicksort** escolhe um pivô e separa menores e maiores. A partição de **Lomuto** usa o último elemento e um único índice que varre o vetor; é simples, mas com muitos valores iguais as partições ficam desequilibradas. A de **Hoare** usa dois índices que vêm das pontas e trocam os pares errados; faz menos trocas e lida bem com repetidos. Aqui o Hoare usa o elemento do meio como pivô, o que também evita o pior caso em vetores já ordenados. No pior caso (pivô sempre o menor ou o maior), qualquer quicksort cai para O(n²).
- **Heapsort** monta um heap máximo (o pai sempre maior que os filhos, guardado no próprio vetor: os filhos de i estão em 2i + 1 e 2i + 2) e tira o maior n vezes.
- **Shell sort** faz insertion sort com saltos grandes que vão diminuindo; os elementos andam longe cedo. Os intervalos de Marcin Ciura (1, 4, 10, 23, 57, 132, 301, 701...) são os melhores conhecidos na prática.
- **Por que n log n?** Um algoritmo que só compara precisa distinguir as n! ordens possíveis, e cada comparação no máximo divide as possibilidades por dois: são pelo menos log2(n!) comparações, que é aproximadamente n·log2(n).
- **Counting e radix** escapam desse limite porque não comparam: contam. O counting conta quantas vezes cada valor aparece, transforma as contagens em posições finais (soma acumulada) e distribui os elementos de trás para frente, o que preserva a ordem dos iguais. O radix LSD aplica esse counting a cada dígito, das unidades para cima; como cada passada é estável, a ordem dos dígitos de baixo é mantida nas passadas seguintes.
- **Estável** quer dizer que elementos com a mesma chave mantêm a ordem original: essencial para ordenar por um critério e depois por outro.

### Busca em grafos numa grade

A grade é um grafo: cada célula livre é um vértice, ligado às quatro vizinhas (ou oito, com diagonais). Entrar numa célula custa 1, ou 5 se for lama; na diagonal, o custo é multiplicado por raiz(2). Uma diagonal só vale se as duas células ortogonais do lado estiverem livres, senão o caminho "cortaria a quina" de uma parede.

| Algoritmo | Estrutura | Menor caminho? | Observação |
|---|---|---|---|
| BFS | fila | sim, em número de passos | expande em camadas de distância 0, 1, 2... |
| DFS | pilha | não | vai fundo antes de voltar; acha algum caminho |
| Dijkstra | fila de prioridade por g | sim, com pesos | exige pesos não negativos |
| A* | fila de prioridade por g + h | sim, se h for admissível | expande menos que o Dijkstra |
| Gulosa | fila de prioridade por h | não | rapidíssima, mas se engana |
| BFS bidirecional | duas filas | sim, em número de passos | encontra no meio |

Com V células, a BFS e a DFS custam O(V) e o Dijkstra e o A*, O(V log V) com o heap binário.

- **Dijkstra** sempre expande a célula aberta com menor custo acumulado `g`. Como os pesos não são negativos, quando uma célula sai da fila o custo dela é definitivo.
- **A\*** ordena por `f = g + h`, onde `h` é uma estimativa do custo até o fim. Se `h` nunca superestima (heurística **admissível**), o primeiro caminho até o fim é ótimo; se além disso respeita a desigualdade triangular (**consistente**), nenhuma célula precisa ser reaberta. Com custo mínimo 1 por passo:
  - **Manhattan** `|dl| + |dc|`: exata em grade sem diagonais e sem obstáculos; com diagonais, superestima (uma diagonal anda 2 em Manhattan e custa só 1,41).
  - **Euclidiana** `raiz(dl² + dc²)`: admissível sempre, mas otimista demais, então expande mais.
  - **Octil** `max(dl, dc) + (raiz(2) - 1)·min(dl, dc)`: o custo exato com diagonais e sem obstáculos; a melhor escolha quando elas estão ligadas.
  Em empates de `f`, a implementação prefere a célula com menor `h` (mais perto do fim), o que reduz bastante as expansões.
- **Busca gulosa** usa só `h`: corre para o alvo, mas não olha o caminho percorrido, então cai em armadilhas e não garante o menor custo.
- **BFS bidirecional** busca do início e do fim ao mesmo tempo, sempre expandindo uma camada inteira do lado com a fila menor. Quando um lado encontra uma célula que o outro já viu, os dois meios caminhos se juntam. Dentro da camada em que o primeiro encontro aparece, o programa guarda o encontro de menor soma de distâncias, e isso garante o caminho mínimo. Com fator de ramificação b e distância d, a busca cai de cerca de b^d para 2·b^(d/2) células.

### Labirintos

Um labirinto **perfeito** tem exatamente um caminho entre quaisquer duas salas: as células livres formam uma árvore. Os geradores trabalham com "salas" nas coordenadas ímpares e paredes entre elas.

- **Backtracker recursivo**: uma DFS aleatória que derruba a parede entre a sala atual e uma vizinha nova, e volta quando não há mais vizinhas. Faz corredores longos e sinuosos.
- **Prim aleatório**: cresce a árvore sorteando, entre todas as paredes da borda, qual derrubar. Faz muitos becos curtos.
- **Divisão recursiva**: começa vazio, levanta uma parede com uma única passagem, e repete em cada metade. Faz salas retangulares visíveis.

Os testes conferem a propriedade da árvore: o número de ligações entre células livres vizinhas é exatamente o número de células livres menos um, e todas são alcançáveis.

## Contribuindo

Issues e pull requests são bem-vindos.

## Licença

MIT. Veja [LICENSE](LICENSE).
