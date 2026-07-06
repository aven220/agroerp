import { apiRequest } from './client';

export interface EppmCenter {
  dashboard: {
    totalPublished: number;
    installedCount: number;
    enabledCount: number;
    disabledCount: number;
    failedInstalls: number;
    pendingUpdates: number;
    audit24h: number;
    topPlugins: Array<{ pluginKey: string; name: string; downloadCount: number; ratingAvg: number }>;
    byType: Array<{ type: string; count: number }>;
  };
  suggestions: unknown[];
  installs: EppmInstall[];
}

export interface EppmPlugin {
  id: string;
  pluginKey: string;
  name: string;
  description?: string;
  vendor: string;
  vendorType: string;
  pluginType: string;
  categoryKey: string;
  status: string;
  currentVersion: string;
  ratingAvg: number;
  ratingCount: number;
  downloadCount: number;
  license?: string;
  tags: string[];
  screenshots: string[];
  documentation?: string;
  compatibility: Record<string, unknown>;
  category?: { name: string };
  versions?: Array<{ version: string; changelog?: string; publishedAt: string }>;
}

export interface EppmInstall {
  id: string;
  pluginKey: string;
  installedVersion: string;
  status: string;
  autoUpdate: boolean;
  installedAt: string;
  plugin: EppmPlugin;
}

export interface EppmCategory {
  categoryKey: string;
  name: string;
  description?: string;
}

export function getEppmCenter() {
  return apiRequest<EppmCenter>('/eppm/center');
}

export function searchMarketplace(q?: string, categoryKey?: string, pluginType?: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (categoryKey) params.set('categoryKey', categoryKey);
  if (pluginType) params.set('pluginType', pluginType);
  const query = params.toString() ? `?${params}` : '';
  return apiRequest<EppmPlugin[]>(`/eppm/marketplace${query}`);
}

export function getMarketplacePlugin(pluginKey: string) {
  return apiRequest<EppmPlugin>(`/eppm/marketplace/${pluginKey}`);
}

export function listMarketplaceCategories() {
  return apiRequest<EppmCategory[]>('/eppm/marketplace/categories');
}

export function listInstalledPlugins(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<EppmInstall[]>(`/eppm/plugins${q}`);
}

export function installPlugin(pluginKey: string, config?: Record<string, unknown>) {
  return apiRequest<EppmInstall>(`/eppm/plugins/${pluginKey}/install`, {
    method: 'POST',
    body: JSON.stringify({ config }),
  });
}

export function enablePlugin(installId: string) {
  return apiRequest<unknown>(`/eppm/installs/${installId}/enable`, { method: 'POST' });
}

export function disablePlugin(installId: string) {
  return apiRequest<unknown>(`/eppm/installs/${installId}/disable`, { method: 'POST' });
}

export function uninstallPlugin(installId: string) {
  return apiRequest<unknown>(`/eppm/installs/${installId}/uninstall`, { method: 'POST' });
}

export function schedulePluginUpdate(installId: string, toVersion: string) {
  return apiRequest<unknown>(`/eppm/installs/${installId}/schedule-update`, {
    method: 'POST',
    body: JSON.stringify({ toVersion }),
  });
}

export function rollbackPlugin(installId: string) {
  return apiRequest<unknown>(`/eppm/installs/${installId}/rollback`, { method: 'POST' });
}

export function listPluginUpdates() {
  return apiRequest<unknown[]>('/eppm/updates');
}

export function listPluginAudit(pluginKey?: string) {
  const q = pluginKey ? `?pluginKey=${pluginKey}` : '';
  return apiRequest<unknown[]>(`/eppm/audit${q}`);
}

export function reviewPlugin(pluginKey: string, rating: number, comment?: string) {
  return apiRequest<unknown>(`/eppm/marketplace/${pluginKey}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
}

export function getSdkTemplate(pluginType: string) {
  return apiRequest<unknown>(`/eppm/sdk/template/${pluginType}`);
}

export function validateManifest(manifest: Record<string, unknown>) {
  return apiRequest<unknown>('/eppm/sdk/validate', {
    method: 'POST',
    body: JSON.stringify({ manifest }),
  });
}

export function packageManifest(manifest: Record<string, unknown>) {
  return apiRequest<unknown>('/eppm/sdk/package', {
    method: 'POST',
    body: JSON.stringify({ manifest }),
  });
}

export function listExtensionPoints() {
  return apiRequest<unknown[]>('/eppm/extension-points');
}
