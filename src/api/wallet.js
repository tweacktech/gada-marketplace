/** Wallet and transaction endpoints (authenticated customer). */
import { apiClient } from './client';

export const adaptTransaction = (t) => ({
  id: t.id,
  title: t.transaction_title || 'Transaction',
  ref: t.transaction_ref,
  amount: Number(t.amount || 0),
  type: t.transaction_type,
  status: t.transaction_status,
  method: t.payment_method,
  date: t.date_of_transaction,
});

/** Laravel paginators nest rows under `data`; plain lists are returned as-is. */
const rowsOf = (page) => (Array.isArray(page) ? page : page?.data || []);

export const walletApi = {
  /** { wallet, earning_wallet, virtual_account, transaction_history } */
  async getWalletInfo() {
    const res = await apiClient.get('/account/wallet-info');
    const d = res.data || {};
    return {
      balance: Number(d.wallet?.balance || 0),
      earningBalance: Number(d.earning_wallet?.balance || 0),
      virtualAccount: d.virtual_account
        ? { bankName: d.virtual_account.bank_name, accountNumber: d.virtual_account.account_number }
        : null,
      recentTransactions: rowsOf(d.transaction_history).map(adaptTransaction),
    };
  },

  async getBalance() {
    const res = await apiClient.get('/account/wallet-balance');
    return Number(res.data?.wallet?.balance || 0);
  },

  /** @returns {{ items, nextPage }} */
  async getTransactions({ filter, page = 1 } = {}) {
    const res = await apiClient.get('/account/transaction-histories', { filter, page });
    const body = res.data || {};
    return {
      items: rowsOf(body).map(adaptTransaction),
      nextPage: body.next_page_url ? (body.current_page || page) + 1 : null,
    };
  },

  async getFilters() {
    const res = await apiClient.get('/account/filters');
    return res.data || [];
  },
};
