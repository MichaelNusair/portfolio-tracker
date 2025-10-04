import { z } from 'zod';

// Asset types and enums
export const AssetTypeSchema = z.enum([
  'BTC',
  'ETH',
  'SPY',
  'Nadlan',
  'Pension',
  'Hishtalmut',
]);

export const TransactionTypeSchema = z.enum(['buy', 'sell']);

export type AssetType = z.infer<typeof AssetTypeSchema>;
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

// Asset display names for better UX
export const ASSET_DISPLAY_NAMES: Record<AssetType, string> = {
  BTC: 'Bitcoin (BTC)',
  ETH: 'Ethereum (ETH)',
  SPY: 'S&P 500 (SPY)',
  Nadlan: 'Nadlan',
  Pension: 'Pension',
  Hishtalmut: 'Hishtalmut',
};

// Asset descriptions for tooltips/context
export const ASSET_DESCRIPTIONS: Record<AssetType, string> = {
  BTC: 'Bitcoin - Leading cryptocurrency',
  ETH: 'Ethereum - Smart contract platform',
  SPY: 'SPDR S&P 500 ETF Trust - Tracks S&P 500 index',
  Nadlan: 'Nadlan - locked in haifa apartment',
  Pension: 'Pension - Israeli pension fund',
  Hishtalmut: 'Hishtalmut - Israeli keren hishtalmut fund',
};

// Transaction schema for validation
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  asset: AssetTypeSchema,
  type: TransactionTypeSchema,
  quantity: z.number().positive('Quantity must be positive'),
  totalILS: z.number().positive('Total ILS must be positive'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Input schemas for API requests (without auto-generated fields)
export const CreateTransactionInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  asset: AssetTypeSchema,
  type: TransactionTypeSchema,
  quantity: z.number().positive('Quantity must be positive'),
  totalILS: z.number().positive('Total ILS must be positive'),
});

export const UpdateTransactionInputSchema =
  CreateTransactionInputSchema.partial();

// Response schemas for API responses
export const TransactionResponseSchema = TransactionSchema;
export const TransactionsListResponseSchema = z.array(TransactionSchema);

// Asset holding schema
export const AssetHoldingSchema = z.object({
  asset: AssetTypeSchema,
  quantity: z.number().nonnegative(),
  avgPrice: z.number().nonnegative(),
  currentPrice: z.number().nonnegative(),
  valueILS: z.number().nonnegative(),
  change24h: z.number(),
});

export const AssetHoldingsListResponseSchema = z.array(AssetHoldingSchema);

// Portfolio value schema
export const PortfolioValueSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  totalILS: z.number().nonnegative(),
});

export const PortfolioHistoryResponseSchema = z.array(PortfolioValueSchema);

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
});

// API Gateway response schemas
export const ApiResponseSchema = z.object({
  statusCode: z.number(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string(),
});

// Type exports for TypeScript
export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionInput = z.infer<
  typeof CreateTransactionInputSchema
>;
export type UpdateTransactionInput = z.infer<
  typeof UpdateTransactionInputSchema
>;
export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;
export type TransactionsListResponse = z.infer<
  typeof TransactionsListResponseSchema
>;
export type AssetHolding = z.infer<typeof AssetHoldingSchema>;
export type AssetHoldingsListResponse = z.infer<
  typeof AssetHoldingsListResponseSchema
>;
export type PortfolioValue = z.infer<typeof PortfolioValueSchema>;
export type PortfolioHistoryResponse = z.infer<
  typeof PortfolioHistoryResponseSchema
>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;

// Validation helper functions
export function validateCreateTransactionInput(
  data: unknown
): CreateTransactionInput {
  return CreateTransactionInputSchema.parse(data);
}

export function validateUpdateTransactionInput(
  data: unknown
): UpdateTransactionInput {
  return UpdateTransactionInputSchema.parse(data);
}

export function validateTransaction(data: unknown): Transaction {
  return TransactionSchema.parse(data);
}

export function validateTransactionsList(
  data: unknown
): TransactionsListResponse {
  return TransactionsListResponseSchema.parse(data);
}

// Safe validation helpers that don't throw
export function safeValidateCreateTransactionInput(data: unknown) {
  return CreateTransactionInputSchema.safeParse(data);
}

export function safeValidateUpdateTransactionInput(data: unknown) {
  return UpdateTransactionInputSchema.safeParse(data);
}

export function safeValidateTransaction(data: unknown) {
  return TransactionSchema.safeParse(data);
}
