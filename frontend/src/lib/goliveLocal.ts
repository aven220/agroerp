/** Lectura local de Go Live (misma clave que implementationEngine). */
export function readCertifiedLocalSafe(): { certified: boolean; at: string | null } {
  try {
    const certified = localStorage.getItem('agroerp_golive_certified') === '1';
    const raw = localStorage.getItem('agroerp_golive_record');
    const parsed = raw ? (JSON.parse(raw) as { at?: string }) : null;
    return { certified, at: parsed?.at ?? null };
  } catch {
    return { certified: false, at: null };
  }
}
