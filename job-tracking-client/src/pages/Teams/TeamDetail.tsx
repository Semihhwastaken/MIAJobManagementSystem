import React, { useState } from 'react';
import TaskForm from '../../components/TaskForm/TaskForm';
import { Task } from '../../types/task';

const TeamDetail: React.FC = () => {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const handleAddTask = (userId: string) => {
    setSelectedUser(userId);
    setIsTaskFormOpen(true);
  };

  const handleCreateTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      // Dispatch create task action
      // await dispatch(createTask(newTask));
      setIsTaskFormOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  return (
    <div>
      {/* Render team details */}
      <button onClick={() => handleAddTask('userId')}>Add Task</button>

      {/* Task Form Modal */}
      {isTaskFormOpen && (
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => {
            setIsTaskFormOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleCreateTask}
          existingTasks={[]} // Pass existing tasks if available
          preSelectedUserId={selectedUser || undefined}
        />
      )}
    </div>
  );
};

export default TeamDetail;