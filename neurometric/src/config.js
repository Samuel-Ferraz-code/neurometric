/**
 * Configuração central do NeuroMetric.
 *
 * Lê variáveis de ambiente (opcionalmente de um arquivo .env na raiz do projeto)
 * sem depender de bibliotecas externas. Valores sensíveis nunca ficam no código:
 * use o arquivo .env (que não vai para o GitHub) ou as variáveis do sistema.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

/** Carrega pares CHAVE=valor do .env sem sobrescrever variáveis já definidas. */
function loadDotEnv(file = path.join(ROOT_DIR, '.env')) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const env = process.env;
/** Caminhos relativos do .env são resolvidos a partir da raiz do projeto. */
const fromRoot = (value, fallback) => {
  if (!value) return fallback;
  if (value === ':memory:') return value;
  return path.resolve(ROOT_DIR, value);
};

const int = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const config = {
  rootDir: ROOT_DIR,
  publicDir: path.join(ROOT_DIR, 'public'),
  env: env.NODE_ENV || 'development',
  isProduction: env.NODE_ENV === 'production',
  port: int(env.PORT, 3000),
  baseUrl: env.BASE_URL || `http://localhost:${int(env.PORT, 3000)}`,

  /** Caminho do arquivo SQLite. ":memory:" é usado nos testes automatizados. */
  databaseFile: fromRoot(env.DATABASE_FILE, path.join(ROOT_DIR, 'data', 'neurometric.sqlite')),

  /** Banco de questões ativo (JSON convertido do documento "Questões Qi_so10.docx"). */
  questionBankFile: fromRoot(env.QUESTION_BANK_FILE, path.join(ROOT_DIR, 'data', 'questoes.json')),

  /** Parâmetros normativos (μ e σ) para a estimativa de QI. Sem esse arquivo, o QI fica "indisponível". */
  normsFile: fromRoot(env.NORMS_FILE, path.join(ROOT_DIR, 'data', 'normas.json')),

  session: {
    cookieName: 'nm_sid',
    /** Sessão comum: expira em 12 horas (o cookie some ao fechar o navegador). */
    ttlMs: int(env.SESSION_TTL_HOURS, 12) * 60 * 60 * 1000,
    /** "Lembrar de mim": cookie persistente de 30 dias. */
    rememberTtlMs: int(env.SESSION_REMEMBER_DAYS, 30) * 24 * 60 * 60 * 1000,
    secureCookie: env.COOKIE_SECURE === 'true' || env.NODE_ENV === 'production',
  },

  loginLimit: {
    /** Janela de contagem de falhas de login. */
    windowMs: int(env.LOGIN_WINDOW_MINUTES, 15) * 60 * 1000,
    /** Falhas permitidas por e-mail dentro da janela. */
    maxPerEmail: int(env.LOGIN_MAX_PER_EMAIL, 5),
    /** Falhas permitidas por endereço IP dentro da janela. */
    maxPerIp: int(env.LOGIN_MAX_PER_IP, 20),
  },

  passwordReset: {
    ttlMs: int(env.RESET_TOKEN_MINUTES, 30) * 60 * 1000,
    /** Em desenvolvimento, o link de redefinição é exibido no console (não há servidor de e-mail). */
    logLinkToConsole: env.RESET_LINK_TO_CONSOLE !== 'false' && env.NODE_ENV !== 'production',
  },

  test: {
    /** Duração padrão da tela de memorização, caso a questão não defina a sua. */
    memorizationMs: int(env.MEMORIZATION_SECONDS, 8) * 1000,
  },

  google: {
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: env.GOOGLE_REDIRECT_URI || '',
  },
};

config.google.enabled = Boolean(config.google.clientId && config.google.clientSecret && config.google.redirectUri);

module.exports = config;
