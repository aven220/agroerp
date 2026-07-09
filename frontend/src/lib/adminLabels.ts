export { slugifyRoleName, USER_STATUS_LABELS } from './adminPermissions';

export const ROLE_WIZARD_STEPS = [
  { id: 'info', label: '1. Información', hint: 'Nombre y descripción del rol' },
  { id: 'permissions', label: '2. Permisos', hint: 'Qué puede hacer este rol' },
  { id: 'review', label: '3. Resumen', hint: 'Confirmar antes de guardar' },
] as const;

export const USER_WIZARD_STEPS = [
  { id: 'profile', label: '1. Datos personales', hint: 'Nombre e identificación' },
  { id: 'access', label: '2. Acceso', hint: 'Correo, contraseña y rol' },
  { id: 'review', label: '3. Resumen', hint: 'Confirmar antes de crear' },
] as const;

export const ADMIN_HELP_CARDS = [
  {
    title: '¿Qué es un rol?',
    body: 'Un rol agrupa permisos. Por ejemplo, «Supervisor de campo» puede ver productores y aprobar formularios sin acceder a finanzas.',
  },
  {
    title: '¿Qué es el identificador interno?',
    body: 'Es un código técnico generado automáticamente. Los usuarios finales solo ven el nombre del rol.',
  },
  {
    title: 'Buenas prácticas',
    body: 'Cree roles por función (no por persona). Asigne el rol mínimo necesario para cada usuario.',
  },
] as const;
