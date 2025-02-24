import React, { useState, useEffect } from "react";
import axiosInstance from "../../services/axiosInstance";
import defaultAvatar from '../../assets/images/default-avatar.png';
import Footer from "../../components/Footer/Footer";

interface UserInfo {
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    position: string;
    title: string;
    profileImage?: string;
}

interface PasswordForm {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

const Profile: React.FC = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [userInfo, setUserInfo] = useState<UserInfo>({
        id: "",
        username: "",
        fullName: "",
        email: "",
        phone: "",
        department: "",
        position: "",
        title: "",
        profileImage: "",
    });

    const [passwordForm, setPasswordForm] = useState<PasswordForm>({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            setIsLoading(true);
            const response = await axiosInstance.get('/Users/profile');
            setUserInfo(response.data);
            setError(null);
        } catch (err) {
            setError('Profil bilgileri yüklenirken bir hata oluştu.');
            console.error('Profil yükleme hatası:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const updateData = {
                fullName: userInfo.fullName,
                department: userInfo.department,
                title: userInfo.title,
                phone: userInfo.phone,
                position: userInfo.position,
                profileImage: userInfo.profileImage
            };
            await axiosInstance.put('/Users/profile', updateData);
            setIsEditing(false);
            setError(null);
            // Başarılı güncelleme sonrası profili yeniden yükle
            await fetchUserProfile();
        } catch (err) {
            setError('Profil bilgileri güncellenirken bir hata oluştu.');
            console.error('Profil güncelleme hatası:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('Yeni şifreler eşleşmiyor.');
            return;
        }

        try {
            setIsLoading(true);
            await axiosInstance.put('/Users/password', passwordForm);
            setShowPasswordModal(false);
            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setError(null);
        } catch (err) {
            setError('Şifre güncellenirken bir hata oluştu.');
            console.error('Şifre güncelleme hatası:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageClick = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            // Dosya boyutunu kontrol et (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Dosya boyutu 5MB\'dan büyük olamaz');
                return;
            }

            // Dosya tipini kontrol et
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                setError('Sadece JPG, PNG ve GIF formatları desteklenir');
                return;
            }

            try {
                setIsLoading(true);
                const formData = new FormData();
                formData.append('file', file);

                const response = await axiosInstance.post('/Users/profile/image', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });

                if (response.data.profileImage) {
                    setUserInfo(prev => ({
                        ...prev,
                        profileImage: response.data.profileImage
                    }));
                }
                setError(null);
            } catch (err: any) {
                const errorMessage = err.response?.data || 'Profil resmi güncellenirken bir hata oluştu';
                setError(errorMessage);
                console.error('Profil resmi güncelleme hatası:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fileInput.click();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    {error && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    {/* Profile Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center justify-center mb-8 relative">
                            <div className="relative group">
                                <img
                                    src={userInfo.profileImage || defaultAvatar}
                                    alt="Profil Resmi"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                />
                                <button
                                    onClick={handleImageClick}
                                    className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
                                    title="Profil Resmini Değiştir"
                                >
                                    <i className="fas fa-camera"></i>
                                </button>
                            </div>
                        </div>
                        <h1 className="mt-4 text-2xl font-bold text-gray-800">
                            {userInfo.fullName}
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
                                className="text-purple-600 hover:text-purple-700 rounded-button whitespace-nowrap"
                            >
                                <i className="fas fa-edit mr-2"></i>
                                {isEditing ? "İptal" : "Düzenle"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Kullanıcı Adı</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={userInfo.username}
                                        disabled={true}
                                        className="mt-1 p-2 border rounded-lg bg-gray-100"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Tam Ad</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={userInfo.fullName}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">E-posta</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={userInfo.email}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Telefon</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={userInfo.phone}
                                        onChange={handleInputChange}
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
                                        name="department"
                                        value={userInfo.department}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Pozisyon</label>
                                    <input
                                        type="text"
                                        name="position"
                                        value={userInfo.position}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm text-gray-600">Ünvan</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={userInfo.title}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {isEditing && (
                            <div className="mt-6 flex justify-end space-x-4">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-700"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Kaydet
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Password Change Section */}
                    <div className="border-t pt-6">
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="text-purple-600 hover:text-purple-700"
                        >
                            <i className="fas fa-key mr-2"></i>
                            Şifre Değiştir
                        </button>
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-lg w-full max-w-md">
                        <h3 className="text-xl font-semibold mb-4">Şifre Değiştir</h3>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <label className="text-sm text-gray-600">Mevcut Şifre</label>
                                <input
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm(prev => ({
                                        ...prev,
                                        currentPassword: e.target.value
                                    }))}
                                    className="mt-1 p-2 border rounded-lg"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm text-gray-600">Yeni Şifre</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(prev => ({
                                        ...prev,
                                        newPassword: e.target.value
                                    }))}
                                    className="mt-1 p-2 border rounded-lg"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm text-gray-600">Yeni Şifre (Tekrar)</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(prev => ({
                                        ...prev,
                                        confirmPassword: e.target.value
                                    }))}
                                    className="mt-1 p-2 border rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-4">
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-700"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handlePasswordChange}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Değiştir
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default Profile;