/**
 * Package API
 */

import { get, post } from './httpClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { Package } from '../types/package.types';

export const packageApi = {
  getPackages: (serviceId?: string) =>
    get<Package[]>(
      API_ENDPOINTS.PACKAGES.LIST,
      serviceId ? { params: { serviceId } } : undefined,
    ),
  buyPackage: (id: string) => post<any>(API_ENDPOINTS.PACKAGES.BUY(id)),
  validateUser: () => get<any>(API_ENDPOINTS.PACKAGES.VALIDATE_USER),
};

