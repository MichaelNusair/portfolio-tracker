import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

// Cognito configuration - these will be replaced with actual values from CDK deployment
const POOL_DATA = {
  UserPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_example', // TODO: Replace with actual User Pool ID
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'example_client_id', // TODO: Replace with actual Client ID
};

const userPool = new CognitoUserPool(POOL_DATA);

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Authentication service
export class AuthService {
  private static instance: AuthService;
  private currentUser: CognitoUser | null = null;
  private session: CognitoUserSession | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize auth state from stored session
  async initializeAuth(): Promise<AuthState> {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();

      if (cognitoUser) {
        cognitoUser.getSession(
          (err: any, session: CognitoUserSession | null) => {
            if (err || !session || !session.isValid()) {
              resolve({ user: null, isAuthenticated: false, isLoading: false });
              return;
            }

            this.currentUser = cognitoUser;
            this.session = session;

            const payload = session.getIdToken().decodePayload();
            const user: User = {
              id: payload.sub,
              email: payload.email,
              firstName: payload.given_name,
              lastName: payload.family_name,
            };

            resolve({ user, isAuthenticated: true, isLoading: false });
          }
        );
      } else {
        resolve({ user: null, isAuthenticated: false, isLoading: false });
      }
    });
  }

  // Sign in with Google OAuth
  async signInWithGoogle(): Promise<void> {
    const cognitoUser = userPool.getCurrentUser();

    if (cognitoUser) {
      cognitoUser.signOut();
    }

    // Redirect to Cognito hosted UI for Google OAuth
    const redirectUrl =
      `${import.meta.env.VITE_COGNITO_DOMAIN}/oauth2/authorize?` +
      `client_id=${POOL_DATA.ClientId}&` +
      `response_type=code&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${encodeURIComponent(
        import.meta.env.VITE_REDIRECT_URI ||
          'http://localhost:3000/auth/callback'
      )}&` +
      `identity_provider=Google`;

    window.location.href = redirectUrl;
  }

  // Handle OAuth callback
  async handleAuthCallback(code: string): Promise<AuthState> {
    try {
      // Exchange code for tokens (this would typically be done server-side)
      // For now, we'll redirect to complete the OAuth flow
      const tokenEndpoint = `${
        import.meta.env.VITE_COGNITO_DOMAIN
      }/oauth2/token`;
      const redirectUri =
        import.meta.env.VITE_REDIRECT_URI ||
        'http://localhost:3000/auth/callback';

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: POOL_DATA.ClientId,
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange authorization code');
      }

      const tokens = await response.json();

      // Create a new CognitoUser and set the session
      const cognitoUser = new CognitoUser({
        Username: tokens.id_token
          ? JSON.parse(atob(tokens.id_token.split('.')[1])).sub
          : 'unknown',
        Pool: userPool,
      });

      const session = new CognitoUserSession({
        IdToken: tokens.id_token,
        AccessToken: tokens.access_token,
        RefreshToken: tokens.refresh_token,
      });

      cognitoUser.setSignInUserSession(session);

      // Store tokens in localStorage for persistence
      localStorage.setItem('idToken', tokens.id_token);
      localStorage.setItem('accessToken', tokens.access_token);
      localStorage.setItem('refreshToken', tokens.refresh_token);

      const payload = JSON.parse(atob(tokens.id_token.split('.')[1]));
      const user: User = {
        id: payload.sub,
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
      };

      return { user, isAuthenticated: true, isLoading: false };
    } catch (error) {
      console.error('Auth callback error:', error);
      return { user: null, isAuthenticated: false, isLoading: false };
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }

    // Clear stored tokens
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Get current session
  getCurrentSession(): CognitoUserSession | null {
    return this.session;
  }

  // Get ID token for API calls
  getIdToken(): string | null {
    if (this.session && this.session.isValid()) {
      return this.session.getIdToken().getJwtToken();
    }

    // Try to get from localStorage
    return localStorage.getItem('idToken');
  }

  // Get access token for API calls
  getAccessToken(): string | null {
    if (this.session && this.session.isValid()) {
      return this.session.getAccessToken().getJwtToken();
    }

    // Try to get from localStorage
    return localStorage.getItem('accessToken');
  }
}

export const authService = AuthService.getInstance();
