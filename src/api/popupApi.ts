/**
 * Popup API
 */

import { get } from './httpClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export interface PopupData {
  _id: string;
  title: string;
  description?: string;
  image: string;
  status: string;
  createdAt?: string;
}

export const popupApi = {
  getPopup: (status = 'active') =>
    get<PopupData>(`${API_ENDPOINTS.POPUP.GET_ACTIVE}?status=${status}`),
};

export default popupApi;
