import React, { useEffect } from 'react';
import { Task } from '../../types/task';
import { useDispatch } from 'react-redux';
import { deleteTask, updateTask } from '../../redux/features/tasksSlice';
import { AppDispatch } from '../../redux/store';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onEdit, onDelete }) => {
  const dispatch = useDispatch<AppDispatch>();

  const calculateProgress = () => {
    if (task.subTasks.length === 0) return 0;
    return Math.round((task.subTasks.filter(st => st.completed).length / task.subTasks.length) * 100);
  };

  const updateTaskStatus = async () => {
    const progress = calculateProgress();
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    let newStatus: 'todo' | 'in-progress' | 'completed' | 'overdue' = task.status;

    if (progress === 0) {
      newStatus = 'todo';
    } else if (progress === 100) {
      newStatus = 'completed';
    } else if (progress > 0 && progress < 100) {
      newStatus = 'in-progress';
    }

    // Eğer due date geçmiş ve task tamamlanmamışsa overdue yap
    if (now > dueDate && progress !== 100) {
      newStatus = 'overdue';
    }

    if (newStatus !== task.status && task.id) {
      await dispatch(updateTask({
        ...task,
        status: newStatus
      }));
    }
  };

  useEffect(() => {
    updateTaskStatus();
  }, [task.subTasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
      try {
        await dispatch(deleteTask(task.id));
      } catch (error) {
        console.error('Görev silinirken hata oluştu:', error);
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task);
  };

  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-lg shadow-md mb-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:transform hover:scale-[1.02] relative group"
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
        <button
          onClick={handleEdit}
          className="p-1 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
          title="Düzenle"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
          title="Sil"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{task.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(task.status)}`}>
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {task.assignedUsers.map((user, index) => (
            <div
              key={user.id || index}
              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 relative group"
              title={user.fullName || user.username}
            >
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.fullName || user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{(user.fullName || user.username).charAt(0).toUpperCase()}</span>
              )}
              <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                {user.fullName || user.username}
                {user.department && ` (${user.department})`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
