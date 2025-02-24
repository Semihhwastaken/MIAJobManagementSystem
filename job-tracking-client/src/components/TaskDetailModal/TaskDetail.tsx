import React, { useState, useEffect } from 'react';
import { Task } from '../../types/task';
import { useDispatch, useSelector } from 'react-redux';
import { updateTask } from '../../redux/features/tasksSlice';
import { RootState, AppDispatch } from '../../redux/store';

interface TaskDetailModalProps {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose }) => {
    const dispatch: AppDispatch = useDispatch();
    const allTasks = useSelector((state: RootState) => state.tasks.items);
    const [localTask, setLocalTask] = useState(task);

    useEffect(() => {
        setLocalTask(task);
    }, [task]);

    if (!isOpen) return null;

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            case 'low':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleSubTaskToggle = (subTaskId: string) => {
        // Eğer task overdue ise, subtask'ları değiştirmeye izin verme
        if (localTask.status === 'overdue') {
            alert('Bu görev süresi dolduğu için alt görevler tamamlanamaz!');
            return;
        }

        const updatedTask = {
            ...localTask,
            subTasks: localTask.subTasks.map(st =>
                st.id === subTaskId ? { ...st, completed: !st.completed } : st
            )
        };
        setLocalTask(updatedTask);
        dispatch(updateTask(updatedTask));
    };

    const progressPercentage = localTask.subTasks.length > 0
        ? Math.round((localTask.subTasks.filter(st => st.completed).length / localTask.subTasks.length) * 100)
        : 0;

    // Bağlı görevlerin başlıklarını bul
    const getDependencyTitle = (depId: string) => {
        const dependentTask = allTasks.find(t => t.id === depId);
        return dependentTask?.title || 'Silinmiş Görev';
    };

    return (
        <div className="fixed inset-y-0 right-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full p-6 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-medium text-gray-900" id="modal-title">
                            {localTask.title}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <span className="sr-only">Kapat</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mb-4">
                        <span className={`inline-block px-2 py-1 rounded-md text-sm font-medium ${getPriorityColor(localTask.priority)}`}>
                            {localTask.priority.charAt(0).toUpperCase() + localTask.priority.slice(1)}
                        </span>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">Açıklama</h4>
                            <p className="mt-1 text-sm text-gray-500">{localTask.description}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-900">İlerleme</h4>
                            <div className="mt-2">
                                <div className="flex items-center">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progressPercentage}%` }}
                                        />
                                    </div>
                                    <span className="ml-2 text-sm text-gray-500">{progressPercentage}%</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-900">Alt Görevler</h4>
                            <div className="mt-2 space-y-2">
                                {localTask.subTasks.map((subTask) => (
                                    <div key={subTask.id} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={subTask.completed}
                                            onChange={() => handleSubTaskToggle(subTask.id!)}
                                            disabled={localTask.status === 'overdue'}
                                            className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 
                                                ${localTask.status === 'overdue' ? 'cursor-not-allowed opacity-50' : ''}`}
                                        />
                                        <label className={`ml-2 text-sm ${localTask.status === 'overdue' ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {subTask.title}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-900">Bağlı Görevler</h4>
                            <div className="mt-2 space-y-2">
                                {localTask.dependencies.map((depId, index) => (
                                    <div key={index} className="text-sm text-gray-500 flex items-center">
                                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        {getDependencyTitle(depId)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-900">Dosyalar</h4>
                            <div className="mt-2 space-y-2">
                                {localTask.attachments.map((attachment, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            <a 
                                                href={attachment.fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                {attachment.fileName}
                                            </a>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {new Date(attachment.uploadDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-900">Atanan Kişiler</h4>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {localTask.assignedUsers.map((user, index) => (
                                    <div 
                                        key={user.id || index} 
                                        className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1 group relative"
                                        title={`${user.fullName || user.username}${user.department ? ` (${user.department})` : ''}`}
                                    >
                                        {user.profileImage ? (
                                            <img
                                                src={user.profileImage}
                                                alt={user.fullName || user.username}
                                                className="w-6 h-6 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                                                {(user.fullName || user.username).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-sm text-gray-700">
                                            {user.fullName || user.username}
                                            {user.department && (
                                                <span className="text-gray-500 text-xs ml-1">
                                                    ({user.department})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
