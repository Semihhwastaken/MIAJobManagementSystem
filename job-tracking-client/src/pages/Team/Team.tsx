/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../redux/store';
import UserTaskCommentModal from '../../components/Comments/UserTaskCommentModal';
import { IoIosAddCircleOutline } from "react-icons/io";
import {
    fetchTeamMembers,
    fetchDepartments,
    setSearchQuery,
    createTeam,
    generateTeamInviteLink,
    fetchTeams,
    deleteTeam,
    removeTeamMember,
    addExperties,
    fetchMemberActiveTasks,
} from '../../redux/features/teamSlice';
import { useTheme } from '../../context/ThemeContext';
import { TeamMember } from '../../types/team';
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ClipboardDocumentIcon,
    UserMinusIcon,
    ChatBubbleOvalLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { useSnackbar } from 'notistack';
import { DEPARTMENTS } from '../../constants/departments';
import TaskForm from '../../components/TaskForm/TaskForm';
import {Task} from '../../types/task';
import { createTask  } from '../../redux/features/tasksSlice';
import Footer from '../../components/Footer/Footer';
import { toast } from 'react-hot-toast';

const Team: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const {
        teams,
        searchQuery,
        filters,
        sortBy,
        sortOrder
    } = useSelector((state: RootState) => state.team);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [teamDescription, setTeamDescription] = useState('');
    const [teamDepartment, setTeamDepartment] = useState('');
    const [creatingTeam, setCreatingTeam] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [, setInviteLinkLoading] = useState(false);
    const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [, setRemovingMember] = useState(false);
    const [, setAddingExpertise] = useState(false);
    const [selectedMemberForTask, setSelectedMemberForTask] = useState<TeamMember | undefined>(null as unknown as TeamMember | undefined);
    const [selectedTeamForTask, setSelectedTeamForTask] = useState<{ id: string; name: string } | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [showExpertiesModal, setShowExpertiesModal] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [newExpertise, setNewExpertise] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState<string>('');
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{ teamId: string, memberId: string } | null>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const [showCommentModal, setShowCommentModal] = useState(false);

    useEffect(() => {
        // Kullanıcı girişi kontrolü
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
            return;
        }

        // Takım verilerini yükleme
        dispatch(fetchTeamMembers());
        dispatch(fetchDepartments());
        dispatch(fetchTeams());

        // Debug: kullanıcı ve takım ilişkisini logla
        if (currentUser && teams.length > 0) {
            console.log('Mevcut kullanıcı:', currentUser);
            console.log('Kullanıcının oluşturduğu takımlar:', teams.filter(team => 
                team.createdById === currentUser.id || team.createdBy === currentUser.id
            ));
            console.log('Kullanıcının üye olduğu takımlar:', teams.filter(team => 
                team.members.some(member => member.id === currentUser.id)
            ));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, navigate, currentUser?.id, teams.length]);

    // Teams listesini periyodik olarak güncelle
    useEffect(() => {
        // İlk yükleme
        dispatch(fetchTeams());
        dispatch(fetchMemberActiveTasks());
        
        // Her 15 saniyede bir güncelle
        const interval = setInterval(() => {
            dispatch(fetchTeams());
            dispatch(fetchMemberActiveTasks());
        }, 15000);
        
        return () => clearInterval(interval);
    }, [dispatch,currentUser]);

    const handleCreateTeam = async () => {
        if (!teamName || !teamDepartment) {
            enqueueSnackbar('Takım adı ve departman seçimi zorunludur', { variant: 'error' });
            return;
        }

        try {
            setCreatingTeam(true);
            
            // Kullanıcının owner olduğu takımları kontrol et
            const ownerTeams = teams.filter(team => team.members.some(m => m.id === currentUser?.id && m.role === 'Owner'));
            if (ownerTeams.length >= 5) {
                enqueueSnackbar('En fazla 5 takıma sahip olabilirsiniz. Yeni bir takım oluşturmak için mevcut takımlarınızdan birini silmelisiniz.', { variant: 'error' });
                setCreatingTeam(false);
                return;
            }

            // Create team and get the result
            const result = await dispatch(createTeam({
                name: teamName,
                description: teamDescription,
                department: teamDepartment
            })).unwrap();

            enqueueSnackbar('Takım başarıyla oluşturuldu', { variant: 'success' });
            
            // Link oluşturma işlemini başlat - make sure result contains the team ID
            if (result && result.id) {
                try {
                    console.log('Davet linki oluşturuluyor...', result.id);
                    const linkResult = await dispatch(generateTeamInviteLink(result.id)).unwrap();
                    
                    if (linkResult && linkResult.inviteLink) {
                        // Link bilgisini tut
                        setInviteLink(linkResult.inviteLink);
                    }
                } catch (err) {
                    console.error('Link oluşturma hatası:', err);
                }
            } else {
                console.error('Oluşturulan takım için ID bulunamadı:', result);
            }

            // Kullanıcı bilgilerini güncelle
            try {
                console.log('Yeni takım oluşturuldu, kullanıcı bilgileri yenileniyor...');
                console.log('Kullanıcı bilgileri güncellendi');
            } catch (refreshError) {
                console.error('Kullanıcı bilgileri yenilenirken hata:', refreshError);
            }

            // Formu temizle
            setTeamName('');
            setTeamDescription('');
            setTeamDepartment('');
            
            setCreatingTeam(false);
            setShowCreateTeamModal(false);
            
            // Ekipleri yeniden yükle
            dispatch(fetchTeams());
            
        } catch (error) {
            console.error('Ekip oluşturma hatası:', error);
            const errorMsg = `Basic plan users can only create 5 teams. You have ${teams.length} teams. Upgrade your plan to create more teams.`;
            enqueueSnackbar(errorMsg, { variant: 'error' });
            setCreatingTeam(false);
        }
    };

    const handleGenerateInviteLink = async (teamId: string) => {
        try {
            console.log('Davet linki oluşturuluyor...', teamId);
            setInviteLinkLoading(true);
            
            // Davet linki oluştur veya varsa mevcut olanı getir
            // Backend, süresi geçmiş linkler için yeni link üretecek, geçerli linkler için mevcut linki döndürecek
            const result = await dispatch(generateTeamInviteLink(teamId)).unwrap();
            
            console.log('API yanıtı:', result);
            
            // API'den gelen bağlantıyı al
            const link = result.inviteLink;
            console.log('Davet linki:', link);
            
            // Tam URL oluştur
            const fullUrl = `${window.location.origin}${link}`;
            setInviteLink(fullUrl);
            
            setShowInviteLinkModal(true);
            setInviteLinkLoading(false);
        } catch (error) {
            console.error('Davet linki oluşturma hatası:', error);
            toast.error('Davet linki oluşturulurken bir hata oluştu.');
            setInviteLinkLoading(false);
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
            console.log('Takım silme isteği gönderiliyor:', teamToDelete);
            
            const deleteResponse = await dispatch(deleteTeam(teamToDelete)).unwrap();
            console.log('Takım silme başarılı:', deleteResponse);
            
            enqueueSnackbar('Takım başarıyla silindi', { variant: 'success' });
            setShowDeleteConfirmModal(false);
            setTeamToDelete('');

            // Kullanıcı bilgilerini güncelle
            try {
                console.log('Takım silindi, kullanıcı bilgileri yenileniyor...');
                console.log('Kullanıcı bilgileri güncellendi');
            } catch (refreshError) {
                console.error('Kullanıcı bilgileri yenilenirken hata:', refreshError);
            }

            // Ana sayfaya yönlendir
            navigate('/');
        } catch (error: any) {
            // Detaylı hata bilgisini logla
            console.error('Takım silme hatası detayları:', {
                teamId: teamToDelete,
                errorMessage: error.message,
                errorDetails: error.response?.data || error
            });
            
            // Kullanıcıya gösterilecek mesaj
            const errorMessage = error.response?.data?.message || error.message || 'Takım silinirken bir hata oluştu';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        }
    };

    const handleRemoveMemberClick = (teamId: string, memberId: string) => {
        setMemberToRemove({ teamId, memberId });
        setShowRemoveMemberModal(true);
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove) return;
        
        try {
            setRemovingMember(true);
            // Use the memberToRemove object that contains teamId and memberId
            const result = await dispatch(removeTeamMember({ 
                teamId: memberToRemove.teamId, 
                memberId: memberToRemove.memberId 
            })).unwrap();
            
            if (result.success) {
                toast.success(result.message || 'Üye başarıyla çıkarıldı.');
                setShowRemoveMemberModal(false);
                // Takımları yeniden yükle
                dispatch(fetchTeams());
            } else {
                toast.error(result.message || 'Üye çıkarılırken bir hata oluştu.');
            }
            setRemovingMember(false);
            // Reset member to remove state
            setMemberToRemove(null);
        } catch (error) {
            console.error('Üye çıkarma hatası:', error);
            toast.error('Üye çıkarılırken bir hata oluştu.');
            setRemovingMember(false);
        }
    };

    const handleCommentClick = (userId: string) => {
        setSelectedUserId(userId);
        setShowCommentModal(true);
    };

    const handleAddExpertiseClick = (id: string, currentExpertise: string[] = []) => {
        setSelectedMemberId(id);
        // Join existing expertise with commas
        setNewExpertise(currentExpertise.join(', '));
        setShowExpertiesModal(true);
    };

    const handleAddExpertise = async () => {
        if (!newExpertise || !selectedMemberId) {
            toast.error('Lütfen bir uzmanlık alanı girin.');
            return;
        }
        
        try {
            setAddingExpertise(true);
            // Split by comma, clean up, and remove duplicates
            const expertiseArray = [...new Set(
                newExpertise
                    .split(',')
                    .map(exp => exp.trim())
                    .filter(exp => exp)
            )];
            
            const result = await dispatch(addExperties({ 
                memberId: selectedMemberId,
                experties: expertiseArray.join(',') // Send as comma-separated string
            })).unwrap();
            
            if (result) {
                toast.success('Uzmanlık alanları başarıyla güncellendi.');
                setShowExpertiesModal(false);
                setNewExpertise('');
                
                // Refresh the data
                dispatch(fetchTeams());
                dispatch(fetchMemberActiveTasks());
            } else {
                toast.error('Uzmanlık alanları güncellenemedi.');
            }
        } catch (error: any) {
            console.error('Uzmanlık alanı ekleme hatası:', error);
            toast.error(error.message || 'Uzmanlık alanları güncellenirken bir hata oluştu.');
        } finally {
            setAddingExpertise(false);
        }
    };

    const handleOpenTaskForm = (member: TeamMember, teamId: string, teamName: string) => {
        setSelectedMemberForTask(member);
        // Pass team info including id and name to TaskForm component
        setSelectedTeamForTask({
            id: teamId,
            name: teamName
        });
        setShowTaskForm(true);
    };

    const handleCreateTask = async (taskData: Omit<Task, 'id'>) => {
        try {
            await dispatch(createTask(taskData)).unwrap();
            enqueueSnackbar('Görev başarıyla oluşturuldu', { variant: 'success' });
            setShowTaskForm(false);
        } catch (error: any) {
            enqueueSnackbar(error.message || 'Görev oluşturulurken bir hata oluştu', { variant: 'error' });
        }
    };

    const renderTeamMembers = (teamMembers: TeamMember[], teamName: string, teamId: string) => {
        const filteredAndSortedMembers = teamMembers
            .filter(member => {
                const matchesSearch = member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    member.email.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = filters.status.length === 0 || filters.status.includes(member.status);
                const matchesDepartment = filters.department.length === 0 || filters.department.includes(member.department);
                const matchesExpertise = filters.expertise.length === 0 || 
                    member.expertise?.some(exp => filters.expertise.includes(exp));
                return matchesSearch && matchesStatus && matchesDepartment && matchesExpertise;
            })
            .sort((a, b) => {
                if (sortBy === 'performance') {
                    const aScore = typeof a.performanceScore === 'number' ? a.performanceScore : 0;
                    const bScore = typeof b.performanceScore === 'number' ? b.performanceScore : 0;
                    return sortOrder === 'asc' ? aScore - bScore : bScore - aScore;
                }
                // ...existing sorting logic...
                return 0;
            });

        // İşlemi yapan kullanıcının bu takımın owner'ı olup olmadığını kontrol et
        const isTeamOwner = teamMembers.some(member => 
            member.id === currentUser?.id && (member.role === 'Owner' || member.role === 'Master')
        );

        return (
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamName}</h2>
                    <div className="flex gap-2">
                        {/* Takım oluşturucu veya Owner/Master rolüne sahip kullanıcılar davet linki oluşturabilir */}
                        {(isTeamOwner || currentUser?.id === teams.find(t => t.id === teamId)?.createdById) && (
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
                        {/* Takım oluşturucu veya Owner rolüne sahip kullanıcılar takımı silebilir */}
                        {(isTeamOwner || currentUser?.id === teams.find(t => t.id === teamId)?.createdById) && (
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
                                    <tr key={`${teamId}-${member.id}`} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                        {/* TABLE ÜYE */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 relative">
                                                    {member.profileImage ? (
                                                        <img className="h-10 w-10 rounded-full" src={member.profileImage} alt="" />
                                                    ) : (
                                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                                                            <span className={`text-xl font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                                {member.fullName.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${getOnlineStatusColor(member.onlineStatus || 'online')}`}></span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {member.fullName}
                                                        {member.id === teams.find(t => t.id === teamId)?.createdById && (
                                                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isDarkMode ? "bg-red-400 text-black-800":"bg-blue-100 text-blue-800"} `}>
                                                                Owner👑
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {member.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* TABLE DEPARTMAN */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {member.department || member.title || 'Genel'}
                                                {member.position && (
                                                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {member.position}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {/* TABLE PERFORMANCE */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                                                    <div
                                                        className="h-2 bg-blue-500 rounded-full"
                                                        style={{ width: `${Math.round(member.performanceScore) || 50}%` }}
                                                    ></div>
                                                </div>
                                                <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {Math.round(member.performanceScore) || 50}%
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {member.completedTasksCount || 0} görev tamamlandı
                                            </div>
                                        </td>
                                        {/* TABLE DURUM */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(member.status)}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        {/* TABLE UZMANLIK */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-1">
                                                {member.expertise === null || member.expertise.length === 0 ? (
                                                    currentUser?.id === member.id ? (
                                                        <span 
                                                        className={`group px-2 inline-flex text-xs leading-5 font-semibold rounded-full transition-all duration-200 ease-in-out cursor-pointer 
                                                            ${isDarkMode 
                                                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                                              onClick={() => handleAddExpertiseClick(member.id, [])}>
                                                                Uzmanlık Ekle 
                                                                <IoIosAddCircleOutline
                                                                    className="w-5 h-5 ml-1 transition-transform duration-200 ease-in-out group-hover:scale-110"
                                                                />
                                                        </span>
                                                    ) : (
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                            ${isDarkMode 
                                                              ? 'bg-gray-700 text-gray-300' 
                                                              : 'bg-gray-200 text-gray-600'}`}>
                                                            Uzmanlık Yok
                                                        </span>
                                                    )
                                                ) : (
                                                    <>
                                                        {member.expertise.map((expertise, index) => (
                                                            <span key={index} className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                                                {expertise}
                                                            </span>
                                                        ))}
                                                        {currentUser?.id === member.id && (
                                                            <span 
                                                            className={`group px-2 inline-flex text-xs leading-5 font-semibold rounded-full transition-all duration-200 ease-in-out cursor-pointer 
                                                                ${isDarkMode 
                                                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                                                  onClick={() => handleAddExpertiseClick(member.id, member.expertise)}>
                                                                <IoIosAddCircleOutline
                                                                    className="w-5 h-5 transition-transform duration-200 ease-in-out group-hover:scale-110"
                                                                />
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                                    
                                            </div>
                                        </td>
                                        {/* TABLE İŞLEMLER */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                {/* İşlem butonlarını sadece owner'lar görebilsin */}
                                                {(isTeamOwner || currentUser?.id === teams.find(t => t.id === teamId)?.createdById) && (
                                                    <button
                                                        onClick={() => handleOpenTaskForm(member, teamId, teamName)}
                                                        className={`px-2 py-1 rounded-md ${isDarkMode
                                                            ? 'bg-blue-900 hover:bg-blue-800 text-blue-200'
                                                            : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                                                            }`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {/* "Yorum" butonu */}
                                                <button
                                                    onClick={() => handleCommentClick(member.id)}
                                                    className={`px-2 py-1 rounded-md ${isDarkMode
                                                        ? 'bg-green-900 hover:bg-green-800 text-green-200'
                                                        : 'bg-green-100 hover:bg-green-200 text-green-800'
                                                        }`}
                                                >
                                                    <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
                                                </button>
                                                {/* Üyeyi kaldır butonu - sadece takım sahibi görebilir ve kendini çıkaramaz */}
                                                {member.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => handleRemoveMemberClick(teamId, member.id)}
                                                        className={`px-2 py-1 rounded-md ${isDarkMode
                                                            ? 'bg-red-900 hover:bg-red-800 text-red-200'
                                                            : 'bg-red-100 hover:bg-red-200 text-red-800'
                                                            }`}
                                                    >
                                                        <UserMinusIcon className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
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

    const getOnlineStatusColor = (status: string) => {
        switch (status) {
            case 'online':
                return 'bg-green-500';
            case 'offline':
                return 'bg-gray-500';
            default:
                return 'bg-gray-500';
        }
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
                        {DEPARTMENTS.map((dept) => (
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
                    <div className={`relative transform transition-all ${
                        isDarkMode ? 'bg-gray-800' : 'bg-white'
                    } rounded-xl shadow-2xl p-8 w-full max-w-md`}>
                        {/* Modal Header */}
                        <div className="mb-6">
                            <h2 className={`text-2xl font-bold ${
                                isDarkMode ? 'text-gray-100' : 'text-gray-800'
                            }`}>Yeni Ekip Oluştur</h2>
                            <p className={`mt-2 text-sm ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>Yeni bir ekip oluşturmak için aşağıdaki bilgileri doldurun.</p>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="teamName" className={`block text-sm font-medium mb-2 ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                    Ekip Adı
                                </label>
                                <input
                                    type="text"
                                    id="teamName"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-lg transition-colors duration-200 ease-in-out ${
                                        isDarkMode 
                                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                                    } border focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                                    placeholder="Ekip adını girin"
                                />
                            </div>

                            <div>
                                <label htmlFor="teamDescription" className={`block text-sm font-medium mb-2 ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                    Ekip Açıklaması
                                </label>
                                <textarea
                                    id="teamDescription"
                                    value={teamDescription}
                                    onChange={(e) => setTeamDescription(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-lg transition-colors duration-200 ease-in-out ${
                                        isDarkMode 
                                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                                    } border focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                                    placeholder="Ekip açıklamasını girin (opsiyonel)"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label htmlFor="teamDepartment" className={`block text-sm font-medium mb-2 ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                    Departman
                                </label>
                                <select
                                    id="teamDepartment"
                                    value={teamDepartment}
                                    onChange={(e) => setTeamDepartment(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-lg transition-colors duration-200 ease-in-out ${
                                        isDarkMode 
                                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                                            : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                    } border focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                                >
                                    <option value="" className={isDarkMode ? 'bg-gray-700' : 'bg-white'}>Departman Seçin</option>
                                    {DEPARTMENTS.map((dept) => (
                                        <option key={dept} value={dept} className={isDarkMode ? 'bg-gray-700' : 'bg-white'}>
                                            {dept}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                className={`px-5 py-2.5 rounded-lg transition-colors duration-200 ${
                                    isDarkMode 
                                        ? 'text-gray-300 hover:bg-gray-700' 
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                onClick={() => {
                                    setShowCreateTeamModal(false);
                                    setTeamName('');
                                    setTeamDescription('');
                                    setTeamDepartment('');
                                }}
                            >
                                İptal
                            </button>
                            <button
                                className={`px-5 py-2.5 rounded-lg transition-all duration-200 ${
                                    creatingTeam 
                                        ? 'bg-blue-400 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                                } text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                                onClick={handleCreateTeam}
                                disabled={creatingTeam}
                            >
                                {creatingTeam ? 'Oluşturuluyor...' : 'Oluştur'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Uzmanlık Ekleme Modalı */}
            {showExpertiesModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} max-w-md w-full mx-4`}>
                        <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Uzmanlık Güncelle
                        </h3>
                        <div className="mb-4">
                            <label 
                                htmlFor="expertise" 
                                className={`block text-sm font-medium mb-2 ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}
                            >
                                Uzmanlık Alanları (virgülle ayırın)
                            </label>
                            <input
                                type="text"
                                id="expertise"
                                value={newExpertise}
                                onChange={(e) => setNewExpertise(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                }`}
                                placeholder="Örn: React, Node.js, MongoDB"
                            />
                            <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Birden fazla uzmanlık alanını virgülle ayırarak girebilirsiniz.
                            </p>
                        </div>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => {
                                    setShowExpertiesModal(false);
                                    setNewExpertise('');
                                }}
                                className={`px-4 py-2 rounded-lg ${
                                    isDarkMode 
                                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                }`}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleAddExpertise}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Güncelle
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
                        <div className={`mt-4 ${isDarkMode ? "bg-gray-100 dark:bg-gray-700":"bg-white-300 dark:bg-white-700"} p-3 rounded-lg`}>
                            <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Bilgi:
                            </h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Bu davet linki 24 saat geçerlidir. Link süresi geçtiğinde yeni bir davet linki oluşturulacaktır.
                            </p>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => setShowInviteLinkModal(false)}
                                className={`px-4 py-2 rounded-lg ${isDarkMode
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
        <Footer />
            {showCommentModal && (
                <UserTaskCommentModal
                    isOpen={showCommentModal}
                    onClose={() => {
                        setShowCommentModal(false);
                        setSelectedUserId('');
                    }}
                    userId={selectedUserId}
                />
            )}

            {showTaskForm && selectedMemberForTask && (
                <TaskForm
                    isOpen={showTaskForm}
                    onClose={() => setShowTaskForm(false)}
                    onSave={handleCreateTask}
                    selectedUser={selectedMemberForTask}
                    teamId={selectedTeamForTask?.id}
                    teamName={selectedTeamForTask?.name}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
        
    );
};

export default Team;