import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import axiosInstance from '../../services/axiosInstance';
import { toast } from 'react-hot-toast';

interface UserTaskCommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;  // Make userId optional since it's not always needed
}

interface Task {
    id: string;
    title: string;
    description: string;
}

const UserTaskCommentModal: React.FC<UserTaskCommentModalProps> = ({ isOpen, onClose, userId }) => {
    const [userTasks, setUserTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');
    const [comment, setComment] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            // Only fetch tasks if we have a userId
            fetchUserTasks();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, userId]);

    const fetchUserTasks = async () => {
        if (!userId) return;  // Guard clause for when userId is not provided
        
        try {
            const response = await axiosInstance.get(`/tasks/user/${userId}`);
            setUserTasks(response.data);
        } catch (error) {
            console.error('Error fetching user tasks:', error);
            toast.error('Görevler yüklenirken bir hata oluştu');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTaskId || !comment.trim()) {
            toast.error('Lütfen görev seçin ve yorum yazın');
            return;
        }

        setLoading(true);
        try {
            await axiosInstance.post('/comment/user-task-comment', {
                taskId: selectedTaskId,
                content: comment
            });
            
            toast.success('Yorum başarıyla eklendi');
            onClose();
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Yorum eklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                    Göreve Yorum Ekle
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Görev Seçin
                                        </label>
                                        <select
                                            value={selectedTaskId}
                                            onChange={(e) => setSelectedTaskId(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 p-2"
                                            required
                                        >
                                            <option value="">Görev seçin</option>
                                            {userTasks.map((task) => (
                                                <option key={task.id} value={task.id}>
                                                    {task.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Yorum
                                        </label>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 p-2"
                                            rows={4}
                                            required
                                            placeholder="Yorumunuzu yazın..."
                                        />
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                                        >
                                            İptal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                        >
                                            {loading ? 'Gönderiliyor...' : 'Yorum Ekle'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default UserTaskCommentModal;