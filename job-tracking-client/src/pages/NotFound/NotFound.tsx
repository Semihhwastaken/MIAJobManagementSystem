import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
        >
          <div className={`text-9xl font-bold ${
            isDarkMode ? 'text-gray-700' : 'text-gray-200'
          }`}>
            404
          </div>
        </motion.div>
        
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 space-y-6"
        >
          <h1 className={`text-3xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Sayfa Bulunamadı
          </h1>
          
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Aradığınız sayfaya ulaşılamıyor.
          </p>

          <div className="flex justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className={`px-6 py-3 rounded-lg font-medium shadow-lg
                ${isDarkMode 
                  ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' 
                  : 'bg-white text-gray-900 hover:bg-gray-50'}`}
            >
              <i className="fas fa-arrow-left mr-2" />
              Geri Git
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg"
            >
              <i className="fas fa-home mr-2" />
              Ana Sayfa
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
