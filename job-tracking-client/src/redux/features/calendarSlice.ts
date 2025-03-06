import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  priority: 'High' | 'Medium' | 'Low';
  participants: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CalendarState {
  events: CalendarEvent[];
  selectedDate: string;
  loading: boolean;
  error: string | null;
  selectedEvent: CalendarEvent | null;
}

const initialState: CalendarState = {
  events: [],
  selectedDate: new Date().toISOString().split('T')[0],
  loading: false,
  error: null,
  selectedEvent: null,
};

/**
 * Redux slice for managing calendar events and state
 */
const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    /**
     * Set all calendar events (replaces existing events)
     */
    setEvents: (state, action: PayloadAction<CalendarEvent[]>) => {
      state.events = action.payload;
    },

    /**
     * Add a new event to the calendar
     */
    addEvent: (state, action: PayloadAction<CalendarEvent>) => {
      state.events.push(action.payload);
    },

    /**
     * Update an existing calendar event
     */
    updateEvent: (state, action: PayloadAction<CalendarEvent>) => {
      const index = state.events.findIndex(event => event.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    },

    /**
     * Delete an event from the calendar
     */
    deleteEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(event => event.id !== action.payload);
    },

    /**
     * Set the currently selected date in the calendar
     */
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },

    /**
     * Set the loading state for calendar operations
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    /**
     * Set error state for calendar operations
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    /**
     * Set the currently selected event
     */
    setSelectedEvent: (state, action: PayloadAction<CalendarEvent | null>) => {
      state.selectedEvent = action.payload;
    },

    /**
     * Clear any error messages
     */
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  setSelectedDate,
  setLoading,
  setError,
  setSelectedEvent,
  clearError,
} = calendarSlice.actions;

export default calendarSlice.reducer;
