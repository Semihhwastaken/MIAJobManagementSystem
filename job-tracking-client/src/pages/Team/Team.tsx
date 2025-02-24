import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../redux/store';
import {
    fetchTeamMembers,
    fetchDepartments,
    setSearchQuery,
    createTeam,
    generateTeamInviteLink,
    fetchTeams,
    deleteTeam,
    removeTeamMember
} from '../../redux/features/teamSlice';
import { useTheme } from '../../context/ThemeContext';
import { TeamMember } from '../../types/team';
import {
    ChatBubbleLeftIcon,
    ClipboardDocumentListIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    ClipboardDocumentIcon,
    UserMinusIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../services/axiosInstance';
import { useSnackbar } from 'notistack';

const Team: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const {
        members,
        teams,
        departments,
        searchQuery,
        filters,
        sortBy,
        sortOrder
    } = useSelector((state: RootState) => state.team);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamDescription, setNewTeamDescription] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState<string>('');
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{ teamId: string, memberId: string } | null>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        // Kullanıcı girişi kontrolü
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
            return;
        }

        dispatch(fetchTeamMembers() as any);
        dispatch(fetchDepartments() as any);
        dispatch(fetchTeams() as any);
    }, [dispatch, navigate]);

    const handleCreateTeam = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
            return;
        }

        if (newTeamName.trim()) {
            try {
                console.log('Takım oluşturma isteği gönderiliyor:', {
                    name: newTeamName,
                    description: newTeamDescription.trim() || undefined
                });

                const result = await dispatch(createTeam({
                    name: newTeamName,
                    description: newTeamDescription.trim() || undefined
                }) as any);

                console.log('API Yanıtı:', result); // Debug için

                if (result.error) {
                    const errorMessage = result.error.response?.data?.message || result.error.message || 'Ekip oluşturulurken bir hata oluştu';
                    console.error('Hata detayı:', result.error); // Debug için
                    enqueueSnackbar(errorMessage, { variant: 'error' });
                    return;
                }

                if (result.payload) {
                    try {
                        const linkResult = await dispatch(generateTeamInviteLink(result.payload.id) as any);
                        if (linkResult.error) {
                            // 401 hatası için özel kontrol
                            if (linkResult.error.response?.status === 401) {
                                navigate('/auth');
                                return;
                            }
                            throw new Error(linkResult.error.message || 'Davet linki oluşturulurken bir hata oluştu');
                        }

                        if (linkResult.payload) {
                            setInviteLink(linkResult.payload.inviteLink);
                            enqueueSnackbar('Ekip başarıyla oluşturuldu!', { variant: 'success' });
                            setShowCreateTeamModal(false);
                            setNewTeamName('');
                            setNewTeamDescription('');
                            dispatch(fetchTeams() as any);
                        }
                    } catch (error: any) {
                        enqueueSnackbar(error.message, { variant: 'error' });
                    }
                }
            } catch (error: any) {
                enqueueSnackbar(error.message, { variant: 'error' });
                setShowCreateTeamModal(true);
            }
        }
    };

    const handleGenerateInviteLink = async (teamId: string) => {
        try {
            const response = await axiosInstance.post(`Team/invite-link/${teamId}`);
            const inviteCode = response.data.inviteLink.split('code=')[1];
            const inviteLink = `${window.location.origin}/team/join-with-code/${inviteCode}`;
            setInviteLink(inviteLink);
            setSelectedTeamId(teamId);
            setShowInviteLinkModal(true);
            await navigator.clipboard.writeText(inviteLink);
            enqueueSnackbar('Davet linki panoya kopyalandı!', { variant: 'success' });
        } catch (error: any) {
            console.error('Davet linki oluşturulurken hata:', error);
            enqueueSnackbar('Davet linki oluşturulamadı', { variant: 'error' });
        }
    };

    const handleCopyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error: any) {
            console.error('Link kopyalanırken hata oluştu:', error);
        }
    };

    const handleDeleteTeamClick = (teamId: string) => {
        setTeamToDelete(teamId);
        setShowDeleteConfirmModal(true);
    };

    const handleDeleteTeam = async () => {
        if (!teamToDelete) return;

        try {
            const result = await dispatch(deleteTeam(teamToDelete)).unwrap();
            enqueueSnackbar('Takım başarıyla silindi', { variant: 'success' });
            setShowDeleteConfirmModal(false);
            setTeamToDelete('');

            // Ana sayfaya yönlendir
            navigate('/');
        } catch (error: any) {
            enqueueSnackbar(error.message || 'Takım silinirken bir hata oluştu', { variant: 'error' });
        }
    };

    const handleRemoveMemberClick = (teamId: string, memberId: string) => {
        setMemberToRemove({ teamId, memberId });
        setShowRemoveMemberModal(true);
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove) return;

        try {
            const result = await dispatch(removeTeamMember({
                teamId: memberToRemove.teamId,
                memberId: memberToRemove.memberId
            })).unwrap();

            enqueueSnackbar('Üye başarıyla çıkartıldı', { variant: 'success' });
            setShowRemoveMemberModal(false);
            setMemberToRemove(null);

            // Takım listesini yenile
            dispatch(fetchTeams() as any);
        } catch (error: any) {
            enqueueSnackbar(error.message || 'Üye çıkartılırken bir hata oluştu', { variant: 'error' });
        }
    };


    const renderTeamMembers = (teamMembers: TeamMember[], teamName: string, teamId: string) => {
        const filteredAndSortedMembers = teamMembers
            .filter(member => {
                const matchesSearch = member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    member.email.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = filters.status.length === 0 || filters.status.includes(member.status);
                const matchesDepartment = selectedDepartment === 'all' || member.department === selectedDepartment;
                return matchesSearch && matchesStatus && matchesDepartment;
            })
            .sort((a, b) => {
                let comparison = 0;
                switch (sortBy) {
                    case 'name':
                        comparison = a.fullName.localeCompare(b.fullName);
                        break;
                    case 'performance':
                        comparison = b.performanceScore - a.performanceScore;
                        break;
                    case 'tasks':
                        comparison = b.completedTasksCount - a.completedTasksCount;
                        break;
                    default:
                        comparison = a.fullName.localeCompare(b.fullName);
                }
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        const owner = members.filter(member => member.role === 'Owner')
        const isOwner = owner.length > 0 && currentUser ? owner[0].id === currentUser.id : false;


        return (
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamName}</h2>
                    <div className="flex gap-2">
                        {teamMembers.some(member => member.role === 'Owner' && member.id === currentUser?.id) && (
                            <button
                                onClick={() => handleGenerateInviteLink(teamId)}
                                className={`flex items-center px-3 py-1 rounded-lg ${isDarkMode
                                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
                                Davet Linki
                            </button>)}
                        {teamMembers.some(member => member.role === 'Owner' && member.id === currentUser?.id) && (
                            <button
                                onClick={() => handleDeleteTeamClick(teamId)}
                                className={`flex items-center px-3 py-1 rounded-lg ${isDarkMode
                                    ? 'bg-red-900 hover:bg-red-800 text-red-100'
                                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Takımı Sil
                            </button>
                        )}
                    </div>
                </div>
                <div className={`shadow-lg rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="overflow-x-auto">
                        <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                            <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                                <tr>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        Üye
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        Departman
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        Performans
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        Durum
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        Uzmanlık
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                        İşlemler
                                    </th>
                                </tr>
                            </thead>
                            <tbody className={`${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                                {filteredAndSortedMembers.map((member) => (
                                    <tr key={member.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 relative">
                                                    {member.profileImage ? (
                                                        <img className="h-10 w-10 rounded-full" src={member.profileImage} alt="" />
                                                    ) : (
                                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                                                            <span className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                                {member.fullName.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${getOnlineStatusColor(member.onlineStatus)}`}></span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {member.fullName}
                                                    </div>
                                                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {member.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{member.department}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                                                    <div
                                                        className="h-2 bg-blue-500 rounded-full"
                                                        style={{ width: `${member.performanceScore}%` }}
                                                    ></div>
                                                </div>
                                                <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {member.performanceScore}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(member.status)}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-1">
                                                {member.expertise.map((skill, index) => (
                                                    <span
                                                        key={index}
                                                        className={`px-2 py-1 text-xs rounded-full ${isDarkMode
                                                            ? 'bg-blue-900 text-blue-200'
                                                            : 'bg-blue-100 text-blue-800'
                                                            }`}
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => navigate(`/messages/${member.id}`)}
                                                className={`text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4`}
                                            >
                                                <ChatBubbleLeftIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/tasks/${member.id}`)}
                                                className={`text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300`}
                                            >
                                                <ClipboardDocumentListIcon className="h-5 w-5" />
                                            </button>
                                            {isOwner && member.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => handleRemoveMemberClick(teamId, member.id)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                                                    title="Üyeyi Çıkart"
                                                >
                                                    <UserMinusIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'bg-green-100 text-green-800';
            case 'busy':
                return 'bg-red-100 text-red-800';
            case 'away':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getOnlineStatusColor = (status: 'online' | 'offline') => {
        return status === 'online' ? 'bg-green-500' : 'bg-gray-400';
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Takım Üyeleri</h1>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Üye ara..."
                            className={`pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                }`}
                            value={searchQuery}
                            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>

                    <select
                        className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                            }`}
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                        <option value="all">Tüm Departmanlar</option>
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>
                                {dept}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowCreateTeamModal(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Yeni Ekip
                    </button>
                </div>
            </div>

            {teams.map((team) => (
                <div key={team.id}>
                    {renderTeamMembers(team.members, team.name, team.id)}
                </div>
            ))}

            {/* Create Team Modal */}
            {showCreateTeamModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md ${isDarkMode ? 'dark' : ''}`}>
                        <h2 className="text-2xl font-bold mb-4 dark:text-white">Yeni Ekip Oluştur</h2>
                        <div className="mb-4">
                            <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Ekip Adı
                            </label>
                            <input
                                type="text"
                                id="teamName"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Ekip adını girin"
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Ekip Açıklaması
                            </label>
                            <textarea
                                id="teamDescription"
                                value={newTeamDescription}
                                onChange={(e) => setNewTeamDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Ekip açıklamasını girin (opsiyonel)"
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                                onClick={() => {
                                    setShowCreateTeamModal(false);
                                    setNewTeamName('');
                                    setNewTeamDescription('');
                                }}
                            >
                                İptal
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                onClick={handleCreateTeam}
                            >
                                Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Davet Linki Modal */}
            {showInviteLinkModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className={`rounded-lg p-6 w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Takım Davet Linki
                        </h2>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="text"
                                readOnly
                                value={inviteLink}
                                className={`w-full px-4 py-2 border rounded-lg ${isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-gray-50 border-gray-300 text-gray-900'
                                    }`}
                            />
                            <button
                                onClick={handleCopyInviteLink}
                                className={`px-4 py-2 rounded-lg ${copySuccess
                                    ? 'bg-green-500 text-white'
                                    : isDarkMode
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                            >
                                {copySuccess ? 'Kopyalandı!' : 'Kopyala'}
                            </button>
                        </div>
                        {inviteLink && (
                            <div className="mt-2">
                                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Davet Linki:</h3>
                                <a href={inviteLink} target="_blank" rel="noopener noreferrer" className={`text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300`}>
                                    {inviteLink}
                                </a>
                            </div>
                        )}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowInviteLinkModal(false)}
                                className={`px-4 py-2 ${isDarkMode
                                    ? 'text-gray-400 hover:text-gray-200'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme Onay Modalı */}
            {showDeleteConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} max-w-md w-full mx-4`}>
                        <h3 className="text-xl font-semibold mb-4">Ekibi Sil</h3>
                        <p className="mb-6">Bu ekibi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setShowDeleteConfirmModal(false)}
                                className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleDeleteTeam}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                            >
                                Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Üye Çıkartma Onay Modalı */}
            {showRemoveMemberModal && memberToRemove && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} max-w-md w-full mx-4`}>
                        <h3 className="text-xl font-semibold mb-4">Üyeyi Çıkart</h3>
                        <p className="mb-6">Bu üyeyi ekipten çıkartmak istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setShowRemoveMemberModal(false)}
                                className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleRemoveMember}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                            >
                                Çıkart
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Team;