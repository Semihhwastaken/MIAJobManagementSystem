import axiosInstance from './axiosInstance';
import { CalendarEvent } from '../redux/features/calendarSlice';

const API_URL = 'https://miajobmanagementsystem.onrender.com/api';

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
   * Fetch all events for a specific team
   * @param teamId - ID of the team to get events for
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   * @returns Promise containing the team events
   */
  async getTeamEvents(teamId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axiosInstance.get(`${API_URL}/calendar/events/team/${teamId}`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },

  /**
   * Fetch all events assigned to team members
   * @returns Promise containing the events
   */
  async getTeamMemberEvents(): Promise<CalendarEvent[]> {
    const response = await axiosInstance.get(`${API_URL}/calendar/events/team-members`, {
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
   * Create a new team calendar event
   * @param teamId - ID of the team to create event for
   * @param event - Event data to create
   * @returns Promise containing the created team event
   */
  async createTeamEvent(teamId: string, event: Omit<CalendarEvent, 'id' | 'teamId'>): Promise<CalendarEvent> {
    const response = await axiosInstance.post(`${API_URL}/calendar/events/team/${teamId}`, {
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
