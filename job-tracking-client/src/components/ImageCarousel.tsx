import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const images = [
  {
    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80',
    title: 'Modern Proje Yönetimi',
    description: 'Ekibinizle birlikte projelerinizi etkili bir şekilde yönetin'
  },
  {
    url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80',
    title: 'Görev Takibi',
    description: 'Görevlerinizi organize edin ve süreçlerinizi optimize edin'
  },
  {
    url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80',
    title: 'Takım İşbirliği',
    description: 'Ekip çalışmasını güçlendirin ve verimliliği artırın'
  },
  {
    url: 'https://businessmap.io/wp-content/uploads/website-images/strategic-execution/project_management_process_stages.png',
    title: 'Proje Sureci',
    description: 'Görevlerinizi organize edin ve süreçlerinizi optimize edin'
  },
  {
    url: 'https://res.cloudinary.com/monday-blogs/fl_lossy,f_auto,q_auto/wp-blog/2020/12/Task_management-3-1.jpg',
    title: 'Task Takibi demosu',
    description: 'Görevlerinizi organize edin ve süreçlerinizi optimize edin'
  },
  {
    url: 'https://www.chanty.com/blog/wp-content/uploads/2017/02/collaboration_benefits.png',
    title: 'Team',
    description: 'Görevlerinizi organize edin ve süreçlerinizi optimize edin'
  },
];

const ImageCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${images[currentIndex].url})` }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ImageCarousel;
