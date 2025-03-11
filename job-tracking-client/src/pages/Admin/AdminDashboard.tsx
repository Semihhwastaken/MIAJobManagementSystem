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
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
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

        setStats(dashboardStats.data);
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
        <div className={`p-6 rounded-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-lg`}>
          <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {stats?.recentActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      </div>

      {/* Task Analysis Section */}
      {taskStats && (
        <div ref={sectionRefs.tasks} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className="text-xl font-semibold mb-4">Task Analysis</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'High', value: taskStats.tasksByPriority.high },
                { name: 'Medium', value: taskStats.tasksByPriority.medium },
                { name: 'Low', value: taskStats.tasksByPriority.low }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4">
              <p>Average Completion Time: {taskStats.averageCompletionTime.toFixed(1)} days</p>
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
  
  return (
    <div className={`p-4 rounded-lg ${
      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{activity.type}</span>
          <p className="text-sm text-gray-500">{activity.description}</p>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(activity.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default AdminDashboard;
