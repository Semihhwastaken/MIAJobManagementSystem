import React, { useState } from 'react';
import { Modal } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

interface TaskHistoryProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: TaskHistoryDto[];
}

interface TaskHistoryDto {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    dueDate: string;
    assignedUsers: { id: string; fullName: string; }[];
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ isOpen, onClose, tasks }) => {
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);

    const historicalTasks = tasks.filter(task => 
        task.status === 'completed' || task.status === 'overdue'
    );

    const toggleTaskDetails = (taskId: string) => {
        setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'overdue':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            className="flex items-center justify-center p-4"
        >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Görev Geçmişi</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {historicalTasks.map((task) => (
                        <div
                            key={task.id}
                            className="border rounded-lg overflow-hidden shadow-sm"
                        >
                            <div
                                className="p-4 bg-white cursor-pointer hover:bg-gray-50"
                                onClick={() => toggleTaskDetails(task.id!)}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                                            {task.status === 'completed' ? 'Tamamlandı' : 'Süresi Geçmiş'}
                                        </span>
                                        <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                                    </div>
                                    <i className={`fas fa-chevron-${expandedTaskId === task.id ? 'up' : 'down'} text-gray-400`}></i>
                                </div>

                                {expandedTaskId === task.id && (
                                    <div className="mt-4 space-y-3 text-gray-600">
                                        <p><span className="font-medium">Açıklama:</span> {task.description}</p>
                                        <p><span className="font-medium">Öncelik:</span> {task.priority}</p>
                                        <p><span className="font-medium">Kategori:</span> {task.category}</p>
                                        <p><span className="font-medium">Son Tarih:</span> {new Date(task.dueDate).toLocaleDateString('tr-TR')}</p>
                                        <p><span className="font-medium">Atanan Kişiler:</span> {task.assignedUsers?.map(user => user.fullName).join(', ')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {historicalTasks.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            Tamamlanmış veya süresi geçmiş görev bulunmamaktadır.
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default TaskHistory;