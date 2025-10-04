import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { Client } from 'pg';
import { SecretsManager } from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';

// Database connection helper
async function getDbClient(host: string): Promise<Client> {
  const secretsManager = new SecretsManager();

  const secretValue = await secretsManager
    .getSecretValue({
      SecretId: process.env.DB_SECRET_ARN!,
    })
    .promise();

  const credentials = JSON.parse(secretValue.SecretString!);

  const client = new Client({
    host: host,
    port: 5432,
    database: 'portfoliodb',
    user: credentials.username,
    password: credentials.password,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}

// Initialize database schema
async function initializeDatabase(host: string): Promise<void> {
  const client = await getDbClient(host);

  try {
    // Read and execute schema file
    const schemaPath = path.join(__dirname, '..', 'database-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolon to execute each statement separately
    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }

    console.log('Database schema initialized successfully');
  } finally {
    await client.end();
  }
}

export async function handler(
  event: CloudFormationCustomResourceEvent,
  context: Context
) {
  console.log('Database initialization event:', JSON.stringify(event, null, 2));

  const { RequestType, ResourceProperties } = event;
  const { DB_HOST } = ResourceProperties || {};

  if (!DB_HOST) {
    throw new Error('DB_HOST is required');
  }

  try {
    if (RequestType === 'Create' || RequestType === 'Update') {
      await initializeDatabase(DB_HOST);
    }

    // Return success for all request types (including Delete)
    return {
      Status: 'Success',
      Reason: 'Database initialized successfully',
      PhysicalResourceId: 'PortfolioTrackerDBInit',
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
    };
  } catch (error) {
    console.error('Error initializing database:', error);

    throw error;
  }
}
