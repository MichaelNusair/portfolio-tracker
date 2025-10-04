# Portfolio Tracker

A full-stack portfolio tracking application with user authentication, transaction management, and real-time portfolio analytics.

## Features

- **User Authentication**: Google OAuth via AWS Cognito
- **Transaction Management**: Add, edit, delete portfolio transactions
- **Multi-Asset Support**: BTC, ETH, SPY, Nadlan, Pension, Hishtalmut
- **Portfolio Analytics**: Real-time value calculations and charts
- **CSV Import**: Bulk import transactions from CSV files
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Real-time Updates**: Live portfolio value calculations

## Architecture

### Frontend

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **AWS Cognito** for authentication
- **Nx** monorepo management

### Backend

- **AWS CDK** for infrastructure as code
- **Amazon RDS** PostgreSQL database
- **AWS Lambda** serverless functions
- **Amazon API Gateway** REST API
- **AWS Cognito** user authentication
- **AWS Secrets Manager** secure credential storage

## Project Structure

```
portfolio-tracker/
├── apps/ui/                 # React frontend application
├── packages/
│   ├── api/                # Shared API types (legacy)
│   ├── backend/            # AWS CDK infrastructure
│   └── lambda/             # Lambda functions
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate credentials
- Google Cloud Console project with OAuth credentials

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project and enable Google+ API
3. Create OAuth 2.0 credentials (Client ID)
4. Add authorized redirect URIs for your domain

### 3. Configure Environment Variables

Copy and update the environment files:

```bash
cp apps/ui/.env.example apps/ui/.env.local
```

Update the following variables in `.env.local`:

```bash
VITE_API_BASE_URL=https://your-deployed-api.amazonaws.com
VITE_USER_POOL_ID=your-cognito-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-cognito-client-id
VITE_COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
VITE_REDIRECT_URI=https://your-app-domain.com/auth/callback
```

### 4. Deploy Backend Infrastructure

```bash
npm run deploy:all
```

This will:

- Build Lambda functions
- Deploy CDK infrastructure (RDS, Cognito, API Gateway)
- Initialize database schema

### 5. Update CDK Configuration

In `packages/backend/lib/backend-stack.ts`, replace:

- `YOUR_GOOGLE_CLIENT_ID` with your Google OAuth Client ID
- `YOUR_GOOGLE_CLIENT_SECRET` with your Google OAuth Client Secret
- Update callback URLs for your domain

### 6. Start Development Server

```bash
npm run dev
```

## Development Commands

```bash
# Build all projects
npm run build

# Run linting
npm run lint

# Deploy backend only
npm run deploy:backend

# Build Lambda functions only
npm run build:backend

# Run frontend development server
npm run dev
```

## Deployment

### Backend Deployment

```bash
# Deploy infrastructure changes
npm run deploy:backend

# Build Lambda functions first
npm run build:backend
```

### Environment Variables

After CDK deployment, copy the output values to your frontend `.env.local`:

- `ApiEndpoint` → `VITE_API_BASE_URL`
- `UserPoolId` → `VITE_USER_POOL_ID`
- `UserPoolClientId` → `VITE_USER_POOL_CLIENT_ID`
- `CognitoDomain` → `VITE_COGNITO_DOMAIN`

### Database Schema

The database is automatically initialized with:

- Users table linked to Cognito
- Transactions table with user isolation
- Asset holdings and portfolio value views
- Performance indexes

## API Endpoints

All API endpoints require authentication:

```
GET    /transactions      - List user transactions
POST   /transactions      - Create transaction
PUT    /transactions/{id} - Update transaction
DELETE /transactions/{id} - Delete transaction
```

## Security Features

- **User Isolation**: All data is user-specific
- **JWT Authentication**: Secure API access
- **CORS Protection**: Configured for frontend domain
- **VPC Security**: Database in private subnets
- **Secrets Management**: Secure credential storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
