import React, { useState } from 'react';
import FeedbackForm from './FeedbackForm';
import { motion, AnimatePresence } from 'framer-motion';

const FeedbackButton: React.FC = () => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setShowFeedbackModal(true)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 z-50"
      >
        <i className="fas fa-comment-alt" /> Geri Bildirim
      </motion.button>

      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white/95 backdrop-blur-sm rounded-lg p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl text-black font-semibold">Geri Bildiriminiz</h2>
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              <FeedbackForm onSubmit={() => setShowFeedbackModal(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackButton;
