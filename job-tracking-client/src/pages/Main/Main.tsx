// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";

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

    // Otomatik slider için useEffect
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000); // Her 5 saniyede bir değişecek

        return () => clearInterval(timer);
    }, []);

    const testimonials = [
        {
            name: "Alexandra Thompson",
            role: "Product Manager at TechCorp",
            content:
                "TaskFlow has revolutionized how our team manages projects. The intuitive interface and powerful features have increased our productivity by 40%.",
            avatar:
                "https://public.readdy.ai/ai/img_res/af8c60391f533d6308a6699a66e9b389.jpg",
        },
        {
            name: "Richard Martinez",
            role: "CEO of InnovateLabs",
            content:
                "Since implementing TaskFlow, our team collaboration has improved significantly. It's become an essential part of our daily operations.",
            avatar:
                "https://public.readdy.ai/ai/img_res/e67ec462b09ef04d398ff2b99ecd21a6.jpg",
        },
        {
            name: "Jennifer Chen",
            role: "Team Lead at DesignPro",
            content:
                "The analytics and reporting features in TaskFlow provide invaluable insights into our team's performance and project progress.",
            avatar:
                "https://public.readdy.ai/ai/img_res/9b56331dae804e5efdeaaf3974cd45fe.jpg",
        },
        {
            name: "Michael Brown",
            role: "CTO at FutureTech",
            content:
                "TaskFlow's integration capabilities have streamlined our development process. The automation features save us countless hours every week.",
            avatar:
                "https://public.readdy.ai/ai/img_res/d8c9f3a2b1e5f7g6h4i2j8k9l5m3n1.jpg",
        },
        {
            name: "Sarah Wilson",
            role: "Project Manager at GlobalSoft",
            content:
                "The real-time collaboration features in TaskFlow have made remote work seamless. Our team efficiency has increased by 60%.",
            avatar:
                "https://public.readdy.ai/ai/img_res/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5.jpg",
        },
        {
            name: "David Kim",
            role: "Engineering Lead at InnovateX",
            content:
                "TaskFlow's customizable workflows have transformed how we handle complex projects. The learning curve was minimal, but the impact was immediate.",
            avatar:
                "https://public.readdy.ai/ai/img_res/p9q8r7s6t5u4v3w2x1y0z9a8b7c6d5.jpg",
        },
    ];

    const nextTestimonial = () => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    };

    const prevTestimonial = () => {
        setCurrentTestimonial((prev) =>
            prev === 0 ? testimonials.length - 1 : prev - 1
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
                                Features
                            </a>
                            <a
                                href="#pricing"
                                className="text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                                Pricing
                            </a>
                            <a
                                href="#testimonials"
                                className="text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                                Testimonials
                            </a>
                            <a
                                href="#contact"
                                className="text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                                Contact
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
                                Log in
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
                                Start Free Trial
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
                                Features
                            </a>
                            <a
                                href="#pricing"
                                className="block text-gray-600 hover:text-indigo-600 py-2"
                            >
                                Pricing
                            </a>
                            <a
                                href="#testimonials"
                                className="block text-gray-600 hover:text-indigo-600 py-2"
                            >
                                Testimonials
                            </a>
                            <a
                                href="#contact"
                                className="block text-gray-600 hover:text-indigo-600 py-2"
                            >
                                Contact
                            </a>
                            <div className="pt-4 space-y-4">
                                <button
                                    onClick={handleLogin}
                                    className="!rounded-button w-full text-gray-600 hover:text-indigo-600 py-2"
                                >
                                    Log in
                                </button>
                                <button
                                    onClick={handleStartFreeTrial}
                                    className="!rounded-button w-full bg-indigo-600 text-white py-2 hover:bg-indigo-700"
                                >
                                    Start Free Trial
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
                                Transform Your Team's Productivity with TaskFlow
                            </motion.h1>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                className="text-xl text-gray-600 mb-8"
                            >
                                Streamline your workflow, enhance collaboration, and achieve
                                more with our intelligent task management platform.
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
                                    Get Started Free
                                </button>
                                <button
                                    onClick={handleLogin}
                                    className="!rounded-button bg-white text-indigo-600 px-8 py-3 text-lg hover:bg-gray-50 transition-colors"
                                >
                                    Watch Demo
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
                            Everything you need to manage tasks effectively
                        </h2>
                        <p className="text-xl text-gray-600">
                            Powerful features that help you streamline workflows and boost
                            productivity
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: "fas fa-chart-line",
                                title: "Advanced Analytics",
                                description:
                                    "Get detailed insights into team performance and project progress with comprehensive analytics.",
                            },
                            {
                                icon: "fas fa-users",
                                title: "Team Collaboration",
                                description:
                                    "Work together seamlessly with real-time updates and communication tools.",
                            },
                            {
                                icon: "fas fa-clock",
                                title: "Time Tracking",
                                description:
                                    "Monitor time spent on tasks and improve team efficiency with detailed time analytics.",
                            },
                            {
                                icon: "fas fa-calendar-alt",
                                title: "Smart Scheduling",
                                description:
                                    "Optimize task scheduling with AI-powered recommendations and calendar integration.",
                            },
                            {
                                icon: "fas fa-mobile-alt",
                                title: "Mobile Access",
                                description:
                                    "Stay productive on the go with our powerful mobile apps for iOS and Android.",
                            },
                            {
                                icon: "fas fa-shield-alt",
                                title: "Enterprise Security",
                                description:
                                    "Keep your data safe with enterprise-grade security and compliance features.",
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
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-xl text-gray-600">
                            Choose the plan that works best for you
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Free",
                                price: "$0",
                                features: [
                                    "Up to 5 users",
                                    "Unlimited tasks",
                                    "Basic reporting",
                                ],
                            },
                            {
                                title: "Pro",
                                price: "$9.99",
                                features: [
                                    "Up to 10 users",
                                    "Unlimited tasks",
                                    "Advanced reporting",
                                    "Custom workflows",
                                ],
                            },
                            {
                                title: "Enterprise",
                                price: "Custom",
                                features: [
                                    "Unlimited users",
                                    "Unlimited tasks",
                                    "Advanced reporting",
                                    "Custom workflows",
                                    "Dedicated support",
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
                            What Our Customers Say
                        </h2>
                        <p className="text-xl text-gray-600">
                            Don't just take our word for it - hear from our satisfied
                            customers
                        </p>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="relative max-w-3xl mx-auto"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentTestimonial}
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ duration: 0.5 }}
                                className="bg-white rounded-lg shadow-lg p-8"
                            >
                                <div className="flex items-center mb-6">
                                    <img
                                        src={testimonials[currentTestimonial].avatar}
                                        alt={testimonials[currentTestimonial].name}
                                        className="w-16 h-16 rounded-full object-cover"
                                    />
                                    <div className="ml-4">
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            {testimonials[currentTestimonial].name}
                                        </h3>
                                        <p className="text-gray-600">
                                            {testimonials[currentTestimonial].role}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-gray-600 text-lg italic">
                                    "{testimonials[currentTestimonial].content}"
                                </p>
                            </motion.div>
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
                                {testimonials.map((_, index) => (
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
                            Get in Touch
                        </h2>
                        <p className="text-xl text-gray-600">
                            We'd love to hear from you
                        </p>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="bg-white rounded-lg shadow-lg p-8">
                            {/* Contact form içeriği */}
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* CTA Section */}
            <section className="bg-indigo-600 py-20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-6">
                        Ready to transform your team's productivity?
                    </h2>
                    <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
                        Join thousands of teams who have already improved their
                        workflow with TaskFlow
                    </p>
                    <button
                        onClick={handleStartFreeTrial}
                        className="!rounded-button bg-white text-indigo-600 px-8 py-3 text-lg hover:bg-gray-50 transition-colors"
                    >
                        Start Your Free Trial
                    </button>
                </div>
            </section>

            {/* Footer */}
            <motion.footer
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
                                Empowering teams to achieve more through intelligent
                                task management.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Product
                            </h3>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Features
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Pricing
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Security
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Enterprise
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Company
                            </h3>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        About
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="#"
                                        className="hover:text-white transition-colors"
                                    >
                                        Careers
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
                                        Contact
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Connect
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
                        <p>&copy; 2025 TaskFlow. All rights reserved.</p>
                    </div>
                </div>
            </motion.footer>
        </motion.div>
    );
};

export default App;
