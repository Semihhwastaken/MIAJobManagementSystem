import React, { useState, useEffect } from 'react';
import * as echarts from 'echarts';
import TaskDetail from '../../components/TaskDetailModal/TaskDetail';
import TaskForm from '../../components/TaskForm/TaskForm';
import { Task } from '../../types/task';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, createTask, updateTask, deleteTask } from '../../redux/features/tasksSlice';
import { RootState, AppDispatch } from '../../redux/store';
import Footer from '../../components/Footer/Footer';

const Tasks: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: tasks, status, error } = useSelector((state: RootState) => state.tasks);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Tasks');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ startDate: string, endDate: string }>({ startDate: '', endDate: '' });
  const [isFilterActive, setIsFilterActive] = useState(false);

  const priorityOrder = {
    'high': 3,
    'medium': 2,
    'low': 1
  };

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTasks());
    }
  }, [status, dispatch]);

  useEffect(() => {
    const chartDom = document.getElementById('taskProgressChart');
    if (chartDom) {
      const myChart = echarts.init(chartDom);
      const option = {
        animation: false,
        tooltip: {
          trigger: 'item'
        },
        series: [
          {
            name: 'Task Status',
            type: 'pie',
            radius: ['60%', '80%'],
            data: [
              { value: tasks.filter(t => t.status === 'todo').length, name: 'To Do' },
              { value: tasks.filter(t => t.status === 'in-progress').length, name: 'In Progress' },
              { value: tasks.filter(t => t.status === 'completed').length, name: 'Completed' }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      };
      myChart.setOption(option);
    }
  }, [tasks]);

  const handleTaskClick = (task: Task) => {
    if (task.id) {
      setSelectedTask(task);
      setIsDetailModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
  };

  const handleEditClick = (task: Task) => {
    if (task.id) {
      setSelectedTask(task);
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateTask = async (updatedTaskData: Omit<Task, 'id'>) => {
    if (selectedTask?.id) {
      try {
        const updatedTask = {
          ...updatedTaskData,
          id: selectedTask.id
        };
        await dispatch(updateTask(updatedTask));
        setIsEditModalOpen(false);
        setSelectedTask(null);
      } catch (error) {
        console.error('Görev güncellenirken hata oluştu:', error);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await dispatch(deleteTask(taskId));
    } catch (error) {
      console.error('Görev silinirken hata oluştu:', error);
    }
  };

  const handleCreateTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      await dispatch(createTask(newTask));
      setIsNewTaskModalOpen(false);
    } catch (error) {
      console.error('Görev oluşturulurken hata oluştu:', error);
    }
  };

  const categories = ['All Tasks', 'Personal', 'Work', 'Shopping', 'Health'];

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Tasks' || task.category === selectedCategory;
    const matchesDateFilter = !isFilterActive || (
      task.dueDate >= dateFilter.startDate &&
      task.dueDate <= dateFilter.endDate
    );
    return matchesSearch && matchesCategory && matchesDateFilter;
  }).sort((a, b) => {
    if (sortByPriority) {
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
    }
    return 0;
  });

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full">Yükleniyor...</div>;
  }

  if (status === 'failed') {
    return <div className="text-red-600">Hata: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600">Track and manage your tasks efficiently</p>
          </div>
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="!rounded-button bg-indigo-600 text-white px-4 py-2 flex items-center space-x-2 hover:bg-indigo-700 transition-colors"
          >
            <i className="fas fa-plus"></i>
            <span>Add New Task</span>
          </button>
        </div>

        {/* Task Management Tools */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSortByPriority(!sortByPriority)}
                className={`!rounded-button flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${sortByPriority ? 'bg-indigo-100 border-indigo-300' : ''}`}
              >
                <i className="fas fa-sort text-gray-600"></i>
                <span className="text-gray-600">Sort</span>
              </button>
              <button
                onClick={() => setIsDateFilterModalOpen(true)}
                className={`!rounded-button flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${isFilterActive ? 'bg-indigo-100 border-indigo-300' : ''}`}
              >
                <i className="fas fa-filter text-gray-600"></i>
                <span className="text-gray-600">Filter</span>
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex space-x-4 mb-6">
            {categories.map((category) => (
              <button
                key={category}
                className={`!rounded-button px-4 py-2 rounded-lg transition-colors ${selectedCategory === category
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanımlama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öncelik</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atanan Kişiler</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Düzenleme</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr 
                    key={task.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.title}</td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">{task.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        task.status === 'todo' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'in-progress' ? 'bg-purple-100 text-purple-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {task.assignedUsers && task.assignedUsers.length > 0 ? (
                          <div className="flex -space-x-2">
                            {task.assignedUsers.map((user, index) => (
                              <div
                                key={index}
                                className="relative inline-flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full ring-2 ring-white"
                                title={user.fullName}
                              >
                                <span className="text-xs font-medium text-white">
                                  {user.fullName?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Atanmamış</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(task);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-2"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(selectedTask?.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onSave={handleCreateTask}
        existingTasks={tasks}
      />

      {/* Edit Task Modal */}
      <TaskForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateTask}
        existingTasks={tasks}
        task={selectedTask || undefined}
      />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
          task={selectedTask}
        />
      )}

      {/* Date Filter Modal */}
      {isDateFilterModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Tarih Aralığı Seçin</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setDateFilter({ startDate: '', endDate: '' });
                    setIsFilterActive(false);
                    setIsDateFilterModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Filtreyi Temizle
                </button>
                <button
                  onClick={() => {
                    if (dateFilter.startDate && dateFilter.endDate) {
                      setIsFilterActive(true);
                      setIsDateFilterModalOpen(false);
                    }
                  }}
                  disabled={!dateFilter.startDate || !dateFilter.endDate}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Uygula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default Tasks;