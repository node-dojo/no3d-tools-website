export function v3OwnerGateEnabled(env = process.env) {
  return env.V3_ACCESS_MODE?.trim().toLowerCase() === 'owner';
}

export function v3OwnerEmails(env = process.env) {
  return new Set(
    (env.V3_OWNER_EMAILS || '')
      .split(',')
      .map(value => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function v3OwnerAllowed(email, env = process.env) {
  if (!v3OwnerGateEnabled(env)) return true;
  if (typeof email !== 'string') return false;
  return v3OwnerEmails(env).has(email.trim().toLowerCase());
}
