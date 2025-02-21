import { motion } from 'framer-motion';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, ChartOptions, Filler } from 'chart.js';
import { useTheme } from '../../context/ThemeContext';
import Footer from "../../components/Footer/Footer";

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
  const { isDarkMode } = useTheme();

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

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? '#fff' : '#000',
          font: {
            size: 11
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#000',
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#000',
          font: {
            size: 11
          }
        }
      }
    }
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? '#fff' : '#000',
          font: {
            size: 11
          }
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>Dashboard</h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Hoşgeldiniz, bugün neler olduğuna bakalım</p>
        </div>
        <div className="flex items-center gap-4">
          <select className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white`}>
            <option>Bu Hafta</option>
            <option>Bu Ay</option>
            <option>Bu Yıl</option>
          </select>
          <button className={`bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg`}>
            Rapor İndir
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Toplam Görev</p>
              <h3 className="text-2xl font-bold mt-1">{taskStats.total}</h3>
            </div>
            <span className="text-green-500">{taskStats.totalGrowth}</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tamamlanan</p>
              <h3 className="text-2xl font-bold mt-1">{taskStats.completed}</h3>
            </div>
            <span className="text-green-500">{taskStats.completedGrowth}</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Devam Eden</p>
              <h3 className="text-2xl font-bold mt-1">{taskStats.inProgress}</h3>
            </div>
            <span className="text-yellow-500">{taskStats.inProgressGrowth}</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Geciken</p>
              <h3 className="text-2xl font-bold mt-1">{taskStats.overdue}</h3>
            </div>
            <span className="text-red-500">{taskStats.overdueGrowth}</span>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Task Progress Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Görev İlerlemesi
          </h2>
          <div className="h-[250px]">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Team Performance Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Ekip Performansı
          </h2>
          <div className="h-[250px]">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </motion.div>
      </div>

      {/* Recent Projects and Activities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Son Projeler
            </h2>
            <button className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'}`}>
              Tümünü Gör
            </button>
          </div>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}>WD</span>
                  </div>
                  <div>
                    <h3 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Web Design Project</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>2 gün önce güncellendi</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full ${isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                  }`}>
                  Aktif
                </span>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`}>MD</span>
                  </div>
                  <div>
                    <h3 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Mobile Development</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>5 gün önce güncellendi</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full ${isDarkMode ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                  Devam Ediyor
                </span>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
                    <span className={`font-medium ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>UI</span>
                  </div>
                  <div>
                    <h3 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>UI/UX Design System</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>1 hafta önce güncellendi</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full ${isDarkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'
                  }`}>
                  Gecikmiş
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Son Aktiviteler
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map((_, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-800'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                    <p className="font-medium">Görev #{index + 1} güncellendi</p>
                  </div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>2 saat önce</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <Footer />
    </motion.div>
  );
};

export default Dashboard;
