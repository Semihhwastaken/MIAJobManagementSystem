/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import TaskDetail from '../../components/TaskDetailModal/TaskDetail';
import TaskForm from '../../components/TaskForm/TaskForm';
import TaskHistory from '../../components/TaskHistory/TaskHistory';
import { Task } from '../../types/task';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, createTask, updateTask, deleteTask, clearTasksCache } from '../../redux/features/tasksSlice';
import { RootState, AppDispatch } from '../../redux/store';
import Footer from '../../components/Footer/Footer';
import { getTeamMembersByTeamId } from '../../redux/features/teamSlice';
import { useTheme } from '../../context/ThemeContext';

// Silme onay modalı için yeni component
const DeleteConfirmationModal: React.FC<{
  isOpen: boolean;
  taskTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, taskTitle, onClose, onConfirm }) => {
  const { isDarkMode } = useTheme();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-gray-800/30 flex items-center justify-center z-50">
      <div
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } p-6 rounded-lg shadow-xl w-96`}
        onClick={e => e.stopPropagation()}
      >
        <h2 className={`text-xl font-semibold mb-4 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>Görev Silme Onayı</h2>
        <p className={`${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        } mb-6`}>
          "<span className="font-semibold">{taskTitle}</span>" görevini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              isDarkMode
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white rounded-md bg-red-600 hover:bg-red-700"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
};

const Tasks: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: tasks, error } = useSelector((state: RootState) => state.tasks); // Remove loading from destructuring
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [taskOwnerStatus, setTaskOwnerStatus] = useState<{[key: string]: boolean}>({});
  const [, setIsValidationLoading] = useState(true);
  const { isDarkMode } = useTheme();

  // Silme onay modalı için state'ler
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{id: string, title: string} | null>(null);

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

  const priorityOrder = useMemo(() => ({
    'high': 3,
    'medium': 2,
    'low': 1
  }), []);

  // Optimize task owner validation
  const checkOwnerStatus = useCallback(async (tasks: Task[]) => {
    setIsValidationLoading(true);
    const ownerStatusMap: {[key: string]: boolean} = {};
    const processedTeams = new Set<string>();

    try {
      // Görevleri takımlara göre grupla
      const teamGroups: {[teamId: string]: Task[]} = {};
      tasks.forEach(task => {
        if (task.teamId && task.status !== "completed" && task.status !== "overdue") {
          if (!teamGroups[task.teamId]) {
            teamGroups[task.teamId] = [];
          }
          teamGroups[task.teamId].push(task);
        }
      });

      // Her takım için bir kez sorgu yap
      const teamIds = Object.keys(teamGroups);
      
      // Önce tüm görevleri kontrol et - eğer kullanıcıya atanmışsa ve tamamlanmamışsa izin ver
      tasks.forEach(task => {
        // Completed durumundaki görevler için action butonları gösterilmeyecek
        if (task.id && task.status !== "completed" && task.assignedUsers && Array.isArray(task.assignedUsers) && 
            task.assignedUsers.some(user => user.id === currentUser?.id)) {
          ownerStatusMap[task.id] = true;
        }
      });
      
      // Şimdi takım sahipliğini kontrol et
      for (const teamId of teamIds) {
        if (!processedTeams.has(teamId)) {
          processedTeams.add(teamId);
          try {
            console.log(`Checking ownership for team ${teamId}`);
            const teamMembersResult = await dispatch(getTeamMembersByTeamId(teamId));
            
            if (teamMembersResult.payload && Array.isArray(teamMembersResult.payload)) {
              const isOwner = teamMembersResult.payload.some(
                (teamMember: any) => teamMember.id === currentUser?.id && teamMember.role === "Owner"
              );
              
              console.log(`User is owner of team ${teamId}: ${isOwner}`);
              
              // Takımın sahibiyse, bu takıma ait tamamlanmamış görevlere izin ver
              if (isOwner && teamGroups[teamId]) {
                teamGroups[teamId].forEach(task => {
                  // Completed durumundaki görevler için action butonları gösterilmeyecek
                  if (task.id && task.status !== "completed") {
                    ownerStatusMap[task.id] = true;
                  }
                });
              }
            } else {
              console.log(`No team members returned or invalid payload for team ${teamId}`);
            }
          } catch (error) {
            console.error(`Error checking team ownership for team ${teamId}:`, error);
          }
        }
      }
      
      setTaskOwnerStatus(ownerStatusMap);
    } catch (error) {
      console.error('Error in checkOwnerStatus:', error);
    } finally {
      setIsValidationLoading(false);
    }
  }, [dispatch, currentUser?.id]);

  // Initial tasks fetch
  useEffect(() => {
    // Önce cache'i temizleyelim, böylece her zaman en güncel verileri alırız
    dispatch(clearTasksCache());
    // Her zaman en güncel görevleri getir
    dispatch(fetchTasks()).catch((error) => {
      console.error('Error fetching tasks:', error);
    });
  }, [dispatch]); // tasks.length'i kaldırdık, böylece sadece component mount olduğunda çalışacak

  // Check owner status when tasks or user changes
  useEffect(() => {
    if (tasks.length > 0 && currentUser?.id) {
      checkOwnerStatus(tasks);
    }
  }, [tasks.length, currentUser?.id, checkOwnerStatus,tasks]);

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

        // Sadece kullanıcıya atanmış veya kullanıcının takım sahibi olduğu görevleri göster
        const isAssignedToUser = currentUser && task.assignedUsers?.some(user => user.id === currentUser.id);
        const isTeamOwner = currentUser && task.id && taskOwnerStatus[task.id] === true;
        
        // Eğer kullanıcıya atanmamış ve kullanıcı takım sahibi değilse görevi filtreliyoruz
        if (!isAssignedToUser && !isTeamOwner) {
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
  }, [processedTasks, searchTerm, selectedCategory, isFilterActive, dateFilter, sortByPriority, isHistoryModalOpen, currentUser, taskOwnerStatus,priorityOrder,tasks]);

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
        const assignedUserIds = (updatedTaskData.assignedUsers || [])
          .map(user => user.id)
          .filter((id): id is string => id !== undefined);

        const updatedTask = {
          ...updatedTaskData,
          id: selectedTask.id,
          assignedUserIds,
          completedDate: updatedTaskData.completedDate || new Date().toISOString(),
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

  const handleDeleteTask = useCallback(async (taskId: string | undefined, taskTitle: string = "", e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!taskId || taskId === 'undefined') {
      console.error('Geçersiz görev ID', taskId);
      return;
    }
    
    // Delete onay modalını aç
    setTaskToDelete({ id: taskId, title: taskTitle });
    setIsDeleteModalOpen(true);
  }, []);

  // Silme onayı sonrası asıl silme işlemini gerçekleştir
  const confirmDeleteTask = useCallback(async () => {
    if (!taskToDelete) return;
    
    try {
      // Önce UI'dan görevi kaldırmak için yerel bir kopya oluşturalım ve filtreleme yapalım
      // Bu, silme API çağrısı tamamlanmadan bile UI'yı günceller
      const taskId = taskToDelete.id;
      
      // Silme işlemini gerçekleştir
      const resultAction = await dispatch(deleteTask(taskId));
      
      // Başarılı silme durumunda state güncellemesi
      if (deleteTask.fulfilled.match(resultAction)) {
        console.log('Görev başarıyla silindi');
        
        // Cache'i temizle ve verileri yeniden yükle
        setTimeout(() => {
          dispatch(clearTasksCache());
          dispatch(fetchTasks());
        }, 300);
      } else {
        console.error('Görev silme işlemi başarısız:', resultAction.error);
      }
    } catch (error) {
      console.error('Görev silinirken bir hata oluştu:', error);
    } finally {
      // Modal'ı kapat
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  }, [dispatch, taskToDelete]);

  const handleCreateTask = useCallback(async (newTaskData: Omit<Task, 'id'>) => {
    try {
      const assignedUserIds = (newTaskData.assignedUsers || [])
        .map(user => user.id)
        .filter((id): id is string => id !== undefined);

      const taskToCreate = {
        ...newTaskData,
        assignedUserIds,
        completedDate: newTaskData.completedDate || new Date().toISOString()
      };

      // Create the task in the backend
      const createdTask = await dispatch(createTask(taskToCreate)).unwrap();
      
      if (!createdTask || !createdTask.id) {
        console.error('Task creation failed: No valid task returned from API');
        return;
      }
      
      // Log success with created task ID
      console.log('Task created successfully with ID:', createdTask.id);
      
      // Clear all related caches to ensure fresh data
      dispatch(clearTasksCache());
      
      // Force refresh tasks data after a short delay to ensure backend processing is complete
      setTimeout(() => {
        dispatch(fetchTasks())
          .then(() => {
            console.log('Tasks refreshed after creation');
            // Force refresh any related user/team task data
            if (createdTask.teamId) {
              dispatch(getTeamMembersByTeamId(createdTask.teamId))
                .catch(err => console.error('Error refreshing team data:', err));
            }
          })
          .catch(err => console.error('Error refreshing tasks:', err));
      }, 500); // Increased delay to ensure backend processing completes
      
      setIsNewTaskModalOpen(false);
    } catch (error) {
      console.error('Görev oluşturulurken hata oluştu:', error);
    }
  }, [dispatch]);

  const categories = ['All Cases', 'Bug', 'Development', 'Documentation', 'Testing', 'Maintenance'];

  // Memoize TaskGroup and TaskRow components

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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Tasks</h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Track and manage your tasks efficiently</p>
          </div>
          {/* Yeni görev ekleme butonu */}
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Task
          </button>
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
                <i className={`fas fa-history ${isDarkMode ? 'text-white' : 'text-gray-600'}`}></i>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setSortByPriority(!sortByPriority);
                }}
                className={`!rounded-button flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${sortByPriority ? 'bg-indigo-100 border-indigo-300' : ''}`}
              >
                <i className={`fas fa-sort ${isDarkMode ? 'text-white' : 'text-gray-600'}`}></i>
                <span className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Sort</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsDateFilterModalOpen(true);
                }}
                className={`!rounded-button flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${isFilterActive ? 'bg-indigo-100 border-indigo-300' : ''}`}
              >
                <i className={`fas fa-filter ${isDarkMode ? 'text-white' : 'text-gray-600'}`}></i>
                <span className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Filter</span>
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex space-x-4 mb-6">
            {categories.map((category) => (
              <button
                key={category}
                className={`!rounded-button px-4 py-2 rounded-lg transition-colors ${isDarkMode ? selectedCategory === category ? 'bg-gray-900 text-white' : 'bg-gray-600 text-white-600 hover:bg-gray-200' : selectedCategory === category ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? "text-gray-200" : "text-gray-500"} uppercase tracking-wider`}>Title</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? "text-gray-200" : "text-gray-500"} uppercase tracking-wider`}>Tanımlama</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? "text-gray-200" : "text-gray-500"} uppercase tracking-wider`}>Öncelik</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? "text-gray-200" : "text-gray-500"} uppercase tracking-wider`}>Durum</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? "text-gray-200" : "text-gray-500"} uppercase tracking-wider`}>Kategori</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? "text-gray-200" : "text-gray-500"} uppercase tracking-wider`}>Atanan Kişiler</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? "text-gray-200" : "text-gray-500"} uppercase tracking-wider`}>Son Düzenleme</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? "text-gray-200" : "text-gray-500"} uppercase tracking-wider`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${
                isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                {filteredTasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <tr 
                      className={`${isDarkMode ? "hover:bg-gray-500" : "hover:bg-gray-50"} cursor-pointer transition-colors ${
                        task.isLinked ? `border-l-4 ${isDarkMode ? "border-white-200" : "border-blue-400"}` : ''
                      }`}
                      onClick={(e) => handleTaskClick(task, e)}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? "text-gray-200" :"text-gray-900"}`}>{task.title}</td>
                      <td className={`px-6 py-4 whitespace-normal text-sm ${isDarkMode ? "text-gray-200" :"text-gray-900"} max-w-xs`}>{task.description}</td>
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
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? "text-gray-200" :"text-gray-900"}`}>{task.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* User Avatars */}
                        <div className="flex items-center space-x-2">
                          {task.assignedUsers && task.assignedUsers.length > 0 ? (
                            <div className="flex -space-x-2">
                              {task.assignedUsers.map((user, index) => (
                                <div
                                  key={index}
                                  className={`relative inline-flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full ring-2 ${isDarkMode ? "ring-gray-400" : "ring-white"}`}
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
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? "text-gray-200" :"text-gray-900"}`}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.teamId && (
                          taskOwnerStatus[task.id!] || 
                          (currentUser?.role === 'admin') // Admin rolündeki kullanıcılara tüm görevler için izin ver
                        ) && (
                          <>
                            <button
                              onClick={(e) => handleEditClick(task, e)}
                              className="text-indigo-600 hover:text-indigo-900 mr-2"
                              title="Görevi Düzenle"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={(e) => handleDeleteTask(task.id!, task.title, e)}
                              className="text-red-600 hover:text-red-900"
                              title="Görevi Sil"
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
                        className={`hover:${isDarkMode ? "bg-gray-400" : "bg-blue-50"} cursor-pointer transition-colors bg-blue-50/30`}
                        onClick={(e) => handleTaskClick(linkedTask, e)}
                      >
                        <td className={`px-6 py-4 pl-12 whitespace-nowrap text-sm font-medium ${isDarkMode ? "text-gray-300" :"text-gray-900"}`}>
                          <div className="flex items-center">
                            <div className={`w-6 border-l-2 border-b-2 ${isDarkMode ? "border-white-400" : "border-blue-400"} h-6 -ml-6`}></div>
                            {linkedTask.title}
                          </div>
                        </td>
                        {/* ...other cells similar to above... */}
                        <td className={`px-6 py-4 whitespace-normal text-sm ${isDarkMode ? "text-gray-300": "text-gray-500"}  max-w-xs`}>{linkedTask.description}</td>
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
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? "text-gray-300":"text-gray-500"} `}>{linkedTask.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {linkedTask.assignedUsers && linkedTask.assignedUsers.length > 0 ? (
                              <div className="flex -space-x-2">
                                {linkedTask.assignedUsers.map((user, index) => (
                                  <div
                                    key={index}
                                    className={`relative inline-flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full ring-2 ${isDarkMode ? "ring-gray-300" : "ring-white"}`}
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
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? "text-gray-300":"text-gray-500"} `}>
                          {new Date(linkedTask.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {linkedTask.teamId && (
                            taskOwnerStatus[linkedTask.id!] || 
                            (currentUser?.role === 'admin') // Admin rolündeki kullanıcılara tüm görevler için izin ver
                          ) && (
                            <>
                              <button
                                onClick={(e) => handleEditClick(linkedTask, e)}
                                className="text-indigo-600 hover:text-indigo-900 mr-2"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                onClick={(e) => handleDeleteTask(linkedTask.id, linkedTask.title, e)}
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
          isDarkMode={isDarkMode}
          task={{
            ...selectedTask,
            assignedUserIds: selectedTask.assignedUsers?.map(user => user.id).filter((id): id is string => id !== undefined) || [],
            completedDate: selectedTask.completedDate || new Date().toISOString() // Convert Date to string
          }}
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
        <div className="fixed inset-0 backdrop-blur-md bg-gray-800/30 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-xl w-96`} onClick={e => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tarih Aralığı Seçin</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className={`w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bitiş Tarihi</label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className={`w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
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
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
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
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    !dateFilter.startDate || !dateFilter.endDate
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
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

      {/* Silme onay modalını ekle */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        taskTitle={taskToDelete?.title || ""}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDeleteTask}
      />

      <Footer />
    </div>
  );
};

export default Tasks;