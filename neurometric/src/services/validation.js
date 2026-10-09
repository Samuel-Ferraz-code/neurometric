/**
 * Regras de validação compartilhadas pelo back-end.
 * O front-end repete as mesmas regras para dar retorno imediato, mas a decisão final é sempre do servidor.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

function validateEmail(value) {
  const email = clean(value).toLowerCase();
  if (!email) return { error: 'Informe o e-mail.' };
  if (email.length > 254 || !EMAIL_RE.test(email)) return { error: 'Informe um e-mail válido.' };
  return { value: email };
}

function validatePassword(password, confirm) {
  if (typeof password !== 'string' || password.length < 8) return { error: 'A senha deve ter no mínimo 8 caracteres.' };
  if (password.length > 128) return { error: 'A senha deve ter no máximo 128 caracteres.' };
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return { error: 'A senha deve conter letras e números.' };
  if (confirm !== undefined && password !== confirm) return { error: 'As senhas não coincidem.' };
  return { value: password };
}

function validateRegistration(body = {}) {
  const errors = {};
  const email = validateEmail(body.email);
  if (email.error) errors.email = email.error;

  const name = clean(body.name).replace(/\s+/g, ' ');
  if (name.length < 3) errors.name = 'Informe seu nome completo.';
  else if (name.length > 120) errors.name = 'Nome muito longo.';

  const age = Number(body.age);
  if (!Number.isInteger(age) || age < 10 || age > 120) errors.age = 'Informe uma idade válida entre 10 e 120 anos.';

  const phoneDigits = clean(body.phone).replace(/\D/g, '');
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) errors.phone = 'Informe um telefone com DDD (10 ou 11 dígitos).';

  const password = validatePassword(body.password, body.confirmPassword);
  if (password.error) errors.password = password.error;

  if (body.acceptTerms !== true) errors.acceptTerms = 'Você deve aceitar os Termos de Uso e a Política de Privacidade.';

  return {
    errors,
    ok: Object.keys(errors).length === 0,
    data: { email: email.value, name, age, phone: phoneDigits || null, password: body.password },
  };
}

module.exports = { validateEmail, validatePassword, validateRegistration, clean };
