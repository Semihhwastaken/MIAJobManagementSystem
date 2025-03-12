import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Task, User, SubTask, Attachment } from '../../types/task';
import { Team, TeamMember } from '../../types/team';
import { fileUpload, Task as TaskType, fetchTasks, createTask, updateTask } from '../../redux/features/tasksSlice';
import teamService from '../../services/teamService';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, XCircleIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSnackbar } from 'notistack';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<TaskType, 'id'>) => void;
  existingTasks?: TaskType[];
  task?: TaskType;
  selectedUser?: TeamMember;
  isDarkMode: boolean;
  teamId?: string;
  teamName?: string;
}

type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'overdue';
type TaskPriority = 'low' | 'medium' | 'high';

interface FormData {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  dependencies: string[];
  attachments: Attachment[];
  subTasks: SubTask[];
  assignedUsers: User[];
  assignedUserIds: string[];
  teamId: string | undefined;
  createdAt: string;
  updatedAt: string;
  completedDate: Date | null;
}

const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, onSave, existingTasks = [], task, selectedUser, isDarkMode, teamId, teamName }) => {
  const dispatch = useAppDispatch();
  const allTasks = useAppSelector(state => state.tasks.items);
  const { enqueueSnackbar } = useSnackbar();
  const [debouncedDispatch, setDebouncedDispatch] = useState(false);
  const dispatchTimeoutRef = useRef<number | null>(null);

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const initialFormData: FormData = {
    title: task?.title || '',
    description: task?.description || '',
    dueDate: formatDateForInput(task?.dueDate || new Date().toISOString().split('T')[0]),
    priority: (task?.priority || 'medium') as TaskPriority,
    status: (task?.status || 'todo') as TaskStatus,
    category: task?.category || 'Bug',
    dependencies: task?.dependencies || [],
    attachments: task?.attachments || [],
    subTasks: task?.subTasks || [],
    assignedUsers: task?.assignedUsers || [],
    assignedUserIds: task?.assignedUserIds || [],
    teamId: task?.teamId || teamId,
    createdAt: task?.createdAt || new Date().toISOString(),
    updatedAt: task?.updatedAt || new Date().toISOString(),
    completedDate: task?.completedDate || null
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [newSubTask, setNewSubTask] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teamId || null);
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(teamName || null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Fetch tasks if not provided as props
  useEffect(() => {
    if (!existingTasks || existingTasks.length === 0) {
      if (dispatchTimeoutRef.current) {
        clearTimeout(dispatchTimeoutRef.current);
      }
      
      if (debouncedDispatch) {
        dispatchTimeoutRef.current = window.setTimeout(() => {
          dispatch(fetchTasks());
          setDebouncedDispatch(false);
        }, 500); // 500ms debounce
      }
    }
    
    return () => {
      if (dispatchTimeoutRef.current) {
        clearTimeout(dispatchTimeoutRef.current);
      }
    };
  }, [dispatch, existingTasks, debouncedDispatch]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        dueDate: formatDateForInput(task.dueDate),
        priority: task.priority,
        status: task.status,
        category: task.category,
        assignedUsers: task.assignedUsers || [],
        subTasks: task.subTasks,
        teamId: task.teamId,
        dependencies: task.dependencies,
        attachments: task.attachments,
        completedDate: task?.status === 'completed' ? new Date() : null,
      });
    }
  }, [task]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const myTeams = await teamService.getMyTeams();
        setTeams(myTeams);

        // Find team using task.teamId if task exists, or teamId from props
        const selectedTaskTeamId = task?.teamId || teamId;
        const userTeam = selectedTaskTeamId ? myTeams.find(team => team.id === selectedTaskTeamId) : null;

        if (userTeam) {
          setSelectedTeam(userTeam);
          setSelectedTeamId(userTeam.id);
          setSelectedTeamName(userTeam.name);
          if (selectedUser) {
            setFormData(prevState => ({
              ...prevState,
              assignedUsers: selectedUser ? [selectedUser] : []
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };

    fetchTeams();
  }, [task, teamId, selectedUser]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (selectedTeam && selectedTeam.id) {
        try {
          const members = await teamService.getTeamMembers(selectedTeam.id);
          setUsers(members);
        } catch (error) {
          console.error('Error fetching team members:', error);
          enqueueSnackbar('Ekip üyeleri yüklenirken bir hata oluştu', { variant: 'error' });
        }
      }
    };

    fetchTeamMembers();
  }, [selectedTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
  
    // Add more thorough validation
    if (!formData.title.trim()) {
      enqueueSnackbar('Başlık alanı zorunludur', { variant: 'error' });
      return;
    }

    if (!formData.dueDate) {
      enqueueSnackbar('Bitiş tarihi zorunludur', { variant: 'error' });
      return;
    }

    if (!selectedTeamId && !task?.teamId && !teamId) {
      enqueueSnackbar('Lütfen bir ekip seçin', { variant: 'error' });
      return;
    }

    try {
      // Format the date correctly for the API
      const dueDate = new Date(formData.dueDate);
      dueDate.setHours(23, 59, 59, 999);
      
      // Ensure all subtasks have required fields but don't set IDs
      const processedSubTasks = formData.subTasks.map(subTask => ({
        // Keep ID if exists but don't generate new ones - let MongoDB handle it
        ...(subTask.id ? { id: subTask.id } : {}),
        title: subTask.title,
        completed: Boolean(subTask.completed)
      }));

      // Ensure all assignedUsers have the required fields
      const processedAssignedUsers = formData.assignedUsers.map(user => ({
        id: user.id || '',
        username: user.username || '',
        email: user.email || '',
        fullName: user.fullName || user.username || '',
        department: user.department || '',
        title: user.title || '',
        position: user.position || '',
        profileImage: user.profileImage || ''
      }));

      // Extract user IDs for the assignedUserIds field
      const assignedUserIds = processedAssignedUsers
        .filter(user => user.id)
        .map(user => user.id);

      // Create a complete task payload with all required fields
      const taskPayload = {
        // Don't include id for new tasks - the createTask thunk will generate one
        // For existing tasks, the id will be added before dispatching
        title: formData.title.trim(),
        description: formData.description.trim(),
        teamId: selectedTeamId || task?.teamId || teamId || '',
        createdAt: task ? task.createdAt : now,
        updatedAt: now,
        dueDate: dueDate.toISOString(),
        status: formData.status || 'todo',
        priority: formData.priority || 'medium',
        category: formData.category || 'Bug',
        subTasks: processedSubTasks,
        dependencies: formData.dependencies || [],
        attachments: formData.attachments || [],
        assignedUsers: processedAssignedUsers,
        assignedUserIds: assignedUserIds
      };

      console.log('Task payload before dispatch:', taskPayload);

      let taskId = '';

      if (task && task.id) {
        // Update existing task
        const updatedTask = await dispatch(updateTask({
          ...taskPayload,
          id: task.id
        })).unwrap();
        
        taskId = updatedTask.id;
        enqueueSnackbar('Görev başarıyla güncellendi', { variant: 'success' });
      } else {
        // Create new task
        const createdTask = await dispatch(createTask(taskPayload)).unwrap();
        taskId = createdTask.id;
        enqueueSnackbar('Görev başarıyla oluşturuldu', { variant: 'success' });
      }
      
      // Handle file upload if needed
      if (selectedFile && taskId) {
        try {
          await dispatch(fileUpload({ taskId, file: selectedFile })).unwrap();
          enqueueSnackbar('Dosya başarıyla yüklendi', { variant: 'success' });
        } catch (error) {
          console.error('Error uploading file:', error);
          enqueueSnackbar('Görev kaydedildi fakat dosya yüklenemedi', { variant: 'warning' });
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Try to get a more specific error message if available
      let errorMessage = 'Form gönderilirken bir hata oluştu';
      if (typeof error === 'object' && error !== null) {
        const anyError = error as any;
        if (anyError.message) {
          errorMessage = anyError.message;
        } else if (anyError.errors) {
          errorMessage = Object.values(anyError.errors).join(', ');
        }
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleAddSubTask = () => {
    if (newSubTask.trim()) {
      setFormData({
        ...formData,
        subTasks: [
          ...formData.subTasks,
          { title: newSubTask.trim(), completed: false }
        ]
      });
      setNewSubTask('');
    }
  };

  const handleRemoveSubTask = (index: number) => {
    setFormData({
      ...formData,
      subTasks: formData.subTasks.filter((_, i) => i !== index)
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setFileError('');
    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setFileError('Dosya boyutu 10MB\'dan küçük olmalıdır');
      return;
    }

    // Check file type
    const allowedExtensions = ['.jpg', '.png', '.jpeg', '.pdf', '.zip', '.docx', '.doc', '.rar', '.txt', '.xlsx', '.xls'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(extension)) {
      setFileError('Desteklenmeyen dosya formatı. Lütfen izin verilen bir format seçin.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError('');
  };

  const handleRemoveAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index)
    });
  };

  const handleUserToggle = (user: TeamMember) => {
    const isSelected = formData.assignedUsers.some(u => u.id === user.id);
    setFormData({
      ...formData,
      assignedUsers: isSelected
        ? formData.assignedUsers.filter(u => u.id !== user.id)
        : [...formData.assignedUsers, user]
    });
  };

  const handleDependencyToggle = (taskId: string) => {
    const isSelected = formData.dependencies.includes(taskId);
    setFormData({
      ...formData,
      dependencies: isSelected
        ? formData.dependencies.filter(id => id !== taskId)
        : [...formData.dependencies, taskId]
    });
  };

  const handleRemoveUser = (userId: string) => {
    setFormData({
      ...formData,
      assignedUsers: formData.assignedUsers.filter(user => user.id !== userId)
    });
  };

  const getAvailableTasks = () => {
    return allTasks.filter(existingTask => {
      // Filter out completed or overdue tasks
      if (existingTask.status === 'completed' || existingTask.status === 'overdue') {
        return false;
      }
      // Filter out the task being edited
      if (task?.id === existingTask.id) {
        return false;
      }
      // Only include tasks from the same team
      return existingTask.teamId === selectedTeamId;
    });
  };

  // Debounce handler for description field to prevent API calls on each keystroke
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, description: e.target.value });
    // Do not trigger API calls for description field changes
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className={`rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto ${
        isDarkMode ? 'bg-gray-800/95 backdrop-blur-sm text-gray-100' : 'bg-white/90 backdrop-blur-sm text-gray-900'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {task ? 'Görevi Düzenle' : 'Yeni Görev Oluştur'}
          </h2>
          <button
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Temel Bilgiler */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Başlık
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Açıklama
            </label>
            <textarea
              required
              value={formData.description}
              onChange={handleDescriptionChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Bitiş Tarihi
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Öncelik
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Kategori
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="Bug">Bug</option>
              <option value="Development">Development</option>
              <option value="Documentation">Documentation</option>
              <option value="Testing">Testing</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Ekip
            </label>
            <div className={`mt-1 block w-full py-3 px-4 rounded-md border shadow-sm text-base ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-300 border-gray-600' 
                : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}>
              {selectedTeam?.name || selectedTeamName || 'Ekip seçildi'}
            </div>
          </div>

          {/* Alt Görevler */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Alt Görevler
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubTask();
                  }
                }}
                placeholder="Alt görev ekle..."
                className={`flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <button
                type="button"
                onClick={handleAddSubTask}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Ekle
              </button>
            </div>
            <div className="space-y-2">
              {formData.subTasks.map((subTask, index) => (
                <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <span className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>
                    {subTask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubTask(index)}
                    className={isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Kişi Atama */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Görevli Kişiler
            </label>
            <div className="space-y-2">
              {/* Seçili kullanıcılar */}
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.assignedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      isDarkMode ? 'bg-indigo-900/40' : 'bg-indigo-50'
                    }`}
                  >
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.fullName || user.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-indigo-700 text-indigo-200' : 'bg-indigo-200 text-indigo-600'
                      }`}>
                        {(user.fullName || user.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={isDarkMode ? 'text-gray-200' : ''}>
                      {user.fullName || user.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id!)}
                      className={isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Kullanıcı seçme dropdown */}
              <Listbox
                value={null}
                onChange={(selectedUser: TeamMember) => {
                  if (selectedUser && !formData.assignedUsers.some(u => u.id === selectedUser.id)) {
                    setFormData({
                      ...formData,
                      assignedUsers: [...formData.assignedUsers, selectedUser]
                    });
                  }
                }}
              >
                <div className="relative">
                  <Listbox.Button className={`relative w-full cursor-pointer rounded-lg py-2 pl-3 pr-10 text-left border focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}>
                    <span className={`block truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Kişi seçin...
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <svg className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={React.Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className={`absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md py-1 text-base shadow-lg ring-1 ring-opacity-5 focus:outline-none sm:text-sm ${
                      isDarkMode
                        ? 'bg-gray-800 ring-gray-700'
                        : 'bg-white ring-black'
                    }`}>
                      {users.length === 0 ? (
                        <div className={`py-2 px-4 italic ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Ekip üyeleri bulunamadı
                        </div>
                      ) : (
                        users
                          .filter(user => !formData.assignedUsers.some(u => u.id === user.id))
                          .map(user => (
                            <Listbox.Option
                              key={user.id}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                  isDarkMode
                                    ? active ? 'bg-indigo-900/40 text-indigo-100' : 'text-gray-200'
                                    : active ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
                                }`
                              }
                              value={user}
                            >
                              {({ active }) => (
                                <>
                                  <div className="flex items-center">
                                    {user.profileImage ? (
                                      <img
                                        src={user.profileImage}
                                        alt={user.fullName || user.username}
                                        className="h-6 w-6 flex-shrink-0 rounded-full"
                                      />
                                    ) : (
                                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                                        isDarkMode ? 'bg-indigo-600 text-indigo-200' : 'bg-indigo-200 text-indigo-600'
                                      }`}>
                                        <span className="text-xs font-medium">
                                          {(user.fullName || user.username).charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <span className="ml-3 block truncate">{user.fullName || user.username}</span>
                                  </div>
                                </>
                              )}
                            </Listbox.Option>
                          ))
                      )}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>
          </div>

          {/* Bağımlı Görevler */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Bağımlı Görevler
            </label>
            <div className={`space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              {getAvailableTasks().length > 0 ? (
                getAvailableTasks().map((availableTask) => (
                  <div
                    key={availableTask.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer ${
                      isDarkMode
                        ? formData.dependencies.includes(availableTask.id || '')
                          ? 'bg-indigo-900/30'
                          : 'hover:bg-gray-700'
                        : formData.dependencies.includes(availableTask.id || '')
                          ? 'bg-indigo-50'
                          : 'hover:bg-gray-50'
                    }`}
                    onClick={() => availableTask.id && handleDependencyToggle(availableTask.id)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.dependencies.includes(availableTask.id || '')}
                      onChange={() => availableTask.id && handleDependencyToggle(availableTask.id)}
                      className={`h-4 w-4 rounded ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-gray-800'
                          : 'text-indigo-600 focus:ring-indigo-500 border-gray-300'
                      }`}
                    />
                    <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                      {availableTask.title}
                    </span>
                  </div>
                ))
              ) : (
                <p className={`italic text-center py-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Bu ekibe ait bağlanabilecek görev bulunamadı.
                </p>
              )}
            </div>
          </div>

          {/* Modern Dosya Yükleme */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Dosya Ekle
            </label>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 transition-all ${
                isDarkMode
                  ? dragActive 
                    ? 'border-indigo-400 bg-indigo-900/20' 
                    : 'border-gray-600 hover:border-indigo-500'
                  : dragActive 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-300 hover:border-indigo-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className={`flex items-center justify-between p-2 rounded-lg ${
                  isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'
                }`}>
                  <div className="flex items-center">
                    <DocumentIcon className={`h-8 w-8 mr-2 ${
                      isDarkMode ? 'text-indigo-400' : 'text-indigo-500'
                    }`} />
                    <div>
                      <p className={`font-medium ${isDarkMode ? 'text-gray-200' : ''}`}>{selectedFile.name}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleRemoveFile}
                    className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <DocumentIcon className={`mx-auto h-12 w-12 ${
                    isDarkMode ? 'text-gray-600' : 'text-gray-300'
                  }`} />
                  <div className="mt-2">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className={`mt-2 block text-sm font-medium ${
                        isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'
                      }`}>
                        Dosya seçmek için tıklayın
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      JPEG, PNG, PDF, ZIP, DOCX, XLS (maks. 10MB)
                    </p>
                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      veya dosyayı buraya sürükleyin
                    </p>
                  </div>
                </div>
              )}
            </div>
            {fileError && (
              <p className="text-red-500 text-xs mt-1">{fileError}</p>
            )}

            {/* Existing attachments */}
            {formData.attachments && formData.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Ekli Dosyalar:
                </p>
                {formData.attachments.map((attachment, index) => (
                  <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center">
                      <DocumentIcon className={`h-5 w-5 mr-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        {attachment.fileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className={isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 border rounded-lg ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;