import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import { fetchTaskHistory } from '../../redux/features/tasksSlice';

interface TaskHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { historyItems, loading, lastHistoryFetchTime } = useSelector((state: RootState) => state.tasks);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      dispatch(fetchTaskHistory())
        .finally(() => setIsLoading(false));
    }
  }, [dispatch, isOpen]);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-3/4 max-w-4xl max-h-[80vh] flex flex-col transform transition-all duration-300 ease-in-out"
        style={{animation: 'fadeInScale 0.3s ease-out'}}
      >
        <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Task History</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Loading history...</p>
            </div>
          ) : historyItems.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500"></div>
              
              <div className="space-y-6 ml-10">
                {historyItems.map((task, index) => {
                  const { date, time } = formatDate(task.dueDate);
                  
                  return (
                    <div 
                      key={task.id} 
                      className="bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 relative"
                      style={{animation: `fadeInRight ${0.2 + index * 0.1}s ease-out`}}
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-[-2.5rem] top-5 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-800"></div>
                      
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{task.title}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              task.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mt-1">{task.description}</p>
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path>
                              </svg>
                              {task.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{date}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{time}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <p className="mt-4 text-gray-500 dark:text-gray-400">No task history found</p>
              <button 
                className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                onClick={() => dispatch(fetchTaskHistory())}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};

export default TaskHistory;