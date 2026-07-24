/**
 * Tutorial / asistente de implementación:
 * solo para el admin de aprendizaje (org demo) o si el usuario activó Tips.
 * El admin de una empresa real configura sin el asistente guiado.
 */

import { useAuth } from '../context/AuthContext';
import { useUserPreferencesOptional } from '../context/UserPreferencesContext';

const LEARNING_ORG_SLUGS = new Set(['demo-agro', 'demo', 'agroerp-demo']);

export function useLearningTutorial(): boolean {
  const { user } = useAuth();
  const prefs = useUserPreferencesOptional();
  if (prefs?.tipsEnabled) return true;

  const slug = (user?.organization?.slug ?? '').toLowerCase();
  const email = (user?.email ?? '').toLowerCase();

  if (LEARNING_ORG_SLUGS.has(slug)) return true;
  if (email.endsWith('@demo.agroerp.com')) return true;
  return false;
}
