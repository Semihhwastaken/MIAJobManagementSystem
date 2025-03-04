import axiosInstance from './axiosInstance';
import { CalendarEvent } from '../redux/features/calendarSlice.tsx';

const API_URL = 'http://localhost:5193/api';

/**
 * Service for handling calendar-related API requests
 */
export const calendarService = {
  /**
   * Fetch all events for a given date range
   * @param startDate - Start date of the range
   * @param endDate - End date of the range
   * @returns Promise containing the events
   */
  async getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const response = await axiosInstance.get(`${API_URL}/calendar/events`, {
      params: { startDate, endDate },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },

  /**
   * Create a new calendar event
   * @param event - Event data to create
   * @returns Promise containing the created event
   */
  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const response = await axiosInstance.post(`${API_URL}/calendar/events`, {
      ...event,
      category: event.category || 'task', // Add default category if not provided
    }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },

  /**
   * Update an existing calendar event
   * @param event - Updated event data
   * @returns Promise containing the updated event
   */
  async updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const response = await axiosInstance.put(`${API_URL}/calendar/events/${event.id}`, event, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },

  /**
   * Delete a calendar event
   * @param eventId - ID of the event to delete
   * @returns Promise indicating success
   */
  async deleteEvent(eventId: string): Promise<void> {
    await axiosInstance.delete(`${API_URL}/calendar/events/${eventId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
};
