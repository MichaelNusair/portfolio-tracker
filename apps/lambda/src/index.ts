import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { Client } from 'pg';
import { SecretsManager } from 'aws-sdk';
import jwt from 'jsonwebtoken';
import {
  validateCreateTransactionInput,
  validateUpdateTransactionInput,
  safeValidateCreateTransactionInput,
  safeValidateUpdateTransactionInput,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  AssetType,
  TransactionType,
  ASSET_DISPLAY_NAMES,
  ASSET_DESCRIPTIONS,
} from '@portfolio-tracker/api';

// Database connection helper
async function getDbClient(): Promise<Client> {
  const secretsManager = new SecretsManager();

  const secretValue = await secretsManager
    .getSecretValue({
      SecretId: process.env.DB_SECRET_ARN!,
    })
    .promise();

  const credentials = JSON.parse(secretValue.SecretString!);

  const client = new Client({
    host: process.env.DB_HOST!,
    port: 5432,
    database: 'portfoliodb',
    user: credentials.username,
    password: credentials.password,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}

// Helper to verify JWT token and get user info
async function getUserFromToken(token: string): Promise<any> {
  // In production, verify the JWT token properly
  // For now, just return the user info from Cognito
  const decoded = jwt.decode(token.replace('Bearer ', '')) as any;
  return {
    sub: decoded.sub,
    email: decoded.email,
    givenName: decoded.given_name,
    familyName: decoded.family_name,
  };
}

// Helper to get user ID from request
async function getUserId(event: APIGatewayProxyEvent): Promise<string> {
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const user = await getUserFromToken(token);

  // Check if user exists in our database, if not create them
  const client = await getDbClient();

  try {
    const existingUser = await client.query(
      'SELECT id FROM users WHERE cognito_id = $1',
      [user.sub]
    );

    if (existingUser.rows.length > 0) {
      return existingUser.rows[0].id;
    }

    // Create new user
    const newUser = await client.query(
      'INSERT INTO users (cognito_id, email, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id',
      [user.sub, user.email, user.givenName, user.familyName]
    );

    return newUser.rows[0].id;
  } finally {
    await client.end();
  }
}

// GET /transactions
async function getTransactions(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const userId = await getUserId(event);
    const client = await getDbClient();

    try {
      const result = await client.query(
        'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC',
        [userId]
      );

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result.rows),
      };
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error getting transactions:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

// POST /transactions
async function createTransaction(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const userId = await getUserId(event);
    const body = JSON.parse(event.body || '{}');

    // Validate input using shared schema
    const validationResult = safeValidateCreateTransactionInput(body);
    if (!validationResult.success) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid input data',
          details: validationResult.error.message,
        }),
      };
    }

    const { date, asset, type, quantity, totalILS } = validationResult.data;

    const client = await getDbClient();

    try {
      const result = await client.query(
        `INSERT INTO transactions (user_id, date, asset, type, quantity, total_ils)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, date, asset, type, quantity, totalILS]
      );

      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result.rows[0]),
      };
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

// PUT /transactions/{id}
async function updateTransaction(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const userId = await getUserId(event);
    const transactionId = event.pathParameters?.id;

    if (!transactionId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Transaction ID is required' }),
      };
    }

    const body = JSON.parse(event.body || '{}');

    // Validate input using shared schema (partial validation for updates)
    const validationResult = safeValidateUpdateTransactionInput(body);
    if (!validationResult.success) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid input data',
          details: validationResult.error.message,
        }),
      };
    }

    const { date, asset, type, quantity, totalILS } = validationResult.data;

    const client = await getDbClient();

    try {
      const result = await client.query(
        `UPDATE transactions
         SET date = $1, asset = $2, type = $3, quantity = $4, total_ils = $5, updated_at = NOW()
         WHERE id = $6 AND user_id = $7
         RETURNING *`,
        [date, asset, type, quantity, totalILS, transactionId, userId]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Transaction not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(result.rows[0]),
      };
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error updating transaction:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

// DELETE /transactions/{id}
async function deleteTransaction(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const userId = await getUserId(event);
    const transactionId = event.pathParameters?.id;

    if (!transactionId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Transaction ID is required' }),
      };
    }

    const client = await getDbClient();

    try {
      const result = await client.query(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
        [transactionId, userId]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Transaction not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Transaction deleted successfully' }),
      };
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

// Main handler
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const { httpMethod, path } = event;

  try {
    switch (httpMethod) {
      case 'GET':
        if (path === '/transactions') {
          return await getTransactions(event);
        }
        break;
      case 'POST':
        if (path === '/transactions') {
          return await createTransaction(event);
        }
        break;
      case 'PUT':
        if (path?.startsWith('/transactions/')) {
          return await updateTransaction(event);
        }
        break;
      case 'DELETE':
        if (path?.startsWith('/transactions/')) {
          return await deleteTransaction(event);
        }
        break;
    }

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }
}
