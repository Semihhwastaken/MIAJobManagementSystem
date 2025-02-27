// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
// start
import React, { useState, useEffect } from 'react';
import * as echarts from 'echarts';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Completed';
  assignee: {
    name: string;
    avatar: string;
  };
  progress: number;
}

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Design System Implementation',
      description: 'Create a comprehensive design system for our new product platform',
      dueDate: '2025-02-25',
      priority: 'High',
      status: 'In Progress',
      assignee: {
        name: 'Emily Anderson',
        avatar: 'https://public.readdy.ai/ai/img_res/9e2f6f81765e05a5f10aec38f5712f47.jpg'
      },
      progress: 65
    },
    {
      id: '2',
      title: 'User Research Analysis',
      description: 'Analyze recent user research data and create actionable insights',
      dueDate: '2025-02-23',
      priority: 'Medium',
      status: 'To Do',
      assignee: {
        name: 'Michael Chen',
        avatar: 'https://public.readdy.ai/ai/img_res/3fb634f97d9eea39e64486f20714bec2.jpg'
      },
      progress: 20
    },
    {
      id: '3',
      title: 'API Documentation Update',
      description: 'Update API documentation with new endpoints and examples',
      dueDate: '2025-02-28',
      priority: 'Low',
      status: 'Completed',
      assignee: {
        name: 'Sarah Williams',
        avatar: 'https://public.readdy.ai/ai/img_res/3ac39e94d873dbbe25d0fc8039062c92.jpg'
      },
      progress: 100
    }
  ]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Tasks');

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
              { value: 3, name: 'To Do' },
              { value: 5, name: 'In Progress' },
              { value: 2, name: 'Completed' }
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
  }, []);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const categories = ['All Cases', 'Bug', 'Development', 'Documentation', 'Testing', 'Maintenance'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <i className="fas fa-tasks text-indigo-600 text-2xl"></i>
            <span className="text-xl font-semibold text-gray-800">TaskFlow</span>
          </div>
          
          <div className="flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">Dashboard</a>
            <a href="#" className="text-indigo-600 font-medium">Tasks</a>
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">Calendar</a>
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">Reports</a>
          </div>

          <div className="flex items-center space-x-4">
            <button className="relative text-gray-600 hover:text-indigo-600 transition-colors">
              <i className="fas fa-bell text-xl"></i>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">3</span>
            </button>
            <div className="h-8 w-8 rounded-full overflow-hidden">
              <img 
                src="https://public.readdy.ai/ai/img_res/7836fde618ca3c5520eb0a06ba010c83.jpg"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600">Track and manage your tasks efficiently</p>
          </div>
          <button className="!rounded-button bg-indigo-600 text-white px-4 py-2 flex items-center space-x-2 hover:bg-indigo-700 transition-colors">
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="!rounded-button flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <i className="fas fa-sort text-gray-600"></i>
                <span>Sort</span>
              </button>
              <button className="!rounded-button flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <i className="fas fa-filter text-gray-600"></i>
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex space-x-4 mb-6">
            {categories.map((category) => (
              <button
                key={category}
                className={`!rounded-button px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category
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
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded-full border-2 border-gray-300 checked:bg-indigo-600 checked:border-transparent focus:ring-indigo-500"
                      checked={task.status === 'Completed'}
                      onChange={() => {}}
                    />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                      <p className="text-gray-600">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      task.priority === 'High' ? 'bg-red-100 text-red-800' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                    <div className="flex items-center space-x-2">
                      <img
                        src={task.assignee.avatar}
                        alt={task.assignee.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-sm text-gray-600">{task.assignee.name}</span>
                    </div>
                    <div className="w-32">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 rounded-full h-2"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Task Analytics</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64" id="taskProgressChart"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-indigo-900">Total Tasks</h3>
                <p className="text-3xl font-bold text-indigo-600">24</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-green-900">Completed</h3>
                <p className="text-3xl font-bold text-green-600">16</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-yellow-900">In Progress</h3>
                <p className="text-3xl font-bold text-yellow-600">5</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-red-900">Overdue</h3>
                <p className="text-3xl font-bold text-red-600">3</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Slide-in Panel */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end">
          <div className="w-1/3 bg-white h-full p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setSelectedTask(null)}
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedTask.title}</h3>
                <p className="text-gray-600">{selectedTask.description}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-calendar text-gray-400"></i>
                  <span className="text-gray-600">Due: {selectedTask.dueDate}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  selectedTask.priority === 'High' ? 'bg-red-100 text-red-800' :
                  selectedTask.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Progress</h4>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 rounded-full h-2"
                    style={{ width: `${selectedTask.progress}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Assignee</h4>
                <div className="flex items-center space-x-2">
                  <img
                    src={selectedTask.assignee.avatar}
                    alt={selectedTask.assignee.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-gray-600">{selectedTask.assignee.name}</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Comments</h4>
                <div className="space-y-4">
                  <div className="flex space-x-3">
                    <img
                      src="https://public.readdy.ai/ai/img_res/0a3ea672d127f584b4a4d804ae5af38d.jpg"
                      alt="Commenter"
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="text-sm text-gray-800">Great progress on this task! Let me know if you need any help.</p>
                      </div>
                      <span className="text-xs text-gray-500">2 hours ago</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <textarea
                    placeholder="Add a comment..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
// end
