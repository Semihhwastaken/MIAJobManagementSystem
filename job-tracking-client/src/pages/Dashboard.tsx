import React from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  Filler 
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const Dashboard = () => {
  // Mock data for task statistics
  const taskStats = {
    total: 248,
    completed: 182,
    inProgress: 45,
    overdue: 21,
    totalGrowth: '+12%',
    completedGrowth: '+8%',
    inProgressGrowth: '+5%',
    overdueGrowth: '+2%',
  };

  // Mock data for line chart
  const lineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Completed',
        data: [12, 14, 8, 10, 13, 9, 12],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'New Tasks',
        data: [8, 9, 7, 12, 14, 8, 10],
        borderColor: 'rgb(74, 222, 128)',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Mock data for team performance
  const doughnutData = {
    labels: ['Development', 'Design', 'Marketing', 'Research'],
    datasets: [{
      data: [35, 25, 20, 20],
      backgroundColor: [
        'rgb(99, 102, 241)',
        'rgb(74, 222, 128)',
        'rgb(250, 204, 21)',
        'rgb(248, 113, 113)',
      ],
      borderWidth: 0,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
    cutout: '70%',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-8"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Hoşgeldiniz, bugün neler olduğuna bakalım</p>
        </div>
        <div className="flex items-center gap-4">
          <select className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option>Bu Hafta</option>
            <option>Bu Ay</option>
            <option>Bu Yıl</option>
          </select>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors">
            Rapor İndir
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-green-500 text-sm font-medium">{taskStats.totalGrowth}</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mt-4">{taskStats.total}</h3>
          <p className="text-gray-600">Toplam Görev</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-green-500 text-sm font-medium">{taskStats.completedGrowth}</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mt-4">{taskStats.completed}</h3>
          <p className="text-gray-600">Tamamlanan Görevler</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-yellow-500 text-sm font-medium">{taskStats.inProgressGrowth}</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mt-4">{taskStats.inProgress}</h3>
          <p className="text-gray-600">Devam Eden</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-red-500 text-sm font-medium">{taskStats.overdueGrowth}</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mt-4">{taskStats.overdue}</h3>
          <p className="text-gray-600">Geciken Görevler</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Görev İlerlemesi</h3>
          <Line data={lineChartData} options={chartOptions} />
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Ekip Performansı</h3>
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Son Projeler</h3>
            <a href="#" className="text-indigo-600 text-sm hover:text-indigo-700">Tümünü Gör</a>
          </div>
          <div className="space-y-4">
            {/* Project items would go here */}
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Son Aktiviteler</h3>
            <a href="#" className="text-indigo-600 text-sm hover:text-indigo-700">Tümünü Gör</a>
          </div>
          <div className="space-y-4">
            {/* Activity items would go here */}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
