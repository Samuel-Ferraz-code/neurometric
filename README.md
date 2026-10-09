# NeuroMetric — Cognitive Lab

Aplicação web de **avaliação cognitiva educacional** com 10 questões em ordem fixa, telas de memorização,
dois cronômetros (geral e por questão) registrados pelo servidor, correção automática no back-end e
página de resultados com gráficos, revisão comentada e histórico de tentativas.

O visual vem das telas criadas no **Google Stitch**, convertidas de Tailwind (CDN) para **CSS externo**
(`public/style.css`) com os mesmos valores. O back-end é **JavaScript (Node.js + Express)** com **SQLite**.

> A pontuação apresentada é de **desempenho** (0 a 100). Ela **não é um QI clinicamente validado**:
> a conversão para a escala de QI só aparece, marcada como experimental, se existir uma amostra normativa válida.

---

## Sumário

1. [Tecnologias](#tecnologias)
2. [Estrutura de pastas](#estrutura-de-pastas)
3. [Pré-requisitos](#pré-requisitos)
4. [Instalação e execução](#instalação-e-execução)
5. [Execução no VS Code](#execução-no-vs-code)
6. [Banco de dados](#banco-de-dados)
7. [Banco de questões](#banco-de-questões)
8. [Como a avaliação funciona](#como-a-avaliação-funciona)
9. [API REST](#api-rest)
10. [Segurança](#segurança)
11. [Testes](#testes)
12. [Login com Google](#login-com-google-opcional)
13. [Publicação no GitHub](#publicação-no-github)
14. [Requisitos acadêmicos](#requisitos-acadêmicos)
15. [Fidelidade ao Stitch e diferenças](#fidelidade-ao-stitch-e-diferenças)
16. [Solução de problemas](#solução-de-problemas)

---

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Front-end | HTML5, CSS3 externo (`style.css`), JavaScript Vanilla, Fetch API (`async/await`), Flexbox, Grid, Media Queries |
| Back-end | Node.js 22.13+, Express 4, API REST, sessões em cookie `HttpOnly` |
| Banco de dados | SQLite pelo módulo nativo `node:sqlite` (sem compilação de dependências) |
| Senhas | Argon2id (`@node-rs/argon2`); se o pacote não instalar, usa scrypt nativo do Node |
| Testes | `node:test` (executor nativo do Node), sem dependências extras |
| Ferramentas | Visual Studio Code, Git, GitHub, npm |

## Estrutura de pastas

```text
neurometric/
├── public/                     ← front-end (servido pelo Express)
│   ├── index.html              ← página inicial (Stitch)
│   ├── login.html              ← entrar (Stitch)
│   ├── cadastro.html           ← criar conta (Stitch)
│   ├── iniciar-teste.html      ← iniciar teste (Stitch)
│   ├── teste.html              ← questões e memorização (criada pelo DESIGN.md)
│   ├── resultado.html          ← resultados e histórico (Stitch)
│   ├── recuperar-senha.html, redefinir-senha.html, termos.html, 404.html
│   ├── style.css               ← TODO o CSS do projeto (externo)
│   ├── js/                     ← api.js, main.js, auth.js, inicio.js, iniciar.js, timer.js, teste.js, resultado.js
│   └── assets/questoes/        ← imagens das questões 7 e 8 (extraídas do Word)
├── src/                        ← back-end
│   ├── server.js               ← ponto de entrada
│   ├── app.js                  ← montagem do Express
│   ├── config.js               ← configuração (.env)
│   ├── routes/                 ← rotas da API
│   ├── controllers/            ← HTTP ⇄ serviços
│   ├── services/               ← regras: autenticação, tentativas, pontuação, banco de questões, Google
│   ├── repositories/           ← acesso ao SQLite (consultas parametrizadas)
│   ├── middleware/             ← sessão, proteção de rotas, segurança, erros
│   ├── database/               ← schema.sql e conexão
│   └── utils/
├── data/                       ← questoes.json (a instalar), banco SQLite, LEIA-ME.md
├── tests/                      ← testes automatizados + banco FICTÍCIO de testes
├── scripts/                    ← validar-banco.js, demo.js
├── docs/                       ← relatório acadêmico, DESIGN.md, telas originais do Stitch
├── .vscode/                    ← configurações de execução no VS Code
├── .env.example
├── .gitignore
└── package.json
```

## Pré-requisitos

- **Node.js 22.13 ou superior** (necessário para o módulo `node:sqlite`). Baixe a versão LTS em <https://nodejs.org>.
  Confira com `node -v`.
- **Git** (<https://git-scm.com>) e uma conta no GitHub.
- **Visual Studio Code** (<https://code.visualstudio.com>).

## Instalação e execução

```bash
# 1. Entre na pasta do projeto
cd neurometric

# 2. Instale as dependências
npm install

# 3. (opcional) Crie o arquivo de configuração
cp .env.example .env        # no Windows (PowerShell): copy .env.example .env

# 4. Instale o banco de questões em data/questoes.json (veja data/LEIA-ME.md) e valide
npm run validar-banco

# 5. Inicie o servidor
npm run dev                 # reinicia sozinho ao salvar arquivos
# ou
npm start
```

Abra **<http://localhost:3000>** no navegador.

**Quer ver o site antes de instalar o banco real?** Rode `npm run demo`. Ele usa um banco **fictício**
(questões marcadas com `[FICTÍCIA]`) e um SQLite separado (`data/demo.sqlite`).

## Execução no VS Code

1. `Arquivo → Abrir Pasta…` e selecione `neurometric`.
2. Abra o terminal integrado (`Ctrl + '`) e rode `npm install`.
3. No painel **Executar e Depurar** (`Ctrl + Shift + D`) há três opções prontas (arquivo `.vscode/launch.json`):
   - *NeuroMetric: servidor*
   - *NeuroMetric: modo demonstração (banco fictício)*
   - *NeuroMetric: testes*
4. Pressione `F5`. O endereço aparece no terminal.

## Banco de dados

O SQLite é criado automaticamente em `data/neurometric.sqlite` na primeira execução, a partir de
`src/database/schema.sql`. Tabelas:

| Tabela | Conteúdo |
|---|---|
| `users` | usuários (senha somente como hash) |
| `sessions` | sessões ativas (o banco guarda só o SHA-256 do token do cookie) |
| `password_resets` | tokens temporários de redefinição de senha (também com hash) |
| `login_attempts` | tentativas de login, para o limite contra força bruta |
| `question_banks` | versões do banco de questões importadas |
| `questions` | questões de cada versão (ordem fixa, gabarito, explicação, memorização) |
| `attempts` | tentativas: usuário, versão do banco, status, início, fim, tempo total |
| `memo_views` | quando cada sequência de memorização foi exibida |
| `answers` | resposta de cada questão: apresentação, confirmação, alternativa, acerto, segundos |
| `results` | resultado consolidado e o gabarito usado na correção |

Para recomeçar do zero, pare o servidor e apague `data/neurometric.sqlite*`.
Para inspecionar os dados, use a extensão *SQLite Viewer* do VS Code.

## Banco de questões

O arquivo `data/questoes.json` **não acompanha o projeto**: ele deve ser gerado a partir de
`Questões Qi_so10.docx`. O formato, as regras de validação e a pasta das imagens estão em
[`data/LEIA-ME.md`](data/LEIA-ME.md). Antes de importar, o servidor valida:

- exatamente **10** questões, `ordem` contínua de 1 a 10, `id` sem repetição;
- **5 alternativas** (A–E) em cada questão, cada uma com texto ou imagem;
- gabarito entre A e E; imagens locais existentes em `public/`;
- sequências de memorização exibidas antes ou na própria questão.

Se algo estiver errado, a importação é recusada (o arquivo original não é alterado) e
`npm run validar-banco` gera o relatório em `docs/relatorio-validacao-banco.md`.

Cada versão do banco é registrada separadamente; tentativas antigas continuam ligadas à versão e ao
gabarito com que foram corrigidas.

## Como a avaliação funciona

1. **Iniciar** (`iniciar-teste.html`): cria a tentativa ou retoma a que estiver em andamento.
2. **Questões** (`teste.html`): ordem fixa de 1 a 10, sem cabeçalho de navegação, alternativas A–E
   (texto ou imagem). Teclas **A–E** escolhem e **Enter** confirma.
3. **Memorização**: antes das questões que dependem de uma sequência, uma tela mostra os dígitos pelo
   tempo configurado; depois a sequência some e a pergunta aparece.
4. **Confirmação**: a resposta vai ao servidor, que corrige, grava o tempo e avança. Não é possível
   responder duas vezes nem alterar uma resposta confirmada.
5. **Resultado** (`resultado.html`): aberto automaticamente ao fim.

### Política de tempo

| Situação | Regra |
|---|---|
| Cronômetro geral (`HH:MM:SS`) | Começa quando a 1ª questão é apresentada e para na confirmação da última. Não reinicia entre questões. |
| Cronômetro da questão (`MM:SS`) | Começa quando a questão aparece (após a memorização, se houver) e para na confirmação. Recomeça em `00:00` na próxima. |
| Atualizar a página / fechar o navegador | A tentativa continua válida. Os dois cronômetros **continuam contando** (tempo corrido), e a mesma questão é restaurada. |
| Limite de tempo | Não há. Os cronômetros são progressivos. |
| Respostas em branco | O botão **Encerrar** finaliza a avaliação; as questões restantes contam como não respondidas (0 ponto). |
| Manipulação pelo navegador | Ignorada: o tempo é calculado pelo servidor (`confirmação − apresentação`). |

### Pontuação

```
S = 100 × (Σ P_obtido / Σ P_máximo)        → com peso 1:  S = (acertos / 10) × 100
```

O tempo é registrado e exibido, mas não altera a pontuação. A estimativa
`QI = 100 + 15 × ((S − μ) / σ)` só é calculada se `data/normas.json` trouxer μ e σ de uma amostra
real com pelo menos 100 participantes; caso contrário, aparece como **indisponível**.

## API REST

Todas as respostas são JSON. Requisições que alteram dados exigem `Content-Type: application/json`
e origem no próprio site.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/api/auth/cadastro` | público | cria conta e inicia sessão |
| POST | `/api/auth/login` | público | autentica (`remember` = Lembrar de mim) |
| POST | `/api/auth/logout` | sessão | encerra a sessão |
| GET | `/api/auth/me` | sessão | usuário autenticado |
| GET | `/api/auth/sessao` | público | usuário da sessão ou `null` |
| POST | `/api/auth/esqueci-senha` | público | gera token de redefinição (30 min) |
| POST | `/api/auth/redefinir-senha` | público | nova senha com o token |
| GET | `/api/auth/config` | público | informa se o login com Google está ativo |
| GET | `/api/auth/google` | público | inicia o OAuth do Google |
| GET | `/api/teste/info` | público | total de questões e categorias (sem conteúdo) |
| POST | `/api/tentativas` | sessão | inicia ou retoma a avaliação |
| GET | `/api/tentativas` | sessão | histórico de tentativas |
| GET | `/api/tentativas/atual` | sessão | tentativa em andamento |
| POST | `/api/tentativas/:id/apresentar` | sessão | registra o início da etapa atual e devolve a questão (sem gabarito) |
| GET | `/api/tentativas/:id/progresso` | sessão | progresso |
| POST | `/api/tentativas/:id/respostas` | sessão | `{ questaoId, alternativa }` |
| POST | `/api/tentativas/:id/finalizar` | sessão | encerra antes do fim |
| GET | `/api/tentativas/:id/resultado` | sessão | resultado, gabarito e explicações (só após finalizar) |

O servidor sempre verifica se a tentativa pertence ao usuário logado.

## Segurança

- Senhas com **Argon2id** (19 MiB, 2 iterações) ou scrypt; nunca em texto puro; nada sensível no `localStorage`.
- Sessão em cookie `HttpOnly`, `SameSite=Lax` (e `Secure` em produção); o banco guarda só o hash do token.
- "Lembrar de mim": cookie persistente de 30 dias; sem ele, cookie de sessão e validade de 12 h no servidor.
- Limite de login: 5 falhas por e-mail ou 20 por IP em 15 minutos.
- Recuperação de senha com token aleatório de uso único, 30 minutos de validade, que encerra as sessões antigas.
- Consultas SQL parametrizadas, validação de entrada no front-end e no back-end, erros tratados em um único middleware.
- Cabeçalhos de segurança (CSP sem scripts ou estilos inline, `X-Frame-Options`, `nosniff`).
- Gabarito e explicações nunca são enviados antes da finalização.

## Testes

```bash
npm test
```

São 40 testes em `tests/` (cadastro, login, validação de senhas, sessões, limite de tentativas,
recuperação de senha, proteção de rotas e páginas, banco de questões, ordem fixa, sigilo do gabarito,
memorização, cronômetros, persistência ao atualizar, respostas duplicadas, pontuação, finalização,
QI experimental e histórico). Eles usam o **banco fictício** de `tests/fixtures/` e um SQLite em memória,
com relógio controlado (os testes simulam minutos passando sem esperar).

## Login com Google (opcional)

O botão fica **desativado** até a configuração; sem ela, ele apenas informa que o recurso não está disponível.

1. Acesse <https://console.cloud.google.com/> e crie um projeto.
2. Em **APIs e serviços → Tela de consentimento OAuth**, configure o app (tipo *Externo*).
3. Em **Credenciais → Criar credenciais → ID do cliente OAuth**, escolha *Aplicativo da Web* e adicione o
   URI de redirecionamento `http://localhost:3000/api/auth/google/callback`.
4. Copie o ID e o segredo para o `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)
   e reinicie o servidor.

## Publicação no GitHub

Crie um repositório **vazio** em <https://github.com/new> (sem README) e, no terminal do VS Code:

```bash
git init
git add .
git commit -m "Implementação inicial do NeuroMetric"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/neurometric.git
git push -u origin main
```

Pelo VS Code, sem terminal: painel **Controle do Código-Fonte** (`Ctrl + Shift + G`) → *Inicializar repositório*
→ escreva a mensagem → *Confirmar* → *Publicar Branch*.

O `.gitignore` já impede o envio de `node_modules/`, `.env` e dos bancos SQLite (que contêm dados pessoais).

## Requisitos acadêmicos

| Requisito | Onde está |
|---|---|
| `index.html` e `style.css` com CSS externo via `<link rel="stylesheet" href="style.css">` | todas as páginas em `public/` |
| Sem CSS interno ou inline | nenhum HTML final tem `<style>`, `style=""` ou Tailwind CDN |
| 20 elementos com Content, Padding, Border e Margin | 25 componentes marcados `[BM-nn]` no `style.css` |
| 20 aplicações de Flexbox | 31 aplicações marcadas `[FX-nn]` no `style.css` |
| Responsividade | media queries em 375/640/768/1024 px, testadas em 375, 768, 1024 e 1440 px |
| `index.html` > 400 linhas | 416 linhas |
| `style.css` > 300 linhas | mais de 3.700 linhas |

As tabelas completas estão em [`docs/RELATORIO.md`](docs/RELATORIO.md).

## Fidelidade ao Stitch e diferenças

Telas originais exportadas do Stitch: `docs/stitch-original/`. O CSS foi convertido com os mesmos valores
e comparado às imagens de referência (login, cadastro e iniciar teste). Diferenças intencionais:

- **Logotipo do cabeçalho**: no export, apontava para uma imagem temporária do Stitch (aparecia quebrada).
  Foi usado o mesmo ícone de marca das telas de login.
- **Cor do placeholder** dos campos de login/cadastro: segue a imagem de referência (`#191c1e`), que é a referência prioritária.
- **Textos**: "60 questões / 50 min" virou "10 questões / Livre". Frases que prometiam curva populacional,
  calibragem normativa e "complexidade adaptativa" foram ajustadas, porque a versão atual não tem amostra normativa.
- **Tela de questões e memorização**: não havia export; foi criada a partir do `DESIGN.md`.
- **Resultados**: mantém as seções do Stitch, com dados reais; barras = tempo por questão, pizza = acertos/erros.
- **Pequenos ajustes de responsividade** que só valem no celular/tablet (recorte dos brilhos do login,
  menu da página de resultados a partir de 1024 px), para não haver rolagem horizontal.

## Solução de problemas

| Problema | Solução |
|---|---|
| `No such built-in module: node:sqlite` | Atualize o Node.js para 22.13 ou superior. |
| `EADDRINUSE: address already in use :::3000` | Já há algo na porta 3000. Feche o outro servidor ou defina `PORT=3001` no `.env`. |
| "Banco de questões não instalado" | Crie `data/questoes.json` (veja `data/LEIA-ME.md`) ou use `npm run demo`. |
| "Banco de questões inválido" ao iniciar | Rode `npm run validar-banco` e corrija os itens do relatório. |
| Erro ao instalar `@node-rs/argon2` | É opcional: o projeto usa scrypt automaticamente. |
| Não recebo o e-mail de redefinição | Não há servidor de e-mail configurado; em desenvolvimento o link aparece no terminal. |
| Ícones aparecem como palavras | A fonte Material Symbols vem do Google Fonts; verifique a conexão com a internet. |
