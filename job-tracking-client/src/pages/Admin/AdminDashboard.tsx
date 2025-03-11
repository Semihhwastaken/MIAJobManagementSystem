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

const AdminDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching admin stats with token:', token); // Debug log
        
        const response = await axiosInstance.get('/admin/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setStats(response.data);
      } catch (err: any) {
        console.error('Admin dashboard error:', err.response?.data); // Debug log
        setError('Failed to load admin statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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

      {/* Feedback Management Section */}
      <div className="mt-8">
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
