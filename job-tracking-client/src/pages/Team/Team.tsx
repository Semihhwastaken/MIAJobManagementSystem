import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { fetchTeamMembers, fetchDepartments, fetchTeamMembersByDepartment } from '../../redux/features/teamSlice';
import { Menu } from '@headlessui/react';
import { motion } from 'framer-motion';

const Team = () => {
    const dispatch = useDispatch();
    const { members, departments, loading, error } = useSelector((state: RootState) => state.team);
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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Takım Üyeleri</h1>
                <Menu as="div" className="relative">
                    <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        {selectedDepartment === 'all' ? 'Tüm Departmanlar' : selectedDepartment}
                    </Menu.Button>
                    <Menu.Items className="absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={() => handleDepartmentChange('all')}
                                        className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
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
                                            className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                                } block px-4 py-2 text-sm w-full text-left`}
                                        >
                                            {department}
                                        </button>
                                    )}
                                </Menu.Item>
                            ))}
                        </div>
                    </Menu.Items>
                </Menu>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map((member) => (
                    <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white text-lg font-semibold">
                                    {member.fullName.split(' ').map(n => n[0]).join('')}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">{member.fullName}</h3>
                                <p className="text-sm text-gray-500">{member.department}</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-gray-600">{member.email}</p>
                            <p className="text-sm text-gray-600 mt-1">
                                Atanan Görevler: {member.assignedJobs.length}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Team;
