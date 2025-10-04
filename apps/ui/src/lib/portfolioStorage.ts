import { apiClient } from './api';
import { AssetType, Transaction, TransactionType } from '@/types/portfolio';

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await apiClient.getTransactions();

  if (response.error) {
    console.error('Failed to fetch transactions:', response.error);
    return [];
  }

  return response.data || [];
};

export const addTransaction = async (
  transaction: Omit<Transaction, 'id'>
): Promise<Transaction | null> => {
  const response = await apiClient.createTransaction(transaction);

  if (response.error) {
    console.error('Failed to create transaction:', response.error);
    return null;
  }

  return response.data || null;
};

export const updateTransaction = async (
  id: string,
  transaction: Partial<Transaction>
): Promise<Transaction | null> => {
  const response = await apiClient.updateTransaction(id, transaction);

  if (response.error) {
    console.error('Failed to update transaction:', response.error);
    return null;
  }

  return response.data || null;
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  const response = await apiClient.deleteTransaction(id);

  if (response.error) {
    console.error('Failed to delete transaction:', response.error);
    return false;
  }

  return true;
};

export const importFromCSV = async (
  csvText: string
): Promise<Transaction[]> => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].toLowerCase().split(',');

  const transactions: Omit<Transaction, 'id'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const transaction: Partial<Transaction> = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (header.includes('date')) transaction.date = value;
      if (header.includes('asset'))
        transaction.asset = value.toUpperCase() as AssetType;
      if (header.includes('type'))
        transaction.type = value.toLowerCase() as TransactionType;
      if (header.includes('quantity')) transaction.quantity = parseFloat(value);
      if (
        header.includes('total') ||
        header.includes('ils') ||
        header.includes('amount')
      )
        transaction.totalILS = parseFloat(value);
    });

    // Validate required fields
    if (
      transaction.date &&
      transaction.asset &&
      transaction.type &&
      transaction.quantity &&
      transaction.totalILS
    ) {
      transactions.push(transaction as Omit<Transaction, 'id'>);
    }
  }

  // Import transactions one by one
  const importedTransactions: Transaction[] = [];

  for (const transaction of transactions) {
    const imported = await addTransaction(transaction);
    if (imported) {
      importedTransactions.push(imported);
    }
  }

  return importedTransactions;
};
