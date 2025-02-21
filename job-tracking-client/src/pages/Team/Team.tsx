import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import {
    fetchTeamMembers,
    fetchDepartments,
    fetchTeamMembersByDepartment,
    setSearchQuery,
    setFilters,
    setSortBy,
    setSortOrder,
    updateMemberStatus
} from '../../redux/features/teamSlice';
import { Menu, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { TeamMember } from '../../types/team';
import { 
    ChatBubbleLeftIcon, 
    ClipboardDocumentListIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const Team = () => {
    const dispatch = useDispatch();
    const { isDarkMode } = useTheme();
    const {
        members,
        departments,
        loading,
        error,
        searchQuery,
        filters,
        sortBy,
        sortOrder
    } = useSelector((state: RootState) => state.team);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

    useEffect(() => {
        dispatch(fetchTeamMembers() as any);
        dispatch(fetchDepartments() as any);
    }, [dispatch]);

    const handleDepartmentChange = (department: string) => {
        setSelectedDepartment(department);
        if (department === 'all') {
            dispatch(fetchTeamMembers() as any);
        } else {
            dispatch(fetchTeamMembersByDepartment(department) as any);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setSearchQuery(e.target.value));
    };

    const handleStatusFilter = (status: string) => {
        const newStatuses = filters.status.includes(status)
            ? filters.status.filter(s => s !== status)
            : [...filters.status, status];
        dispatch(setFilters({ status: newStatuses }));
    };

    const handleSort = (newSortBy: 'name' | 'performance' | 'tasks' | 'seniority') => {
        if (sortBy === newSortBy) {
            dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'));
        } else {
            dispatch(setSortBy(newSortBy));
            dispatch(setSortOrder('asc'));
        }
    };

    const handleStatusChange = (memberId: string, status: string) => {
        dispatch(updateMemberStatus({ memberId, status }) as any);
    };

    const filteredAndSortedMembers = members
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

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
        <div className={`container mx-auto px-4 py-8 ${isDarkMode ? 'dark' : ''}`}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
                <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    Takım Üyeleri
                </h1>

                {/* Search and Filter Section */}
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        placeholder="Üye ara..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className={`px-4 py-2 rounded-lg border ${
                            isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300'
                        }`}
                    />

                    {/* Department Filter */}
                    <Menu as="div" className="relative">
                        <Menu.Button className={`inline-flex justify-center px-4 py-2 rounded-lg border ${
                            isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-700'
                        }`}>
                            {selectedDepartment === 'all' ? 'Tüm Departmanlar' : selectedDepartment}
                        </Menu.Button>
                        <Transition
                            enter="transition duration-100 ease-out"
                            enterFrom="transform scale-95 opacity-0"
                            enterTo="transform scale-100 opacity-100"
                            leave="transition duration-75 ease-out"
                            leaveFrom="transform scale-100 opacity-100"
                            leaveTo="transform scale-95 opacity-0"
                        >
                            <Menu.Items className={`absolute right-0 w-56 mt-2 origin-top-right rounded-md shadow-lg ${
                                isDarkMode
                                    ? 'bg-gray-800 ring-1 ring-black ring-opacity-5'
                                    : 'bg-white divide-y divide-gray-100'
                            }`}>
                                <div className="py-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => handleDepartmentChange('all')}
                                                className={`${
                                                    active
                                                        ? isDarkMode
                                                            ? 'bg-gray-700 text-white'
                                                            : 'bg-gray-100 text-gray-900'
                                                        : isDarkMode
                                                            ? 'text-gray-200'
                                                            : 'text-gray-700'
                                                } block px-4 py-2 text-sm w-full text-left`}
                                            >
                                                Tüm Departmanlar
                                            </button>
                                        )}
                                    </Menu.Item>
                                    {departments.map((department) => (
                                        <Menu.Item key={department}>
                                            {({ active }) => (
                                                <button
                                                    onClick={() => handleDepartmentChange(department)}
                                                    className={`${
                                                        active
                                                            ? isDarkMode
                                                                ? 'bg-gray-700 text-white'
                                                                : 'bg-gray-100 text-gray-900'
                                                            : isDarkMode
                                                                ? 'text-gray-200'
                                                                : 'text-gray-700'
                                                    } block px-4 py-2 text-sm w-full text-left`}
                                                >
                                                    {department}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    ))}
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>

                    {/* Sort Options */}
                    <Menu as="div" className="relative">
                        <Menu.Button className={`inline-flex justify-center px-4 py-2 rounded-lg border ${
                            isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-700'
                        }`}>
                            Sırala
                        </Menu.Button>
                        <Transition
                            enter="transition duration-100 ease-out"
                            enterFrom="transform scale-95 opacity-0"
                            enterTo="transform scale-100 opacity-100"
                            leave="transition duration-75 ease-out"
                            leaveFrom="transform scale-100 opacity-100"
                            leaveTo="transform scale-95 opacity-0"
                        >
                            <Menu.Items className={`absolute right-0 w-56 mt-2 origin-top-right rounded-md shadow-lg ${
                                isDarkMode
                                    ? 'bg-gray-800 ring-1 ring-black ring-opacity-5'
                                    : 'bg-white divide-y divide-gray-100'
                            }`}>
                                <div className="py-1">
                                    {[
                                        { id: 'name', label: 'İsim' },
                                        { id: 'performance', label: 'Performans' },
                                        { id: 'tasks', label: 'Görev Sayısı' }
                                    ].map((option) => (
                                        <Menu.Item key={option.id}>
                                            {({ active }) => (
                                                <button
                                                    onClick={() => handleSort(option.id as any)}
                                                    className={`${
                                                        active
                                                            ? isDarkMode
                                                                ? 'bg-gray-700 text-white'
                                                                : 'bg-gray-100 text-gray-900'
                                                            : isDarkMode
                                                                ? 'text-gray-200'
                                                                : 'text-gray-700'
                                                    } block px-4 py-2 text-sm w-full text-left`}
                                                >
                                                    {option.label}
                                                    {sortBy === option.id && (
                                                        <span className="ml-2">
                                                            {sortOrder === 'asc' ? '↑' : '↓'}
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    ))}
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>

            {/* Team Members Table */}
            <div className={`mt-8 overflow-x-auto rounded-lg shadow ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
                <table className="w-full">
                    <thead className={`${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                <button 
                                    onClick={() => handleSort('name')}
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                >
                                    <span>Üye</span>
                                    {sortBy === 'name' && (
                                        sortOrder === 'asc' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />
                                    )}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Departman</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                <button 
                                    onClick={() => handleSort('performance')}
                                    className="flex items-center space-x-1 hover:text-blue-500"
                                >
                                    <span>Performans</span>
                                    {sortBy === 'performance' && (
                                        sortOrder === 'asc' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />
                                    )}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Durum</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Uzmanlık</th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredAndSortedMembers.map((member) => (
                            <motion.tr
                                key={member.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`${
                                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                                } transition-colors`}
                            >
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 flex-shrink-0">
                                            {member.profileImage ? (
                                                <img
                                                    src={member.profileImage}
                                                    alt={member.fullName}
                                                    className="h-8 w-8 rounded-full"
                                                />
                                            ) : (
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                                    isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                                                }`}>
                                                    <span className="text-sm font-medium">
                                                        {member.fullName.split(' ').map(n => n[0]).join('')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-3">
                                            <div className="text-sm font-medium">{member.fullName}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{member.department}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                            <div 
                                                className={`h-full rounded-full ${
                                                    member.performanceScore >= 80 ? 'bg-green-500' :
                                                    member.performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${member.performanceScore}%` }}
                                            />
                                        </div>
                                        <span className="text-sm">{member.performanceScore}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        member.status === 'available' ? 'bg-green-100 text-green-800' :
                                        member.status === 'busy' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {member.expertise.slice(0, 2).map((exp, index) => (
                                            <span
                                                key={index}
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                {exp}
                                            </span>
                                        ))}
                                        {member.expertise.length > 2 && (
                                            <span className="text-xs text-gray-500">+{member.expertise.length - 2}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <div className="flex justify-center space-x-2">
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className={`p-1.5 rounded-full ${
                                                isDarkMode 
                                                    ? 'hover:bg-blue-600 text-gray-400 hover:text-white' 
                                                    : 'hover:bg-blue-100 text-gray-600 hover:text-blue-600'
                                            }`}
                                        >
                                            <ChatBubbleLeftIcon className="w-4 h-4" />
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className={`p-1.5 rounded-full ${
                                                isDarkMode 
                                                    ? 'hover:bg-purple-600 text-gray-400 hover:text-white' 
                                                    : 'hover:bg-purple-100 text-gray-600 hover:text-purple-600'
                                            }`}
                                        >
                                            <ClipboardDocumentListIcon className="w-4 h-4" />
                                        </motion.button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Team;
