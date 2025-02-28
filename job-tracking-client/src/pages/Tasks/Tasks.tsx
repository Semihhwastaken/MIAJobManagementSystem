import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as echarts from 'echarts';
import TaskDetail from '../../components/TaskDetailModal/TaskDetail';
import TaskForm from '../../components/TaskForm/TaskForm';
import TaskHistory from '../../components/TaskHistory/TaskHistory';
import { Task } from '../../types/task';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, createTask, updateTask, deleteTask } from '../../redux/features/tasksSlice';
import { RootState, AppDispatch } from '../../redux/store';
import Footer from '../../components/Footer/Footer';
import { getTeamMembersByTeamId } from '../../redux/features/teamSlice';

interface GroupedTask extends Task {
  isLinked?: boolean;
  linkedTasks?: Task[];
}

const Tasks: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: tasks, status, error } = useSelector((state: RootState) => state.tasks);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [taskOwnerStatus, setTaskOwnerStatus] = useState<{[key: string]: boolean}>({});
  const [isValidationLoading, setIsValidationLoading] = useState(true);
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

  // Optimize task owner validation
  const checkOwnerStatus = useCallback(async (tasks: Task[]) => {
    setIsValidationLoading(true);
    const ownerStatusMap: {[key: string]: boolean} = {};
    const processedTeams = new Set<string>();

    try {
      for (const task of tasks) {
        if (task.teamId && task.status !== "completed" && task.status !== "overdue") {
          if (!processedTeams.has(task.teamId)) {
            processedTeams.add(task.teamId);
            try {
              const teamMembersResult = await dispatch(getTeamMembersByTeamId(task.teamId));
              const isOwner = teamMembersResult.payload.some(
                teamMember => teamMember.id === currentUser?.id && teamMember.role === "Owner"
              );
              
              if (isOwner) {
                tasks
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
      setTaskOwnerStatus(ownerStatusMap);
    } finally {
      setIsValidationLoading(false);
    }
  }, [dispatch, currentUser?.id]);

  // Initial tasks fetch
  useEffect(() => {
    if (!tasks.length) {
      dispatch(fetchTasks()).catch((error) => {
        console.error('Error fetching tasks:', error);
      });
    }
  }, [dispatch, tasks.length]);

  // Check owner status when tasks or user changes
  useEffect(() => {
    if (tasks.length > 0 && currentUser?.id) {
      checkOwnerStatus(tasks);
    }
  }, [tasks.length, currentUser?.id, checkOwnerStatus]);

  // Memoize filtered and processed tasks
  const processedTasks = useMemo(() => {
    return tasks.map(task => {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      
      const linkedTasks = tasks.filter(t => 
          task.dependencies?.includes(t.id!)
      );
      
      return {
          ...task,
          status: now > dueDate && task.status !== 'completed' ? 'overdue' as const : task.status,
          isLinked: linkedTasks.length > 0,
          linkedTasks: linkedTasks.length > 0 ? linkedTasks : undefined
      };
    });
  }, [tasks]);

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
        setIsEditModalOpen(false);
        
        // Add a slight delay to improve UX
        setTimeout(() => {
          setSelectedTask(null);
        }, 300);
      } catch (error) {
        console.error('Görev güncellenirken hata oluştu:', error);
      }
    }
  }, [dispatch, selectedTask]);

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
      setIsNewTaskModalOpen(false);
    } catch (error) {
      console.error('Görev oluşturulurken hata oluştu:', error);
    }
  }, [dispatch]);

  const categories = ['All Cases', 'Bug', 'Development', 'Documentation', 'Testing', 'Maintenance'];

  // Memoize TaskGroup and TaskRow components
  const TaskGroup = useCallback<React.FC<{ task: GroupedTask }>>(({ task }) => {
    if (!task.isLinked) {
      return <TaskRow task={task} />;
    }

    return (
      <div className="border-2 border-blue-400 rounded-lg p-4 mb-4">
        <TaskRow task={task} isMainTask />
        <div className="space-y-2 mt-3">
          {task.linkedTasks?.map(linkedTask => (
            <div key={linkedTask.id} className="ml-4">
              <TaskRow task={linkedTask as GroupedTask} />
            </div>
          ))}
        </div>
      </div>
    );
  }, []);

  const TaskRow = useCallback<React.FC<{ task: GroupedTask; isMainTask?: boolean }>>(({ task, isMainTask }) => {
    return (
      <div 
        className={`bg-white rounded-lg p-4 ${
          isMainTask ? 'border-b-2 border-blue-200' : 'hover:bg-blue-50'
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
            <p className="text-gray-600 mt-1">{task.description}</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              task.priority === 'high' ? 'bg-red-100 text-red-800' :
              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {task.priority}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              task.status === 'todo' ? 'bg-gray-100 text-gray-800' :
              task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {task.status}
            </span>
          </div>
        </div>
      </div>
    );
  }, []);

  if (status === 'loading' || isValidationLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center">
            <i className="fas fa-exclamation-circle text-red-600 mr-2"></i>
            <p className="text-red-600">Hata: {error || 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600">Track and manage your tasks efficiently</p>
          </div>
        </div>

        {/* Task Management Tools */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
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
          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
              <tbody className="bg-white divide-y divide-gray-200">
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