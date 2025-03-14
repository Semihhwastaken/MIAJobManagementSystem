import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { joinTeamWithInviteCode } from '../../redux/features/teamSlice';
import { AppDispatch } from '../../redux/store';
import { useSnackbar } from 'notistack';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    UserGroupIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

const TeamInvite: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const { enqueueSnackbar } = useSnackbar();
    const { isDarkMode } = useTheme();
    const [isJoining, setIsJoining] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<boolean>(false);

    const inviteCode = searchParams.get('code');

    useEffect(() => {
        if (!inviteCode) {
            navigateWithCountdown('/', 'Geçersiz davet kodu');
            return;
        }
        joinTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inviteCode]);

    useEffect(() => {
        if (countdown !== null && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            navigate('/team');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countdown]);

    const navigateWithCountdown = (_path: string, message: string, variant: 'success' | 'error' = 'error') => {
        setStatus(message);
        enqueueSnackbar(message, { variant });
        setCountdown(5);
    };

    const joinTeam = async () => {
        if (!inviteCode || isJoining) return;

        setIsJoining(true);
        setStatus('Ekibe katılma işlemi gerçekleştiriliyor...');

        try {
            const result = await dispatch(joinTeamWithInviteCode(inviteCode)).unwrap();
            navigateWithCountdown('/team', result.message, 'success');
        } catch (error: unknown) {
            // HTTP 400 hatasını kontrol et
            if ((error as { response?: { status?: number }, message?: string }).response?.status === 400 || (error as { message?: string }).message?.includes('Zaten bu takımın üyesisiniz')) {
                const message = 'Bu ekibe zaten üyesiniz';
                setStatus(message);
                setError(true);
                navigateWithCountdown('/team', message, 'error');
            } else {
                navigateWithCountdown('/team', (error as { message: string }).message || 'Ekibe katılırken r hata oluştu', 'error');
            }
        } finally {
            setIsJoining(false);
        }
    };

    // Animasyon varyantları
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    const iconVariants = {
        hidden: { scale: 0 },
        visible: { 
            scale: 1,
            transition: { 
                type: "spring",
                stiffness: 200,
                delay: 0.2
            }
        }
    };

    const statusVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { 
            opacity: 1, 
            x: 0,
            transition: { delay: 0.3 }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
            <motion.div 
                className={`max-w-md w-full p-8 rounded-2xl shadow-xl backdrop-blur-sm ${
                    isDarkMode 
                        ? 'bg-gray-800/90 text-white' 
                        : 'bg-white/90 text-gray-900'
                }`}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div 
                    className="text-center mb-8"
                    variants={iconVariants}
                >
                    <UserGroupIcon className="h-20 w-20 mx-auto text-blue-500 mb-4" />
                    <h1 className="text-3xl font-bold">Ekip Davetiyesi</h1>
                </motion.div>

                <div className="text-center">
                    {isJoining ? (
                        <motion.div 
                            className="mb-6"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <ArrowPathIcon className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
                            <p className="text-lg">{status}</p>
                        </motion.div>
                    ) : (
                        <motion.div 
                            className="space-y-4"
                            variants={statusVariants}
                        >
                            { !error ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <XCircleIcon className="h-8 w-8 text-red-500" />
                                    <p className="text-lg text-red-500">Bu ekibe zaten üyesiniz veya erişim yetkiniz yok</p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center space-x-2">
                                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                                    <p className="text-lg text-green-500">{status}</p>
                                </div>
                            )}

                            {countdown !== null && (
                                <motion.div 
                                    className="mt-8"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                >
                                    <div className={`text-2xl font-bold mb-2 ${
                                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`}>
                                        {countdown}
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        saniye içinde yönlendiriliyorsunuz
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default TeamInvite;
