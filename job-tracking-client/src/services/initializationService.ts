import { store } from '../redux/store';
import { fetchCurrentUser, fetchUserTeams, fetchUserTasks } from '../redux/features/userCacheSlice';
import { invalidateTasksCache } from '../redux/features/tasksSlice';
import SignalRService from './signalRService';

class InitializationService {
  private static instance: InitializationService | null = null;
  private isInitialized: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private lastInitializationTime: number = 0;
  private readonly CACHE_TIMEOUT = 30000; // 30 seconds cache timeout
  private readonly DEBOUNCE_INTERVAL = 1000; // Reduced from 5000ms to 1000ms
  private lastRoute: string = '';
  private routeChangeCount: number = 0;
  
  private constructor() {}
  
  public static getInstance(): InitializationService {
    if (!InitializationService.instance) {
      InitializationService.instance = new InitializationService();
    }
    return InitializationService.instance;
  }
  
  /**
   * Initialize user data and setup real-time updates
   * @param userId The ID of the current user
   * @returns Promise<boolean> Whether initialization was successful
   */
  public async initializeUserData(userId: string): Promise<boolean> {
    if (!userId) {
      console.error('No user ID provided for initialization');
      return false;
    }
    
    // Removed initialization in progress check to allow refresh operations to happen immediately
    
    // Reduced debounce interval to allow more frequent updates
    const now = Date.now();
    if (now - this.lastInitializationTime < this.DEBOUNCE_INTERVAL) {
      console.log(`Recently initialized, but proceeding anyway to ensure data freshness`);
      // Continue execution instead of returning false
    }
    
    // If already initialized, refresh the data
    if (this.isInitialized) {
      console.log('User data already initialized, refreshing data');
      await this.loadAllUserDataOptimized();
      return true;
    }
    
    this.lastInitializationTime = now;
    
    try {
      // Initialize SignalR connections
      const signalRService = SignalRService.getInstance();
      await signalRService.startConnection(userId);
      
      // Setup SignalR event handlers
      this.setupSignalRHandlers(signalRService);
      
      // Load initial data using the new optimized endpoint
      await this.loadAllUserDataOptimized();
      
      // Setup periodic refresh (every 5 minutes)
      this.startPeriodicRefresh();
      
      this.isInitialized = true;
      console.log('User data initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize user data:', error);
      return false;
    }
  }
  
  /**
   * Load all user data using the optimized endpoint that fetches everything in one request
   */
  public async loadAllUserDataOptimized(): Promise<void> {
    try {
      // First invalidate all caches to ensure fresh data
      store.dispatch(invalidateTasksCache());
      store.dispatch({ type: 'userCache/invalidateCache', payload: 'all' });
      store.dispatch({ type: 'team/invalidateCache', payload: 'all' });

      // Then load all data in parallel
      const results = await Promise.all([
        store.dispatch(fetchCurrentUser()),
        store.dispatch(fetchUserTeams()),
        store.dispatch(fetchUserTasks())
      ]);

      // Update last initialization time only if all requests succeeded
      if (results.every(r => !r.error)) {
        this.lastInitializationTime = Date.now();
      }
      
      console.log('All user data loaded successfully');
    } catch (error) {
      console.error('Error loading user data:', error);
      throw error;
    }
  }
  
  /**
   * Load all user data (profile, teams, tasks) with separate requests
   * This is used as a fallback if the optimized endpoint fails
   */
  public async loadAllUserData(): Promise<void> {
    try {
      // Use Promise.all to fetch data concurrently
      await Promise.all([
        store.dispatch(fetchCurrentUser()),
        store.dispatch(fetchUserTeams()),
        store.dispatch(fetchUserTasks())
      ]);
      
      console.log('All user data loaded successfully');
    } catch (error) {
      console.error('Error loading user data:', error);
      throw error;
    }
  }
  
  /**
   * Setup SignalR event handlers for real-time updates
   */
  private setupSignalRHandlers(signalRService: SignalRService): void {
    // Register event handlers with empty callbacks (the main logic is in the SignalR service)
    signalRService.onTaskUpdated(() => {});
    signalRService.onTeamMembershipChanged(() => {});
    signalRService.onUserProfileUpdated(() => {});
  }
  
  /**
   * Start periodic refresh of user data
   * Modified to add a more robust check to prevent multiple intervals
   */
  private startPeriodicRefresh(): void {
    // Clear any existing interval before setting a new one
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      // Removed the initialization in progress check to allow concurrent refreshes
      // Only check if the cache has expired
      if (Date.now() - this.lastInitializationTime > this.CACHE_TIMEOUT) {
        this.loadAllUserDataOptimized().catch(err => 
          console.error('Error during periodic refresh:', err)
        );
      }
    }, this.CACHE_TIMEOUT);
    
    console.log(`Periodic refresh scheduled every ${this.CACHE_TIMEOUT/1000} seconds`);
  }
  
  /**
   * Clean up resources when user logs out
   */
  public cleanup(): void {
    // Clear refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Disconnect SignalR
    const signalRService = SignalRService.getInstance();
    signalRService.stopConnection();
    
    this.isInitialized = false;
    this.lastInitializationTime = 0;
    this.routeChangeCount = 0;
    this.lastRoute = '';
  }

  /**
   * Handle route changes to refresh data if necessary
   * @param newRoute The new route
   */
  public async handleRouteChange(newRoute: string): Promise<void> {
    // Reset route change counter if it's been more than CACHE_TIMEOUT since last change
    if (Date.now() - this.lastInitializationTime > this.CACHE_TIMEOUT) {
      this.routeChangeCount = 0;
    }

    // If route actually changed
    if (this.lastRoute !== newRoute) {
      this.lastRoute = newRoute;
      this.routeChangeCount++;

      // Always refresh data on a route change that includes the team route
      if (newRoute.includes('/team') || this.routeChangeCount > 1) {
        await this.forceRefreshData();
      }
    }
  }

  /**
   * Force refresh user data - Enhanced to always refresh team data
   */
  public async forceRefreshData(): Promise<void> {
    try {
      store.dispatch(invalidateTasksCache());
      store.dispatch({ type: 'userCache/invalidateCache', payload: 'all' });
      store.dispatch({ type: 'team/invalidateCache', payload: 'all' });
      store.dispatch({ type: 'team/invalidateAllCaches' }); // Added explicit team cache invalidation

      await Promise.all([
        store.dispatch(fetchCurrentUser()),
        store.dispatch(fetchUserTeams()),
        store.dispatch(fetchUserTasks())
      ]);

      // Also directly fetch teams from the teamSlice
      await store.dispatch({ type: 'Team/fetchTeams' });

      // Reset counters
      this.routeChangeCount = 0;
      this.lastInitializationTime = Date.now();
    } catch (error) {
      console.error('Error during force refresh:', error);
    }
  }
}

export default InitializationService;
