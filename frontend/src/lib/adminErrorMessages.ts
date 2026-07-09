const FRIENDLY_PATTERNS: Array<{ test: RegExp; message: string }> = [
  { test: /slug|identificador/i, message: 'El identificador interno no es válido. Use solo letras y números.' },
  { test: /already exists|duplicate|ya existe/i, message: 'Ya existe un rol con ese nombre.' },
  { test: /permission|permiso/i, message: 'No tiene permisos para realizar esta acción.' },
  { test: /forbidden|403/i, message: 'No tiene permisos para realizar esta acción.' },
  { test: /unauthorized|401/i, message: 'Su sesión expiró. Vuelva a iniciar sesión.' },
  { test: /email.*exist|correo/i, message: 'Ya existe un usuario con ese correo electrónico.' },
  { test: /password|contraseña/i, message: 'La contraseña no cumple los requisitos mínimos.' },
  { test: /name|nombre/i, message: 'Debe ingresar un nombre válido.' },
  { test: /network|fetch|conexión/i, message: 'No se pudo conectar con el servidor. Intente de nuevo.' },
];

export function friendlyAdminError(
  err: unknown,
  fallback: string,
): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (!raw.trim()) return fallback;
  for (const { test, message } of FRIENDLY_PATTERNS) {
    if (test.test(raw)) return message;
  }
  if (raw.length > 120 || raw.includes('{') || raw.includes('Error:')) {
    return fallback;
  }
  return raw;
}

export const ADMIN_VALIDATION = {
  roleNameRequired: 'Debe ingresar un nombre para el rol.',
  roleNameMin: 'El nombre debe tener al menos 2 caracteres.',
  rolePermsRequired: 'Seleccione al menos un permiso para este rol.',
  userNameRequired: 'Debe ingresar nombre y apellido.',
  userDocumentRequired: 'Debe ingresar el documento de identidad.',
  userEmailRequired: 'Debe ingresar un correo electrónico.',
  userPasswordMin: 'La contraseña debe tener al menos 8 caracteres.',
  userRoleRequired: 'Seleccione un rol para el usuario.',
  noPermissionCreateRole: 'No tiene permisos para crear roles.',
  noPermissionCreateUser: 'No tiene permisos para crear usuarios.',
} as const;
