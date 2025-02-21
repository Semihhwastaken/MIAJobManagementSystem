import React from "react";
import { motion } from "framer-motion";

const Footer: React.FC = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="bg-gray-900 text-white py-12"
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <motion.div whileHover={{ scale: 1.05 }}>
            <h4 className="text-xl font-bold mb-4">MIA</h4>
            <p className="text-gray-400">
              Modern ve etkili iş yönetim çözümü
            </p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }}>
            <h4 className="text-xl font-bold mb-4">İletişim</h4>
            <p className="text-gray-400">info@mia.com</p>
            <p className="text-gray-400">+90 212 555 0000</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }}>
            <h4 className="text-xl font-bold mb-4">Sosyal Medya</h4>
            <div className="flex space-x-4">
              <motion.a
                whileHover={{ scale: 1.2, color: "#1DA1F2" }}
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <i className="fab fa-twitter"></i>
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.2, color: "#0077B5" }}
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <i className="fab fa-linkedin"></i>
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.2, color: "#E4405F" }}
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <i className="fab fa-instagram"></i>
              </motion.a>
            </div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }}>
            <h4 className="text-xl font-bold mb-4">Adres</h4>
            <p className="text-gray-400">Levent Mahallesi</p>
            <p className="text-gray-400">Büyükdere Caddesi No: 123</p>
            <p className="text-gray-400">İstanbul, Türkiye</p>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-t border-gray-800 mt-8 pt-8 text-center"
        >
          <p className="text-gray-400">
            &copy; {new Date().getFullYear()} MIA İş Yönetim Sistemi. Tüm hakları saklıdır.
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
};

export default Footer;
