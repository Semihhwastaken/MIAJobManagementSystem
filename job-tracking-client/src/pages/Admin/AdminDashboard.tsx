/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import axiosInstance from '../../services/axiosInstance';
import FeedbackManagement from '../../components/Admin/Feedback/FeedbackManagement';
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Activity } from '../../types/activity';

interface AdminStats {
  totalUsers: number;
  totalTeams: number;
  totalTasks: number;
  activeUsers: number;
  systemStats: {
    databaseSize: number;
    cacheHitRate: number;
    apiRequests: number;
    errorRate: number;
  } | null; // Make systemStats optional
  recentActivities: Activity[]; // Updated to use Activity type
}

interface TaskStats {
  tasksByStatus: {
    completed: number;
    inProgress: number;
    overdue: number;
  };
  tasksByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  averageCompletionTime: number;
}

interface TeamStats {
  totalTeams: number;
  teamsWithActiveTasks: number;
  averageTeamSize: number;
  teamPerformance: Array<{
    teamId: string;
    teamName: string;
    completionRate: number;
  }>;
}

// Update the SectionRef interface definition
interface SectionRef {
  [key: string]: React.RefObject<HTMLDivElement>;
}

const AdminDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update the refs declaration to use MutableRefObject
  const sectionRefs: SectionRef = {
    stats: React.useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>,
    system: React.useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>,
    tasks: React.useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>,
    teams: React.useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>,
    feedback: React.useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>,
  };

  // Update the scrollToSection function to handle null
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        console.log('Fetching admin stats with token:', token); // Debug log
        
        const [dashboardStats, taskStatsData, teamStatsData] = await Promise.all([
          axiosInstance.get('/admin/dashboard', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          axiosInstance.get('/admin/taskStats', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          axiosInstance.get('/admin/teamStats', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        ]);

        // Transform the activities to match the Activity interface
        const transformedStats = {
          ...dashboardStats.data,
          recentActivities: dashboardStats.data.recentActivities.map(mapResponseToActivity)
        };

        setStats(transformedStats);
        setTaskStats(taskStatsData.data);
        setTeamStats(teamStatsData.data);
      } catch (err: any) {
        console.error('Admin dashboard error:', err.response?.data); // Debug log
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`container mx-auto px-4 py-8 ${
        isDarkMode ? 'text-white' : 'text-gray-800'
      }`}
    >
      {/* Add Navigation Header */}
      <div className="sticky top-0 z-50 bg-opacity-90 backdrop-blur-sm mb-8 -mx-4 px-4 py-4 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => scrollToSection(sectionRefs.stats)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection(sectionRefs.system)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              System
            </button>
            <button
              onClick={() => scrollToSection(sectionRefs.tasks)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => scrollToSection(sectionRefs.teams)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => scrollToSection(sectionRefs.feedback)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              Feedback
            </button>
          </div>
        </div>
      </div>

      {/* Update existing sections with refs */}
      <div ref={sectionRefs.stats} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Stats cards here */}
        <StatCard
          title="Total Users"
          value={stats?.totalUsers}
          icon="👥"
        />
        <StatCard
          title="Total Teams"
          value={stats?.totalTeams}
          icon="🏢"
        />
        <StatCard
          title="Total Tasks"
          value={stats?.totalTasks}
          icon="✓"
        />
        <StatCard
          title="Active Users"
          value={stats?.activeUsers}
          icon="👤"
        />
      </div>

      <div ref={sectionRefs.system} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* System Stats */}
        <div className={`p-6 rounded-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-lg`}>
          <h2 className="text-xl font-semibold mb-4">System Statistics</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { 
                    name: 'Cache Hit Rate', 
                    value: stats?.systemStats?.cacheHitRate ?? 0 
                  },
                  { 
                    name: 'Error Rate', 
                    value: stats?.systemStats?.errorRate ?? 0 
                  },
                  { 
                    name: 'Success Rate', 
                    value: 100 - (stats?.systemStats?.errorRate ?? 0) 
                  }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  '#4F46E5', // Indigo
                  '#EF4444', // Red
                  '#10B981'  // Green
                ].map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm">Database Size</p>
              <p className="text-xl font-bold">
                {((stats?.systemStats?.databaseSize ?? 0) / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm">API Requests</p>
              <p className="text-xl font-bold">{stats?.systemStats?.apiRequests ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <RecentActivitiesSection activities={stats?.recentActivities || []} />
      </div>

      {/* Task Analysis Section */}
      {taskStats && (
        <div ref={sectionRefs.tasks} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Task Status Chart */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className="text-xl font-semibold mb-4">Task Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: taskStats.tasksByStatus.completed },
                    { name: 'In Progress', value: taskStats.tasksByStatus.inProgress },
                    { name: 'Overdue', value: taskStats.tasksByStatus.overdue }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    '#10B981', // Yeşil - Completed
                    '#3B82F6', // Mavi - In Progress
                    '#EF4444'  // Kırmızı - Overdue
                  ].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Task Priority Chart */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className="text-xl font-semibold mb-4">Tasks by Priority</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: 'High', value: taskStats.tasksByPriority.high, color: '#EF4444' },
                  { name: 'Medium', value: taskStats.tasksByPriority.medium, color: '#F59E0B' },
                  { name: 'Low', value: taskStats.tasksByPriority.low, color: '#10B981' }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: isDarkMode ? '#D1D5DB' : '#4B5563' }}
                />
                <YAxis 
                  tick={{ fill: isDarkMode ? '#D1D5DB' : '#4B5563' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1F2937' : 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: isDarkMode ? '#D1D5DB' : '#4B5563' }}
                />
                <Legend 
                  formatter={(value) => <span style={{ color: isDarkMode ? '#D1D5DB' : '#4B5563' }}>{value}</span>}
                />
                <Bar 
                  dataKey="value" 
                  name="Number of Tasks"
                  radius={[4, 4, 0, 0]}
                >
                  {[
                    '#EF4444', // Kırmızı - High
                    '#F59E0B', // Turuncu - Medium
                    '#10B981'  // Yeşil - Low
                  ].map((color, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={color}
                      style={{ filter: 'brightness(1.1)' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span className="text-sm font-medium">High</span>
                </div>
                <p className="text-lg font-bold mt-1">{taskStats.tasksByPriority.high}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm font-medium">Medium</span>
                </div>
                <p className="text-lg font-bold mt-1">{taskStats.tasksByPriority.medium}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm font-medium">Low</span>
                </div>
                <p className="text-lg font-bold mt-1">{taskStats.tasksByPriority.low}</p>
              </div>
            </div>
          </div>

          {/* Task Metrics */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg col-span-2`}>
            <h2 className="text-xl font-semibold mb-4">Task Metrics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-sm">Average Completion Time</p>
                <p className="text-2xl font-bold">{taskStats.averageCompletionTime.toFixed(1)} days</p>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-sm">Total Active Tasks</p>
                <p className="text-2xl font-bold">
                  {taskStats.tasksByStatus.inProgress}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-sm">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {((taskStats.tasksByStatus.completed / 
                    (taskStats.tasksByStatus.completed + 
                     taskStats.tasksByStatus.inProgress + 
                     taskStats.tasksByStatus.overdue)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Performance Section */}
      {teamStats && (
        <div ref={sectionRefs.teams} className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Team Performance</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm">Average Team Size</p>
              <p className="text-2xl font-bold">{teamStats.averageTeamSize.toFixed(1)}</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm">Teams with Active Tasks</p>
              <p className="text-2xl font-bold">{teamStats.teamsWithActiveTasks}</p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm">Total Teams</p>
              <p className="text-2xl font-bold">{teamStats.totalTeams}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamStats.teamPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="teamName" />
              <YAxis />
              <Bar dataKey="completionRate" fill="#82ca9d" name="Completion Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Feedback Management Section */}
      <div ref={sectionRefs.feedback} className="mt-8">
        <FeedbackManagement />
      </div>

    </motion.div>
  );
};

interface StatCardProps {
  title: string;
  value?: number;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-6 rounded-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-lg`}
    >
      <div className="flex items-center">
        <span className="text-3xl mr-4">{icon}</span>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-2xl font-bold">{value || 0}</p>
        </div>
      </div>
    </motion.div>
  );
};

interface ActivityItemProps {
  activity: {
    type: string;
    description: string;
    timestamp: string;
  };
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const { isDarkMode } = useTheme();

  // Aktivite tipine göre renkler ve ikonlar
  const activityStyles = {
    user: {
      icon: 'fas fa-user',
      color: 'text-blue-500',
      bg: isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
    },
    task: {
      icon: 'fas fa-tasks',
      color: 'text-green-500',
      bg: isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
    },
    team: {
      icon: 'fas fa-users',
      color: 'text-purple-500',
      bg: isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
    },
    login: {
      icon: 'fas fa-sign-in-alt',
      color: 'text-yellow-500',
      bg: isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
    },
    system: {
      icon: 'fas fa-cog',
      color: 'text-red-500',
      bg: isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
    }
  };

  const style = activityStyles[activity.type.toLowerCase() as keyof typeof activityStyles] || activityStyles.system;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg ${
        isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'
      } transition-colors duration-200 border border-transparent hover:border-indigo-500/20`}
    >
      <div className="flex items-center space-x-4">
        <div className={`${style.bg} p-3 rounded-lg`}>
          <i className={`${style.icon} ${style.color} text-lg`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              {activity.type}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap ml-4`}>
              {new Date(activity.timestamp).toLocaleString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </span>
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>
            {activity.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// Recent Activities bölümünü güncelle
const RecentActivitiesSection = ({ activities }: { activities: Activity[] }) => {
  const { isDarkMode } = useTheme();
  const [filter, setFilter] = useState<string>('all');

  const filteredActivities = activities.filter(activity => 
    filter === 'all' ? true : activity.type.toLowerCase() === filter
  );

  return (
    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Recent Activities</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-gray-200' 
              : 'bg-white border-gray-300 text-gray-700'
          }`}
        >
          <option value="all">All Activities</option>
          <option value="user">User</option>
          <option value="task">Task</option>
          <option value="team">Team</option>
          <option value="login">Login</option>
          <option value="system">System</option>
        </select>
      </div>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-inbox text-4xl text-gray-400 mb-2"></i>
            <p className="text-gray-500">No activities found</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
};

const mapResponseToActivity = (activity: any): Activity => {
  return {
    id: activity.id,
    type: activity.type.toLowerCase(),
    description: activity.description,
    userId: activity.userId || 'system', // Provide default value if userId is missing
    timestamp: activity.timestamp,
    metadata: activity.metadata || {}
  };
};

export default AdminDashboard;
