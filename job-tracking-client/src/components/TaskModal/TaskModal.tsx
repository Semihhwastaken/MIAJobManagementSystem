import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
<<<<<<< HEAD
import { Task, User, SubTask } from '../../types/task'
=======
import { Task, SubTask } from '../../types/task'
>>>>>>> newdb1
import { Team, TeamMember } from '../../types/team'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { updateTask, createTask } from '../../redux/features/tasksSlice'
import teamService from '../../services/teamService'
import toast from 'react-hot-toast'
import { PlusIcon, XMarkIcon, PaperClipIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline'
<<<<<<< HEAD
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
=======
import { Listbox } from '@headlessui/react'
>>>>>>> newdb1

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
    category: 'general', // Varsayılan kategori eklendi
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [users, setUsers] = useState<TeamMember[]>([]);

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

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const myTeams = await teamService.getMyTeams();
        setTeams(myTeams);
        if (myTeams.length > 0) {
          setSelectedTeam(myTeams[0]);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
        toast.error('Ekipler yüklenirken bir hata oluştu');
      }
    };

    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (selectedTeam) {
        try {
          const members = await teamService.getTeamMembers(selectedTeam.id);
          setUsers(members);
        } catch (error) {
          console.error('Error fetching team members:', error);
          toast.error('Ekip üyeleri yüklenirken bir hata oluştu');
        }
      }
    };

    if (isOpen && selectedTeam) {
      fetchTeamMembers();
    }
  }, [isOpen, selectedTeam]);

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

  // Seçili kullanıcıları kaldırma fonksiyonu
  const handleRemoveUser = (userId: string) => {
    setFormData({
      ...formData,
      assignedUsers: formData.assignedUsers.filter(user => user.id !== userId)
    });
  };

  // Form gönderme
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const now = new Date().toISOString()

    try {
      const taskData = {
        ...formData,
        subTasks: formData.subTasks.map(task => ({
          id: task.id,
          title: task.title,
          completed: task.completed
        })),
        assignedUsers: formData.assignedUsers.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          department: user.department,
          title: user.title,
          position: user.position,
          profileImage: user.profileImage
        })),
        attachments: formData.attachments.map(attachment => ({
          id: attachment.id,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          fileType: attachment.fileType,
          uploadDate: attachment.uploadDate
        })),
        dependencies: selectedDependencies
      }

      if (editTask) {
        await dispatch(updateTask({
          ...taskData,
          id: editTask.id,
          createdAt: editTask.createdAt,
          updatedAt: now
        })).unwrap()
        toast.success('Görev başarıyla güncellendi!', {
          duration: 3000,
          position: 'bottom-right'
        })
      } else {
        await dispatch(createTask({
          ...taskData,
          createdAt: now,
          updatedAt: now
        })).unwrap()
        toast.success('Görev başarıyla oluşturuldu!', {
          duration: 3000,
          position: 'bottom-right'
        })
      }
      onClose()
    } catch (error) {
      toast.error('Bir hata oluştu!', {
        duration: 3000,
        position: 'bottom-right'
      })
      console.error('Error:', error)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
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

                  {/* Ekip seçimi */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Ekip Seçin</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={selectedTeam?.id || ''}
                      onChange={(e) => {
                        const team = teams.find(t => t.id === e.target.value);
                        setSelectedTeam(team || null);
                      }}
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Görevli Kişiler */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Görevli Kişiler
                    </label>
                    <div className="space-y-2">
                      {/* Seçili kullanıcılar */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.assignedUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full text-sm"
                          >
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.fullName || user.username}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center">
                                <span className="text-xs text-indigo-600">
                                  {(user.fullName || user.username).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span>{user.fullName || user.username}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(user.id || '')}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <XMarkIcon className="w-4 h-4" />
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
                          <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm">
                            <span className="block truncate text-gray-500">Kullanıcı seç...</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                              {users
                                .filter(user => !formData.assignedUsers.some(u => u.id === user.id))
                                .map((user) => (
                                  <Listbox.Option
                                    key={user.id}
                                    className={({ active }) =>
                                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                                      }`
                                    }
                                    value={user}
                                  >
                                    {({ selected }) => (
                                      <>
                                        <div className="flex items-center">
                                          {user.profileImage ? (
                                            <img
                                              src={user.profileImage}
                                              alt={user.fullName || user.username}
                                              className="w-6 h-6 rounded-full object-cover mr-3"
                                            />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center mr-3">
                                              <span className="text-xs text-indigo-600">
                                                {(user.fullName || user.username).charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                          )}
                                          <span className="block truncate">
                                            {user.fullName || user.username}
                                            {user.department && (
                                              <span className="text-gray-500 text-sm ml-2">
                                                ({user.department})
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                        {selected ? (
                                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                          </span>
                                        ) : null}
                                      </>
                                    )}
                                  </Listbox.Option>
                                ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
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
                              className={`flex-1 transition-all duration-200 ${subTask.completed ? 'line-through text-gray-400' : 'text-gray-900'
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
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
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
    </Transition>
  )
}

export default TaskModal
