// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.

import React, { useState } from "react";

const App: React.FC = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const [userInfo, setUserInfo] = useState({
        name: "Mehmet Yılmaz",
        title: "Kıdemli Yazılım Geliştirici",
        email: "mehmet.yilmaz@mia.com",
        phone: "+90 532 123 4567",
        department: "Yazılım Geliştirme",
        position: "Takım Lideri",
        address: "Maslak Mahallesi, Büyükdere Caddesi No:123",
        city: "İstanbul",
        country: "Türkiye",
        postalCode: "34485",
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const handleSave = () => {
        setIsEditing(false);
    };

    const handlePasswordChange = () => {
        if (passwordForm.newPassword === passwordForm.confirmPassword) {
            setShowPasswordModal(false);
            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    {/* Profile Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative">
                            <img
                                src="https://public.readdy.ai/ai/img_res/c98fbc22cf78bdde5c4e9414c1eeff13.jpg"
                                alt="Profil Fotoğrafı"
                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                            <button className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full shadow-lg">
                                <i className="fas fa-camera"></i>
                            </button>
                        </div>
                        <h1 className="mt-4 text-2xl font-bold text-gray-800">
                            {userInfo.name}
                        </h1>
                        <p className="text-gray-600">{userInfo.title}</p>
                    </div>

                    {/* Personal Information */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">
                                Kişisel Bilgiler
                            </h2>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-purple-600 hover:text-purple-700 !rounded-button whitespace-nowrap"
                            >
                                <i className="fas fa-edit mr-2"></i>
                                {isEditing ? "İptal" : "Düzenle"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Ad Soyad</label>
                                    <input
                                        type="text"
                                        value={userInfo.name}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">E-posta</label>
                                    <input
                                        type="email"
                                        value={userInfo.email}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Telefon</label>
                                    <input
                                        type="tel"
                                        value={userInfo.phone}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Departman</label>
                                    <input
                                        type="text"
                                        value={userInfo.department}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Pozisyon</label>
                                    <input
                                        type="text"
                                        value={userInfo.position}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                            Adres Bilgileri
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Adres</label>
                                    <input
                                        type="text"
                                        value={userInfo.address}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Şehir</label>
                                    <input
                                        type="text"
                                        value={userInfo.city}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Ülke</label>
                                    <input
                                        type="text"
                                        value={userInfo.country}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Posta Kodu</label>
                                    <input
                                        type="text"
                                        value={userInfo.postalCode}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password Change Section */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                            Şifre Değiştirme
                        </h2>
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors !rounded-button whitespace-nowrap"
                        >
                            <i className="fas fa-key mr-2"></i>
                            Şifre Değiştir
                        </button>
                    </div>

                    {/* Save Button */}
                    {isEditing && (
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors !rounded-button whitespace-nowrap"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors !rounded-button whitespace-nowrap"
                            >
                                Kaydet
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full">
                        <h3 className="text-xl font-semibold mb-4">Şifre Değiştir</h3>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <label className="text-sm text-gray-600">Mevcut Şifre</label>
                                <input
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            currentPassword: e.target.value,
                                        })
                                    }
                                    className="mt-1 p-2 border rounded-lg"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm text-gray-600">Yeni Şifre</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            newPassword: e.target.value,
                                        })
                                    }
                                    className="mt-1 p-2 border rounded-lg"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm text-gray-600">
                                    Yeni Şifre (Tekrar)
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            confirmPassword: e.target.value,
                                        })
                                    }
                                    className="mt-1 p-2 border rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-4 mt-6">
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 !rounded-button whitespace-nowrap"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handlePasswordChange}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 !rounded-button whitespace-nowrap"
                            >
                                Değiştir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
