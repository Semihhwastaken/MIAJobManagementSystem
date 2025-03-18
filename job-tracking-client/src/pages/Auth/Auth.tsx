import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box,
    Container,
    Typography,
    TextField,
    Paper,
    useTheme,
    IconButton,
    InputAdornment,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Person as PersonIcon,
    Email as EmailIcon,
    Lock as LockIcon,
} from '@mui/icons-material';
import { verifyAndRegister } from '../../services/api';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import logo from '../../assets/images/logo.png';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import { Google } from '@mui/icons-material';
import { useNotification } from '../../components/Notification/Notification';
import { useDispatch } from 'react-redux';
import { setUser, setToken } from '../../redux/features/authSlice';
import SignalRService from '../../services/signalRService';


const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#FFFFFF',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
}));

const FormContainer = styled('form')(({ theme }) => ({
    width: '100%',
    marginTop: theme.spacing(1),
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: 'rgba(0, 0, 0, 0.23)',
        },
        '&:hover fieldset': {
            borderColor: theme.palette.primary.main,
        },
        '& input': {
            color: '#000000',
            '&:-webkit-autofill': {
                WebkitBoxShadow: '0 0 0 1000px white inset',
                WebkitTextFillColor: '#000000'
            },
            '&:-webkit-autofill:hover': {
                WebkitBoxShadow: '0 0 0 1000px white inset'
            },
            '&:-webkit-autofill:focus': {
                WebkitBoxShadow: '0 0 0 1000px white inset'
            },
            '&:-webkit-autofill:active': {
                WebkitBoxShadow: '0 0 0 1000px white inset'
            }
        }
    },
    '& .MuiInputLabel-root': {
        color: 'rgba(0, 0, 0, 0.7)',
    },
    '& .MuiInputAdornment-root .MuiSvgIcon-root': {
        color: 'rgba(0, 0, 0, 0.54)',
    }
}));

const AuthButton = styled(motion.button)(({ theme }) => ({
    width: '100%',
    margin: theme.spacing(3, 0, 2),
    padding: theme.spacing(1.5),
    borderRadius: '10px',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
    '&:hover': {
        background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.primary.main} 90%)`,
    },
}));

const ToggleButton = styled(motion.button)(({ theme }) => ({
    width: '100%',
    marginTop: theme.spacing(2),
    padding: theme.spacing(1),
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: theme.palette.primary.main,
    '&:hover': {
        color: theme.palette.primary.dark,
    },
}));

interface VerificationResponse {
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
        fullName: string;
        department: string;
    };
    error?: string;
}

const Auth: React.FC = () => {
    const dispatch = useDispatch();
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationStep, setVerificationStep] = useState<'initiate' | 'verify' | null>(null);
    const theme = useTheme();
    const navigate = useNavigate();
    const {showSuccess, showError } = useNotification();
    const { setIsAuthenticated } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
        department: '',
        title: '',
        phone: '',
        position: '',
        profileImage: ''

    });

    const [errors, setErrors] = useState<{
        username?: string;
        email?: string;
        password?: string;
        fullName?: string;
        department?: string;
        title?: string;
        phone?: string;
        position?: string;
        verificationCode?: string;
        general?: string;
    }>({});

    // Initialize SignalR service
    const signalRService = SignalRService.getInstance();

    const validateForm = () => {
        const tempErrors = {
            username: '',
            email: '',
            password: '',
            fullName: '',
            department: '',
            title: '',
            phone: '',
            position: '',
            general: ''
        };
        let isValid = true;

        // Kullanıcı adı kontrolü
        if (!formData.username) {
            tempErrors.username = 'Kullanıcı adı gereklidir';
            isValid = false;
        } else if (formData.username.length < 3) {
            tempErrors.username = 'Kullanıcı adı en az 3 karakter olmalıdır';
            isValid = false;
        }

        // Email kontrolü (sadece kayıt olurken)
        if (!isLogin) {
            if (!formData.email) {
                tempErrors.email = 'E-posta adresi gereklidir';
                isValid = false;
            } else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData.email)) {
                    tempErrors.email = 'Geçerli bir e-posta adresi giriniz';
                    isValid = false;
                }
            }

            // Diğer alanların kontrolü
            if (!formData.fullName) {
                tempErrors.fullName = 'Ad Soyad gereklidir';
                isValid = false;
            }

            if (!formData.department) {
                tempErrors.department = 'Departman gereklidir';
                isValid = false;
            }

            if (!formData.title) {
                tempErrors.title = 'Ünvan gereklidir';
                isValid = false;
            }

            if (!formData.position) {
                tempErrors.position = 'Pozisyon gereklidir';
                isValid = false;
            }

            if (!formData.phone) {
                tempErrors.phone = 'Telefon numarası gereklidir';
                isValid = false;
            }

        }

        // Şifre kontrolü
        if (!formData.password) {
            tempErrors.password = 'Parola gereklidir';
            isValid = false;
        } else if (formData.password.length < 6) {
            tempErrors.password = 'Parola en az 6 karakter olmalıdır';
            isValid = false;
        }

        setErrors(tempErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            if (!isLogin) {
                // Registration flow
                if (!verificationStep) {
                    // Step 1: Initiate registration
                    const response = await fetch('http://localhost:5193/api/auth/register/initiate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: formData.email,
                            username: formData.username,
                            password: formData.password,
                            fullName: formData.fullName,
                            department: formData.department,
                            title: formData.title,
                            phone: formData.phone,
                            position: formData.position,
                            profileImage: formData.profileImage
                        })
                    });

                    const data = await response.json();
                    console.log('Initiate Response:', data);

                    if (response.ok) {
                        setVerificationStep('verify');
                        showSuccess('Doğrulama kodu e-postanına gönderildi.');
                        setErrors({});
                    } else {
                        const errorMessage = data.errors ? Object.values(data.errors).flat().join(', ') :
                            data.Message || data.message || 'An error occurred';
                        setErrors({ general: errorMessage });
                        showError('Başarısız.');
                    }
                } else if (verificationStep === 'verify') {
                    // Step 2: Complete registration with verification
                    const response = await fetch('http://localhost:5193/api/auth/register/verify', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: formData.email,
                            code: verificationCode,
                            username: formData.username,
                            password: formData.password,
                            fullName: formData.fullName || '',
                            department: formData.department || '',
                            title: formData.title || '',
                            phone: formData.phone || '',
                            position: formData.position || '',
                            profileImage: formData.profileImage
                        })
                    });

                    const data = await response.json();
                    console.log('Verify Response:', data);

                    if (response.ok) {
                        // Store the token and user data
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));

                        // Update Redux state
                        dispatch(setToken(data.token));
                        dispatch(setUser(data.user));

                        // Update authentication context
                        setIsAuthenticated(true);

                        // Initialize SignalR connections
                        const signalRService = SignalRService.getInstance();
                        await signalRService.startConnection(data.user.id);

                        showSuccess('Başarıyla kayıt olundu.');
                        // Navigate to home page
                        navigate('/');
                    } else {
                        const errorMessage = data.Message || data.message || 'An error occurred';
                        setErrors({ general: errorMessage });
                        showError('Doğrulama başarısız.');
                    }
                }
            } else {
                // Login flow
                try {
                    const response = await fetch('http://localhost:5193/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username: formData.username,
                            password: formData.password
                        })
                    });

                    // response.json()'ı bir kez çağırıp sonucu saklıyoruz
                    const data = await response.json();
                    console.log('Login Response:', data);

                    if (response.ok) {
                        if (!data.token || !data.user) {
                            throw new Error('Sunucudan geçersiz yanıt formatı alındı');
                        }
                        try {
                            // Store auth data
                            localStorage.setItem('token', data.token);
                            localStorage.setItem('user', JSON.stringify(data.user));

                            // Update Redux state
                            dispatch(setToken(data.token));
                            dispatch(setUser(data.user));

                            // Update authentication context
                            setIsAuthenticated(true);

                            // Initialize SignalR connections
                            const signalRService = SignalRService.getInstance();
                            await signalRService.startConnection(data.user.id);

                            // Only navigate if everything is successful
                            showSuccess('Başarıyla giriş yaptınız.');
                            navigate('/');
                        } catch (error) {
                            console.error('Giriş sonrası kurulum sırasında hata:', error);
                            setErrors({ general: 'Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.' });
                            // Clear any partial auth state
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            setIsAuthenticated(false);
                        }
                    } else {
                        // response.ok değilse, zaten aldığımız data'yı kullanıyoruz
                        let errorMessage = 'Bir hata oluştu';
                        
                        if (data && data.message) {
                            errorMessage = data.message;
                        } else if (response.status === 401) {
                            errorMessage = 'Kullanıcı adı veya şifre hatalı';
                        } else if (response.status === 500) {
                            errorMessage = 'Sunucu hatası, lütfen daha sonra tekrar deneyin';
                        }
                        
                        setErrors({ general: errorMessage });
                        showError(`Giriş başarısız: ${errorMessage}`);
                    }
                } catch (fetchError) {
                    console.error('Giriş isteği sırasında hata:', fetchError);
                    setErrors({ general: 'Sunucuya bağlanırken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.' });
                    showError('Sunucuya bağlanılamadı');
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
            setErrors({ general: 'An unexpected error occurred. Please try again.' });
        }
    };

    const handleVerificationSubmit = async () => {
        if (!verificationCode) {
            setErrors(prev => ({
                ...prev,
                verificationCode: 'Doğrulama kodu gereklidir'
            }));
            return;
        }

        try {
            const response = await verifyAndRegister({
                ...formData,
                code: verificationCode
            }) as VerificationResponse;

            if (response.error) {
                setErrors(prev => ({
                    ...prev,
                    verificationCode: response.error
                }));
                return;
            }

            if (response.token && response.user) {
                // Store the token and user data
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                // Update Redux state
                dispatch(setToken(response.token));
                dispatch(setUser(response.user));

                // Update authentication context
                setIsAuthenticated(true);
                setVerificationDialogOpen(false);

                // Initialize SignalR connections
                await signalRService.startConnection(response.user.id);

                // Navigate to home page
                navigate('/');
            }
        } catch (error) {
            console.error('Verification error:', error);
            setErrors(prev => ({
                ...prev,
                verificationCode: 'An unexpected error occurred'
            }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGoogleSuccess = async (tokenResponse: { access_token: string }) => {
        try {
            const response = await axios.post('http://localhost:5193/api/auth/google', {
                token: tokenResponse.access_token
            });

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                dispatch(setToken(response.data.token));
                setIsAuthenticated(true);
                navigate('/');
            }
        } catch (error: unknown) {
            setErrors(prev => ({
                ...prev,
                general: axios.isAxiosError(error) && error.response?.data?.message || 'Google ile giriş yapılırken bir hata oluştu'

            }));
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleSuccess,
        onError: () => {
            setErrors(prev => ({
                ...prev,
                general: 'Google ile giriş yapılırken bir hata oluştu'

            }));
        }
    });

    useEffect(() => {
        console.log('Modal state changed:', verificationDialogOpen);
    }, [verificationDialogOpen]);

    return (
        <Container
            component="main"
            maxWidth={false}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '2rem 1rem'
            }}
        >

            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    padding: theme.spacing(2),
                    overflow: 'hidden',
                    gap: 4
                }}
            >
                {/* Left side content */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        overflow: 'hidden',
                    }}
                >
                    <motion.div
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Typography
                            variant="h2"
                            component="h1"
                            sx={{
                                color: '#1a237e',
                                fontWeight: 'bold',
                                mb: 2,
                                fontSize: '3.5rem',
                                overflow: 'hidden',
                            }}
                        >
                            MIA Teknoloji

                        </Typography>
                        <Typography
                            variant="h2"
                            component="h1"
                            sx={{
                                color: '#283593',
                                fontWeight: 'bold',
                                mb: 3,
                                fontSize: '3.5rem',
                                overflow: 'hidden',
                            }}
                        >
                            İş Takip Sistemi
                        </Typography>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                color: '#455a64',
                                fontSize: '1.2rem',
                                fontWeight: 500,
                                overflow: 'hidden',
                            }}
                        >
                            İşlerinizi bir yerde topluyoruz!
                        </Typography>
                    </motion.div>
                </Box>

                {/* Right side - Login/Register form */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <StyledPaper elevation={6} sx={{ width: '100%', maxWidth: '450px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                mb: 4,
                                overflow: 'hidden',
                            }}>
                                <img
                                    src={logo}
                                    alt="MIA Teknoloji Logo"
                                    style={{
                                        width: '180px',
                                        height: 'auto',
                                        objectFit: 'contain',
                                        marginBottom: '1rem',
                                        overflow: 'hidden',
                                    }}
                                />

                                <Typography
                                    component="h1"
                                    variant="h5"
                                    sx={{
                                        mb: 1,
                                        color: theme.palette.primary.main,
                                        textAlign: 'center',
                                        fontWeight: 500,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {isLogin ? 'Hoşgeldiniz!' : 'Kayıt Ol'}
                                </Typography>
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        color: 'text.secondary',
                                        textAlign: 'center'
                                    }}
                                >
                                    Keep all your credentials safe!
                                </Typography>
                            </Box>
                        </motion.div>

                        <FormContainer onSubmit={handleSubmit}>
                            {errors.general && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Typography
                                        color="error"
                                        variant="body2"
                                        sx={{
                                            textAlign: 'center',
                                            mb: 2,
                                            padding: '8px',
                                            backgroundColor: '#ffebee',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        {errors.general}
                                    </Typography>
                                </motion.div>
                            )}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={isLogin ? 'login' : 'register'}
                                    initial={{ x: isLogin ? -100 : 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: isLogin ? 100 : -100, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <StyledTextField
                                        required
                                        fullWidth
                                        name="username"
                                        label="Kullanıcı Adı"
                                        value={formData.username}
                                        onChange={handleChange}
                                        error={!!errors.username}
                                        helperText={errors.username}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <PersonIcon color={errors.username ? "error" : "primary"} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    {!isLogin && (
                                        <>
                                            <StyledTextField
                                                required
                                                fullWidth
                                                name="email"
                                                label="E-posta"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                error={!!errors.email}
                                                helperText={errors.email}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <EmailIcon color={errors.email ? "error" : "primary"} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />

                                            <StyledTextField
                                                fullWidth
                                                margin="normal"
                                                label="Full Name"
                                                type="text"
                                                value={formData.fullName || ''}
                                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                error={!!errors.fullName}
                                                helperText={errors.fullName}
                                            />
                                            <StyledTextField
                                                fullWidth
                                                margin="normal"
                                                label="Department"
                                                type="text"
                                                value={formData.department || ''}
                                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                error={!!errors.department}
                                                helperText={errors.department}
                                            />
                                            <StyledTextField
                                                fullWidth
                                                margin="normal"
                                                label="Title"
                                                type="text"
                                                value={formData.title || ''}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                error={!!errors.title}
                                                helperText={errors.title}
                                            />
                                            <StyledTextField
                                                fullWidth
                                                margin="normal"
                                                label="Phone"
                                                type="text"
                                                value={formData.phone || ''}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                error={!!errors.phone}
                                                helperText={errors.phone}
                                            />
                                            <StyledTextField
                                                fullWidth
                                                margin="normal"
                                                label="Position"
                                                type="text"
                                                value={formData.position || ''}
                                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                                error={!!errors.position}
                                                helperText={errors.position}
                                            />
                                        </>
                                    )}

                                    <StyledTextField
                                        required
                                        fullWidth
                                        name="password"
                                        label="Parola"
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={handleChange}
                                        error={!!errors.password}
                                        helperText={errors.password}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockIcon color={errors.password ? "error" : "primary"} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="toggle password visibility"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                    >
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    {!isLogin && verificationStep === 'verify' && (
                                        <StyledTextField
                                            fullWidth
                                            margin="normal"
                                            label="Verification Code"
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            error={!!errors.verificationCode}
                                            helperText={errors.verificationCode}
                                        />
                                    )}

                                    {errors.general && (
                                        <Typography
                                            color="error"
                                            variant="body2"
                                            sx={{ mt: 1, textAlign: 'center' }}
                                        >
                                            {errors.general}
                                        </Typography>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            <AuthButton
                                type="submit"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                            </AuthButton>

                            {isLogin && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Google />}
                                    onClick={() => googleLogin()}
                                    sx={{
                                        mt: 2,
                                        mb: 1,
                                        color: '#4285F4',
                                        borderColor: '#4285F4',
                                        '&:hover': {
                                            borderColor: '#4285F4',
                                            backgroundColor: 'rgba(66, 133, 244, 0.04)'
                                        }
                                    }}
                                >
                                    Google ile Giriş Yap
                                </Button>
                            )}

                            <ToggleButton
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                whileHover={{ scale: 1.02 }}
                            >
                                {isLogin ? 'Bir hesabın yok mu? Kaydol' : 'Zaten bir hesabın var mı? Giriş Yap'}
                            </ToggleButton>
                        </FormContainer>
                    </StyledPaper>
                </Box>
            </Box>

            {/* Verification Dialog */}
            <Dialog
                open={verificationDialogOpen}
                onClose={() => {
                    console.log('Modal closing');
                    setVerificationDialogOpen(false);
                }}
                PaperProps={{
                    style: {
                        borderRadius: '15px',
                        padding: '20px',
                        minWidth: '400px'
                    }
                }}
            >
                <DialogTitle>
                    Email Doğrulama
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" style={{ marginBottom: '20px' }}>
                        Email adresinize gönderilen 6 haneli doğrulama kodunu giriniz.
                    </Typography>
                    <StyledTextField
                        fullWidth
                        label="Doğrulama Kodu"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        error={!!errors.verificationCode}
                        helperText={errors.verificationCode}
                        variant="outlined"
                        margin="normal"
                        autoFocus
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVerificationDialogOpen(false)} color="primary">
                        İptal
                    </Button>
                    <Button
                        onClick={handleVerificationSubmit}
                        color="primary"
                        variant="contained"
                        style={{
                            borderRadius: '8px',
                            padding: '8px 20px'
                        }}
                    >
                        Doğrula
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Auth;
