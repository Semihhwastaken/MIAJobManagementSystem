import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { Task } from '../../types/task';
import TaskCard from '../Tasks/TaskCard';
import { CircularProgress, Box, Typography } from '@mui/material';

interface TasksListProps {
  title: string;
  filterStatus?: string;
}

const TasksList: React.FC<TasksListProps> = ({ title, filterStatus }) => {
  const { userTasks, loading } = useSelector((state: RootState) => state.userCache);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (userTasks) {
      let filtered = [...userTasks];
      
      if (filterStatus) {
        filtered = filtered.filter(task => task.status === filterStatus);
      }
      
      // Sort by due date
      filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      
      setFilteredTasks(filtered);
    }
  }, [userTasks, filterStatus]);

  if (loading.tasks) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
        <Typography color="text.secondary">No tasks available.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
      {filteredTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </Box>
  );
};

export default TasksList;
