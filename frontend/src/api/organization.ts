/**
 * PM — Licencia de producto por organización (persistida en backend).
 */

import { apiRequest } from './client';
import type { ProductPackageId } from '../config/productModules';

export interface OrgProductLicense {
  organizationId?: string;
  name?: string;
  packageId: ProductPackageId;
  enabledModules: string[];
}

export function getOrgProductLicense() {
  return apiRequest<OrgProductLicense>('/identity/organization/product-license');
}

export function updateOrgProductLicense(body: {
  packageId: ProductPackageId;
  enabledModules?: string[];
}) {
  return apiRequest<OrgProductLicense>('/identity/organization/product-license', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
