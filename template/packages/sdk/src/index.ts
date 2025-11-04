import { type Treaty, treaty } from '@elysiajs/eden';
import type { App } from '@{{PROJECT_NAME}}/api';
import { DOMAINS, type Environment } from '@{{PROJECT_NAME}}/constants';

/**
 * Supported environment types for the SDK.
 * - `'local'`: Local development server (http://localhost:3333)
 * - `Environment`: Production or other configured environments
 */
export type SDKEnvironment = 'local' | Environment;

type AppTreaty = Treaty.Create<App>;

/**
 * Type-safe SDK client for the {{PROJECT_NAME}} API.
 *
 * Provides a Treaty-based HTTP client with automatic environment-based URL resolution
 * and full type safety for all API endpoints.
 *
 * @example
 * ```typescript
 * // Use the default instance
 * import { sdk } from '@{{PROJECT_NAME}}/sdk';
 *
 * const { data } = await sdk.api.profile.patch({ age: 21 });
 *
 * // Create a custom instance
 * const prodClient = new SDK('production');
 * await prodClient.api.users.index.get();
 *
 * // Switch environments dynamically
 * sdk.setEnvironment('production');
 * await sdk.api.companies.index.get();
 * ```
 */
export class SDK {
  private client: AppTreaty;
  sessionId: string | null = null;
  private readonly SESSION_KEY = '{{PROJECT_NAME}}_session_id';
  private onSessionExpired: ((message?: string) => void) | null = null;

  /**
   * Creates a new SDK instance.
   *
   * @param environment - The environment to connect to. Defaults to 'local'.
   */
  constructor(public environment: SDKEnvironment = 'local') {
    this.client = this.createClient();
  }

  /**
   * Creates a Treaty client with proper authentication headers.
   *
   * @returns The Treaty client configured for the current environment.
   */
  private createClient(): AppTreaty {
    const client = treaty<App>(this.baseUrl, {
      headers: () => {
        if (this.sessionId) {
          return {
            authorization: `Bearer ${this.sessionId}`,
          };
        }
        return undefined;
      },
      onResponse: ({ status }) => {
        if (status === 401 || status === 403) {
          this.handleSessionExpired();
        }
      },
    });

    return client;
  }

  /**
   * Handles session expiration by clearing local state and calling the callback.
   *
   * @param message - Optional message to pass to the callback
   */
  private handleSessionExpired(message?: string): void {
    this.clearSession();
    if (this.onSessionExpired) {
      this.onSessionExpired(message);
    }
  }

  /**
   * Sets a callback to be called when the session expires.
   *
   * @param callback - The function to call when session expiration is detected. Receives an optional message parameter.
   *
   * @example
   * ```typescript
   * sdk.setOnSessionExpired((message) => {
   *   // Show notification
   *   showToast(message || 'Session expired');
   *   // Redirect to login page
   *   router.path = '/login';
   * });
   * ```
   */
  setOnSessionExpired(callback: (message?: string) => void): void {
    this.onSessionExpired = callback;
  }

  /**
   * Checks if an error indicates session expiration and triggers the callback if so.
   *
   * @param error - The error object from an API call
   * @returns true if the error was a session error, false otherwise
   *
   * @example
   * ```typescript
   * const { data, error } = await sdk.api.profile.get();
   * if (sdk.checkSessionError(error)) {
   *   return; // User will be logged out automatically
   * }
   * ```
   */
  checkSessionError(error: any): boolean {
    if (!error) return false;

    // Check error status
    if (error.status === 401 || error.status === 403) {
      const errorMessage =
        typeof error.value === 'string' ? error.value : JSON.stringify(error.value || '');

      const isSessionError =
        errorMessage.includes('session') ||
        errorMessage.includes('banned') ||
        errorMessage.includes('Authentication required');

      if (isSessionError) {
        // Extract user-friendly message
        let message = 'Your session has expired. Please log in again.';
        if (errorMessage.includes('banned')) {
          message = 'Your account has been banned. Please contact support.';
        } else if (errorMessage.includes('No session token provided')) {
          message = 'Please log in to continue.';
        }

        this.handleSessionExpired(message);
        return true;
      }
    }

    return false;
  }

  /**
   * Gets the base URL for the current environment.
   *
   * @returns The full API base URL (including protocol and domain).
   */
  get baseUrl() {
    if (this.environment === 'local') {
      return 'http://localhost:3333';
    }

    return `https://${DOMAINS.api[this.environment]}`;
  }

  /**
   * Changes the environment and reinitializes the client.
   *
   * This will update the base URL and create a new Treaty client instance.
   *
   * @param environment - The new environment to switch to.
   *
   * @example
   * ```typescript
   * const client = new SDK('local');
   * client.setEnvironment('production'); // Now points to production API
   * ```
   */
  setEnvironment(environment: SDKEnvironment): void {
    this.environment = environment;
    this.client = this.createClient();
  }

  /**
   * Restores the session ID from localStorage.
   *
   * Call this method during app initialization (e.g., in hydrate) to restore
   * a persisted session from a previous visit.
   *
   * @returns The restored session ID, or null if no session was found.
   *
   * @example
   * ```typescript
   * async hydrate() {
   *   sdk.restoreSession();
   *   await this.checkAuth();
   * }
   * ```
   */
  restoreSession(): string | null {
    this.sessionId = localStorage.getItem(this.SESSION_KEY);
    return this.sessionId;
  }

  /**
   * Sets the session ID in memory only (not persisted to localStorage).
   *
   * Use this for temporary sessions during onboarding flow that shouldn't
   * survive a page refresh until the user completes onboarding.
   *
   * @param sessionId - The session ID to set in memory.
   *
   * @example
   * ```typescript
   * sdk.setSessionInMemory('abc123xyz');
   * ```
   */
  setSessionInMemory(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Sets the session ID and persists it to localStorage.
   *
   * This will automatically add the Authorization header to all subsequent API requests.
   *
   * @param sessionId - The session ID to set and persist.
   *
   * @example
   * ```typescript
   * sdk.setSession('abc123xyz');
   * ```
   */
  setSession(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem(this.SESSION_KEY, sessionId);
  }

  /**
   * Persists the current in-memory session to localStorage.
   *
   * Call this after the user completes onboarding to make the session
   * survive page refreshes.
   *
   * @example
   * ```typescript
   * sdk.persistSession();
   * ```
   */
  persistSession(): void {
    if (this.sessionId) {
      localStorage.setItem(this.SESSION_KEY, this.sessionId);
    }
  }

  /**
   * Clears the session ID from memory and localStorage.
   *
   * This will remove the Authorization header from subsequent API requests.
   *
   * @example
   * ```typescript
   * sdk.clearSession();
   * ```
   */
  clearSession(): void {
    this.sessionId = null;
    localStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Gets the Treaty client instance with full type safety.
   *
   * Access all API endpoints through this property with autocomplete and type checking.
   *
   * @returns The Treaty client configured for the current environment.
   *
   * @example
   * ```typescript
   * const { data, error } = await sdk.api.auth.login.post({
   *   email: 'user@example.com',
   *   password: 'secret123'
   * });
   * ```
   */
  get api() {
    return this.client;
  }
}

/**
 * Default SDK instance configured for local development.
 *
 * Use this for quick access without creating a new SDK instance.
 *
 * @example
 * ```typescript
 * import { sdk } from '@{{PROJECT_NAME}}/sdk';
 *
 * // Make API calls
 * const { data } = await sdk.api.profile.get();
 *
 * // Switch to production
 * sdk.setEnvironment('production');
 * ```
 */
export const sdk = new SDK();
