/**
 * Alert API
 */

import { get } from './httpClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export interface AlertData {
  id: string;
  title: string;
  body: string;
  message?: string;
  type: string;
  image?: string;
  imageUrl?: string;
  image_url?: string;
  sentAt?: string;
  createdAt?: string;
  payload?: any;
}

export const alertApi = {
  getAlertsByType: (userType: string) =>
    get<AlertData[]>(API_ENDPOINTS.ALERT.BY_TYPE(userType)),
};

export default alertApi;
