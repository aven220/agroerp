export { slugifyRoleName, USER_STATUS_LABELS } from './adminPermissions';

export const ROLE_WIZARD_STEPS = [
  { id: 'info', label: '1. Información', hint: 'Nombre y descripción del rol' },
  { id: 'permissions', label: '2. Permisos', hint: 'Qué puede hacer este rol' },
  { id: 'review', label: '3. Resumen', hint: 'Confirmar antes de guardar' },
] as const;

export const USER_WIZARD_STEPS = [
  { id: 'profile', label: '1. Información personal', hint: 'Nombre e identificación de la persona' },
  { id: 'access', label: '2. Credenciales', hint: 'Correo y contraseña de ingreso' },
  { id: 'role', label: '3. Rol', hint: 'Qué podrá hacer en el sistema' },
  { id: 'review', label: '4. Resumen', hint: 'Confirmar antes de crear' },
] as const;

export const ADMIN_HELP_CARDS = [
  {
    title: '¿Qué es un rol?',
    body: 'Un rol agrupa permisos. Por ejemplo, «Supervisor de campo» puede ver productores y aprobar formularios sin acceder a finanzas.',
  },
  {
    title: 'Buenas prácticas',
    body: 'Cree roles por función (no por persona). Asigne el rol mínimo necesario para cada usuario.',
  },
  {
    title: 'Siguiente paso',
    body: 'Después de crear el rol, invite usuarios y asígneles este perfil para que puedan ingresar al sistema.',
  },
] as const;

export const ADMIN_HELP_TOPICS = {
  role: {
    title: '¿Qué es un Rol?',
    body: 'Un rol define qué puede hacer una persona en AgroERP. En lugar de configurar cada usuario por separado, usted crea roles como «Supervisor» o «Operario» y luego los asigna.',
  },
  permission: {
    title: '¿Qué es un Permiso?',
    body: 'Un permiso es una capacidad concreta, por ejemplo consultar productores o aprobar formularios. Los roles agrupan varios permisos relacionados.',
  },
  mfa: {
    title: '¿Qué es MFA?',
    body: 'La autenticación multifactor (MFA) pide un segundo paso al iniciar sesión, como un código en el teléfono. Protege la cuenta aunque alguien conozca la contraseña.',
  },
  audit: {
    title: '¿Qué es Auditoría?',
    body: 'La auditoría registra quién hizo qué y cuándo: inicios de sesión, cambios de datos y acciones sensibles. Sirve para control interno y cumplimiento.',
  },
  policy: {
    title: '¿Qué es una Política?',
    body: 'Las políticas definen reglas de seguridad: longitud de contraseñas, tiempo de sesión, bloqueo por intentos fallidos y requisitos de MFA.',
  },
  user: {
    title: '¿Qué es un Usuario?',
    body: 'Un usuario es una persona con cuenta de acceso al sistema. Cada usuario tiene un correo, contraseña y un rol que determina sus capacidades.',
  },
  organization: {
    title: '¿Está lista mi organización?',
    body: 'Su organización está lista cuando tiene roles definidos, usuarios invitados, políticas de seguridad revisadas y los módulos clave configurados.',
  },
} as const;

export type AdminHelpTopicId = keyof typeof ADMIN_HELP_TOPICS;

export const ROLE_COLORS = [
  '#2563eb',
  '#16a34a',
  '#b45309',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
] as const;

export const ROLE_ICONS = ['👑', '📋', '👷', '🌾', '🔍', '👤', '⚙️', '🛡️'] as const;
