import { createAction } from '@reduxjs/toolkit';
import { RESET_STATE } from './actionTypes';

export const resetState = createAction(RESET_STATE); 