// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.

import React, { useState } from "react";
<<<<<<< HEAD
import * as echarts from "echarts";
=======

>>>>>>> newdb1

const App: React.FC = () => {
    const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Hero Section */}
            <div
                className="relative h-[500px] bg-cover bg-center"
                style={{
                    backgroundImage:
                        'url("https://public.readdy.ai/ai/img_res/44e7c0b75fba05be370e4f2d1268f39f.jpg")',
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-purple-600/90">
                    <div className="container mx-auto px-6 h-full flex items-center">
                        <div className="max-w-2xl text-white">
                            <h1 className="text-5xl font-bold mb-6">
                                MIA İş Yönetim Sistemi
                            </h1>
                            <p className="text-xl mb-8">
                                Projelerinizi ve görevlerinizi kolayca yönetin, ekibinizle
                                işbirliği yapın ve verimliliğinizi artırın.
                            </p>
                            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors !rounded-button whitespace-nowrap">
                                Hemen Başlayın
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="container mx-auto px-6 py-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Task Management Card */}
                    <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="text-blue-500 text-4xl mb-6">
                            <i className="fas fa-tasks"></i>
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Görev Yönetimi</h3>
                        <p className="text-gray-600 mb-6">
                            Görevlerinizi oluşturun, düzenleyin ve önceliklendirin. Ekibinizle
                            gerçek zamanlı işbirliği yapın.
                        </p>
                        <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors !rounded-button whitespace-nowrap">
                            Görevlere Git <i className="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>

                    {/* Team Collaboration Card */}
                    <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="text-indigo-500 text-4xl mb-6">
                            <i className="fas fa-users"></i>
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Ekip İşbirliği</h3>
                        <p className="text-gray-600 mb-6">
                            Ekibinizle sorunsuz iletişim kurun, görevleri atayın ve projelerin
                            durumunu takip edin.
                        </p>
                        <button className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors !rounded-button whitespace-nowrap">
                            Ekibe Git <i className="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>

                    {/* Reports Card */}
                    <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="text-purple-500 text-4xl mb-6">
                            <i className="fas fa-chart-bar"></i>
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Raporlar ve Analizler</h3>
                        <p className="text-gray-600 mb-6">
                            Proje ilerlemesini takip edin, performans metriklerini analiz edin
                            ve veri odaklı kararlar alın.
                        </p>
                        <button className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors !rounded-button whitespace-nowrap">
                            Raporlara Git <i className="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* How to Use Section */}
            <div className="bg-white py-20">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Nasıl Kullanılır?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {howToUseSteps.map((step, index) => (
                            <div key={index} className="text-center">
                                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <i className={`fas ${step.icon} text-blue-500 text-2xl`}></i>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                                <p className="text-gray-600">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="container mx-auto px-6 py-20">
                <h2 className="text-3xl font-bold text-center mb-12">
                    Sıkça Sorulan Sorular
                </h2>
                <div className="max-w-3xl mx-auto">
                    {faqData.map((faq, index) => (
                        <div key={index} className="mb-4">
                            <button
                                className="w-full bg-white p-4 rounded-lg shadow-md flex justify-between items-center hover:bg-gray-50 transition-colors !rounded-button whitespace-nowrap"
                                onClick={() => handleAccordionClick(index)}
                            >
                                <span className="font-semibold text-left">{faq.question}</span>
                                <i
                                    className={`fas fa-chevron-${activeAccordion === index ? "up" : "down"} text-blue-500`}
                                ></i>
                            </button>
                            {activeAccordion === index && (
                                <div className="bg-white mt-2 p-4 rounded-lg shadow-md">
                                    <p className="text-gray-600">{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h4 className="text-xl font-bold mb-4">MIA</h4>
                            <p className="text-gray-400">
                                Modern ve etkili iş yönetim çözümü
                            </p>
                        </div>
                        <div>
                            <h4 className="text-xl font-bold mb-4">İletişim</h4>
                            <p className="text-gray-400">info@mia.com</p>
                            <p className="text-gray-400">+90 212 555 0000</p>
                        </div>
                        <div>
                            <h4 className="text-xl font-bold mb-4">Sosyal Medya</h4>
                            <div className="flex space-x-4">
                                <a
                                    href="#"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <i className="fab fa-twitter"></i>
                                </a>
                                <a
                                    href="#"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <i className="fab fa-linkedin"></i>
                                </a>
                                <a
                                    href="#"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <i className="fab fa-instagram"></i>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xl font-bold mb-4">Adres</h4>
                            <p className="text-gray-400">Levent Mahallesi</p>
                            <p className="text-gray-400">Büyükdere Caddesi No: 123</p>
                            <p className="text-gray-400">İstanbul, Türkiye</p>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center">
                        <p className="text-gray-400">
                            &copy; 2025 MIA İş Yönetim Sistemi. Tüm hakları saklıdır.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
