import React, { useState, useContext } from 'react';
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
    Button
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Person as PersonIcon,
    Email as EmailIcon,
    Lock as LockIcon,
} from '@mui/icons-material';
import { login, register } from '../services/api';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import logo from '../assets/images/logo.png';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import { Google } from '@mui/icons-material';

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

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const theme = useTheme();
    const navigate = useNavigate();
    const { setIsAuthenticated } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState<{
        username?: string;
        email?: string;
        password?: string;
        general?: string;
    }>({});

    const validateForm = () => {
        let tempErrors = {
            username: '',
            email: '',
            password: '',
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
        setErrors({ username: '', email: '', password: '', general: '' });

        if (!validateForm()) {
            return;
        }

        try {
            if (isLogin) {
                const response = await login({
                    username: formData.username,
                    password: formData.password,
                });
                if (response.error || response.message?.toLowerCase().includes('error')) {
                    const errorMessage = response.error || response.message;
                    setErrors(prev => ({ ...prev, general: errorMessage }));
                    return;
                }

                if (response.token) {
                    localStorage.setItem('token', response.token);
                    setIsAuthenticated(true);
                    navigate('/');
                }
            } else {
                const response = await register(formData);

                if (response.error || response.message?.toLowerCase().includes('error')) {
                    const errorMessage = response.error || response.message;

                    if (errorMessage.toLowerCase().includes('kullanıcı adı')) {
                        setErrors(prev => ({ ...prev, username: 'Bu kullanıcı adı zaten kullanılıyor' }));
                    } else if (errorMessage.toLowerCase().includes('e-posta')) {
                        setErrors(prev => ({ ...prev, email: 'Bu e-posta adresi zaten kayıtlı' }));
                    } else {
                        setErrors(prev => ({ ...prev, general: errorMessage }));
                    }
                    return;
                }

                if (response.token) {
                    localStorage.setItem('token', response.token);
                    setIsAuthenticated(true);
                    navigate('/');
                }
            }
        } catch (error) {
            console.error('Auth error:', error);

            setErrors(prev => ({
                ...prev,
                general: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'

            }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGoogleSuccess = async (tokenResponse: any) => {
        try {
            const response = await axios.post('http://localhost:5193/api/auth/google', {
                token: tokenResponse.access_token
            });

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                setIsAuthenticated(true);
                navigate('/');
            }
        } catch (error: any) {

            setErrors(prev => ({
                ...prev,
                general: error.response?.data?.message || 'Google ile giriş yapılırken bir hata oluştu'

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
        </Container>
    );
};

export default Auth;
