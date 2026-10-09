-- =====================================================================
-- NeuroMetric — esquema do banco de dados SQLite
-- Todas as datas são gravadas em milissegundos desde 1970 (UTC), pelo servidor.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- Usuários cadastrados. A senha é guardada somente como hash (Argon2id ou scrypt).
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT    NOT NULL,
  age           INTEGER,
  phone         TEXT,
  password_hash TEXT,
  google_sub    TEXT UNIQUE,
  created_at    INTEGER NOT NULL
);

-- Sessões autenticadas. O cookie guarda um token aleatório; aqui fica apenas o SHA-256 dele.
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  remember    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Tokens temporários de recuperação de senha (também guardados como hash).
CREATE TABLE IF NOT EXISTS password_resets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT    NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER
);

-- Registro de tentativas de login, usado para limitar ataques de força bruta.
CREATE TABLE IF NOT EXISTS login_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT,
  ip           TEXT,
  success      INTEGER NOT NULL,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);

-- Versões do banco de questões importadas (permite manter o histórico de versões antigas).
CREATE TABLE IF NOT EXISTS question_banks (
  version     TEXT    PRIMARY KEY,
  source       TEXT,
  total        INTEGER NOT NULL,
  content_hash TEXT    NOT NULL,
  imported_at  INTEGER NOT NULL
);

-- Questões de cada versão do banco. A ordem de apresentação é fixa (coluna position).
CREATE TABLE IF NOT EXISTS questions (
  bank_version     TEXT    NOT NULL REFERENCES question_banks(version),
  id               INTEGER NOT NULL,
  position         INTEGER NOT NULL,
  category         TEXT,
  statement        TEXT    NOT NULL,
  image            TEXT,
  options_json     TEXT    NOT NULL,
  correct_letter   TEXT    NOT NULL CHECK (correct_letter IN ('A','B','C','D','E')),
  explanation      TEXT,
  weight           REAL    NOT NULL DEFAULT 1,
  memo_sequence    TEXT,
  memo_before_pos  INTEGER,
  memo_duration_ms INTEGER,
  PRIMARY KEY (bank_version, id),
  UNIQUE (bank_version, position)
);

-- Tentativas (uma avaliação completa de um usuário).
-- started_at = momento em que a 1ª questão foi apresentada (início do cronômetro geral).
CREATE TABLE IF NOT EXISTS attempts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_version     TEXT    NOT NULL REFERENCES question_banks(version),
  status           TEXT    NOT NULL CHECK (status IN ('em_andamento','finalizada','encerrada')),
  current_position INTEGER NOT NULL DEFAULT 1,
  total_questions  INTEGER NOT NULL,
  created_at       INTEGER NOT NULL,
  started_at       INTEGER,
  finished_at      INTEGER,
  total_seconds    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);

-- Exibições das sequências de memorização (antes das questões que dependem delas).
CREATE TABLE IF NOT EXISTS memo_views (
  attempt_id  INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  shown_at    INTEGER NOT NULL,
  ends_at     INTEGER NOT NULL,
  PRIMARY KEY (attempt_id, question_id)
);

-- Respostas: uma linha por questão apresentada. presented_at inicia o cronômetro da questão.
CREATE TABLE IF NOT EXISTS answers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id      INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL,
  position        INTEGER NOT NULL,
  presented_at    INTEGER NOT NULL,
  answered_at     INTEGER,
  selected_letter TEXT CHECK (selected_letter IN ('A','B','C','D','E')),
  is_correct      INTEGER,
  seconds         INTEGER,
  UNIQUE (attempt_id, question_id)
);

-- Resultado consolidado, calculado no servidor ao finalizar a tentativa.
CREATE TABLE IF NOT EXISTS results (
  attempt_id        INTEGER PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
  bank_version      TEXT    NOT NULL,
  total             INTEGER NOT NULL,
  correct           INTEGER NOT NULL,
  wrong             INTEGER NOT NULL,
  unanswered        INTEGER NOT NULL,
  points            REAL    NOT NULL,
  max_points        REAL    NOT NULL,
  score             REAL    NOT NULL,
  total_seconds     INTEGER NOT NULL,
  avg_seconds       REAL,
  fastest_question  INTEGER,
  slowest_question  INTEGER,
  answer_key_json   TEXT    NOT NULL,
  computed_at       INTEGER NOT NULL
);
