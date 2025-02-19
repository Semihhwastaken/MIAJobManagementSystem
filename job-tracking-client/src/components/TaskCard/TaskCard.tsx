import { motion } from 'framer-motion';
import { Task } from '../../types/task';
import { PaperClipIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface TaskCardProps {
    task: Task;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

/**
 * Görev kartı bileşeni
 * Her bir görevi temsil eden kart komponenti
 */
const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const priorityColors = {
        low: 'bg-green-100 text-green-800',
        medium: 'bg-yellow-100 text-yellow-800',
        high: 'bg-red-100 text-red-800',
    };

    const statusColors = {
        'todo': 'bg-gray-100 text-gray-800',
        'in-progress': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800',
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-300"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-semibold text-gray-800">{task.title}</h3>
                    <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${priorityColors[task.priority]}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${statusColors[task.status]}`}>
                            {task.status === 'todo' ? 'Yapılacak' : 
                             task.status === 'in-progress' ? 'Devam Ediyor' : 'Tamamlandı'}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit(task.id)}
                        className="text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50"
                    >
                        Düzenle
                    </button>
                    <button
                        onClick={() => onDelete(task.id)}
                        className="text-red-600 hover:text-red-800 px-2 py-1 rounded-md hover:bg-red-50"
                    >
                        Sil
                    </button>
                </div>
            </div>

            <p className="text-gray-600 mb-4">{task.description}</p>

            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>Bitiş: {new Date(task.dueDate).toLocaleDateString('tr-TR')}</span>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center text-indigo-600 hover:text-indigo-800"
                >
                    {isExpanded ? (
                        <>
                            Gizle
                            <ChevronUpIcon className="h-4 w-4 ml-1" />
                        </>
                    ) : (
                        <>
                            Detaylar
                            <ChevronDownIcon className="h-4 w-4 ml-1" />
                        </>
                    )}
                </button>
            </div>

            {isExpanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t pt-4 space-y-4"
                >
                    {/* Atanan Kullanıcılar */}
                    {task.assignedUsers.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Atanan Kullanıcılar</h4>
                            <div className="flex -space-x-2">
                                {task.assignedUsers.map((user) => (
                                    <img
                                        key={user.id}
                                        src={user.avatar}
                                        alt={user.name}
                                        title={user.name}
                                        className="w-8 h-8 rounded-full border-2 border-white"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Alt Görevler */}
                    {task.subTasks.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Alt Görevler</h4>
                            <div className="space-y-2">
                                {task.subTasks.map((subTask) => (
                                    <div
                                        key={subTask.id}
                                        className="flex items-center text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={subTask.completed}
                                            readOnly
                                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 mr-2"
                                        />
                                        <span className={subTask.completed ? 'line-through text-gray-400' : ''}>
                                            {subTask.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bağımlı Görevler */}
                    {task.dependencies.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Bağımlı Görevler</h4>
                            <div className="space-y-1">
                                {task.dependencies.map((depId) => (
                                    <div
                                        key={depId}
                                        className="text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                    >
                                        • {depId}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ekler */}
                    {task.attachments.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Ekler</h4>
                            <div className="space-y-2">
                                {task.attachments.map((attachment) => (
                                    <a
                                        key={attachment.id}
                                        href={attachment.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                        <PaperClipIcon className="h-4 w-4 mr-1" />
                                        {attachment.fileName}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

export default TaskCard;
