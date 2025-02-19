import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Task, mockUsers, SubTask } from '../../types/task'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { updateTask } from '../../redux/features/tasksSlice'
import { addTask } from '../../redux/features/tasksSlice'
import toast from 'react-hot-toast'
import { PlusIcon, XMarkIcon, PaperClipIcon } from '@heroicons/react/24/outline'

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTask?: Task;
}

const TaskModal = ({ isOpen, onClose, editTask }: TaskModalProps) => {
  const defaultFormData: Task = {
    id: '',
    title: '',
    description: '',
    status: 'todo',
    priority: 'low',
    dueDate: new Date().toISOString().split('T')[0],
    assignedUsers: [],
    subTasks: [],
    dependencies: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const [formData, setFormData] = useState<Task>(defaultFormData)
  const [subTaskInput, setSubTaskInput] = useState('')
  const dispatch = useAppDispatch()
  const tasks = useAppSelector((state) => state.tasks.items)
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(formData.dependencies || [])

  // editTask değiştiğinde veya modal açıldığında/kapandığında formData'yı güncelle
  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        // Eğer editTask varsa, tüm alanları kontrol ederek boş dizileri varsayılan değerlerle doldur
        setFormData({
          ...editTask,
          assignedUsers: editTask.assignedUsers || [],
          subTasks: editTask.subTasks || [],
          dependencies: editTask.dependencies || [],
          attachments: editTask.attachments || [],
          dueDate: editTask.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0]
        })
      } else {
        setFormData(defaultFormData)
      }
    }
  }, [editTask, isOpen])

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

  // Alt görev tamamlama durumunu güncelle
  const handleSubTaskComplete = async (index: number, completed: boolean) => {
    try {
      if (!formData.id) return;

      // Önce yerel state'i güncelle
      const newSubTasks = formData.subTasks.map((task, idx) => 
        idx === index ? { ...task, completed } : task
      );

      // Hemen UI'ı güncelle
      setFormData(prev => ({
        ...prev,
        subTasks: newSubTasks
      }));

      // Sonra backend'e gönder
      const updatedTask = {
        ...formData,
        subTasks: newSubTasks,
        updatedAt: new Date().toISOString()
      };

      const resultAction = await dispatch(updateTask(updatedTask));
      
      if (!updateTask.fulfilled.match(resultAction)) {
        // Eğer backend güncellemesi başarısız olursa, değişikliği geri al
        setFormData(prev => ({
          ...prev,
          subTasks: formData.subTasks // Önceki duruma geri dön
        }));
        toast.error('Alt görev güncellenemedi');
      }
    } catch (error) {
      // Hata durumunda da değişikliği geri al
      setFormData(prev => ({
        ...prev,
        subTasks: formData.subTasks
      }));
      console.error('Alt görev güncellenirken hata:', error);
      toast.error('Alt görev güncellenemedi');
    }
  };

  // Kullanıcı atama/çıkarma
  const handleUserToggle = (user: any) => {
    const currentUsers = formData.assignedUsers || []
    const isAssigned = currentUsers.some(u => u.id === user.id)

    setFormData({
      ...formData,
      assignedUsers: isAssigned
        ? currentUsers.filter(u => u.id !== user.id)
        : [...currentUsers, user]
    })
  }

  // Bağımlı görev seçme
  const handleDependencyToggle = (taskId: string) => {
    setSelectedDependencies(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  // Form gönderme
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const now = new Date().toISOString();

      // Form verilerini hazırla
      const taskData = {
        ...formData,
        dependencies: selectedDependencies,
        subTasks: formData.subTasks.map(task => ({
          ...task,
          completed: task.completed || false
        })),
        assignedUsers: formData.assignedUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        })),
        attachments: formData.attachments.map(attachment => ({
          id: attachment.id,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          fileType: attachment.fileType,
          uploadDate: attachment.uploadDate
        }))
      };

      if (editTask) {
        await dispatch(updateTask({
          ...taskData,
          id: editTask.id,
          createdAt: editTask.createdAt,
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
          ...taskData,
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

      onClose()
      setFormData(defaultFormData)
    } catch (error) {
      console.error('Error submitting task:', error)
      toast.error('Bir hata oluştu!', {
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
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
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
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
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
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
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
                        value={formData.dueDate.split('T')[0]} // Sadece tarih kısmını al
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
                        value={selectedDependencies}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value)
                          setSelectedDependencies(selected)
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
                      {formData.subTasks.map((subTask, index) => (
                        <div key={subTask.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="checkbox"
                              checked={subTask.completed || false}
                              onChange={(e) => handleSubTaskComplete(index, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span 
                              className={`flex-1 transition-all duration-200 ${
                                subTask.completed ? 'line-through text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              {subTask.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubTask(subTask.id!)}
                            className="text-red-500 hover:text-red-700 ml-2"
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

                  {/* Bağımlı görevler */}
                  <div>
                    <label htmlFor="dependencies" className="block text-sm font-medium text-gray-700 mb-2">
                      Bağımlı Görevler
                    </label>
                    <select
                      id="dependencies"
                      multiple
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={selectedDependencies}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setSelectedDependencies(selected);
                      }}
                    >
                      {tasks.filter(t => t.id !== editTask?.id).map(task => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                    {selectedDependencies.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium text-gray-700">Seçili Bağımlı Görevler:</h4>
                        <ul className="mt-1 space-y-1">
                          {selectedDependencies.map(depId => {
                            const dependentTask = tasks.find(t => t.id === depId);
                            return (
                              <li key={depId} className="text-sm text-gray-600">
                                • {dependentTask?.title || 'Silinmiş görev'}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Atanan kullanıcılar */}
                  <div className="grid grid-cols-2 gap-4">
                    {mockUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.assignedUsers?.some(u => u.id === user.id)}
                          onChange={() => handleUserToggle(user)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label className="flex items-center space-x-2">
                          {user.avatar && (
                            <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
                          )}
                          <span>{user.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Dosya ekleme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ekler
                    </label>
                    <div className="space-y-2">
                      {(formData.attachments || []).map((attachment) => (
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
    </Transition.Root>
  )
}

export default TaskModal
