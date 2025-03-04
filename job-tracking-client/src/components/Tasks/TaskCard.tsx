import React from 'react';
import { Task } from '../../types/task';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Avatar, 
  Grid, 
  LinearProgress, 
  Tooltip 
} from '@mui/material';
import { 
  AccessTime, 
  PriorityHigh, 
  LowPriority, 
  FlagOutlined, 
  CheckCircleOutline, 
  WarningAmber 
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  // Calculate completion percentage based on subtasks
  const completionPercentage = task.subTasks.length > 0
    ? Math.round((task.subTasks.filter(st => st.completed).length / task.subTasks.length) * 100)
    : 0;

  // Determine status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'in progress': return 'info';
      case 'overdue': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // Determine priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return <PriorityHigh color="error" />;
      case 'medium': return <FlagOutlined color="warning" />;
      case 'low': return <LowPriority color="info" />;
      default: return null;
    }
  };

  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
  
  return (
    <Card sx={{ 
      mb: 2, 
      borderLeft: 4, 
      borderColor: `${isOverdue ? 'error.main' : getStatusColor(task.status)}.main`,
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 3
      }
    }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Typography variant="h6" component="div" gutterBottom noWrap sx={{ maxWidth: '80%' }}>
                {task.title}
              </Typography>
              <Box>
                {getPriorityIcon(task.priority)}
              </Box>
            </Box>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 1, 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {task.description}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Chip 
                label={task.status} 
                color={getStatusColor(task.status) as any}
                size="small"
                sx={{ mr: 1 }}
              />
              
              <Box display="flex" alignItems="center">
                <Tooltip title="Due date">
                  <Box display="flex" alignItems="center" mr={1}>
                    <AccessTime fontSize="small" sx={{ mr: 0.5, fontSize: '0.875rem' }} />
                    <Typography variant="caption">
                      {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                    </Typography>
                  </Box>
                </Tooltip>
                
                {task.assignedUsers && task.assignedUsers.length > 0 && (
                  <Box>
                    <AvatarGroup max={3} sx={{ ml: 1 }}>
                      {task.assignedUsers.map(user => (
                        <Tooltip key={user.id} title={user.fullName || user.username}>
                          <Avatar 
                            src={user.profileImage} 
                            alt={user.fullName || user.username}
                            sx={{ width: 24, height: 24 }}
                          >
                            {(user.fullName || user.username)[0]}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>

          {task.subTasks.length > 0 && (
            <Grid item xs={12}>
              <Box display="flex" alignItems="center">
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={completionPercentage} 
                    color={isOverdue ? "error" : "primary"}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {completionPercentage}%
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

// Create a simplified AvatarGroup since it may not be available in all MUI versions
const AvatarGroup: React.FC<{ children: React.ReactNode, max: number, sx?: any }> = ({ children, max, sx }) => {
  const childArray = React.Children.toArray(children);
  const displayedChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;
  
  return (
    <Box sx={{ display: 'flex', ...sx }}>
      {displayedChildren}
      {remainingCount > 0 && (
        <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.500', fontSize: '0.75rem' }}>
          +{remainingCount}
        </Avatar>
      )}
    </Box>
  );
};

export default TaskCard;
