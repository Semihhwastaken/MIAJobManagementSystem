// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import axiosInstance from "../../services/axiosInstance";
import { Feedback } from '../../types/feedback';
import { Rating } from "@mui/material";
import FeedbackForm from "../../components/Feedback/FeedbackForm";
import { getInitials } from '../../utils/helper';

const App: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentTestimonial, setCurrentTestimonial] = useState(0);
    const navigate = useNavigate();

    const handleLogin = () => {
        navigate("/login");
    };

    const handleStartFreeTrial = () => {
        navigate("/login");
    };

    const [publicFeedbacks, setPublicFeedbacks] = useState<Feedback[]>([]);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                const response = await axiosInstance.get('/feedback/public');
                setPublicFeedbacks(response.data);
            } catch (error) {
                console.error('Error fetching feedbacks:', error);
            }
        };

        fetchFeedbacks();
    }, []);

    // Otomatik slider için useEffect
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTestimonial((prev) => (prev + 1) % publicFeedbacks.length);
        }, 5000); // Her 5 saniyede bir değişecek

        return () => clearInterval(timer);
    }, [publicFeedbacks.length]);
    
    const nextTestimonial = () => {
        setCurrentTestimonial((prev) => (prev + 1) % publicFeedbacks.length);
    };

    const prevTestimonial = () => {
        setCurrentTestimonial((prev) =>
            prev === 0 ? publicFeedbacks.length - 1 : prev - 1
        );
    };

    // Scroll animasyonları için ref'ler
    const featuresRef = React.useRef(null);
    const pricingRef = React.useRef(null);
    const testimonialsRef = React.useRef(null);
    const contactRef = React.useRef(null);

    // useInView hook'ları
    const featuresInView = useInView(featuresRef, { once: true, amount: 0.3 });
    const pricingInView = useInView(pricingRef, { once: true, amount: 0.3 });
    const testimonialsInView = useInView(testimonialsRef, { once: true, amount: 0.3 });
    const contactInView = useInView(contactRef, { once: true, amount: 0.3 });

    // Animasyon varyantları
    const containerVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4 },
        },
    };

    // Logo animasyonu için
    const logoVariants = {
        initial: { scale: 1 },
        hover: {
            scale: 1.05,
            transition: {
                duration: 0.2,
                yoyo: Infinity
            }
        }
    };

    // Buton animasyonları için
    const buttonVariants = {
        initial: { scale: 1 },
        hover: {
            scale: 1.05,
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
        },
        tap: { scale: 0.95 }
    };

    // Testimonials section içinde
    const formattedTestimonials = publicFeedbacks.map(item => ({
        name: item.userName,
        role: item.userRole,
        content: item.content,
        avatar: item.userAvatar || getInitials(item.userName),
        rating: item.rating,
        isInitials: !item.userAvatar,
        adminResponse: item.adminResponse // Ekle
    }));

    useEffect(() => {
        if (formattedTestimonials.length > 0) {
            setCurrentTestimonial(0);
        }
    }, [formattedTestimonials.length]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-white"
        >

            {/* Navigation */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="bg-white fixed w-full z-50 shadow-sm"
            >
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center h-20">
                        <motion.div
                            className="flex items-center space-x-3"
                            variants={logoVariants}
                            initial="initial"
                            whileHover="hover"
                        >
                            <motion.button
                                onClick={() => navigate("/auth")}
                                className="flex items-center space-x-2"
                            >
                                <motion.i
                                    className="fas fa-tasks text-indigo-600 text-2xl"
                                    animate={{
                                        rotate: [0, 10, -10, 0],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                                <motion.span
                                    className="text-2xl font-bold text-gray-900"
                                    animate={{
                                        color: ["#1F2937", "#4F46E5", "#1F2937"],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    TaskFlow
                                </motion.span>
                            </motion.button>
                        </motion.div>

                        <div className="hidden md:flex items-center space-x-8">
                            <a
                                href="#features"
                                className="text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                                Özellikler
                            </a>
                            <a
                                href="#pricing"
                                className="text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                                Hizmetler
                            </a>
                            <a
                                href="#testimonials"
                                className="text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                                İletişim
                            </a>
                        </div>

                        <div className="hidden md:flex items-center space-x-4">
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                onClick={handleLogin}
                                className="!rounded-button text-gray-600 hover:text-indigo-600 transition-colors px-4 py-2 relative overflow-hidden group"
                            >
                                <motion.span
                                    className="absolute inset-0 bg-indigo-100 transform translate-y-full transition-transform group-hover:translate-y-0"
                                    style={{ zIndex: -1 }}
                                    transition={{ duration: 0.3 }}
                                />
                                Giriş Yap
                            </motion.button>
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                onClick={handleStartFreeTrial}
                                className="!rounded-button bg-indigo-600 text-white px-6 py-2 hover:bg-indigo-700 transition-colors relative overflow-hidden group"
                            >
                                <motion.span
                                    className="absolute inset-0 bg-indigo-700 transform translate-y-full transition-transform group-hover:translate-y-0"
                                    style={{ zIndex: -1 }}
                                    transition={{ duration: 0.3 }}
                                />
                                Ücretsiz Deneme Başlat
                            </motion.button>
                        </div>

                        <button
                            className="md:hidden text-gray-600"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <i className="fas fa-bars text-2xl"></i>
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "tween", duration: 0.3 }}
                        className="md:hidden fixed inset-0 z-40 bg-white pt-20"
                    >
                        <div className="p-4 space-y-4">
                            <a
                                href="#features"
                                className="block text-gray-600 hover:text-indigo-600 py-2"
                            >
                                Özellikler
                            </a>
                            <a
                                href="#pricing"
                                className="block text-gray-600 hover:text-indigo-600 py-2"
                            >
                                Hizmetler
                            </a>
                            <a
                                href="#testimonials"
                                className="block text-gray-600 hover:text-indigo-600 py-2"
                            >
                                İletişim
                            </a>
                            <div className="pt-4 space-y-4">
                                <button
                                    onClick={handleLogin}
                                    className="!rounded-button w-full text-gray-600 hover:text-indigo-600 py-2"
                                >
                                    Giriş Yap
                                </button>
                                <button
                                    onClick={handleStartFreeTrial}
                                    className="!rounded-button w-full bg-indigo-600 text-white py-2 hover:bg-indigo-700"
                                >
                                    Ücretsiz Deneme Başlat
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero Section */}
            <div className="relative pt-20 overflow-hidden">
                <motion.div
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 z-0"
                >
                    <img
                        src="https://public.readdy.ai/ai/img_res/9fc5d489b6be5a7e474da53506e159ab.jpg"
                        alt="Hero Background"
                        className="w-full h-full object-cover"
                    />
                </motion.div>
                <div className="max-w-7xl mx-auto px-4 pt-20 pb-32 relative z-10">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                        >
                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
                            >
                                TaskFlow ile Ekibinizin Verimliliğini Artırın
                            </motion.h1>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                className="text-xl text-gray-600 mb-8"
                            >
                                İş akışınızı düzenleyin, işbirliğini artırın ve akıllı görev yönetim platformumuzla daha fazlasını başarın.
                            </motion.p>
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6, duration: 0.5 }}
                                className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
                            >
                                <button
                                    onClick={handleStartFreeTrial}
                                    className="!rounded-button bg-indigo-600 text-white px-8 py-3 text-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Ücretsiz Başlayın
                                </button>
                                <button
                                    onClick={handleLogin}
                                    className="!rounded-button bg-white text-indigo-600 px-8 py-3 text-lg hover:bg-gray-50 transition-colors"
                                >
                                    Demo İzle
                                </button>
                            </motion.div>
                        </motion.div>
                        <div className="relative">
                            <img
                                src="https://public.readdy.ai/ai/img_res/a91631f5b871cfacb346673a569b47fd.jpg"
                                alt="TaskFlow Dashboard"
                                className="rounded-lg shadow-2xl"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <motion.section
                ref={featuresRef}
                initial="hidden"
                animate={featuresInView ? "visible" : "hidden"}
                variants={containerVariants}
                className="py-20 bg-gray-50"
            >
                <div className="max-w-7xl mx-auto px-4">
                    <motion.div variants={itemVariants} className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Görevleri Etkili Bir Şekilde Yönetmek İçin İhtiyacınız Olan Her Şey
                        </h2>
                        <p className="text-xl text-gray-600">
                            İş akışlarını düzenlemenize ve verimliliği artırmanıza yardımcı olan güçlü özellikler
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: "fas fa-chart-line",
                                title: "Gelişmiş Analitik",
                                description:
                                    "Ekip performansı ve proje ilerlemesi hakkında ayrıntılı bilgiler edinin.",
                            },
                            {
                                icon: "fas fa-users",
                                title: "Ekip İşbirliği",
                                description:
                                    "Gerçek zamanlı güncellemeler ve iletişim araçları ile sorunsuz çalışın.",
                            },
                            {
                                icon: "fas fa-clock",
                                title: "Zaman Takibi",
                                description:
                                    "Görevlerde harcanan zamanı izleyin ve ekip verimliliğini artırın.",
                            },
                            {
                                icon: "fas fa-calendar-alt",
                                title: "Akıllı Planlama",
                                description:
                                    "AI destekli öneriler ve takvim entegrasyonu ile görev planlamasını optimize edin.",
                            },
                            {
                                icon: "fas fa-mobile-alt",
                                title: "Mobil Erişim",
                                description:
                                    "iOS ve Android için güçlü mobil uygulamalarımızla hareket halindeyken üretken kalın.",
                            },
                            {
                                icon: "fas fa-shield-alt",
                                title: "Kurumsal Güvenlik",
                                description:
                                    "Verilerinizi kurumsal düzeyde güvenlik ve uyumluluk özellikleri ile koruyun.",
                            },
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                className="bg-white p-8 rounded-lg shadow-lg hover:shadow-md transition-shadow"
                            >
                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
                                    <i
                                        className={`${feature.icon} text-indigo-600 text-xl`}
                                    ></i>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Pricing Section */}
            <motion.section
                ref={pricingRef}
                initial="hidden"
                animate={pricingInView ? "visible" : "hidden"}
                variants={containerVariants}
                className="py-20 bg-white"
            >
                <div className="max-w-7xl mx-auto px-4">
                    <motion.div variants={itemVariants} className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Basit, Şeffaf Fiyatlandırma
                        </h2>
                        <p className="text-xl text-gray-600">
                            Size en uygun planı seçin
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Ücretsiz",
                                price: "$0",
                                features: [
                                    "5 kullanıcıya kadar",
                                    "Sınırsız görev",
                                    "Temel raporlama",
                                ],
                            },
                            {
                                title: "Pro",
                                price: "$9.99",
                                features: [
                                    "10 kullanıcıya kadar",
                                    "Sınırsız görev",
                                    "Gelişmiş raporlama",
                                    "Özel iş akışları",
                                ],
                            },
                            {
                                title: "Kurumsal",
                                price: "Özel",
                                features: [
                                    "Sınırsız kullanıcı",
                                    "Sınırsız görev",
                                    "Gelişmiş raporlama",
                                    "Özel iş akışları",
                                    "Özel destek",
                                ],
                            },
                        ].map((plan, index) => (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                className="bg-white p-6 rounded-lg shadow-lg border"
                            >
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    {plan.title}
                                </h3>
                                <p className="text-3xl font-bold text-gray-900 mb-4">
                                    {plan.price}
                                </p>
                                <ul className="space-y-2">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="text-gray-600">
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Testimonials Section */}
            <motion.section
                ref={testimonialsRef}
                initial="hidden"
                animate={testimonialsInView ? "visible" : "hidden"}
                variants={containerVariants}
                id="testimonials"
                className="py-20 bg-gray-50"
            >
                <div className="max-w-7xl mx-auto px-4">
                    <motion.div variants={itemVariants} className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Müşterilerimiz Ne Diyor
                        </h2>
                        <p className="text-xl text-gray-600">
                            Sadece bizim sözümüze güvenmeyin - memnun müşterilerimizin söylediklerini dinleyin
                        </p>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="relative max-w-3xl mx-auto"
                    >
                        <AnimatePresence mode="wait">
                            {formattedTestimonials.length > 0 && (
                                <motion.div
                                    key={currentTestimonial}
                                    initial={{ opacity: 0, x: 100 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ duration: 0.5 }}
                                    className="bg-white rounded-lg shadow-lg p-8"
                                >
                                    <div className="flex items-center mb-6">
                                        {formattedTestimonials[currentTestimonial].isInitials ? (
                                            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                                                {formattedTestimonials[currentTestimonial].avatar}
                                            </div>
                                        ) : (
                                            <img
                                                src={formattedTestimonials[currentTestimonial].avatar}
                                                alt={formattedTestimonials[currentTestimonial].name}
                                                className="w-16 h-16 rounded-full object-cover"
                                            />
                                        )}
                                        <div className="ml-4">
                                            <h3 className="text-xl font-semibold text-gray-900">
                                                {formattedTestimonials[currentTestimonial].name}
                                            </h3>
                                            <p className="text-gray-600">
                                                {formattedTestimonials[currentTestimonial].role}
                                            </p>
                                            {formattedTestimonials[currentTestimonial].rating && (
                                                <div className="mt-1">
                                                    <Rating 
                                                        value={formattedTestimonials[currentTestimonial].rating} 
                                                        readOnly 
                                                        size="small"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {formattedTestimonials[currentTestimonial].content && (
                                        <p className="text-gray-600 text-lg italic mb-4">
                                            "{formattedTestimonials[currentTestimonial].content}"
                                        </p>
                                    )}
                                    {formattedTestimonials[currentTestimonial].adminResponse && (
                                        <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                                            <p className="text-sm text-indigo-600 font-medium mb-2">Yanıt:</p>
                                            <p className="text-gray-700">
                                                "{formattedTestimonials[currentTestimonial].adminResponse}"
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-between items-center mt-6">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={prevTestimonial}
                                className="bg-indigo-600 text-white p-2 rounded-full shadow-lg"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 19l-7-7 7-7"
                                    />
                                </svg>
                            </motion.button>

                            <div className="flex space-x-2">
                                {formattedTestimonials.map((_, index) => (
                                    <motion.button
                                        key={index}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() =>
                                            setCurrentTestimonial(index)
                                        }
                                        className={`w-3 h-3 rounded-full ${currentTestimonial === index
                                            ? "bg-indigo-600"
                                            : "bg-gray-300"
                                            }`}
                                    />
                                ))}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={nextTestimonial}
                                className="bg-indigo-600 text-white p-2 rounded-full shadow-lg"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* Contact Section */}
            <motion.section
                ref={contactRef}
                initial="hidden"
                animate={contactInView ? "visible" : "hidden"}
                variants={containerVariants}
                className="py-20 bg-white"
            >
                <div className="max-w-7xl mx-auto px-4">
                    <motion.div variants={itemVariants} className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            İletişime Geçin
                        </h2>
                        <p className="text-xl text-gray-600">
                            Sizden haber almak isteriz
                        </p>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="bg-white rounded-lg shadow-lg p-8">
                            <FeedbackForm />
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* CTA Section */}
            <section className="bg-indigo-600 py-20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-6">
                        Ekibinizin Verimliliğini Artırmaya Hazır mısınız?
                    </h2>
                    <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
                        TaskFlow ile iş akışlarını iyileştiren binlerce ekibe katılın
                    </p>
                    <button
                        onClick={handleStartFreeTrial}
                        className="!rounded-button bg-white text-indigo-600 px-8 py-3 text-lg hover:bg-gray-50 transition-colors"
                    >
                        Ücretsiz Denemenizi Başlatın
                    </button>
                </div>
            </section>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="bg-gray-900 text-white py-12"
            >
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center space-x-3 mb-6">
                                <i className="fas fa-tasks text-indigo-400 text-2xl"></i>
                                <span className="text-2xl font-bold text-white">
                                    TaskFlow
                                </span>
                            </div>
                            <p className="text-gray-400">
                                Akıllı görev yönetimi ile ekiplerin daha fazlasını başarmasını sağlıyoruz.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Ürün
                            </h3>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Özellikler
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Fiyatlandırma
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Güvenlik
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Kurumsal
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Şirket
                            </h3>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Hakkımızda
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Kariyer
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Blog
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        İletişim
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Bağlantılar
                            </h3>
                            <div className="flex space-x-4">
                                <a
                                    href="#"
                                    className="hover:text-white transition-colors"
                                >
                                    <i className="fab fa-twitter text-xl"></i>
                                </a>
                                <a
                                    href="#"
                                    className="hover:text-white transition-colors"
                                >
                                    <i className="fab fa-linkedin text-xl"></i>
                                </a>
                                <a
                                    href="#"
                                    className="hover:text-white transition-colors"
                                >
                                    <i className="fab fa-github text-xl"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 TaskFlow. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default App;
