#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PortfolioBackendStack } from '../lib/backend-stack';

const app = new cdk.App();
new PortfolioBackendStack(app, 'PortfolioBackendStack', {
  env: { account: '676206907471', region: 'us-east-1' },
});
