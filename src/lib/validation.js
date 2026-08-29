/**
 * Form validation.
 *
 * Rules return a plain message or null. Messages say what to do, never just
 * that something is wrong: "Use a domain like example.com", not "Invalid".
 */

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[+]?[\d][\d\s()-]{6,24}$/;

export const stripProtocol = (value = '') =>
  value.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').replace(/\/+$/, '');

export const rules = {
  required: (label) => (v) => (String(v ?? '').trim() ? null : `${label} is required`),

  minLength: (n, label) => (v) =>
    !v || String(v).trim().length >= n ? null : `${label} needs at least ${n} characters`,

  maxLength: (n, label) => (v) => (!v || String(v).length <= n ? null : `${label} must be under ${n} characters`),

  domain: (v) => {
    if (!v?.trim()) return null;
    const bare = stripProtocol(v);
    if (!bare) return 'Enter the website address, for example example.com';
    if (bare.includes(' ')) return 'A web address cannot contain spaces';
    if (!DOMAIN_RE.test(bare)) return 'That does not look like a web address. Use the form example.com';
    return null;
  },

  email: (v) => (!v?.trim() || EMAIL_RE.test(v.trim()) ? null : 'Enter a valid email, for example name@company.com'),

  phone: (v) =>
    !v?.trim() || PHONE_RE.test(v.trim()) ? null : 'Enter a phone number with country code, for example +91 98250 11111',

  url: (v) => {
    if (!v?.trim()) return null;
    try {
      const u = new URL(v.trim().startsWith('http') ? v.trim() : `https://${v.trim()}`);
      return u.hostname.includes('.') ? null : 'That does not look like a web address';
    } catch {
      return 'That does not look like a web address';
    }
  },

  password: (v) => {
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Use at least 8 characters';
    if (!/[a-z]/i.test(v) || !/\d/.test(v)) return 'Include at least one letter and one number';
    return null;
  },

  maxItems: (n, label) => (list) => (!list || list.length <= n ? null : `You can add up to ${n} ${label}`),
};

/** Runs a { field: [rule, rule] } map and returns { field: message } for failures. */
export const validateForm = (values, schema) => {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(schema)) {
    for (const rule of fieldRules) {
      const message = rule(values[field]);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  }
  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;

/** Strength meter for new passwords: 0-4 plus a label. */
export const passwordStrength = (v = '') => {
  let score = 0;
  if (v.length >= 8) score += 1;
  if (v.length >= 12) score += 1;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score += 1;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) score += 1;
  return { score, label: ['Too short', 'Weak', 'Okay', 'Good', 'Strong'][score] };
};
