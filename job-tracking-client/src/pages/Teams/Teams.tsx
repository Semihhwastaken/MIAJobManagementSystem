import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { fetchTeams, fetchMemberActiveTasks } from '../../redux/features/teamSlice';

const Teams: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { teams, loading, error } = useSelector((state: RootState) => state.team);

    useEffect(() => {
        dispatch(fetchTeams());
        
        // 5 dakikada bir aktif görevleri ve durumları güncelle (300000 ms = 5 dakika)
        const interval = setInterval(() => {
            dispatch(fetchMemberActiveTasks());
            console.log("Tüm üyelerin durumları güncellendi - 5 dakikalık periyot");
        }, 300000);
        
        // Component unmount olduğunda interval'i temizle
        return () => clearInterval(interval);
    }, [dispatch]);

    const renderMemberStatus = (memberId: string) => {
        const member = teams.find(t => t.id === memberId);
        if (!member) return null;

        return (
            <div className="mt-2 text-sm">
                <div className="flex items-center space-x-2">
                    <span className={`${member.status === 'Busy' ? 'text-red-600' : 'text-green-600'}`}>
                        {member.status === 'Busy' ? 'Meşgul' : 'Müsait'}
                    </span>
                </div>
            </div>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="text-gray-600">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center">
                        <i className="fas fa-exclamation-circle text-red-600 mr-2"></i>
                        <p className="text-red-600">Hata: {error || 'Ekipler yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.'}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Continue with the existing render code
    // ... existing render code with renderMemberStatus usage ...
    
    // If the existing render code is incomplete, here's a basic structure:
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <h1 className="text-2xl font-bold mb-6">Ekipler</h1>
                
                {teams.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <p className="text-gray-600">Henüz hiç ekip bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map(team => (
                            <div key={team.id} className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold">{team.name}</h2>
                                <p className="text-gray-600 mt-2">{team.description}</p>
                                {/* Render other team information as needed */}
                                {renderMemberStatus(team.id!)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Teams;