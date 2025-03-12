import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateSubscription } from '../../redux/features/authSlice';
import axiosInstance from '../../services/axiosInstance';
import { toast } from 'react-toastify';

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    // Fetch updated subscription information
    const fetchSubscriptionStatus = async () => {
      try {
        const response = await axiosInstance.get('/subscription/subscription-status');
        
        // Update the Redux store with the new subscription info
        dispatch(updateSubscription({
          subscriptionPlan: response.data.subscriptionPlan,
          subscriptionId: response.data.subscriptionId,
          subscriptionStatus: 'active',
          subscriptionEndDate: response.data.subscriptionExpiryDate
        }));

        // Update the user object in localStorage
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          const updatedUser = {
            ...user,
            subscriptionPlan: response.data.subscriptionPlan,
            subscriptionId: response.data.subscriptionId,
            subscriptionStatus: 'active',
            subscriptionEndDate: response.data.subscriptionExpiryDate
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        toast.error('Abonelik bilgileri güncellenirken bir hata oluştu.');
      }
    };

    fetchSubscriptionStatus();
  }, [dispatch]);

  const handleGoToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
            <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Ödeme Başarılı!</h2>
          <p className="mt-2 text-md text-gray-600">
            Aboneliğiniz başarıyla etkinleştirildi. Artık premium özelliklere erişebilirsiniz.
          </p>
        </div>
        
        <div className="mt-6">
          <button
            onClick={handleGoToDashboard}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-md font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Ana Sayfaya Git
          </button>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>
            Herhangi bir sorunuz varsa, lütfen <a href="mailto:support@example.com" className="font-medium text-blue-600 hover:text-blue-500">destek ekibimizle</a> iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;