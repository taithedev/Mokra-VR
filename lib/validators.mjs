export const validUsername = name => /^[a-z0-9_]{3,20}$/.test(String(name||''));
export const validPassword = value => typeof value === 'string' && value.length >= 10 && value.length <= 128;
export const validColor = value => /^#[0-9a-fA-F]{6}$/.test(String(value||''));
export const validMode = value => value === 'rainbow' || value === 'solid';
export const validDensity = value => Number.isInteger(value) && value >= 1 && value <= 4;
export const displayNameValid = value => typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 32;
