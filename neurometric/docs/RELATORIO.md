<!--
  Relatório acadêmico do projeto NeuroMetric.
  Estrutura baseada na ABNT NBR 14724 (trabalhos acadêmicos), NBR 6023 (referências) e NBR 10520 (citações).
  Ao transferir para o Word/Google Docs: fonte Arial ou Times New Roman 12, espaçamento 1,5,
  margens superior/esquerda 3 cm e inferior/direita 2 cm, títulos de seção numerados em negrito.
-->

# CAPA

**[NOME DA INSTITUIÇÃO]**
**[NOME DO CURSO]**

**[NOME COMPLETO DO(A) ALUNO(A)]**

**NEUROMETRIC — COGNITIVE LAB:**
**aplicação web de avaliação cognitiva com front-end do Google Stitch e back-end em JavaScript**

[CIDADE]
[ANO]

---

# FOLHA DE ROSTO

**[NOME COMPLETO DO(A) ALUNO(A)]**

**NEUROMETRIC — COGNITIVE LAB:**
**aplicação web de avaliação cognitiva com front-end do Google Stitch e back-end em JavaScript**

> Trabalho apresentado à disciplina [NOME DA DISCIPLINA] do curso de [NOME DO CURSO] da [INSTITUIÇÃO],
> como requisito parcial para aprovação.
> Orientador(a): Prof.(a) [NOME].

[CIDADE]
[ANO]

---

# RESUMO

Este trabalho descreve o desenvolvimento do NeuroMetric, uma aplicação web de avaliação cognitiva com finalidade
educacional. As telas foram criadas no Google Stitch e convertidas de classes utilitárias do Tailwind CSS para uma
folha de estilos externa (style.css), preservando cores, espaçamentos, tipografia e responsividade. O back-end foi
implementado em JavaScript com Node.js e Express, com persistência em SQLite, autenticação por sessão, avaliação de
10 questões em ordem fixa, telas de memorização, dois cronômetros controlados pelo servidor, correção automática e
página de resultados com gráficos e revisão comentada. O projeto demonstra 25 componentes com as quatro áreas do
Box Model explicitadas e 31 aplicações de Flexbox, além de 40 testes automatizados. Conclui-se que é possível
transformar um protótipo visual em uma aplicação funcional sem alterar sua identidade visual, desde que a lógica
sensível (tempo, gabarito e correção) permaneça no servidor.

**Palavras-chave:** HTML. CSS. Flexbox. Node.js. Avaliação cognitiva.

---

# SUMÁRIO

1 INTRODUÇÃO
2 FUNDAMENTAÇÃO TEÓRICA
2.1 HTML5
2.2 CSS externo
2.3 Box Model
2.4 Flexbox
2.5 JavaScript no navegador
2.6 Back-end com Node.js e Express
2.7 Banco de dados SQLite
3 DESENVOLVIMENTO
3.1 Análise das telas do Stitch
3.2 Conversão do Tailwind para CSS externo
3.3 Arquitetura do back-end
3.4 Autenticação
3.5 Avaliação, memorização e cronômetros
3.6 Pontuação e resultados
3.7 Integração front-end e back-end
3.8 Responsividade
3.9 Versionamento com Git e GitHub
4 RESULTADOS E TESTES
5 CONSIDERAÇÕES FINAIS
REFERÊNCIAS
APÊNDICE A — Aplicações do Box Model
APÊNDICE B — Aplicações do Flexbox
APÊNDICE C — Capturas de tela

---

# 1 INTRODUÇÃO

O NeuroMetric é uma aplicação web que aplica uma avaliação cognitiva de 10 questões e apresenta ao participante
sua pontuação de desempenho, o tempo gasto em cada questão e uma revisão comentada das respostas. O projeto partiu
de telas prontas, desenhadas no Google Stitch, e teve como objetivos: (a) preservar fielmente esse visual;
(b) separar o CSS do HTML; (c) implementar um back-end em JavaScript com banco de dados; e (d) atender aos
requisitos da disciplina de Box Model, Flexbox, responsividade e versionamento no GitHub.

A avaliação tem finalidade educacional e de autoconhecimento. Por não existir uma amostra normativa validada,
o sistema não converte a pontuação em QI; a estrutura para essa conversão existe, mas só é usada, como estimativa
experimental, quando há parâmetros normativos reais.

# 2 FUNDAMENTAÇÃO TEÓRICA

## 2.1 HTML5

O HTML define a estrutura e o significado do conteúdo. O projeto usa elementos semânticos como `header`, `nav`,
`main`, `section`, `article`, `footer`, `form`, `fieldset`, `details` e `dialog`, o que melhora a acessibilidade e
a leitura por tecnologias assistivas (W3C, 2021).

## 2.2 CSS externo

No CSS externo, as regras ficam em um arquivo próprio, importado pela tag
`<link rel="stylesheet" href="style.css">`. Isso separa apresentação e estrutura, permite reaproveitar o mesmo
arquivo em todas as páginas e facilita a manutenção, já que uma alteração reflete em todo o site (MDN WEB DOCS, 2025a).

## 2.3 Box Model

Todo elemento é tratado pelo navegador como uma caixa formada por quatro áreas: **conteúdo** (content),
**preenchimento** (padding), **borda** (border) e **margem** (margin). A propriedade `box-sizing: border-box` faz
com que `width` e `height` incluam padding e borda, o que torna o dimensionamento previsível (MDN WEB DOCS, 2025b).

## 2.4 Flexbox

O Flexible Box Layout organiza itens em uma dimensão (linha ou coluna). O contêiner recebe `display: flex` e
controla direção (`flex-direction`), quebra (`flex-wrap`, `flex-flow`), alinhamento (`justify-content`,
`align-items`, `align-content`) e espaçamento (`gap`, `row-gap`, `column-gap`); os itens controlam crescimento e
encolhimento (`flex-grow`, `flex-shrink`, `flex-basis`, `flex`), ordem (`order`) e alinhamento individual
(`align-self`) (W3C, 2018).

## 2.5 JavaScript no navegador

No front-end, o JavaScript trata eventos, valida formulários e conversa com o servidor pela Fetch API, com
`async/await`. Os dados recebidos atualizam os elementos HTML existentes, sem recriar a interface.

## 2.6 Back-end com Node.js e Express

O Node.js executa JavaScript no servidor. O Express organiza rotas e middlewares de uma API REST. Toda operação
sensível (autenticação, sigilo do gabarito, correção, cálculo de tempos e persistência) acontece no servidor, pois
qualquer código executado no navegador pode ser alterado pelo usuário (OWASP, 2021).

## 2.7 Banco de dados SQLite

O SQLite é um banco relacional armazenado em um único arquivo, adequado para execução local. Foi usado pelo módulo
nativo `node:sqlite`, com consultas parametrizadas para evitar injeção de SQL (SQLITE, 2025).

# 3 DESENVOLVIMENTO

## 3.1 Análise das telas do Stitch

Foram recebidos cinco arquivos HTML exportados do Stitch, identificados pelo conteúdo (e não pelo nome):
página inicial, login, cadastro, iniciar teste e resultados. Não havia export da tela de questões; ela foi criada
seguindo o documento de design (DESIGN.md): área de foco de até 840 px, seletores circulares de alternativa,
trilha de progresso de 6 px com gradiente e cronômetro em pílula escura.

## 3.2 Conversão do Tailwind para CSS externo

Os arquivos do Stitch usavam o Tailwind por CDN, com classes utilitárias e configuração própria de cores,
espaçamentos e tipografia. Cada combinação de classes foi convertida em uma classe semântica no `style.css`,
com os mesmos valores. Os tokens do Stitch viraram variáveis CSS (`:root`). Foram removidos o CDN do Tailwind,
os blocos `<style>`, os atributos `style` e os eventos inline (`onclick`), estes movidos para arquivos `.js`.
As telas de login, cadastro e iniciar teste foram comparadas com as imagens de referência em capturas com a
mesma escala; posições, larguras, alturas e quebras de linha coincidiram.

## 3.3 Arquitetura do back-end

O código foi dividido em camadas: **rotas** (endereços da API), **controllers** (tradução entre HTTP e regras),
**services** (regras de negócio), **repositories** (acesso ao banco) e **middleware** (sessão, segurança e erros).
O banco possui as tabelas `users`, `sessions`, `password_resets`, `login_attempts`, `question_banks`, `questions`,
`attempts`, `memo_views`, `answers` e `results`.

## 3.4 Autenticação

O cadastro valida e-mail, nome, idade (10 a 120 anos), telefone com DDD, senha (mínimo de 8 caracteres, com letras
e números), confirmação de senha e aceite dos termos, tanto no navegador quanto no servidor. A senha é guardada
somente como hash Argon2id (OWASP, 2021). A sessão usa um cookie `HttpOnly`; a opção "Lembrar de mim" torna o cookie
persistente por 30 dias. O login é bloqueado temporariamente após 5 falhas em 15 minutos, e a recuperação de senha
usa um token aleatório de uso único válido por 30 minutos. O login com Google (OAuth 2.0/OpenID Connect) foi
implementado, mas permanece desativado até que as credenciais sejam configuradas.

## 3.5 Avaliação, memorização e cronômetros

A avaliação tem 10 questões apresentadas em ordem fixa. O servidor só envia ao navegador o enunciado, a imagem e as
alternativas; gabarito e explicação ficam no servidor até a finalização. Para as questões de memorização, uma tela
exibe a sequência por um tempo configurável, que depois desaparece.

Há dois cronômetros progressivos: o geral (`HH:MM:SS`), iniciado na apresentação da primeira questão, e o da questão
(`MM:SS`), reiniciado a cada nova questão. Os horários oficiais são gravados pelo servidor; o navegador apenas exibe
a diferença entre o relógio dele e o do servidor. Por isso, atualizar a página retoma exatamente o mesmo ponto, e
alterar o JavaScript do navegador não altera os tempos registrados.

## 3.6 Pontuação e resultados

A pontuação de desempenho é calculada no servidor por:

S = 100 × (Σ P_obtido / Σ P_máximo)

Com peso 1 em todas as questões, S = (acertos / 10) × 100; por exemplo, 8 acertos resultam em 80. Questões não
respondidas valem zero. A estimativa QI = 100 + 15 × ((S − μ) / σ) fica disponível somente se houver μ e σ de uma
amostra normativa real; sem ela, a página informa que o QI está indisponível.

A página de resultados exibe: pontuação, acertos, erros, aproveitamento, tempo total, tempo médio, questão mais
rápida e mais demorada; gráfico de linha (desempenho acumulado), de barras (tempo por questão) e de pizza (acertos e
erros); desempenho por categoria; revisão das 10 questões em cartões expansíveis com a resposta do usuário, a
alternativa correta, a explicação e o tempo; e o histórico de tentativas.

## 3.7 Integração front-end e back-end

Os formulários e botões originais foram ligados à API com `fetch()` e `async/await` (arquivos em `public/js/`).
As respostas do servidor atualizam os elementos já existentes no HTML, como o banner de validação do cadastro, o
botão "Entrar" do cabeçalho (que passa a "Sair") e os cartões da página de resultados.

## 3.8 Responsividade

Foram mantidos os pontos de quebra do Stitch (640, 768 e 1024 px) e acrescentados ajustes para 375 px. As telas foram
verificadas em 375, 768, 1024 e 1440 px, sem rolagem horizontal. O layout de desktop foi preservado.

## 3.9 Versionamento com Git e GitHub

O projeto foi versionado com Git, com `.gitignore` que impede o envio de dependências, do arquivo `.env` e dos bancos
SQLite com dados pessoais. A publicação segue os comandos `git init`, `git add .`, `git commit`, `git branch -M main`,
`git remote add origin <URL>` e `git push -u origin main`.

# 4 RESULTADOS E TESTES

Foram criados 40 testes automatizados com o executor nativo do Node.js, cobrindo: cadastro, login, validação de
senhas, cookies de sessão, expiração, limite de tentativas, recuperação de senha, proteção de rotas e páginas, sigilo
do gabarito, ordem fixa das questões, memorização, cronômetro geral e individual, persistência ao atualizar a página,
recusa de respostas duplicadas, cálculo da pontuação (0 a 10 acertos), finalização antecipada, estimativa experimental
de QI e persistência do histórico após sair e entrar novamente.

**[Inserir aqui a saída do comando `npm test` executado no seu computador — Figura 1.]**

Requisitos quantitativos verificados:

| Requisito | Exigido | Obtido |
|---|---|---|
| Linhas do `index.html` | mais de 400 | 416 |
| Linhas do `style.css` | mais de 300 | 3729 |
| Componentes com Box Model completo | 20 | 25 (Apêndice A) |
| Aplicações de Flexbox | 20 | 31 (Apêndice B) |

# 5 CONSIDERAÇÕES FINAIS

O projeto mostrou que um protótipo visual pode ser transformado em aplicação funcional sem perder a identidade
visual, desde que a conversão do CSS seja feita com os mesmos valores e verificada por comparação de imagens.
Também evidenciou a importância de manter no servidor tudo o que define o resultado (tempos, gabarito e correção).
Como trabalhos futuros, sugere-se coletar uma amostra normativa para habilitar a estimativa de QI e configurar um
servidor de e-mail para a recuperação de senha em produção.

# REFERÊNCIAS

EXPRESS. **Express 4.x API reference**. [S. l.]: OpenJS Foundation, 2025. Disponível em: https://expressjs.com/en/4x/api.html.
Acesso em: [DIA] [MÊS ABREVIADO]. [ANO].

MDN WEB DOCS. **CSS: Cascading Style Sheets**. [S. l.]: Mozilla, 2025a. Disponível em:
https://developer.mozilla.org/pt-BR/docs/Web/CSS. Acesso em: [DIA] [MÊS ABREVIADO]. [ANO].

MDN WEB DOCS. **Introduction to the CSS basic box model**. [S. l.]: Mozilla, 2025b. Disponível em:
https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Introduction_to_the_CSS_box_model.
Acesso em: [DIA] [MÊS ABREVIADO]. [ANO].

NODE.JS. **Node.js documentation**. [S. l.]: OpenJS Foundation, 2025. Disponível em: https://nodejs.org/docs/latest/api/.
Acesso em: [DIA] [MÊS ABREVIADO]. [ANO].

OWASP. **Password Storage Cheat Sheet**. [S. l.]: OWASP Foundation, 2021. Disponível em:
https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. Acesso em: [DIA] [MÊS ABREVIADO]. [ANO].

SQLITE. **SQLite documentation**. [S. l.], 2025. Disponível em: https://www.sqlite.org/docs.html.
Acesso em: [DIA] [MÊS ABREVIADO]. [ANO].

W3C. **CSS Flexible Box Layout Module Level 1**. [S. l.]: World Wide Web Consortium, 2018. Disponível em:
https://www.w3.org/TR/css-flexbox-1/. Acesso em: [DIA] [MÊS ABREVIADO]. [ANO].

W3C. **Web Content Accessibility Guidelines (WCAG) 2.1**. [S. l.]: World Wide Web Consortium, 2021.
Disponível em: https://www.w3.org/TR/WCAG21/. Acesso em: [DIA] [MÊS ABREVIADO]. [ANO].

---

# APÊNDICE A — Aplicações do Box Model

Cada componente abaixo declara explicitamente as quatro áreas do Box Model no `public/style.css`
(comentários `[BM-nn]`). "Linha" indica onde o comentário começa no arquivo.

| Nº | Seletor | Página | Linha | Componente | Content | Padding | Border | Margin |
|---|---|---|---:|---|---|---|---|---|
| BM-01 | `.site-header` | index.html, iniciar-teste.html | 319 | Cabeçalho fixo translúcido | box-sizing: border-box; width: 100% | padding: 0 | border: 0 solid transparent; border-radius: 0 | margin: 0 |
| BM-02 | `.site-header__inner` | index.html, iniciar-teste.html | 342 | Faixa interna do cabeçalho | box-sizing: border-box; width: 100%; max-width: 1440px; height: 4rem | padding-top: 0; padding-right: var(--margin); padding-bottom: 0; padding-left: var(--margin) | border: 0 solid transparent; border-radius: 0 | margin-top: 0; margin-right: auto; margin-bottom: 0; margin-left: auto |
| BM-03 | `.site-nav__link` | index.html, iniciar-teste.html | 412 | Link do menu de navegação | box-sizing: border-box; width: auto | padding-top: var(--space-xs); padding-right: 0; padding-bottom: var(--space-xs); padding-left: 0 | border: 0 solid transparent; border-radius: 0 | margin: 0 |
| BM-04 | `.btn-header` | index.html, iniciar-teste.html | 462 | Botão "Entrar" do cabeçalho | box-sizing: border-box; width: auto | padding: 0.5rem var(--space-md) | border: 0 solid transparent; border-radius: var(--radius-lg) | margin: 0 |
| BM-05 | `.auth-card--login` | login.html, cadastro.html | 621 | Card de autenticação (tela de login) | box-sizing: border-box; width: 100%; min-width: 0 | padding: var(--space-lg) | border: 0 solid transparent; border-radius: 2rem | margin: 0 |
| BM-06 | `.auth-card--register` | login.html, cadastro.html | 640 | Card de autenticação (tela de cadastro) | box-sizing: border-box; width: 100%; min-width: 0 | padding: var(--space-lg) | border: 0 solid transparent; border-radius: var(--radius-xl) | margin: 0 |
| BM-07 | `.brand-mark` | login, cadastro, index, iniciar-teste, teste | 676 | Quadrado do logotipo (ícone "psychology") | box-sizing: border-box; width: 2.25rem; height: 2.25rem | padding: 0 | border: 0 solid transparent; border-radius: var(--radius-lg) | margin: 0 |
| BM-08 | `.auth-tab` | login.html, cadastro.html | 776 | Aba de navegação Entrar / Criar Conta | box-sizing: border-box; width: 100% | padding-top: 0.625rem; padding-right: 0; padding-bottom: 0.625rem; padding-left: 0 | border: 0 solid transparent; border-radius: var(--radius-lg) | margin: 0 |
| BM-09 | `.auth-input` | login.html, cadastro.html | 895 | Campo de entrada de texto (e-mail, nome, idade, telefone, senha) | box-sizing: border-box; width: 100%; height: 2.75rem | padding-top: 0; padding-right: 1rem; padding-bottom: 0; padding-left: 2.75rem | border: 0 solid transparent; border-radius: var(--radius-lg) | margin: 0 |
| BM-10 | `.btn-gradient` | login.html, cadastro.html | 1065 | Botão principal com gradiente (Entrar / Criar conta) | box-sizing: border-box; width: 100%; height: 3rem | padding: 0 | border: 0 solid transparent; border-radius: var(--radius-xl) | margin-top: var(--space-md); margin-right: 0; margin-bottom: 0; margin-left: 0 |
| BM-11 | `.btn-google` | login.html, cadastro.html | 1165 | Botão "Continuar com Google" | box-sizing: border-box; width: 100%; height: 2.75rem | padding: 0 | border: 0 solid transparent; border-radius: var(--radius-xl) | margin: 0 |
| BM-12 | `.btn-hero` | index.html | 1473 | Botão principal da página inicial ("Acessar com Login") | box-sizing: border-box | padding-top: 0.875rem; padding-right: 2.5rem; padding-bottom: 0.875rem; padding-left: 2.5rem | border: 0 solid transparent; border-radius: var(--radius-full) | margin: 0 |
| BM-13 | `.info-card` | index.html | 1654 | Card de etapa ("Como funciona", "Avaliação cognitiva", "Resultados") | box-sizing: border-box | padding: var(--space-lg) | border: 0 solid transparent; border-radius: var(--radius-xl) | margin: 0 |
| BM-14 | `.site-footer__inner` | index.html | 1892 | Faixa interna do rodapé | box-sizing: border-box; width: 100%; max-width: 1440px | padding: var(--space-xl) var(--margin) | border: 0 solid transparent; border-radius: 0 | margin: 0 auto |
| BM-15 | `.start-pill` | iniciar-teste.html | 2076 | Selo "Avaliação cognitiva • 10 questões" | box-sizing: border-box | padding: 0.375rem 1rem | border-width: 1px; border-style: solid; border-color: var(--ice-line); border-radius: var(--radius-full) | margin-bottom: 1.5rem |
| BM-16 | `.btn-start` | iniciar-teste.html | 2146 | Botão "Iniciar Quiz" | box-sizing: border-box | padding-top: 0.875rem; padding-right: 2rem; padding-bottom: 0.875rem; padding-left: 2rem | border: 0 solid transparent; border-radius: var(--radius-full) | margin: 0 |
| BM-17 | `.start-card` | iniciar-teste.html | 2221 | Card "Antes de começar" | box-sizing: border-box; width: 100% | padding: 1.5rem | border: 1px solid var(--ice-line); border-radius: var(--radius-2xl) | margin-bottom: 2rem |
| BM-18 | `.chip` | iniciar-teste.html | 2291 | Chip de habilidade | box-sizing: border-box | padding: 0.375rem 0.75rem | border-width: 1px; border-style: solid; border-color: var(--ice-line); border-radius: var(--radius-lg) | margin: 0 |
| BM-19 | `.timer-badge` | teste.html | 2386 | Badge de cronômetro (tempo geral e tempo da questão) | box-sizing: border-box; min-width: 8.5rem; height: 2.25rem | padding-top: 0; padding-right: 0.875rem; padding-bottom: 0; padding-left: 0.75rem | border-width: 1px; border-style: solid; border-color: var(--ink); border-radius: var(--radius-full) | margin: 0 |
| BM-20 | `.question-card` | teste.html | 2491 | Cartão da questão | box-sizing: border-box; width: 100%; min-height: 18rem | padding: 2rem | border-width: 1px; border-style: solid; border-color: #e2e8f0; border-radius: var(--radius-2xl) | margin: 0 |
| BM-21 | `.option` | teste.html | 2608 | Alternativa (A–E) | box-sizing: border-box; width: 100%; min-height: 3.5rem | padding: 1rem | border-width: 1px; border-style: solid; border-color: #e2e8f0; border-radius: var(--radius-xl) | margin: 0 |
| BM-22 | `.option__letter` | teste.html | 2641 | Seletor circular com a letra da alternativa | box-sizing: border-box; width: 1.75rem; height: 1.75rem | padding: 0 | border: 2px solid var(--slate-300); border-radius: var(--radius-full) | margin: 0 |
| BM-23 | `.memo-digit` | teste.html | 2767 | Bloco de cada dígito memorizado | box-sizing: border-box; width: 3.5rem; height: 4rem | padding: 0 | border: 1px solid #e2e8f0; border-radius: var(--radius-xl) | margin: 0 |
| BM-24 | `.stat-card` | resultado.html | 3189 | Cartão de estatística (Questões, Acertos, Tempo total...) | box-sizing: border-box; min-width: 0 | padding: 1rem | border: 0 solid transparent; border-radius: var(--radius-xl) | margin: 0 |
| BM-25 | `.review-card` | resultado.html | 3517 | Cartão expansível de revisão de questão | box-sizing: border-box | padding: 1rem | border: 1px solid transparent; border-radius: var(--radius-xl) | margin: 0 |

# APÊNDICE B — Aplicações do Flexbox

Comentários `[FX-nn]` no `public/style.css`. Propriedades usadas no projeto: `display: flex`/`inline-flex`,
`flex-direction`, `flex-wrap`, `flex-flow`, `justify-content`, `align-items`, `align-content`, `align-self`,
`flex-grow`, `flex-shrink`, `flex-basis`, `flex`, `order`, `gap`, `row-gap` e `column-gap`.
As propriedades de item (`flex-grow`, `flex-shrink`, `flex-basis`, `order`) ficam nas regras dos itens indicados
(por exemplo, `.timer-badge`, `.option--image` e `.btn-confirm` na media query do celular).

| Nº | Seletor | Página | Linha | Aplicação | Propriedades Flexbox na regra |
|---|---|---|---:|---|---|
| FX-01 | `.site-header__inner` | index.html, iniciar-teste.html | 347 | Logo + menu à esquerda e ações à direita: justify-content: space-between. | display: flex; align-items: center; justify-content: space-between; gap: var(--space-md) |
| FX-02 | `.site-nav` | index.html, iniciar-teste.html | 404 | Menu de navegação horizontal: oculto no celular e exibido como | align-items: center; gap: var(--space-lg) |
| FX-03 | `.simple-footer__inner` | iniciar-teste.html | 520 | Rodapé: coluna centralizada no celular e linha com space-between | display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 0.75rem |
| FX-04 | `.auth-page` | login.html, cadastro.html | 563 | Corpo das telas de autenticação: centraliza o card na viewport | display: flex; align-items: center; justify-content: center |
| FX-05 | `.auth-stage` | login.html, cadastro.html | 580 | Palco do card: coluna flexível centralizada (flex-direction: column). | display: flex; flex-direction: column |
| FX-06 | `.auth-head` | login.html, cadastro.html | 657 | Cabeçalho do card: logo à esquerda e selo SSL à direita | display: flex; align-items: center; justify-content: space-between |
| FX-07 | `.auth-tab` | login.html, cadastro.html | 781 | Ícone + texto alinhados no centro com gap de 0.375rem. | display: flex; align-items: center; justify-content: center; gap: 0.375rem |
| FX-08 | `.auth-form--register` | login.html, cadastro.html | 842 | Formulário de cadastro em coluna flexível com gap de 1rem entre os campos. | display: flex; flex-direction: column; gap: 1rem |
| FX-09 | `.field` | login.html, cadastro.html | 852 | Cada campo do cadastro: rótulo e caixa empilhados (column) com gap de 0.375rem. | display: flex; flex-direction: column; gap: 0.375rem |
| FX-10 | `.field-box` | login.html, cadastro.html | 870 | Caixa do campo: ícone posicionado sobre o input, centralizado verticalmente (align-items). | display: flex; align-items: center |
| FX-11 | `.auth-options` | login.html, cadastro.html | 961 | "Lembrar de mim" à esquerda e "Esqueci minha senha" à direita (space-between). | display: flex; align-items: center; justify-content: space-between |
| FX-12 | `.check-inline` | login.html, cadastro.html | 969 | Caixa de seleção + texto alinhados na mesma linha (inline-flex + gap). | display: inline-flex; align-items: center; gap: 0.5rem |
| FX-13 | `.btn-gradient` | login.html, cadastro.html | 1070 | Texto e seta centralizados com justify-content: center e gap 0.5rem. | display: flex; align-items: center; justify-content: center; gap: 0.5rem |
| FX-14 | `.divider--login .divider__line` | login.html, cadastro.html | 1122 | Divisor do login: as duas linhas crescem igualmente (flex: 1 1 0%). | flex: 1 1 0% |
| FX-15 | `.hero` | index.html | 1348 | Hero de tela cheia: coluna com justify-content: space-between, | display: flex; flex-direction: column; justify-content: space-between; align-items: center |
| FX-16 | `.info-card` | index.html | 1659 | Conteúdo em coluna com justify-content: space-between, que alinha o | display: flex; flex-direction: column; justify-content: space-between |
| FX-17 | `.start-column` | iniciar-teste.html | 2065 | Coluna central da tela "Iniciar teste": flex-direction column + align-items center. | display: flex; flex-direction: column; align-items: center |
| FX-18 | `.btn-start` | iniciar-teste.html | 2151 | Texto e seta alinhados com inline-flex, align-items center e gap 0.5rem. | display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem |
| FX-19 | `.start-stats` | iniciar-teste.html | 2188 | Indicadores numéricos (10 questões / tempo livre) lado a lado, | display: flex; justify-content: center; align-items: center; gap: 3rem |
| FX-20 | `.chip-list` | iniciar-teste.html | 2281 | Habilidades avaliadas: chips que quebram linha (flex-wrap: wrap) | display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem |
| FX-21 | `.quiz-topbar` | teste.html | 2353 | Barra superior: marca à esquerda e cronômetros à direita. | display: flex; flex-flow: row wrap; align-items: center; justify-content: space-between; row-gap: 0.75rem; column-gap: 1rem |
| FX-22 | `.quiz-timers` | teste.html | 2378 | Grupo de cronômetros: os dois badges dividem a linha | display: flex; align-items: center; gap: 0.5rem |
| FX-23 | `.options` | teste.html | 2575 | Lista de alternativas de texto: coluna flexível com gap de 0.75rem. | display: flex; flex-direction: column; gap: 0.75rem |
| FX-24 | `.options--images` | teste.html | 2586 | Alternativas com imagem: grade flexível que quebra linha | flex-direction: row; flex-wrap: wrap; align-content: flex-start; row-gap: 0.75rem; column-gap: 0.75rem |
| FX-25 | `.option` | teste.html | 2613 | Círculo da letra + texto alinhados (align-items center, gap 1rem). | display: flex; align-items: center; gap: 1rem |
| FX-26 | `.quiz-actions` | teste.html | 2702 | Rodapé da questão: aviso à esquerda e botão de confirmação à direita; | display: flex; align-items: center; justify-content: space-between; gap: 1rem |
| FX-27 | `.memo-digits` | teste.html | 2758 | Dígitos da sequência centralizados em linha (justify-content center), | display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem |
| FX-28 | `.results-tag` | resultado.html | 2991 | Selo da tentativa: align-self: flex-start impede que o item | display: inline-flex; align-items: center; gap: 0.375rem; align-self: flex-start |
| FX-29 | `.results-intro__row` | resultado.html | 3009 | Título do resultado e botão "Novo teste": coluna no celular, | display: flex; flex-direction: column; justify-content: space-between; gap: 1rem |
| FX-30 | `.stat-grid` | resultado.html | 3181 | Grade dos 8 cartões de estatística: linhas de 2 cartões que crescem | display: flex; flex-wrap: wrap; gap: 1rem |
| FX-31 | `.pie-layout` | resultado.html | 3302 | Gráfico de pizza + legenda: coluna no celular e linha a partir de 1024px. | display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem |

# APÊNDICE C — Capturas de tela

> Substitua cada marcador por uma captura real, com legenda acima e fonte abaixo, conforme a ABNT.

**Figura 1 — Testes automatizados (`npm test`)**
[INSERIR CAPTURA]
Fonte: elaborado pelo(a) autor(a) ([ANO]).

**Figura 2 — Página inicial (desktop)**
[INSERIR CAPTURA]
Fonte: elaborado pelo(a) autor(a) ([ANO]).

**Figura 3 — Tela de login e tela de cadastro**
[INSERIR CAPTURA]
Fonte: elaborado pelo(a) autor(a) ([ANO]).

**Figura 4 — Tela "Iniciar teste"**
[INSERIR CAPTURA]
Fonte: elaborado pelo(a) autor(a) ([ANO]).

**Figura 5 — Tela de questão com os dois cronômetros**
[INSERIR CAPTURA]
Fonte: elaborado pelo(a) autor(a) ([ANO]).

**Figura 6 — Tela de memorização**
[INSERIR CAPTURA]
Fonte: elaborado pelo(a) autor(a) ([ANO]).

**Figura 7 — Página de resultados (gráficos e revisão)**
[INSERIR CAPTURA]
Fonte: elaborado pelo(a) autor(a) ([ANO]).

**Figura 8 — Versão para celular (375 px)**
[INSERIR CAPTURA]
Fonte: elaborado pelo(a) autor(a) ([ANO]).

**Figura 9 — Repositório publicado no GitHub**
[INSERIR CAPTURA]
Fonte: elaborado pelo(a) autor(a) ([ANO]).
