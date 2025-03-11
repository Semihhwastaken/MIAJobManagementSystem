import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import axiosInstance from '../../services/axiosInstance';
import { toast } from 'react-toastify';

const SubscriptionPlans: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleSubscribe = async (planType: string) => {
    try {
      setLoading(true);
      
      // The URL the user will be redirected to after successful payment
      const successUrl = `${window.location.origin}/subscription/success`;
      // The URL the user will be redirected to if they cancel the payment
      const cancelUrl = `${window.location.origin}/subscription/cancel`;
      
      const response = await axiosInstance.post('/subscription/create-checkout-session', {
        planType,
        successUrl,
        cancelUrl
      });
      
      // Redirect to Stripe checkout page
      window.location.href = response.data.sessionId 
        ? `https://checkout.stripe.com/pay/${response.data.sessionId}`
        : response.data.url;
      
    } catch (error) {
      console.error('Error creating subscription session:', error);
      toast.error('Ödeme sayfası oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Abonelik Planları
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            İhtiyaçlarınıza uygun planı seçin ve iş yönetimini bir üst seviyeye taşıyın.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-x-8">
          {/* Free Plan */}
          <div className="relative bg-white p-8 rounded-2xl shadow-lg border border-gray-200 flex flex-col">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">Ücretsiz</h3>
              <p className="mt-4 flex items-baseline text-gray-900">
                <span className="text-5xl font-extrabold tracking-tight">₺0</span>
                <span className="ml-1 text-xl font-semibold">/ay</span>
              </p>
              <p className="mt-6 text-gray-500">Temel iş yönetimi özellikleri ile başlayın.</p>

              <ul className="mt-6 space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">5 takım üyesi</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">10 aktif görev</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">Temel görev yönetimi</p>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <div className="rounded-lg shadow-md">
                <button
                  disabled
                  className="w-full bg-gray-200 border border-transparent rounded-md py-3 px-5 text-base font-medium text-gray-500 hover:bg-gray-300"
                >
                  Mevcut Plan
                </button>
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="relative bg-white p-8 rounded-2xl shadow-lg border-2 border-blue-500 flex flex-col">
            <div className="absolute -top-5 left-0 right-0 flex justify-center">
              <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-blue-100 text-blue-600">
                En Popüler
              </span>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">Pro</h3>
              <p className="mt-4 flex items-baseline text-gray-900">
                <span className="text-5xl font-extrabold tracking-tight">₺99</span>
                <span className="ml-1 text-xl font-semibold">/ay</span>
              </p>
              <p className="mt-6 text-gray-500">Profesyonel proje yönetimi araçları ile işinizi büyütün.</p>

              <ul className="mt-6 space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">Sınırsız takım üyesi</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">Sınırsız aktif görev</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">Gelişmiş görev yönetimi</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">İstatistik raporlar</p>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <div className="rounded-lg shadow-md">
                <button
                  onClick={() => handleSubscribe('pro')}
                  disabled={loading}
                  className="w-full bg-blue-500 border border-transparent rounded-md py-3 px-5 text-base font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                >
                  {loading ? 'Yönlendiriliyor...' : 'Şimdi Abone Ol'}
                </button>
              </div>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="relative bg-white p-8 rounded-2xl shadow-lg border border-gray-200 flex flex-col">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">Kurumsal</h3>
              <p className="mt-4 flex items-baseline text-gray-900">
                <span className="text-5xl font-extrabold tracking-tight">₺999</span>
                <span className="ml-1 text-xl font-semibold">/yıl</span>
              </p>
              <p className="mt-6 text-gray-500">Büyük ekipler için özel çözümler ve öncelikli destek.</p>

              <ul className="mt-6 space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">Pro plan özellikleri</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">Öncelikli teknik destek</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">Özelleştirilebilir iş akışları</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">Gelişmiş güvenlik özellikleri</p>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <div className="rounded-lg shadow-md">
                <button
                  onClick={() => handleSubscribe('enterprise')}
                  disabled={loading}
                  className="w-full bg-gray-800 border border-transparent rounded-md py-3 px-5 text-base font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:ring-offset-gray-50"
                >
                  {loading ? 'Yönlendiriliyor...' : 'Şimdi Abone Ol'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-base text-gray-500">
            Tüm planlar otomatik yenilenir fakat istediğiniz zaman iptal edebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;