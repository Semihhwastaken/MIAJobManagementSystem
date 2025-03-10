import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import axiosInstance from '../../services/axiosInstance';
import { toast } from 'react-hot-toast';
import { PaperClipIcon, TagIcon } from '@heroicons/react/24/outline';

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
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);

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
        
        // FormData oluştur (dosya yükleme için)
        const formData = new FormData();
        formData.append('taskId', selectedTaskId);
        formData.append('content', comment);
        formData.append('priority', priority);
        formData.append('tags', JSON.stringify(tags));
        
        if (dueDate) {
            formData.append('dueDate', dueDate);
        }
        
        // Dosyaları ekle
        files.forEach(file => {
            formData.append('files', file);
        });
        
        try {
            await axiosInstance.post('/comment/user-task-comment', {
                taskId: selectedTaskId,
                content: comment,
                priority,
                tags,
                dueDate: dueDate || undefined
            });
            
            // Dosya varsa, ayrı bir istek ile gönder
            if (files.length > 0) {
                const fileFormData = new FormData();
                fileFormData.append('taskId', selectedTaskId);
                files.forEach(file => {
                    fileFormData.append('files', file);
                });
                
                await axiosInstance.post('/comment/attachment', fileFormData);
            }
            
            toast.success('Yorum başarıyla eklendi');
            onClose();
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Yorum eklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };
    
    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const fileList = Array.from(e.target.files);
            setFiles(prev => [...prev, ...fileList]);
        }
    };
    
    const handleRemoveFile = (fileToRemove: File) => {
        setFiles(files.filter(file => file !== fileToRemove));
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
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Önem Derecesi
                                        </label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                                            className="w-full rounded-lg border border-gray-300 p-2"
                                        >
                                            <option value="low">Düşük</option>
                                            <option value="medium">Orta</option>
                                            <option value="high">Yüksek</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tarih (İsteğe Bağlı)
                                        </label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 p-2"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Etiketler
                                        </label>
                                        <div className="flex">
                                            <input
                                                type="text"
                                                value={newTag}
                                                onChange={(e) => setNewTag(e.target.value)}
                                                placeholder="Yeni etiket ekle"
                                                className="flex-grow rounded-l-lg border border-gray-300 p-2"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddTag}
                                                className="bg-blue-500 text-white rounded-r-lg px-3 hover:bg-blue-600"
                                            >
                                                <TagIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {tags.map(tag => (
                                                    <span 
                                                        key={tag} 
                                                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center"
                                                    >
                                                        {tag}
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleRemoveTag(tag)}
                                                            className="ml-1 text-blue-800 hover:text-blue-900"
                                                        >
                                                            &times;
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Dosya Ekle
                                        </label>
                                        <div className="flex items-center">
                                            <label className="cursor-pointer flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg">
                                                <PaperClipIcon className="h-5 w-5 text-gray-500" />
                                                <span className="text-sm">Dosya Seç</span>
                                                <input
                                                    type="file"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    multiple
                                                />
                                            </label>
                                            <span className="ml-3 text-sm text-gray-500">
                                                {files.length} dosya seçildi
                                            </span>
                                        </div>
                                        {files.length > 0 && (
                                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                                {files.map((file, index) => (
                                                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                        <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile(file)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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