import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const LoadingScreen = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`fixed inset-0 flex items-center justify-center overflow-hidden ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Background Pattern */}
      <div className="absolute inset-0" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${isDarkMode ? '#374151' : '#e5e7eb'} 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating Background Elements */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${isDarkMode ? 'bg-blue-500/10' : 'bg-indigo-600/10'}`}
          style={{
            width: Math.random() * 100 + 50,
            height: Math.random() * 100 + 50,
          }}
          animate={{
            x: [Math.random() * 100, Math.random() * -100],
            y: [Math.random() * 100, Math.random() * -100],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: Math.random() * 5 + 3,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Gradient Overlay */}
      <div className={`absolute inset-0 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900/50 to-transparent' 
          : 'bg-gradient-to-br from-gray-50/50 to-transparent'
      }`} />

      {/* Loading Content */}
      <div className="flex flex-col items-center relative z-10">
        <motion.div
          className="relative w-16 h-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {[1, 2, 3].map((index) => (
            <motion.div
              key={index}
              className={`absolute top-0 left-0 w-full h-full border-4 rounded-full ${
                isDarkMode ? 'border-blue-500' : 'border-indigo-600'
              }`}
              animate={{
                rotate: 360
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
                delay: index * 0.2
              }}
              style={{
                borderTopColor: "transparent",
                borderLeftColor: "transparent",
                scale: 1 - index * 0.2
              }}
            />
          ))}
        </motion.div>
        <motion.p
          className={`mt-4 text-lg font-medium ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Yükleniyor...
        </motion.p>
      </div>
    </div>
  );
};

export default LoadingScreen;
