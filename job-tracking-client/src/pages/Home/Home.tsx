import React, { useState } from "react";
import { motion, useInView } from "framer-motion";
import * as echarts from "echarts";
import ImageCarousel from "../../components/ImageCarousel";

const App: React.FC = () => {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  // Scroll animasyonları için ref'ler
  const featuresRef = React.useRef(null);
  const howToUseRef = React.useRef(null);
  const faqRef = React.useRef(null);

  // useInView hook'ları
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.3 });
  const howToUseInView = useInView(howToUseRef, { once: true, amount: 0.3 });
  const faqInView = useInView(faqRef, { once: true, amount: 0.3 });

  // Animasyon varyantları
  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const handleAccordionClick = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const faqData = [
    {
      question: "MIA İş Yönetim Sistemi nedir?",
      answer:
        "MIA, ekip çalışmasını ve proje yönetimini kolaylaştıran, modern ve kullanıcı dostu bir iş yönetim platformudur. Görev takibi, ekip iletişimi ve performans analizi gibi temel özellikleri tek bir sistemde birleştirir.",
    },
    {
      question: "Sistemin temel özellikleri nelerdir?",
      answer:
        "Görev yönetimi, ekip işbirliği araçları, gerçek zamanlı raporlama, performans analizi, dosya paylaşımı ve takvim yönetimi gibi temel özellikler sunmaktadır.",
    },
    {
      question: "Ekip üyeleri nasıl davet edilir?",
      answer:
        "Ekip yöneticileri, e-posta adresleri üzerinden yeni üyeleri sisteme davet edebilir. Davet edilen üyeler, e-posta üzerinden gelen link ile sisteme kayıt olabilirler.",
    },
    {
      question: "Raporlar nasıl oluşturulur?",
      answer:
        "Sistem otomatik olarak proje ve görev verilerini analiz eder. Yöneticiler, özelleştirilebilir raporlar oluşturabilir ve performans metriklerini takip edebilir.",
    },
  ];

  const howToUseSteps = [
    {
      title: "Hesap Oluşturma",
      description:
        "E-posta adresinizle ücretsiz hesap oluşturun ve sisteme giriş yapın.",
      icon: "fa-user-plus",
    },
    {
      title: "Ekip Oluşturma",
      description: "Ekibinizi oluşturun ve üyeleri davet edin.",
      icon: "fa-users",
    },
    {
      title: "Proje Başlatma",
      description: "Yeni proje oluşturun ve görevleri atayın.",
      icon: "fa-project-diagram",
    },
    {
      title: "İlerleme Takibi",
      description: "Raporlar ve analizlerle projenizi takip edin.",
      icon: "fa-chart-line",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600"
    >
      {/* Hero Section with Carousel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative h-[500px]"
      >
        <ImageCarousel />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-purple-600/80 z-10">
          <div className="container mx-auto px-6 h-full flex items-center">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-2xl text-white"
            >
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-5xl font-bold mb-6"
              >
                MIA İş Yönetim Sistemi
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="text-xl mb-8"
              >
                Projelerinizi ve görevlerinizi kolayca yönetin, ekibinizle
                işbirliği yapın ve verimliliğinizi artırın.
              </motion.p>
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Hemen Başlayın
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div
        ref={featuresRef}
        initial="hidden"
        animate={featuresInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="container mx-auto px-6 py-20"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Task Management Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -10, transition: { duration: 0.2 } }}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all"
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              className="text-blue-500 text-4xl mb-6"
            >
              <i className="fas fa-tasks"></i>
            </motion.div>
            <h3 className="text-2xl font-bold mb-4 text-gray-600">Görev Yönetimi</h3>
            <p className="text-gray-600 mb-6">
              Görevlerinizi oluşturun, düzenleyin ve önceliklendirin. Ekibinizle
              gerçek zamanlı işbirliği yapın.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors !rounded-button whitespace-nowrap"
            >
              Görevlere Git <i className="fas fa-arrow-right ml-2"></i>
            </motion.button>
          </motion.div>

          {/* Team Collaboration Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -10, transition: { duration: 0.2 } }}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all"
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              className="text-indigo-500 text-4xl mb-6"
            >
              <i className="fas fa-users"></i>
            </motion.div>
            <h3 className="text-2xl font-bold mb-4 text-gray-600">Ekip İşbirliği</h3>
            <p className="text-gray-600 mb-6">
              Ekibinizle sorunsuz iletişim kurun, görevleri atayın ve projelerin
              durumunu takip edin.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors !rounded-button whitespace-nowrap"
            >
              Ekibe Git <i className="fas fa-arrow-right ml-2"></i>
            </motion.button>
          </motion.div>

          {/* Reports Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -10, transition: { duration: 0.2 } }}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all"
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              className="text-purple-500 text-4xl mb-6"
            >
              <i className="fas fa-chart-bar"></i>
            </motion.div>
            <h3 className="text-2xl font-bold mb-4 text-gray-600">Raporlar ve Analizler</h3>
            <p className="text-gray-600 mb-6">
              Proje ilerlemesini takip edin, performans metriklerini analiz edin
              ve veri odaklı kararlar alın.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors !rounded-button whitespace-nowrap"
            >
              Raporlara Git <i className="fas fa-arrow-right ml-2"></i>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* How to Use Section */}
      <motion.div
        ref={howToUseRef}
        initial="hidden"
        animate={howToUseInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="bg-white py-20"
      >
        <div className="container mx-auto px-6">
          <motion.h2
            variants={itemVariants}
            className="text-3xl font-bold text-center mb-12 text-gray-600"
          >
            Nasıl Kullanılır?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howToUseSteps.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                className="text-center text-gray-600"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4"
                >
                  <i className={`fas ${step.icon} text-blue-500 text-2xl`}></i>
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        ref={faqRef}
        initial="hidden"
        animate={faqInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="container mx-auto px-6 py-20"
      >
        <motion.h2
          variants={itemVariants}
          className="text-3xl font-bold text-center mb-12 text-gray-600"
        >
          Sıkça Sorulan Sorular
        </motion.h2>
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto">
          {faqData.map((faq, index) => (
            <motion.div
              key={index}
              className="mb-4"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <motion.button
                className="w-full bg-white p-4 rounded-lg shadow-md flex justify-between items-center hover:bg-gray-50 transition-colors !rounded-button whitespace-nowrap text-gray-600"
                onClick={() => handleAccordionClick(index)}
                whileTap={{ scale: 0.98 }}
              >
                <span className="font-semibold text-left">{faq.question}</span>
                <motion.i
                  animate={{ rotate: activeAccordion === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className={`fas fa-chevron-down text-blue-500`}
                ></motion.i>
              </motion.button>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: activeAccordion === index ? "auto" : 0,
                  opacity: activeAccordion === index ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-white mt-2 p-4 rounded-lg shadow-md">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Footer */}
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
              &copy; 2025 MIA İş Yönetim Sistemi. Tüm hakları saklıdır.
            </p>
          </motion.div>
        </div>
      </motion.footer>
    </motion.div>
  );
};

export default App;
