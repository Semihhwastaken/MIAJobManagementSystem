import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { fetchTaskHistory } from '../../redux/features/tasksSlice';
import axiosInstance from '../../services/axiosInstance';

interface TaskHistoryProps {
    isOpen: boolean;
    onClose: () => void;
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
    completedDate?: Date;
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'overdue'>('all');
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const taskHistory = useSelector((state: RootState) => state.tasks.taskHistory);

    useEffect(() => {
        const loadTaskHistory = async () => {
            try {
                setLoading(true);
                await dispatch(fetchTaskHistory() as any);
            } catch (err: any) {
                setError(err.message || 'Görev geçmişi yüklenirken bir hata oluştu');
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            loadTaskHistory();
        }
    }, [dispatch, isOpen]);

    const historicalTasks = useMemo(() => {
        return taskHistory.filter(task => {
            if (selectedStatus === 'completed' && task.status !== 'completed') return false;
            if (selectedStatus === 'overdue' && task.status !== 'overdue') return false;
            if (selectedStatus === 'all' && task.status !== 'completed' && task.status !== 'overdue') return false;
            
            return searchTerm === '' || 
                   task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   task.description.toLowerCase().includes(searchTerm.toLowerCase());
        }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [taskHistory, selectedStatus, searchTerm]);

    const stats = useMemo(() => {
        const completed = taskHistory.filter(t => t.status === 'completed').length;
        const overdue = taskHistory.filter(t => t.status === 'overdue').length;
        return { completed, overdue };
    }, [taskHistory]);

    const toggleTaskDetails = (taskId: string) => {
        setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            className="flex items-center justify-center p-4"
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">Görev Geçmişi</h2>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-500 rounded-lg">
                                    <i className="fas fa-check text-white"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-white/80 text-sm">Tamamlanan</p>
                                    <p className="text-white text-2xl font-bold">{stats.completed}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                            <div className="flex items-center">
                                <div className="p-2 bg-red-500 rounded-lg">
                                    <i className="fas fa-clock text-white"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-white/80 text-sm">Süresi Geçen</p>
                                    <p className="text-white text-2xl font-bold">{stats.overdue}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="p-6 border-b">
                    <div className="flex space-x-4 items-center">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Görev ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setSelectedStatus('all')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    selectedStatus === 'all'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Tümü
                            </button>
                            <button
                                onClick={() => setSelectedStatus('completed')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    selectedStatus === 'completed'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Tamamlanan
                            </button>
                            <button
                                onClick={() => setSelectedStatus('overdue')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    selectedStatus === 'overdue'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Süresi Geçen
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tasks List Section */}
                <div className="overflow-y-auto max-h-[calc(85vh-280px)] p-6">
                    <div className="space-y-4">
                        {historicalTasks.map((task) => (
                            <div
                                key={task.id}
                                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => toggleTaskDetails(task.id!)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-2 h-2 rounded-full ${
                                                task.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                            <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                task.status === 'completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {task.status === 'completed' ? 'Tamamlandı' : 'Süresi Geçti'}
                                            </span>
                                            <i className={`fas fa-chevron-${
                                                expandedTaskId === task.id ? 'up' : 'down'
                                            } text-gray-400`}></i>
                                        </div>
                                    </div>

                                    {expandedTaskId === task.id && (
                                        <div className="mt-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">Açıklama</p>
                                                    <p className="mt-1 text-gray-900">{task.description}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">Kategori</p>
                                                    <p className="mt-1 text-gray-900">{task.category}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">Son Tarih</p>
                                                    <p className="mt-1 text-gray-900">
                                                        {format(new Date(task.dueDate), 'dd MMMM yyyy', { locale: tr })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">Öncelik</p>
                                                    <span className={`mt-1 inline-block px-2 py-1 rounded-full text-sm ${
                                                        task.priority === 'high'
                                                            ? 'bg-red-100 text-red-800'
                                                            : task.priority === 'medium'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                            </div>

                                            {task.assignedUsers?.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-sm font-medium text-gray-500 mb-2">Atanan Kişiler</p>
                                                    <div className="flex -space-x-2">
                                                        {task.assignedUsers.map((user, index) => (
                                                            <div
                                                                key={user.id}
                                                                className="relative inline-flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full ring-2 ring-white"
                                                                title={user.fullName}
                                                            >
                                                                <span className="text-xs font-medium text-white">
                                                                    {user.fullName?.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {historicalTasks.length === 0 && (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                    <i className="fas fa-history text-2xl text-gray-400"></i>
                                </div>
                                <p className="text-gray-500 text-lg">Henüz tamamlanmış veya süresi geçmiş görev bulunmamaktadır.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default TaskHistory;