# Banco de questões — como instalar

O servidor lê as questões de **`data/questoes.json`**. Esse arquivo ainda **não está no projeto**:
ele deve ser criado a partir do documento `Questões Qi_so10.docx` (10 questões, gabarito e explicações).
Enquanto ele não existir, o site funciona, mas o botão "Iniciar Quiz" avisa que o banco não foi instalado.
Nenhuma questão é inventada para preencher o lugar.

Para navegar pelo site antes disso, use `npm run demo`, que carrega um banco **fictício** de testes.

## Formato esperado

```json
{
  "versao": "qi10-v1",
  "fonte": "Questões Qi_so10.docx",
  "questoes": [
    {
      "id": 1,
      "ordem": 1,
      "categoria": "Raciocínio lógico",
      "enunciado": "Um fazendeiro tem 50 galinhas. Todas morrem, menos 37. Quantas sobram?",
      "imagem": null,
      "alternativas": [
        { "letra": "A", "texto": "..." },
        { "letra": "B", "texto": "..." },
        { "letra": "C", "texto": "..." },
        { "letra": "D", "texto": "..." },
        { "letra": "E", "texto": "37" }
      ],
      "resposta": "E",
      "explicacao": "A expressão \"todas morrem, menos 37\" indica que 37 galinhas sobreviveram."
    },
    {
      "id": 6,
      "ordem": 6,
      "categoria": "Memória",
      "enunciado": "Qual era o quarto dígito da sequência apresentada?",
      "memorizacao": { "sequencia": "2 3 1 9 7", "exibir_antes_da_questao": 6, "duracao_segundos": 8 },
      "alternativas": [ "... 5 alternativas ..." ],
      "resposta": "A",
      "explicacao": "..."
    },
    {
      "id": 7,
      "ordem": 7,
      "categoria": "Padrões e matrizes",
      "enunciado": "Qual figura completa a sequência?",
      "imagem": "assets/questoes/q7-enunciado.png",
      "alternativas": [
        { "letra": "A", "texto": "", "imagem": "assets/questoes/q7-a.png" },
        { "letra": "B", "texto": "", "imagem": "assets/questoes/q7-b.png" },
        { "letra": "C", "texto": "", "imagem": "assets/questoes/q7-c.png" },
        { "letra": "D", "texto": "", "imagem": "assets/questoes/q7-d.png" },
        { "letra": "E", "texto": "", "imagem": "assets/questoes/q7-e.png" }
      ],
      "resposta": "B",
      "explicacao": "..."
    }
  ]
}
```

### Regras verificadas pelo servidor

| Campo | Regra |
|---|---|
| `versao` | Obrigatório. Ao mudar qualquer conteúdo, troque a versão (ex.: `qi10-v2`) para não misturar tentativas antigas com outro gabarito. |
| `questoes` | Exatamente **10** registros. |
| `id` | Inteiro positivo, sem repetição. |
| `ordem` | 1 a 10, contínua. Define a ordem fixa de apresentação (não há sorteio). |
| `alternativas` | Exatamente 5, com letras A, B, C, D, E nessa ordem. Cada uma precisa de `texto` ou `imagem`. |
| `resposta` | Letra de A a E. Nunca é enviada ao navegador antes da finalização. |
| `imagem` | Caminho dentro de `public/` (ex.: `assets/questoes/q7.png`). URLs externas são recusadas. |
| `memorizacao` | Opcional. `sequencia` (texto exibido), `exibir_antes_da_questao` (posição em que aparece; padrão = a própria questão) e `duracao_segundos`. |
| `peso` | Opcional (padrão 1). Usado em S = 100 × ΣP_obtido / ΣP_máximo. |

As imagens extraídas do Word (questões 7 e 8) vão em `public/assets/questoes/`.

### Validar antes de subir o servidor

```bash
npm run validar-banco
```

O relatório aparece no terminal e é salvo em `docs/relatorio-validacao-banco.md`.

## Estimativa experimental de QI (opcional)

Só crie `data/normas.json` se houver uma amostra normativa real:

```json
{ "media": 62.4, "desvioPadrao": 14.1, "tamanhoAmostra": 350, "fonte": "Descrição da amostra e data da coleta" }
```

Sem esse arquivo (ou com menos de 100 participantes), o resultado mostra o QI como "indisponível".
