/** Erro com status HTTP e código legível, tratado pelo middleware central de erros. */
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, 'dados_invalidos', message, details);
const unauthorized = (message = 'Faça login para continuar.') => new HttpError(401, 'nao_autenticado', message);
const forbidden = (message = 'Acesso negado.') => new HttpError(403, 'acesso_negado', message);
const notFound = (message = 'Recurso não encontrado.') => new HttpError(404, 'nao_encontrado', message);
const conflict = (message) => new HttpError(409, 'conflito', message);
const tooMany = (message) => new HttpError(429, 'muitas_tentativas', message);
const unavailable = (code, message) => new HttpError(503, code, message);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany, unavailable };
