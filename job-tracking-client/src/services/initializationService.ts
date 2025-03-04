import { store } from '../redux/store';
import { fetchCurrentUser, fetchUserTeams, fetchUserTasks } from '../redux/features/userCacheSlice';
import SignalRService from './signalRService';
import axiosInstance from './axiosInstance';

class InitializationService {
  private static instance: InitializationService | null = null;
  private isInitialized: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  
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
      console.log('Loading user data with optimized endpoint...');
      
      // Call the new unified endpoint
      const response = await axiosInstance.get('/UserData/initialize');
      const { user, teams, tasks } = response.data;
      
      // Dispatch all data to Redux store
      const { dispatch } = store;
      
      // Update the store with all received data
      if (user) {
        dispatch({ 
          type: 'userCache/fetchCurrentUser/fulfilled', 
          payload: user 
        });
      }
      
      if (teams) {
        dispatch({ 
          type: 'userCache/fetchUserTeams/fulfilled', 
          payload: teams 
        });
      }
      
      if (tasks) {
        dispatch({ 
          type: 'userCache/fetchUserTasks/fulfilled', 
          payload: tasks 
        });
      }
      
      console.log('All user data loaded successfully via optimized endpoint');
    } catch (error) {
      console.error('Error loading user data with optimized endpoint:', error);
      
      // Fallback to individual requests if the optimized endpoint fails
      console.log('Falling back to individual data requests...');
      await this.loadAllUserData();
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
   * Start periodic refresh of cached data
   */
  private startPeriodicRefresh(): void {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Check for updates every 5 minutes using the optimized endpoint
    this.refreshInterval = setInterval(() => {
      this.loadAllUserDataOptimized();
    }, 5 * 60 * 1000); // 5 minutes
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
  }
}

export default InitializationService;
