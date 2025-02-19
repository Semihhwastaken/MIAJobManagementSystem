import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { NewTask, Task, mockUsers, SubTask } from '../../types/task'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { addTask, updateTask } from '../../redux/features/tasksSlice'
import toast from 'react-hot-toast'
import { PlusIcon, XMarkIcon, PaperClipIcon } from '@heroicons/react/24/outline'

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    editTask?: Task;
}

const initialFormData: NewTask = {
    title: '',
    description: '',
    status: 'todo',
    priority: 'low',
    dueDate: new Date().toISOString().split('T')[0],
    assignedUsers: [],
    subTasks: [],
    dependencies: [],
    attachments: []
}

const TaskModal = ({ isOpen, onClose, editTask }: TaskModalProps) => {
    const [formData, setFormData] = useState<NewTask>(editTask || initialFormData)
    const [subTaskInput, setSubTaskInput] = useState('')
    const dispatch = useAppDispatch()
    const tasks = useAppSelector((state) => state.tasks.items)

    // Dosya yükleme işlemi
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            const file = files[0]
            const newAttachment = {
                id: Date.now().toString(),
                fileName: file.name,
                fileUrl: URL.createObjectURL(file),
                fileType: file.type,
                uploadDate: new Date().toISOString()
            }
            setFormData({
                ...formData,
                attachments: [...formData.attachments, newAttachment]
            })
        }
    }

    // Alt görev ekleme
    const handleAddSubTask = (e: React.FormEvent) => {
        e.preventDefault()
        if (subTaskInput.trim()) {
            const newSubTask: SubTask = {
                id: Date.now().toString(),
                title: subTaskInput,
                completed: false
            }
            setFormData({
                ...formData,
                subTasks: [...formData.subTasks, newSubTask]
            })
            setSubTaskInput('')
        }
    }

    // Alt görev silme
    const handleRemoveSubTask = (id: string) => {
        setFormData({
            ...formData,
            subTasks: formData.subTasks.filter(task => task.id !== id)
        })
    }

    // Kullanıcı atama/çıkarma
    const handleUserToggle = (userId: string) => {
        const user = mockUsers.find(u => u.id === userId)
        if (!user) return

        const isAssigned = formData.assignedUsers.some(u => u.id === userId)
        if (isAssigned) {
            setFormData({
                ...formData,
                assignedUsers: formData.assignedUsers.filter(u => u.id !== userId)
            })
        } else {
            setFormData({
                ...formData,
                assignedUsers: [...formData.assignedUsers, user]
            })
        }
    }

    // Form gönderme
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        try {
            const now = new Date().toISOString();
            
            if (editTask) {
                await dispatch(updateTask({ 
                    ...editTask, 
                    ...formData,
                    updatedAt: now
                })).unwrap()
                toast.success('Görev başarıyla güncellendi!', {
                    duration: 3000,
                    position: 'top-right',
                    style: {
                        background: '#10B981',
                        color: '#fff',
                    }
                })
            } else {
                const newTask = {
                    ...formData,
                    id: Date.now().toString(),
                    createdAt: now,
                    updatedAt: now
                }
                await dispatch(addTask(newTask)).unwrap()
                toast.success('Görev başarıyla eklendi!', {
                    duration: 3000,
                    position: 'top-right',
                    style: {
                        background: '#10B981',
                        color: '#fff',
                    }
                })
            }
            setFormData(initialFormData)
            onClose()
        } catch (error) {
            toast.error(editTask ? 'Görev güncellenirken bir hata oluştu!' : 'Görev eklenirken bir hata oluştu!', {
                duration: 3000,
                position: 'top-right',
                style: {
                    background: '#EF4444',
                    color: '#fff',
                }
            })
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                                >
                                    {editTask ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} id="taskForm" className="space-y-4">
                                    {/* Ana görev bilgileri */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                                Başlık
                                            </label>
                                            <input
                                                type="text"
                                                id="title"
                                                required
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                                Açıklama
                                            </label>
                                            <textarea
                                                id="description"
                                                required
                                                rows={3}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                                Durum
                                            </label>
                                            <select
                                                id="status"
                                                required
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value as NewTask['status'] })}
                                            >
                                                <option value="todo">Yapılacak</option>
                                                <option value="in-progress">Devam Ediyor</option>
                                                <option value="completed">Tamamlandı</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                                                Öncelik
                                            </label>
                                            <select
                                                id="priority"
                                                required
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={formData.priority}
                                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as NewTask['priority'] })}
                                            >
                                                <option value="low">Düşük</option>
                                                <option value="medium">Orta</option>
                                                <option value="high">Yüksek</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                                                Bitiş Tarihi
                                            </label>
                                            <input
                                                type="date"
                                                id="dueDate"
                                                required
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={formData.dueDate}
                                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                            />
                                        </div>

                                        {/* Bağımlı görevler */}
                                        <div>
                                            <label htmlFor="dependencies" className="block text-sm font-medium text-gray-700">
                                                Bağımlı Görevler
                                            </label>
                                            <select
                                                id="dependencies"
                                                multiple
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                value={formData.dependencies}
                                                onChange={(e) => {
                                                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                                                    setFormData({ ...formData, dependencies: selected })
                                                }}
                                            >
                                                {tasks.filter(t => t.id !== editTask?.id).map(task => (
                                                    <option key={task.id} value={task.id}>
                                                        {task.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Alt görevler */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Alt Görevler
                                        </label>
                                        <div className="space-y-2">
                                            {formData.subTasks.map((subTask) => (
                                                <div key={subTask.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                                    <span>{subTask.title}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSubTask(subTask.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <XMarkIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Yeni alt görev ekle"
                                                    value={subTaskInput}
                                                    onChange={(e) => setSubTaskInput(e.target.value)}
                                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddSubTask}
                                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                >
                                                    <PlusIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Atanan kullanıcılar */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Atanan Kullanıcılar
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {mockUsers.map((user) => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => handleUserToggle(user.id)}
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                                                        formData.assignedUsers.some(u => u.id === user.id)
                                                            ? 'bg-indigo-100 text-indigo-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    <img
                                                        src={user.avatar}
                                                        alt={user.name}
                                                        className="w-6 h-6 rounded-full mr-2"
                                                    />
                                                    {user.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Dosya ekleme */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ekler
                                        </label>
                                        <div className="space-y-2">
                                            {formData.attachments.map((attachment) => (
                                                <div key={attachment.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                                    <div className="flex items-center">
                                                        <PaperClipIcon className="h-5 w-5 text-gray-400 mr-2" />
                                                        <span>{attachment.fileName}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            attachments: formData.attachments.filter(a => a.id !== attachment.id)
                                                        })}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <XMarkIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div>
                                                <input
                                                    type="file"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                    id="file-upload"
                                                />
                                                <label
                                                    htmlFor="file-upload"
                                                    className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                >
                                                    <PaperClipIcon className="h-5 w-5 mr-2" />
                                                    Dosya Ekle
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                <div className="mt-6 flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        İptal
                                    </button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        form="taskForm"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                    >
                                        {editTask ? 'Güncelle' : 'Kaydet'}
                                    </motion.button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

export default TaskModal
