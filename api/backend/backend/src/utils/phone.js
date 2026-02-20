const DIGITS_ONLY = /\D/g;

const normalizePhoneDigits = (value) => String(value || '').replace(DIGITS_ONLY, '');

const isValidMobile10 = (value) => /^\d{10}$/.test(String(value || '').trim());

module.exports = {
  normalizePhoneDigits,
  isValidMobile10,
};
