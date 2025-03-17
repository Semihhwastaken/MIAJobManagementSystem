import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import axiosInstance from '../../services/axiosInstance';
import { toast } from 'react-toastify';
import { updateSubscription } from '../../redux/features/authSlice';
import { CircularProgress } from '@mui/material';

const plans = [
  {
    id: 'basic',
    name: 'Ücretsiz',
    price: '0.00',
    features: ['5 kullanıcıya kadar', 'Temel özellikler', 'Email desteği','Sınırlı API erişimi'],
    planType: 'basic'
  },
  {
    id: 'pro',
    name: 'Profesyonel',
    price: '9.99',
    features: [
      '25 kullanıcıya kadar',
      'Gelişmiş raporlama',
      'Öncelikli destek',
      'API erişimi',
    ],
    planType: 'pro'
  },
  {
    id: 'enterprise',
    name: 'Kurumsal',
    price: '19.99',
    features: [
      'Sınırsız kullanıcı',
      'Özel destek',
      'Özelleştirilebilir çözümler',
      'SLA garantisi',
    ],
    planType: 'enterprise'
  },
];

const Subscription: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [localSubscriptionData, setLocalSubscriptionData] = useState({
    plan: '',
    id: '',
    status: '',
    endDate: null as string | null
  });
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();

  // İlk yüklemede subscription durumu güncelleme
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        setIsDataLoading(true);
        const response = await axiosInstance.get('/subscription/subscription-status');
        
        // Save subscription data locally for component state
        setLocalSubscriptionData({
          plan: response.data.subscriptionPlan,
          id: response.data.subscriptionId,
          status: response.data.subscriptionStatus || 'active',
          endDate: response.data.subscriptionExpiryDate
        });
        
        // Redux'ı güncelle
        dispatch(updateSubscription({
          subscriptionPlan: response.data.subscriptionPlan,
          subscriptionId: response.data.subscriptionId,
          subscriptionStatus: response.data.subscriptionStatus || 'active',
          subscriptionEndDate: response.data.subscriptionExpiryDate
        }));
        
        // Update localStorage to ensure data persists after refresh
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          userData.subscriptionPlan = response.data.subscriptionPlan;
          userData.subscriptionId = response.data.subscriptionId;
          userData.subscriptionStatus = response.data.subscriptionStatus || 'active';
          userData.subscriptionEndDate = response.data.subscriptionExpiryDate;
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (err) {
        console.error('Abonelik bilgileri alınırken hata oluştu:', err);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, [dispatch]);

  // Pro veya Enterprise üyelikte Basic planı gösterme
  const displayedPlans = React.useMemo(() => {
    // Use local state instead of Redux state for more reliable rendering
    const activePlan = localSubscriptionData.plan || user?.subscriptionPlan;
    
    return plans.filter(plan => {
      if ((activePlan === 'pro' || activePlan === 'enterprise') && plan.id === 'basic') {
        return false;
      }
      return true;
    });
  }, [localSubscriptionData.plan, user?.subscriptionPlan]);

  // Helper function to determine if a plan is active
  const isPlanActive = (planId: string) => {
    const activePlan = localSubscriptionData.plan || user?.subscriptionPlan;
    return activePlan === planId;
  };

  // Helper function to determine if a button should be disabled
  const isButtonDisabled = (planId: string) => {
    const activePlan = localSubscriptionData.plan || user?.subscriptionPlan;
    const activeStatus = localSubscriptionData.status || user?.subscriptionStatus;
    
    return isLoading || 
           (activePlan === planId) || 
           (planId === 'basic' && activePlan === 'basic' && activeStatus === 'active');
  };

  const handleSubscribe = async (planType: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Basic plan için özel işlem
      if (planType === 'basic') {
        // Kullanıcının planını basic olarak ayarla
        dispatch(updateSubscription({
          subscriptionPlan: 'basic',
          subscriptionId: '',
          subscriptionStatus: 'active',
          subscriptionEndDate: null
        }));
        
        // Basic plan seçimi başarılı mesajı göster
        toast.success('Ücretsiz plan başarıyla seçildi!');
        
        // localStorage'daki kullanıcı bilgilerini güncelle
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          userData.subscriptionPlan = 'basic';
          userData.subscriptionStatus = 'active';
          userData.subscriptionId = '';
          userData.subscriptionEndDate = null;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        // Sayfayı yenile veya anasayfaya yönlendir
        setTimeout(() => window.location.href = '/', 1500);
        return;
      }

      // Diğer planlar için ödeme sürecine devam et
      const response = await axiosInstance.get(`/subscription/payment-link/${planType}`);

      if (!response.data?.paymentUrl) {
        throw new Error('Ödeme linki alınamadı');
      }

      // Başarı sayfasına plan türünü parametre olarak ekle
      const successUrl = `${window.location.origin}/subscription/success?plan=${planType}`;
      const paymentUrl = response.data.paymentUrl.replace(
        /success_url=([^&]+)/,
        `success_url=${encodeURIComponent(successUrl)}`
      );

      // Ödeme sayfasına yönlendir
      window.location.href = paymentUrl;
      
    } catch (error) {
      console.error('Subscription error:', error);
      setError('Abonelik işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Aboneliğinizi iptal etmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await axiosInstance.post('/subscription/cancel');
      
      toast.success('Aboneliğiniz başarıyla iptal edildi');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Abonelik iptal edilirken bir hata oluştu');
      toast.error('Abonelik iptal edilirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while data is loading
  if (isDataLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <CircularProgress color="primary" size={60} />
          <p className={`mt-4 text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Abonelik bilgileri yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className={`text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'} sm:text-4xl`}>
            Planlar ve Fiyatlandırma
          </h2>
          <p className={`mt-4 text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            İhtiyaçlarınıza en uygun planı seçin
          </p>
          {user?.subscriptionPlan && (
            <p className={`mt-2 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Mevcut Planınız: <span className="font-semibold text-indigo-500">{plans.find(p => p.id === user.subscriptionPlan)?.name}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mt-8 max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
          {displayedPlans.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ scale: 1.02 }}
              className={`rounded-lg shadow-lg overflow-hidden relative ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              } ${isPlanActive(plan.id) ? 'ring-4 ring-indigo-500 transform scale-105' : ''}`}
            >
              <div className="px-6 py-8">
                {isPlanActive(plan.id) && (
                  <div className="absolute top-0 right-0 m-2 px-3 py-1 bg-indigo-500 text-white text-sm font-medium rounded-full">
                    Aktif Plan
                  </div>
                )}
                <h3 className={`text-2xl font-semibold text-center ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {plan.name}
                </h3>
                <p className="mt-4 text-center">
                  <span className={`text-4xl font-extrabold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    ${plan.price}
                  </span>
                  <span className={`text-base font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    /ay
                  </span>
                </p>
                <ul className={`mt-8 space-y-4 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg
                        className="flex-shrink-0 h-5 w-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="ml-3">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {isPlanActive(plan.id) && plan.id !== 'basic' ? (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={isLoading}
                      className="w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition duration-200"
                    >
                      {isLoading ? 'İşleniyor...' : 'Aboneliği İptal Et'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.planType)}
                      disabled={isButtonDisabled(plan.id)}
                      className={`w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white transition duration-200 ${
                        isButtonDisabled(plan.id)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : plan.id === 'basic'
                          ? 'bg-green-600 hover:bg-green-700'
                          : plan.id === 'pro'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      } ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isLoading 
                        ? 'İşleniyor...' 
                        : isPlanActive(plan.id) || (plan.id === 'basic' && isPlanActive('basic'))
                        ? 'Mevcut Plan' 
                        : 'Şimdi Başla'
                      }
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Subscription;