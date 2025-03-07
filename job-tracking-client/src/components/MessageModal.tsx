import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useDispatch } from 'react-redux';
import { sendMessage } from '../redux/features/messageSlice';
import { useTheme } from '../context/ThemeContext';
import { XMarkIcon } from '@heroicons/react/24/outline';
<<<<<<< HEAD
=======
import { AppDispatch } from '../redux/store';
>>>>>>> newdb1

interface MessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    senderId: string;
    receiverId: string;
    receiverName: string;
}

<<<<<<< HEAD
const MessageModal = ({ isOpen, onClose, senderId, receiverId, receiverName }: MessageModalProps) => {
    const dispatch = useDispatch();
=======
interface MessagePayload {
    senderId: string;
    receiverId: string;
    content: string;
    subject: string;
}

const MessageModal = ({ isOpen, onClose, senderId, receiverId, receiverName }: MessageModalProps) => {
    const dispatch = useDispatch<AppDispatch>();
>>>>>>> newdb1
    const { isDarkMode } = useTheme();
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');

    const handleSend = async () => {
        if (!content.trim()) return;

        try {
<<<<<<< HEAD
            await dispatch(sendMessage({ senderId, receiverId, content, subject }) as any);
=======
            const messageData: MessagePayload = {
                senderId,
                receiverId,
                content,
                subject
            };
            await dispatch(sendMessage(messageData));
>>>>>>> newdb1
            setContent('');
            setSubject('');
            onClose();
        } catch (error) {
            console.error('Message sending failed:', error);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog 
                as="div" 
                className="relative z-50"
                onClose={onClose}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className={`fixed inset-0 ${isDarkMode ? 'bg-gray-900/30' : 'bg-gray-500/10'} backdrop-blur-sm`} />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all ${
                                isDarkMode ? 'bg-gray-800' : 'bg-white'
                            }`}>
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title className={`text-lg font-medium ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        Mesaj Gönder: {receiverName}
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className={`rounded-full p-1 ${
                                            isDarkMode 
                                                ? 'hover:bg-gray-700 text-gray-400' 
                                                : 'hover:bg-gray-100 text-gray-500'
                                        }`}
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-1 ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Konu
                                        </label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className={`w-full rounded-lg border px-3 py-2 ${
                                                isDarkMode 
                                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                                    : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                            placeholder="Mesaj konusu"
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1 ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Mesaj
                                        </label>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            rows={4}
                                            className={`w-full rounded-lg border px-3 py-2 ${
                                                isDarkMode 
                                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                                    : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                            placeholder="Mesajınızı yazın..."
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end space-x-3">
                                    <button
                                        onClick={onClose}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                            isDarkMode
                                                ? 'text-gray-300 hover:bg-gray-700'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleSend}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                            isDarkMode
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                    >
                                        Gönder
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default MessageModal;
