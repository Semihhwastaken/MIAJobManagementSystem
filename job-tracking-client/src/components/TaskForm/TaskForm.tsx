import React, { useState, useEffect } from 'react';
import { Task, User, SubTask, Attachment } from '../../types/task';
import { Team, TeamMember } from '../../types/team';
import teamService from '../../services/teamService';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'>) => void;
  existingTasks?: Task[];
  task?: Task; // Düzenlenecek görev
}

const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, onSave, existingTasks = [], task }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    dueDate: task?.dueDate || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo',
    category: task?.category || 'Personal',
    assignedUsers: task?.assignedUsers || [] as TeamMember[],
    subTasks: task?.subTasks || [] as SubTask[],
    dependencies: task?.dependencies || [] as string[],
    attachments: task?.attachments || [] as Attachment[]
  });

  const [newSubTask, setNewSubTask] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [users, setUsers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        category: task.category,
        assignedUsers: task.assignedUsers,
        subTasks: task.subTasks,
        dependencies: task.dependencies,
        attachments: task.attachments
      });
    }
  }, [task]);

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
        // toast.error('Ekipler yüklenirken bir hata oluştu');
      }
    };

    fetchTeams();
  }, []);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (selectedTeam) {
        try {
          const members = await teamService.getTeamMembers(selectedTeam.id);
          setUsers(members);
        } catch (error) {
          console.error('Error fetching team members:', error);
          // toast.error('Ekip üyeleri yüklenirken bir hata oluştu');
        }
      }
    };

    fetchTeamMembers();
  }, [selectedTeam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    onClose();
  };

  const handleAddSubTask = () => {
    if (newSubTask.trim()) {
      setFormData({
        ...formData,
        subTasks: [
          ...formData.subTasks,
          { title: newSubTask.trim(), completed: false }
        ]
      });
      setNewSubTask('');
    }
  };

  const handleRemoveSubTask = (index: number) => {
    setFormData({
      ...formData,
      subTasks: formData.subTasks.filter((_, i) => i !== index)
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Normalde burada bir API'ye dosya yüklenip URL alınır
      const mockFileUrl = URL.createObjectURL(file);
      setFormData({
        ...formData,
        attachments: [
          ...formData.attachments,
          {
            fileName: file.name,
            fileUrl: mockFileUrl,
            fileType: file.type,
            uploadDate: new Date().toISOString()
          }
        ]
      });
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index)
    });
  };

  const handleUserToggle = (user: TeamMember) => {
    const isSelected = formData.assignedUsers.some(u => u.id === user.id);
    setFormData({
      ...formData,
      assignedUsers: isSelected
        ? formData.assignedUsers.filter(u => u.id !== user.id)
        : [...formData.assignedUsers, user]
    });
  };

  const handleDependencyToggle = (taskId: string) => {
    const isSelected = formData.dependencies.includes(taskId);
    setFormData({
      ...formData,
      dependencies: isSelected
        ? formData.dependencies.filter(id => id !== taskId)
        : [...formData.dependencies, taskId]
    });
  };

  const handleRemoveUser = (userId: string) => {
    setFormData({
      ...formData,
      assignedUsers: formData.assignedUsers.filter(user => user.id !== userId)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Yeni Görev Oluştur</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Temel Bilgiler */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Öncelik
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="Personal">Kişisel</option>
              <option value="Work">İş</option>
              <option value="Shopping">Alışveriş</option>
              <option value="Health">Sağlık</option>
            </select>
          </div>

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

          {/* Alt Görevler */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alt Görevler
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                placeholder="Alt görev ekle..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
              <button
                type="button"
                onClick={handleAddSubTask}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Ekle
              </button>
            </div>
            <div className="space-y-2">
              {formData.subTasks.map((subTask, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-900">{subTask.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubTask(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Kişi Atama */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <XCircleIcon className="w-4 h-4" />
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
                    as={React.Fragment}
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

          {/* Bağımlı Görevler */}
          {existingTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bağımlı Görevler
              </label>
              <div className="space-y-2">
                {existingTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer ${formData.dependencies.includes(task.id || '')
                      ? 'bg-indigo-50'
                      : 'hover:bg-gray-50'
                      }`}
                    onClick={() => task.id && handleDependencyToggle(task.id)}
                  >
                    <span className="text-gray-900">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dosya Yükleme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dosya Ekle
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full text-gray-900"
            />
            <div className="mt-2 space-y-2">
              {formData.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-900">{attachment.fileName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
