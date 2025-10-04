// Re-export shared types from API package for consistency
// This ensures UI, backend, and API all use the same type definitions
export type {
  AssetType,
  TransactionType,
  Transaction,
  AssetHolding,
  PortfolioValue,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionResponse,
  TransactionsListResponse,
  AssetHoldingsListResponse,
  PortfolioHistoryResponse,
} from '@portfolio-tracker/api';

// Re-export constants from API package
export {
  ASSET_DISPLAY_NAMES,
  ASSET_DESCRIPTIONS,
} from '@portfolio-tracker/api';
