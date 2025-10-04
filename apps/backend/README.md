# Portfolio Tracker Backend

This is the AWS CDK backend for the Portfolio Tracker application, providing authentication, API endpoints, and database storage.

## Architecture

- **AWS CDK**: Infrastructure as Code
- **Amazon RDS**: PostgreSQL database for persistent storage
- **AWS Cognito**: User authentication with Google OAuth
- **AWS Lambda**: Serverless API handlers
- **Amazon API Gateway**: REST API endpoints
- **AWS Secrets Manager**: Secure credential storage

## Prerequisites

1. **AWS CLI**: Configure your AWS credentials
2. **Node.js**: Version 18+
3. **AWS CDK**: Install globally with `npm install -g aws-cdk`

## Setup

1. **Install dependencies**:

   ```bash
   cd packages/backend
   npm install
   ```

2. **Bootstrap CDK** (first time only):

   ```bash
   cdk bootstrap
   ```

3. **Configure Google OAuth**:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs (your deployed app URL + `/auth/callback`)
   - Update `lib/backend-stack.ts` with your Google Client ID and Secret

4. **Deploy infrastructure**:

   ```bash
   cdk deploy
   ```

5. **Note deployment outputs**:
   - `PortfolioTrackerAPI` - API Gateway endpoint URL
   - `PortfolioTrackerUserPoolId` - Cognito User Pool ID
   - `PortfolioTrackerUserPoolClientId` - Cognito Client ID
   - `PortfolioTrackerDBSecretArn` - Database secret ARN

## Update Frontend Configuration

After deployment, update your frontend `.env` file:

```bash
VITE_API_BASE_URL=https://your-api-gateway-id.amazonaws.com
VITE_USER_POOL_ID=your-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-client-id
VITE_COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
VITE_REDIRECT_URI=https://your-app-domain.com/auth/callback
```

## Development

1. **Build Lambda functions**:

   ```bash
   cd packages/lambda
   npm install
   npm run build
   ```

2. **Deploy updates**:
   ```bash
   cdk deploy
   ```

## Database Schema

The database is automatically initialized with:

- `users` table: Links Cognito users to app-specific data
- `transactions` table: Portfolio transactions with user isolation
- Views for asset holdings and portfolio values
- Proper indexes for performance

## API Endpoints

All endpoints require authentication via Bearer token:

- `GET /transactions` - List user's transactions
- `POST /transactions` - Create new transaction
- `PUT /transactions/{id}` - Update transaction
- `DELETE /transactions/{id}` - Delete transaction

## Security Features

- User-specific data isolation
- JWT token validation
- CORS configuration
- VPC isolation for database
- Secrets management for credentials
