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

    // ... existing render code with renderMemberStatus usage ...
}