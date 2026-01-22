/**
 * Session Manager
 *
 * Manages user session state with:
 * - localStorage persistence
 * - Auto-save every 30 seconds
 * - State restoration on page load
 * - Activity tracking
 */

// Session state interface
export interface SessionState {
  sessionId: string;
  createdAt: string;
  lastUpdated: string;
  activeTab: string;
  activeCrawls: string[];
  darkMode: boolean;
  sidebarCollapsed: boolean;
  viewMode: 'grid' | 'list';
  searchQuery: string;
  filters: Record<string, unknown>;
  recentSearches: string[];
  favoriteTemplates: string[];
  customSettings: Record<string, unknown>;
}

// Activity entry interface
export interface ActivityEntry {
  timestamp: string;
  action: string;
  metadata: Record<string, unknown>;
}

// Storage keys
const SESSION_ID_KEY = 'gencrawl_session_id';
const SESSION_DATA_PREFIX = 'gencrawl_session_';
const ACTIVITY_KEY = 'gencrawl_activity';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Session Manager class
 */
class SessionManager {
  private sessionId: string;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private isAvailable: boolean;
  private pendingChanges: boolean = false;

  constructor() {
    this.isAvailable = isLocalStorageAvailable();

    if (!this.isAvailable) {
      console.warn('localStorage not available, session management disabled');
      this.sessionId = generateSessionId();
      return;
    }

    // Restore or create session
    const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (storedSessionId) {
      this.sessionId = storedSessionId;
    } else {
      this.sessionId = this.createSession();
    }

    // Start auto-save
    this.startAutoSave();

    // Listen for beforeunload to save pending changes
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.pendingChanges) {
          this.saveImmediately();
        }
      });
    }
  }

  /**
   * Create a new session
   */
  createSession(): string {
    const id = generateSessionId();

    if (this.isAvailable) {
      localStorage.setItem(SESSION_ID_KEY, id);

      // Initialize session data
      const initialState: Partial<SessionState> = {
        sessionId: id,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        activeTab: 'overview',
        activeCrawls: [],
        darkMode: false,
        sidebarCollapsed: false,
        viewMode: 'grid',
        searchQuery: '',
        filters: {},
        recentSearches: [],
        favoriteTemplates: [],
        customSettings: {},
      };

      localStorage.setItem(
        `${SESSION_DATA_PREFIX}${id}`,
        JSON.stringify(initialState)
      );
    }

    return id;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Save a state value
   */
  saveState<T>(key: keyof SessionState, value: T): void {
    if (!this.isAvailable) return;

    try {
      const session = this.getSession();
      (session as unknown as Record<string, unknown>)[key] = value;
      session.lastUpdated = new Date().toISOString();

      localStorage.setItem(
        `${SESSION_DATA_PREFIX}${this.sessionId}`,
        JSON.stringify(session)
      );

      this.pendingChanges = true;
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }

  /**
   * Get a state value
   */
  getState<T>(key: keyof SessionState, defaultValue: T): T {
    if (!this.isAvailable) return defaultValue;

    try {
      const session = this.getSession();
      const value = (session as unknown as Record<string, unknown>)[key];
      return value !== undefined ? (value as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Get entire session state
   */
  getSession(): SessionState {
    if (!this.isAvailable) {
      return {
        sessionId: this.sessionId,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        activeTab: 'overview',
        activeCrawls: [],
        darkMode: false,
        sidebarCollapsed: false,
        viewMode: 'grid',
        searchQuery: '',
        filters: {},
        recentSearches: [],
        favoriteTemplates: [],
        customSettings: {},
      };
    }

    try {
      const stored = localStorage.getItem(`${SESSION_DATA_PREFIX}${this.sessionId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Return default state on error
    }

    return {
      sessionId: this.sessionId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      activeTab: 'overview',
      activeCrawls: [],
      darkMode: false,
      sidebarCollapsed: false,
      viewMode: 'grid',
      searchQuery: '',
      filters: {},
      recentSearches: [],
      favoriteTemplates: [],
      customSettings: {},
    };
  }

  /**
   * Start auto-save interval
   */
  startAutoSave(): void {
    if (this.autoSaveInterval) return;

    this.autoSaveInterval = setInterval(() => {
      if (this.pendingChanges) {
        this.pendingChanges = false;
        // Could sync to backend here if needed
        console.debug('Session auto-saved');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Save immediately (for beforeunload)
   */
  saveImmediately(): void {
    // Already saved to localStorage on each change
    this.pendingChanges = false;
  }

  /**
   * Track user activity
   */
  trackActivity(action: string, metadata: Record<string, unknown> = {}): void {
    if (!this.isAvailable) return;

    try {
      const activities = this.getActivities();
      activities.push({
        timestamp: new Date().toISOString(),
        action,
        metadata: {
          ...metadata,
          sessionId: this.sessionId,
        },
      });

      // Keep last 100 activities
      const trimmed = activities.slice(-100);
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  }

  /**
   * Get activity history
   */
  getActivities(): ActivityEntry[] {
    if (!this.isAvailable) return [];

    try {
      const stored = localStorage.getItem(ACTIVITY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    if (!this.isAvailable) return;

    try {
      localStorage.removeItem(`${SESSION_DATA_PREFIX}${this.sessionId}`);
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(ACTIVITY_KEY);
      this.sessionId = this.createSession();
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Add to recent searches
   */
  addRecentSearch(query: string): void {
    if (!query.trim()) return;

    const recent = this.getState<string[]>('recentSearches', []);
    const filtered = recent.filter(q => q !== query);
    const updated = [query, ...filtered].slice(0, 10);
    this.saveState('recentSearches', updated);
  }

  /**
   * Toggle favorite template
   */
  toggleFavoriteTemplate(templateId: string): void {
    const favorites = this.getState<string[]>('favoriteTemplates', []);
    const index = favorites.indexOf(templateId);

    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push(templateId);
    }

    this.saveState('favoriteTemplates', favorites);
  }

  /**
   * Check if template is favorited
   */
  isTemplateFavorite(templateId: string): boolean {
    const favorites = this.getState<string[]>('favoriteTemplates', []);
    return favorites.includes(templateId);
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

export default sessionManager;
