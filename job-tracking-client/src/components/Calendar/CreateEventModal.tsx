/* eslint-disable @typescript-eslint/no-unused-vars */
import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTheme } from '../../context/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { setError } from '../../redux/features/calendarSlice';
import type { CalendarEvent } from '../../redux/features/calendarSlice';
import teamService from '../../services/teamService';
import type { TeamMember, Team } from '../../types/team';
import { RootState } from '../../redux/store';

type EventFormData = Omit<CalendarEvent, 'id'>;

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: EventFormData) => void;
  initialData?: CalendarEvent;
}

/**
 * Modal component for creating and editing calendar events
 * @param isOpen - Whether the modal is visible
 * @param onClose - Function to call when closing the modal
 * @param onSubmit - Function to call with form data when submitting
 * @param initialData - Optional event data for editing mode
 */
const CreateEventModal = ({ isOpen, onClose, onSubmit, initialData }: CreateEventModalProps) => {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    participants: [],
    category: initialData?.category || 'task',
    teamId: initialData?.teamId || '',
    meetingLink: initialData?.meetingLink || ''
  });

  // Link doğrulama için geçerli toplantı URL'leri
  const validMeetingDomains = [
    'meet.google.com',
    'zoom.us',
    'teams.microsoft.com',
    'whereby.com',
    'webex.com',
    'gotomeeting.com',
    'bluejeans.com',
    'discord.com',
    'meet.jit.si',
    'skype.com'
  ];

  // meetingLink validation fonksiyonu
  const validateMeetingLink = (link: string): boolean => {
    if (!link) return true; // Boş link geçerli sayılır (zorunlu alan değil)
    
    try {
      const url = new URL(link);
      // Desteklenen toplantı domain'lerini kontrol et
      return validMeetingDomains.some(domain => url.hostname.includes(domain));
    } catch (e) {
      // Geçersiz URL
      return false;
    }
  };

  // Link validasyon hatası state'i
  const [linkError, setLinkError] = useState<string | null>(null);

  // Link değiştiğinde validasyon uygula
  const handleMeetingLinkChange = (link: string) => {
    setFormData({ ...formData, meetingLink: link });
    
    if (!validateMeetingLink(link)) {
      setLinkError('Lütfen geçerli bir toplantı linki girin (Google Meet, Zoom, Microsoft Teams, vb.)');
    } else {
      setLinkError(null);
    }
  };

  // Kullanıcının takımlarını yükleme
  useEffect(() => {
    const loadUserTeams = async () => {
      setIsLoading(true);
      try {
        const teams = await teamService.getMyTeams();
        console.log('Kullanıcının takımları:', teams);
        setUserTeams(teams);
        
        // Eğer takım yoksa veya düzenleme modundaysak, takım üyelerini yükle
        if (initialData?.teamId) {
          const members = await teamService.getTeamMembers(initialData.teamId);
          setTeamMembers(members);
        } else if (teams.length > 0) {
          // Yeni etkinlik oluşturma modunda ve takım varsa
          const members = await teamService.getTeamMembers(teams[0].id);
          setTeamMembers(members);
          
          // Varsayılan olarak ilk takımı seç
          if (!formData.teamId) {
            setFormData(prev => ({ ...prev, teamId: teams[0].id }));
          }
        }
      } catch (error) {
        console.error('Takım bilgileri yüklenirken hata:', error);
        dispatch(setError('Takım bilgileri yüklenemedi'));
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTeams();
  }, [dispatch, initialData?.teamId,formData.teamId]);

  // Takım değiştiğinde takım üyelerini yükleme
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!formData.teamId) return;
      
      setIsLoading(true);
      try {
        const members = await teamService.getTeamMembers(formData.teamId);
        console.log('Takım üyeleri:', members);
        
        // Tekrarlanan üyeleri filtrele
        const uniqueMembers = members.filter((member, index, self) =>
          index === self.findIndex(m => m.email === member.email)
        );
        
        setTeamMembers(uniqueMembers);
      } catch (error) {
        console.error('Takım üyelerini yüklerken hata:', error);
        dispatch(setError('Takım üyeleri yüklenemedi'));
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamMembers();
  }, [formData.teamId, dispatch]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        priority: 'Medium',
        participants: [],
        category: 'task',
        teamId: userTeams.length > 0 ? userTeams[0].id : '',
        meetingLink: ''
      });
    }
  }, [initialData, userTeams]);

  const filteredMembers = teamMembers.filter(member =>
    (member.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (member.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleAddParticipant = (email: string) => {
    if (!formData.participants.includes(email)) {
      setFormData({
        ...formData,
        participants: [...formData.participants, email]
      });
    }
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  // Mevcut kullanıcının e-postasını ekle
  const addCurrentUserAsParticipant = () => {
    if (currentUser?.email && !formData.participants.includes(currentUser.email)) {
      setFormData({
        ...formData,
        participants: [...formData.participants, currentUser.email]
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.title.trim()) {
      dispatch(setError('Etkinlik başlığı gereklidir'));
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      dispatch(setError('Etkinlik tarihleri gereklidir'));
      return;
    }

    // Check if end date is before start date
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      dispatch(setError('Bitiş tarihi başlangıç tarihinden sonra olmalıdır'));
      return;
    }

    // Check if times are valid when on same day
    if (formData.startDate === formData.endDate && 
        new Date(formData.startDate + 'T' + formData.startTime) >= new Date(formData.endDate + 'T' + formData.endTime)) {
      dispatch(setError('Aynı gün içinde bitiş saati başlangıç saatinden sonra olmalıdır'));
      return;
    }
    
    // Eğer toplantı kategorisi seçilmiş ve link eklenmiş ancak geçersizse engelle
    if (formData.category === 'meeting' && formData.meetingLink && !validateMeetingLink(formData.meetingLink)) {
      dispatch(setError('Lütfen geçerli bir toplantı linki girin'));
      return;
    }

    // Eğer kullanıcı kendi e-postasını eklemediyse, otomatik olarak ekle
    if (currentUser?.email && !formData.participants.includes(currentUser.email)) {
      formData.participants.push(currentUser.email);
    }

    console.log('Göndermeden önce form verileri:', formData);
    onSubmit(formData);
    
    if (!initialData) {
      setFormData({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        priority: 'Medium',
        participants: [],
        category: 'task',
        teamId: formData.teamId,
        meetingLink: ''
      });
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
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all
                  ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
              >
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 mb-4"
                >
                  {initialData ? 'Etkinliği Düzenle' : 'Yeni Etkinlik Oluştur'}
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Başlık
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={`w-full rounded-lg border p-2 
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Takım
                    </label>
                    <select
                      value={formData.teamId || ''}
                      onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                      className={`w-full rounded-lg border p-2 
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    >
                      <option value="">Kişisel Etkinlik</option>
                      {userTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Açıklama
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full rounded-lg border p-2 
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Başlangıç Tarihi
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            startDate: newStartDate,
                            // Update end date if it's before new start date
                            endDate: new Date(prev.endDate) < new Date(newStartDate) ? newStartDate : prev.endDate
                          }));
                        }}
                        className={`w-full rounded-lg border p-2 
                          ${isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bitiş Tarihi
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        min={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className={`w-full rounded-lg border p-2 
                          ${isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Başlangıç Saati
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className={`w-full rounded-lg border p-2 
                          ${isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bitiş Saati
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className={`w-full rounded-lg border p-2 
                          ${isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Kategori
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        category: e.target.value as 'meeting' | 'task' | 'deadline' 
                      })}
                      className={`w-full rounded-lg border p-2 
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      required
                    >
                      <option value="meeting">Toplantı</option>
                      <option value="task">Görev</option>
                      <option value="deadline">Son Tarih</option>
                    </select>
                  </div>

                  {/* Toplantı kategorisi seçildiğinde link alanını göster */}
                  {formData.category === 'meeting' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Toplantı Linki
                      </label>
                      <input
                        type="url"
                        value={formData.meetingLink || ''}
                        onChange={(e) => handleMeetingLinkChange(e.target.value)}
                        placeholder="https://meet.google.com/... veya https://zoom.us/..."
                        className={`w-full rounded-lg border p-2 
                          ${isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                          }
                          ${linkError ? 'border-red-500' : ''}
                        `}
                      />
                      {linkError && (
                        <p className="mt-1 text-red-500 text-xs">{linkError}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Desteklenen platformlar: Google Meet, Zoom, Microsoft Teams, Webex, ve diğerleri
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Öncelik
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        priority: e.target.value as 'High' | 'Medium' | 'Low' 
                      })}
                      className={`w-full rounded-lg border p-2 
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      required
                    >
                      <option value="High">Yüksek</option>
                      <option value="Medium">Orta</option>
                      <option value="Low">Düşük</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Katılımcılar
                    </label>
                    <div className="relative">
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsDropdownOpen(true);
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                          placeholder="E-posta ile ara..."
                          className={`w-full rounded-lg border p-2 
                            ${isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={addCurrentUserAsParticipant}
                          className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <i className="fas fa-user-plus"></i>
                        </button>
                      </div>

                      {isDropdownOpen && searchTerm && (
                        <div 
                          className={`absolute w-full mt-1 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto
                            ${isDarkMode ? 'bg-gray-700' : 'bg-white border border-gray-300'}`}
                        >
                          {isLoading ? (
                            <div className="p-3 text-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                            </div>
                          ) : filteredMembers.length > 0 ? (
                            filteredMembers.map(member => (
                              <div
                                key={member.id}
                                onClick={() => handleAddParticipant(member.email)}
                                className={`p-3 border-b cursor-pointer hover:bg-opacity-80
                                  ${isDarkMode 
                                    ? 'border-gray-600 hover:bg-gray-600 text-white' 
                                    : 'border-gray-200 hover:bg-gray-100 text-gray-900'
                                  }`}
                              >
                                <div className="flex items-center">
                                  {member.profileImage ? (
                                    <img 
                                      src={member.profileImage} 
                                      alt={member.fullName} 
                                      className="w-8 h-8 rounded-full mr-2"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-400 mr-2 flex items-center justify-center text-white">
                                      {member.fullName.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium">{member.fullName}</p>
                                    <p className="text-sm opacity-70">{member.email}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-center text-gray-500">
                              Eşleşen üye bulunamadı
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.participants.map((participant, index) => (
                        <div
                          key={index}
                          className={`px-3 py-1 rounded-full text-sm flex items-center
                            ${isDarkMode 
                              ? 'bg-gray-700 text-white' 
                              : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                          {participant}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                participants: formData.participants.filter((_, i) => i !== index)
                              });
                            }}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-times-circle"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className={`px-4 py-2 rounded-lg transition-colors
                        ${isDarkMode
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {initialData ? 'Güncelle' : 'Oluştur'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateEventModal;
