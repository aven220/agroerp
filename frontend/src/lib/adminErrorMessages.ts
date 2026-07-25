const FRIENDLY_PATTERNS: Array<{ test: RegExp; message: string }> = [
  { test: /slug already exists|identificador.*existe|ya existe un rol/i, message: 'Ya existe un rol con ese nombre.' },

  { test: /slug|identificador interno/i, message: 'El identificador interno no es válido. Use solo letras y números.' },
  { test: /forbidden|403|missing permissions|access denied|no tiene permiso/i, message: 'No tiene permisos para realizar esta acción.' },
  { test: /unauthorized|401|sesión expiró|invalid refresh|invalid token/i, message: 'Su sesión expiró. Vuelva a iniciar sesión.' },
  { test: /email.*exist|correo/i, message: 'Ya existe un usuario con ese correo electrónico.' },
  { test: /password|contraseña/i, message: 'La contraseña no cumple los requisitos mínimos.' },
  { test: /ningún permiso es válido|permisos inválidos/i, message: 'Los permisos seleccionados no son válidos. Vuelva a seleccionarlos e intente de nuevo.' },
  { test: /no se pudieron guardar los permisos|no se pudo actualizar el rol|no se pudo crear el rol/i, message: 'No se pudieron guardar los cambios del rol. Intente de nuevo.' },
  { test: /internal server error/i, message: 'Error interno al guardar. Intente de nuevo; si continúa, contacte soporte.' },
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
  if (raw.length > 160 || raw.includes('{') || /Error:|prisma|invocation/i.test(raw)) {
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
