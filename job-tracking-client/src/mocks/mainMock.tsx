// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.

<<<<<<< HEAD
import React, { useState, useEffect } from "react";
=======
import React, { useState  } from "react";
>>>>>>> newdb1
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";

const App: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="bg-white fixed w-full z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center space-x-3">
                            <i className="fas fa-tasks text-indigo-600 text-2xl"></i>
                            <span className="text-2xl font-bold text-gray-900">TaskFlow</span>
                        </div>

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
                            <button className="!rounded-button text-gray-600 hover:text-indigo-600 transition-colors px-4 py-2">
                                Log in
                            </button>
                            <button className="!rounded-button bg-indigo-600 text-white px-6 py-2 hover:bg-indigo-700 transition-colors">
                                Start Free Trial
                            </button>
                        </div>

                        <button
                            className="md:hidden text-gray-600"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <i className="fas fa-bars text-2xl"></i>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-white pt-20">
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
                            <button className="!rounded-button w-full text-gray-600 hover:text-indigo-600 py-2">
                                Log in
                            </button>
                            <button className="!rounded-button w-full bg-indigo-600 text-white py-2 hover:bg-indigo-700">
                                Start Free Trial
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <div className="relative pt-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://public.readdy.ai/ai/img_res/9fc5d489b6be5a7e474da53506e159ab.jpg"
                        alt="Hero Background"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="max-w-7xl mx-auto px-4 pt-20 pb-32 relative z-10">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                Transform Your Team's Productivity with TaskFlow
                            </h1>
                            <p className="text-xl text-gray-600 mb-8">
                                Streamline your workflow, enhance collaboration, and achieve
                                more with our intelligent task management platform.
                            </p>
                            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                                <button className="!rounded-button bg-indigo-600 text-white px-8 py-3 text-lg hover:bg-indigo-700 transition-colors">
                                    Get Started Free
                                </button>
                                <button className="!rounded-button bg-white text-indigo-600 px-8 py-3 text-lg hover:bg-gray-50 transition-colors">
                                    Watch Demo
                                </button>
                            </div>
                        </div>
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
            <section id="features" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Everything you need to manage tasks effectively
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Powerful features that help you streamline workflows and boost
                            productivity
                        </p>
                    </div>

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
                            <div
                                key={index}
                                className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
                                    <i className={`${feature.icon} text-indigo-600 text-xl`}></i>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Trusted by thousands of teams worldwide
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            See what our customers have to say about TaskFlow
                        </p>
                    </div>

                    <Swiper
                        modules={[Pagination, Autoplay]}
                        spaceBetween={30}
                        slidesPerView={1}
                        pagination={{ clickable: true }}
                        autoplay={{ delay: 5000 }}
                        breakpoints={{
                            640: {
                                slidesPerView: 2,
                            },
                            1024: {
                                slidesPerView: 3,
                            },
                        }}
                        className="pb-12"
                    >
                        {testimonials.map((testimonial, index) => (
                            <SwiperSlide key={index}>
                                <div className="bg-gray-50 p-8 rounded-lg h-full">
                                    <div className="flex items-center mb-6">
                                        <img
                                            src={testimonial.avatar}
                                            alt={testimonial.name}
                                            className="w-12 h-12 rounded-full mr-4"
                                        />
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900">
                                                {testimonial.name}
                                            </h4>
                                            <p className="text-gray-600">{testimonial.role}</p>
                                        </div>
                                    </div>
                                    <p className="text-gray-600">{testimonial.content}</p>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-indigo-600 py-20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-6">
                        Ready to transform your team's productivity?
                    </h2>
                    <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
                        Join thousands of teams who have already improved their workflow
                        with TaskFlow
                    </p>
                    <button className="!rounded-button bg-white text-indigo-600 px-8 py-3 text-lg hover:bg-gray-50 transition-colors">
                        Start Your Free Trial
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center space-x-3 mb-6">
                                <i className="fas fa-tasks text-indigo-400 text-2xl"></i>
                                <span className="text-2xl font-bold text-white">TaskFlow</span>
                            </div>
                            <p className="text-gray-400">
                                Empowering teams to achieve more through intelligent task
                                management.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Product</h3>
                            <ul className="space-y-2">
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Features
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Pricing
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Security
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Enterprise
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Company</h3>
                            <ul className="space-y-2">
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        About
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Careers
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Blog
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Contact
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Connect</h3>
                            <div className="flex space-x-4">
                                <a href="#" className="hover:text-white transition-colors">
                                    <i className="fab fa-twitter text-xl"></i>
                                </a>
                                <a href="#" className="hover:text-white transition-colors">
                                    <i className="fab fa-linkedin text-xl"></i>
                                </a>
                                <a href="#" className="hover:text-white transition-colors">
                                    <i className="fab fa-github text-xl"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 TaskFlow. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
