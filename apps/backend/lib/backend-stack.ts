import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as custom_resources from 'aws-cdk-lib/custom-resources';
import { Duration } from 'aws-cdk-lib';
// Import shared types for consistency with API schemas
import type { AssetType, TransactionType } from '@portfolio-tracker/api';

export class PortfolioBackendStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly api: apigateway.HttpApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'PortfolioTrackerVPC', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    const databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: 'portfolio-tracker-db-secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'portfoliouser' }),
        generateStringKey: 'password',
        passwordLength: 16,
        excludePunctuation: true,
      },
    });

    const database = new rds.DatabaseInstance(this, 'PortfolioTrackerDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      databaseName: 'portfoliodb',
      credentials: rds.Credentials.fromSecret(databaseSecret),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      backupRetention: Duration.days(7),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.userPool = new cognito.UserPool(this, 'PortfolioTrackerUserPool', {
      userPoolName: 'portfolio-tracker-users',
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      'GoogleProvider',
      {
        userPool: this.userPool,
        clientId:
          '615869588105-70lqpsoep9pht0uf4cbe13fsl2bck3hb.apps.googleusercontent.com',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scopes: ['email', 'profile', 'openid'],
      }
    );

    this.userPool.identityProviders.push(googleProvider);

    // Cognito User Pool Client for web app
    const userPoolClient = new cognito.UserPoolClient(
      this,
      'PortfolioTrackerClient',
      {
        userPool: this.userPool,
        authFlows: {
          userPassword: true,
          userSrp: true,
          adminUserPassword: true,
        },
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
          },
          scopes: [
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.PROFILE,
          ],
          callbackUrls: ['http://localhost:3000/auth/callback'],
          logoutUrls: ['http://localhost:3000'],
        },
        supportedIdentityProviders: [
          cognito.UserPoolClientIdentityProvider.GOOGLE,
        ],
      }
    );

    // Database initialization function
    const dbInitFunction = new lambda.Function(this, 'DatabaseInitFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'db-init.handler',
      code: lambda.Code.fromAsset('../lambda/dist'),
      environment: {
        DB_SECRET_ARN: databaseSecret.secretArn,
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      timeout: Duration.seconds(60),
      initialPolicy: [
        new iam.PolicyStatement({
          actions: ['secretsmanager:GetSecretValue'],
          resources: [databaseSecret.secretArn],
        }),
      ],
    });

    const dbInitProvider = new custom_resources.Provider(
      this,
      'DatabaseInitProvider',
      {
        onEventHandler: dbInitFunction,
      }
    );

    new cdk.CustomResource(this, 'DatabaseInit', {
      serviceToken: dbInitProvider.serviceToken,
      properties: {
        DB_HOST: database.instanceEndpoint.hostname,
      },
    });

    // Lambda functions for API endpoints
    // The Lambda function uses shared schemas from @portfolio-tracker/api for:
    // - AssetType validation (BTC, ETH, SPY, Nadlan, Pension, Hishtalmut)
    // - TransactionType validation (buy, sell)
    // - CreateTransactionInput and UpdateTransactionInput schema validation
    const transactionsLambda = new lambda.Function(
      this,
      'TransactionsFunction',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset('../lambda/dist'),
        environment: {
          DB_SECRET_ARN: databaseSecret.secretArn,
          DB_HOST: database.instanceEndpoint.hostname,
          USER_POOL_ID: this.userPool.userPoolId,
        },
        vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        timeout: Duration.seconds(30),
        initialPolicy: [
          new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [databaseSecret.secretArn],
          }),
          new iam.PolicyStatement({
            actions: ['cognito-idp:GetUser', 'cognito-idp:ListUsers'],
            resources: [this.userPool.userPoolArn],
          }),
        ],
      }
    );

    // Grant Lambda access to database secret
    databaseSecret.grantRead(transactionsLambda);

    // Grant Lambda access to Cognito for user info
    transactionsLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:GetUser', 'cognito-idp:ListUsers'],
        resources: [this.userPool.userPoolArn],
      })
    );

    // API Gateway with schema-enforced endpoints
    // Routes correspond to @portfolio-tracker/api schema definitions:
    // GET /transactions -> TransactionsListResponseSchema
    // POST /transactions -> CreateTransactionInputSchema -> TransactionResponseSchema
    // PUT /transactions/{id} -> UpdateTransactionInputSchema -> TransactionResponseSchema
    // DELETE /transactions/{id} -> void response
    this.api = new apigateway.HttpApi(this, 'PortfolioTrackerAPI', {
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
        ],
        allowOrigins: ['http://localhost:3000'],
        maxAge: Duration.days(10),
      },
    });

    this.api.addRoutes({
      path: '/transactions',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'TransactionsIntegration',
        transactionsLambda
      ),
    });

    this.api.addRoutes({
      path: '/transactions',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'TransactionsIntegration',
        transactionsLambda
      ),
    });

    this.api.addRoutes({
      path: '/transactions/{id}',
      methods: [apigateway.HttpMethod.PUT],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'TransactionsIntegration',
        transactionsLambda
      ),
    });

    this.api.addRoutes({
      path: '/transactions/{id}',
      methods: [apigateway.HttpMethod.DELETE],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'TransactionsIntegration',
        transactionsLambda
      ),
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url!,
      description: 'API Gateway endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: databaseSecret.secretArn,
      description: 'Database secret ARN',
    });
  }
}
