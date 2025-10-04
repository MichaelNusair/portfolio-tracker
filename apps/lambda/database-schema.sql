-- Database schema for Portfolio Tracker

-- Users table (extends Cognito users with our app-specific data)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    asset VARCHAR(50) NOT NULL CHECK (asset IN ('BTC', 'ETH', 'SPY', 'Nadlan', 'Pension', 'Hishtalmut')),
    type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
    quantity DECIMAL(20, 10) NOT NULL CHECK (quantity > 0),
    total_ils DECIMAL(15, 2) NOT NULL CHECK (total_ils > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset holdings view (calculated from transactions)
CREATE OR REPLACE VIEW asset_holdings AS
SELECT
    user_id,
    asset,
    SUM(
        CASE
            WHEN type = 'buy' THEN quantity
            WHEN type = 'sell' THEN -quantity
            ELSE 0
        END
    ) as total_quantity,
    AVG(
        CASE
            WHEN type = 'buy' THEN total_ils / quantity
            ELSE NULL
        END
    ) as avg_price_ils
FROM transactions
GROUP BY user_id, asset
HAVING SUM(
    CASE
        WHEN type = 'buy' THEN quantity
        WHEN type = 'sell' THEN -quantity
        ELSE 0
    END
) > 0;

-- Portfolio value view (current total value)
CREATE OR REPLACE VIEW portfolio_value AS
SELECT
    user_id,
    SUM(total_quantity * avg_price_ils) as total_value_ils,
    NOW()::DATE as date
FROM asset_holdings
GROUP BY user_id;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset);
CREATE INDEX IF NOT EXISTS idx_users_cognito_id ON users(cognito_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
