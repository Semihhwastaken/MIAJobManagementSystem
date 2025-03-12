import React from 'react';
import { useNavigate } from 'react-router-dom';

const SubscriptionCancel: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    // Change from '/subscription/plans' to '/subscription'
    navigate('/subscription');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-yellow-100">
            <svg className="h-12 w-12 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Ödeme İptal Edildi</h2>
          <p className="mt-2 text-md text-gray-600">
            Ödeme işleminiz tamamlanmadı. Sorun yaşıyorsanız bize ulaşabilir veya daha sonra tekrar deneyebilirsiniz.
          </p>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={handleGoBack}
            className="group relative flex justify-center py-3 px-4 border border-transparent text-md font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Planlara Dön
          </button>
          <button
            onClick={handleGoHome}
            className="group relative flex justify-center py-3 px-4 border border-gray-300 text-md font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Ana Sayfaya Git
          </button>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>
            Yardıma ihtiyacınız varsa, lütfen <a href="mailto:support@example.com" className="font-medium text-blue-600 hover:text-blue-500">destek ekibimizle</a> iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancel;