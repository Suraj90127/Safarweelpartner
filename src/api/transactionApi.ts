/**
 * Transaction API
 */

import { get } from './httpClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const transactionApi = {
  getTransactionHistory: () => get<any>(API_ENDPOINTS.TRANSACTIONS.HISTORY),
};
