import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import {
    fetchMyTeams,
    setSearchQuery,
} from '../../redux/features/teamSlice';
import { Menu, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { 
    UserGroupIcon,
    UserPlusIcon,
    TrashIcon,
    PencilIcon,
    MagnifyingGlassIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import Footer from "../../components/Footer/Footer";

const Team = () => {
    const dispatch = useDispatch();
    const { isDarkMode } = useTheme();
    const {
        allTeams,
        loading,
        error,
        searchQuery,
    } = useSelector((state: RootState) => state.team);

    

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/auth';
            return;
        }

        const fetchTeams = async () => {
            try {
                await dispatch(fetchMyTeams() as any);
            } catch (error: any) {
                console.error('Takımlar yüklenirken hata oluştu:', error.message);
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/auth';
                }
            }
        };

        fetchTeams();
    }, [dispatch]);

    useEffect(() => {
        const handleAuthError = () => {
            window.location.href = '/auth';
        };

        window.addEventListener('authError', handleAuthError);
        return () => {
            window.removeEventListener('authError', handleAuthError);
        };
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setSearchQuery(e.target.value));
    };

    // Render loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="text-red-500 text-xl mb-4">{error}</div>
                <button
                    
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Yeniden Dene
                </button>
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
            {/* Search and Filter Section */}
            <div className="mb-6 flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Takım ara..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                            isDarkMode 
                                ? 'bg-gray-800 text-white border-gray-700' 
                                : 'bg-white text-gray-900 border-gray-300'
                        } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                
                <button
                   
                    className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Yeni Takım
                </button>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(allTeams) && allTeams.length > 0 ? (
                    allTeams.map((team) => (
                        <motion.div
                            key={team.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 rounded-lg shadow-lg ${
                                isDarkMode ? 'bg-gray-800' : 'bg-white'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-semibold">{team.name}</h3>
                                <Menu as="div" className="relative">
                                    <Menu.Button className="p-2 hover:bg-gray-100 rounded-full">
                                        <PencilIcon className="h-5 w-5 text-gray-500" />
                                    </Menu.Button>
                                    <Transition
                                        enter="transition duration-100 ease-out"
                                        enterFrom="transform scale-95 opacity-0"
                                        enterTo="transform scale-100 opacity-100"
                                        leave="transition duration-75 ease-out"
                                        leaveFrom="transform scale-100 opacity-100"
                                        leaveTo="transform scale-95 opacity-0"
                                    >
                                        <Menu.Items className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg ${
                                            isDarkMode ? 'bg-gray-700' : 'bg-white'
                                        } ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        
                                                        className={`${
                                                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                                        } group flex items-center w-full px-4 py-2 text-sm`}
                                                    >
                                                        <PencilIcon className="h-5 w-5 mr-3" />
                                                        Düzenle
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        
                                                        className={`${
                                                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                                        } group flex items-center w-full px-4 py-2 text-sm`}
                                                    >
                                                        <UserPlusIcon className="h-5 w-5 mr-3" />
                                                        Üye Ekle
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        
                                                        className={`${
                                                            active ? 'bg-red-100 text-red-900' : 'text-red-700'
                                                        } group flex items-center w-full px-4 py-2 text-sm`}
                                                    >
                                                        <TrashIcon className="h-5 w-5 mr-3" />
                                                        Sil
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
                            </div>
                            <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {team.description}
                            </p>
                            <div className="flex items-center space-x-2">
                                <UserGroupIcon className="h-5 w-5 text-gray-500" />
                                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                                    {team.members.length} Üye
                                </span>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-8">
                        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            No teams found. Create a new team to get started.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Team;
