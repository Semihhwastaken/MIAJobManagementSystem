import React, { useState, useEffect, useMemo, useCallback } from 'react';
import TaskDetail from '../../components/TaskDetailModal/TaskDetail';
import TaskForm from '../../components/TaskForm/TaskForm';
import TaskHistory from '../../components/TaskHistory/TaskHistory';
import { Task } from '../../types/task';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, fetchAssignedTasks, createTask, updateTask, deleteTask } from '../../redux/features/tasksSlice';
import { RootState, AppDispatch } from '../../redux/store';
import Footer from '../../components/Footer/Footer';
import { getTeamMembersByTeamId } from '../../redux/features/teamSlice';
// Imports for userCacheSlice
import { fetchCurrentUser, fetchUserTeams, fetchUserTasks } from '../../redux/features/userCacheSlice';

// Add cache validation function
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const isCacheValid = (lastFetchTime: number): boolean => {
  return lastFetchTime > 0 && (Date.now() - lastFetchTime < CACHE_TIMEOUT);
};

interface GroupedTask extends Task {
  isLinked?: boolean;
  linkedTasks?: Task[];
}
import { useTheme } from '../../context/ThemeContext';
import { enqueueSnackbar } from 'notistack';

interface TeamMember {
  id: string;
  role: string;
}

const Tasks: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: tasks, assignedTasks, status, error, lastFetchTime } = useSelector((state: RootState) => state.tasks);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const cachedTeams = useSelector((state: RootState) => state.userCache.userTeams);
  const cacheLoading = useSelector((state: RootState) => 
    state.userCache.loading.user || 
    state.userCache.loading.teams || 
    state.userCache.loading.tasks
  );
  
  const [taskOwnerStatus, setTaskOwnerStatus] = useState<{[key: string]: boolean}>({});
  const [isValidationLoading, setIsValidationLoading] = useState(true);
  const { isDarkMode } = useTheme();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Other state variables
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Cases');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ startDate: string, endDate: string }>({ startDate: '', endDate: '' });
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const priorityOrder = {
    'high': 3,
    'medium': 2,
    'low': 1
  };

  // Optimize task owner validation by using cached teams data
  const checkOwnerStatus = useCallback(async (taskList: Task[]) => {
    setIsValidationLoading(true);
    const ownerStatusMap: {[key: string]: boolean} = {};
    const processedTeams = new Set<string>();

    try {
      // First check if we have teams data in cache
      if (cachedTeams.length > 0) {
        // Use cached teams data to determine ownership
        taskList.forEach(task => {
          if (task.teamId && task.status !== "completed" && task.status !== "overdue") {
            if (!processedTeams.has(task.teamId)) {
              processedTeams.add(task.teamId);
              
              // Find team in cached teams
              const team = cachedTeams.find(t => t.id === task.teamId);
              if (team) {
                // Check if current user is an owner in this team
                const isOwner = team.members.some(
                  (teamMember: TeamMember) => 
                    teamMember.id === currentUser?.id && teamMember.role === "Owner"
                );
                
                if (isOwner) {
                  taskList
                    .filter(t => t.teamId === task.teamId)
                    .forEach(t => {
                      if (t.id) ownerStatusMap[t.id] = true;
                    });
                }
              }
            }
          }
        });
      } else {
        // Fall back to API calls if cached data is not available
        for (const task of taskList) {
          if (task.teamId && task.status !== "completed" && task.status !== "overdue") {
            if (!processedTeams.has(task.teamId)) {
              processedTeams.add(task.teamId);
              try {
                const teamMembersResult = await dispatch(getTeamMembersByTeamId(task.teamId));
                const isOwner = teamMembersResult.payload.some(
                  teamMember => teamMember.id === currentUser?.id && teamMember.role === "Owner"
                );
                
                if (isOwner) {
                  taskList
                    .filter(t => t.teamId === task.teamId)
                    .forEach(t => {
                      if (t.id) ownerStatusMap[t.id] = true;
                    });
                }
              } catch (error) {
                console.error('Error checking team ownership:', error);
              }
            }
          }
        }
      }
      setTaskOwnerStatus(ownerStatusMap);
    } finally {
      setIsValidationLoading(false);
    }
  }, [dispatch, currentUser?.id, cachedTeams]);

  // Optimized data loading strategy with progressive loading
  useEffect(() => {
    let isLoading = false;
    const controller = new AbortController();

    const loadTasks = async () => {
      if (isLoading) return;
      isLoading = true;
      
      try {
        // Force fetch if cache is invalid
        if (!isCacheValid(lastFetchTime)) {
          await dispatch(fetchAssignedTasks()).unwrap();
          await dispatch(fetchTasks()).unwrap();
        }

        setIsInitialLoad(false);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error loading tasks:', error);
          setIsInitialLoad(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          isLoading = false;
        }
      }
    };
    
    loadTasks();
    
    // Setup periodic refresh
    const refreshInterval = setInterval(() => {
      if (!isLoading) {
        loadTasks();
      }
    }, 60000); // Refresh every minute

    return () => {
      controller.abort();
      clearInterval(refreshInterval);
      isLoading = false;
    };
  }, [dispatch, lastFetchTime]);

  // Check owner status when tasks or user changes
  useEffect(() => {
    if ((tasks.length > 0 || assignedTasks.length > 0) && 
        currentUser?.id && 
        !cacheLoading && 
        !isInitialLoad) {
      // Use assignedTasks first if available for faster initial load
      const taskList = tasks.length > 0 ? tasks : assignedTasks;
      checkOwnerStatus(taskList);
    }
  }, [tasks.length, assignedTasks.length, currentUser?.id, checkOwnerStatus, cacheLoading, isInitialLoad]);

  // Memoize filtered and processed tasks to avoid recomputation
  const processedTasks = useMemo(() => {
    const tasksToProcess = tasks.length > 0 ? tasks : assignedTasks;
    
    return tasksToProcess.map(task => {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      
      const linkedTasks = tasksToProcess.filter(t => 
          task.dependencies?.includes(t.id!)
      );
      
      return {
          ...task,
          status: now > dueDate && task.status !== 'completed' ? 'overdue' as const : task.status,
          isLinked: linkedTasks.length > 0,
          linkedTasks: linkedTasks.length > 0 ? linkedTasks : undefined
      };
    });
  }, [tasks, assignedTasks]);

  const filteredTasks = useMemo(() => {
    return processedTasks
      .filter(task => {
        // Ana ekranda sadece aktif görevleri göster (completed ve overdue olmayanlar)
        if (!isHistoryModalOpen) {
          if (task.status === 'completed' || task.status === 'overdue') {
            return false;
          }
        }

        const isSubTask = tasks.some(parentTask => 
          parentTask.dependencies?.includes(task.id!)
        );

        if (isSubTask) {
          return false;
        }

        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All Cases' || task.category === selectedCategory;
        const matchesDateFilter = !isFilterActive || (
          task.dueDate >= dateFilter.startDate &&
          task.dueDate <= dateFilter.endDate
        );
        return matchesSearch && matchesCategory && matchesDateFilter;
      })
      .sort((a, b) => {
        if (sortByPriority) {
          return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        }
        return 0;
      });
  }, [processedTasks, searchTerm, selectedCategory, isFilterActive, dateFilter, sortByPriority, isHistoryModalOpen]);

  // Memoize action handlers
  const handleTaskClick = useCallback((task: Task, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (task.id) {
      setSelectedTask(task);
      setIsDetailModalOpen(true);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
    // Don't clear selectedTask immediately to avoid UI flicker
    // during the close animation
    setTimeout(() => {
      setSelectedTask(null);
    }, 300); // Match this with your modal animation duration
  }, []);

  const handleEditClick = useCallback((task: Task, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (task.id) {
      setSelectedTask({
        ...task,
        teamId: task.teamId // Ensure teamId is included
      });
      setIsEditModalOpen(true);
    }
  }, []);

  const handleUpdateTask = useCallback(async (updatedTaskData: Omit<Task, 'id'>) => {
    if (selectedTask?.id) {
      try {
        const updatedTask = {
          ...updatedTaskData,
          id: selectedTask.id
        };
        await dispatch(updateTask(updatedTask));

        // Force invalidate all related caches
        dispatch({ type: 'userCache/invalidateCache', payload: 'all' });
        dispatch({ type: 'team/invalidateCache', payload: 'all' });
        dispatch({ type: 'tasks/invalidateTasksCache' });

        // Refresh all data
        await Promise.all([
            dispatch(fetchCurrentUser()),
            dispatch(fetchUserTeams()),
            dispatch(fetchUserTasks()),
            dispatch(fetchTasks()),
            dispatch(fetchAssignedTasks())
        ]);
        
        setIsEditModalOpen(false);
        // Add a slight delay to improve UX
        setTimeout(() => {
          setSelectedTask(null);
        }, 300);
      } catch (error) {
        console.error('Görev güncellenirken hata oluştu:', error);
        enqueueSnackbar('Görev güncellenirken bir hata oluştu', { variant: 'error' });
      }
    }
  }, [dispatch, selectedTask, enqueueSnackbar]);

  const handleDeleteTask = useCallback(async (taskId: string | undefined, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!taskId || taskId === 'undefined') {
      console.error('Geçersiz görev ID', taskId);
      return;
    }
    try {
      await dispatch(deleteTask(taskId));
      console.log('Görev başarıyla silindi');
    } catch (error) {
      console.error('Görev silinirken bir hata oluştu');
      console.error('Görev silinirken hata oluştu:', error);
    }
  }, [dispatch]);

  const handleCreateTask = useCallback(async (newTask: Omit<Task, 'id'>) => {
    try {
      await dispatch(createTask(newTask));
      
      // Force invalidate all related caches
      dispatch({ type: 'userCache/invalidateCache', payload: 'all' });
      dispatch({ type: 'team/invalidateCache', payload: 'all' });
      dispatch({ type: 'tasks/invalidateTasksCache' });
      
      // Refresh all data
      await Promise.all([
          dispatch(fetchCurrentUser()),
          dispatch(fetchUserTeams()),
          dispatch(fetchUserTasks()),
          dispatch(fetchTasks()),
          dispatch(fetchAssignedTasks())
      ]);

      setIsNewTaskModalOpen(false);
      enqueueSnackbar('Görev başarıyla oluşturuldu', { variant: 'success' });
    } catch (error) {
      console.error('Görev oluşturulurken hata oluştu:', error);
      enqueueSnackbar('Görev oluşturulurken bir hata oluştu', { variant: 'error' });
    }
  }, [dispatch, enqueueSnackbar]);

  const categories = ['All Cases', 'Bug', 'Development', 'Documentation', 'Testing', 'Maintenance'];

  // Show progressive loading indicators
  if (isInitialLoad) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Yükleniyor...</p>
          <p className="text-sm text-gray-400">Görevleriniz hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  // Improved show loading for subsequent requests
  if (status === 'loading' && tasks.length === 0 && assignedTasks.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Görevler yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Enhanced error handling with retry option
  if (status === 'failed' && !isInitialLoad && tasks.length === 0 && assignedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="p-6 rounded-lg bg-red-50 border border-red-200 max-w-md w-full text-center">
          <div className="flex flex-col items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800">Veri Bulunamadı</h3>
            <p className="text-red-600 mb-4">{error || 'Görev verilerine erişilemiyor.'}</p>
            <button 
              onClick={() => {
                setIsInitialLoad(true);
                dispatch(fetchTasks());
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state when there's no data but the request was successful
  if (!isInitialLoad && status === 'succeeded' && tasks.length === 0 && assignedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="p-6 rounded-lg bg-white border border-gray-200 max-w-md w-full text-center shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-800">Görev Bulunamadı</h3>
            <p className="text-gray-600 mb-4">Henüz hiç görev oluşturulmadı.</p>
            <button 
              onClick={() => setIsNewTaskModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Yeni Görev Oluştur
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render partial data even while validation is still loading
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Tasks</h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Track and manage your tasks efficiently</p>
          </div>
          
          {/* Show a loading indicator when validation is in progress */}
          {isValidationLoading && (
            <div className="flex items-center">
              <div className="animate-spin h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
              <span className="text-sm text-gray-500">Veriler yükleniyor...</span>
            </div>
          )}
        </div>

        {/* Task Management Tools */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6 mb-8`}>
          <div className="flex items-center justify-between mb-6">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search tasks..."
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300 text-gray-900'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsHistoryModalOpen(true);
                }}
                className="!rounded-button flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i className="fas fa-history text-gray-600"></i>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setSortByPriority(!sortByPriority);
                }}
                className={`!rounded-button flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${sortByPriority ? 'bg-indigo-100 border-indigo-300' : ''}`}
              >
                <i className="fas fa-sort text-gray-600"></i>
                <span className="text-gray-600">Sort</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsDateFilterModalOpen(true);
                }}
                className={`!rounded-button flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${isFilterActive ? 'bg-indigo-100 border-indigo-300' : ''}`}
              >
                <i className="fas fa-filter text-gray-600"></i>
                <span className="text-gray-600">Filter</span>
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex space-x-4 mb-6">
            {categories.map((category) => (
              <button
                key={category}
                className={`!rounded-button px-4 py-2 rounded-lg transition-colors ${selectedCategory === category
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedCategory(category);
                }}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className={`overflow-x-auto rounded-lg shadow-sm border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanımlama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öncelik</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atanan Kişiler</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Düzenleme</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${
                isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                {filteredTasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <tr 
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        task.isLinked ? 'border-l-4 border-blue-400' : ''
                      }`}
                      onClick={(e) => handleTaskClick(task, e)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.title}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">{task.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.status === 'todo' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'in-progress' ? 'bg-purple-100 text-purple-800' :
                          task.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* User Avatars */}
                        <div className="flex items-center space-x-2">
                          {task.assignedUsers && task.assignedUsers.length > 0 ? (
                            <div className="flex -space-x-2">
                              {task.assignedUsers.map((user, index) => (
                                <div
                                  key={index}
                                  className="relative inline-flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full ring-2 ring-white"
                                  title={user.fullName}
                                >
                                  <span className="text-xs font-medium text-white">
                                    {user.fullName?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Atanmamış</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.teamId && taskOwnerStatus[task.id!] && (
                          <>
                            <button
                              onClick={(e) => handleEditClick(task, e)}
                              className="text-indigo-600 hover:text-indigo-900 mr-2"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={(e) => handleDeleteTask(task.id, e)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    {/* Render linked tasks */}
                    {task.isLinked && task.linkedTasks?.map(linkedTask => (
                      <tr 
                        key={linkedTask.id}
                        className="hover:bg-blue-50 cursor-pointer transition-colors bg-blue-50/30"
                        onClick={(e) => handleTaskClick(linkedTask, e)}
                      >
                        <td className="px-6 py-4 pl-12 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <div className="w-6 border-l-2 border-b-2 border-blue-400 h-6 -ml-6"></div>
                            {linkedTask.title}
                          </div>
                        </td>
                        {/* ...other cells similar to above... */}
                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">{linkedTask.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            linkedTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                            linkedTask.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {linkedTask.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            linkedTask.status === 'todo' ? 'bg-blue-100 text-blue-800' :
                            linkedTask.status === 'in-progress' ? 'bg-purple-100 text-purple-800' :
                            linkedTask.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {linkedTask.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{linkedTask.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {linkedTask.assignedUsers && linkedTask.assignedUsers.length > 0 ? (
                              <div className="flex -space-x-2">
                                {linkedTask.assignedUsers.map((user, index) => (
                                  <div
                                    key={index}
                                    className="relative inline-flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full ring-2 ring-white"
                                    title={user.fullName}
                                  >
                                    <span className="text-xs font-medium text-white">
                                      {user.fullName?.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Atanmamış</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(linkedTask.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {linkedTask.teamId && taskOwnerStatus[linkedTask.id!] && (
                            <>
                              <button
                                onClick={(e) => handleEditClick(linkedTask, e)}
                                className="text-indigo-600 hover:text-indigo-900 mr-2"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                onClick={(e) => handleDeleteTask(linkedTask.id, e)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Task Form Modal - Only render when needed */}
      {isNewTaskModalOpen && (
        <TaskForm
          isOpen={isNewTaskModalOpen}
          isDarkMode={false}
          onClose={() => setIsNewTaskModalOpen(false)}
          onSave={handleCreateTask}
          existingTasks={tasks}
        />
      )}

      {/* Edit Task Modal - Only render when needed */}
      {isEditModalOpen && selectedTask && (
        <TaskForm
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleUpdateTask}
          existingTasks={tasks}
          task={selectedTask}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Task Detail Modal - Only render when needed */}
      {isDetailModalOpen && selectedTask && (
        <TaskDetail
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
          task={selectedTask}
        />
      )}

      {/* Date Filter Modal - Only render when needed */}
      {isDateFilterModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-lg shadow-xl w-96" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Tarih Aralığı Seçin</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDateFilter({ startDate: '', endDate: '' });
                    setIsFilterActive(false);
                    setIsDateFilterModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Filtreyi Temizle
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (dateFilter.startDate && dateFilter.endDate) {
                      setIsFilterActive(true);
                      setIsDateFilterModalOpen(false);
                    }
                  }}
                  disabled={!dateFilter.startDate || !dateFilter.endDate}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Uygula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task History Modal - Only render when needed */}
      {isHistoryModalOpen && (
        <TaskHistory
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}

      <Footer />
    </div>
  );
};

export default Tasks;