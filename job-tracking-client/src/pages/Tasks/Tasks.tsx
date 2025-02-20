import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import TaskModal from '../../components/TaskModal/TaskModal'
import TaskCard from '../../components/TaskCard/TaskCard'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { deleteTask, fetchTasks } from '../../redux/features/tasksSlice'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { Task } from '../../types/task'

/**
 * Tasks sayfası bileşeni
 * Görevlerin listelendiği, eklendiği, düzenlendiği ve silindiği ana sayfa
 */
const Tasks = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined)
  const dispatch = useAppDispatch()
  const { items: tasks, status, error } = useAppSelector((state) => state.tasks)

  // Sayfa yüklendiğinde görevleri getir
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTasks())
    }
  }, [status, dispatch])

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
      try {
        await dispatch(deleteTask(taskId)).unwrap()
        toast.success('Görev başarıyla silindi!', {
          duration: 3000,
          position: 'top-right',
          style: {
            background: '#10B981',
            color: '#fff',
          }
        })
      } catch (error) {
        toast.error('Görev silinirken bir hata oluştu!', {
          duration: 3000,
          position: 'top-right',
          style: {
            background: '#EF4444',
            color: '#fff',
          }
        })
      }
    }
  }

  const handleEditTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setSelectedTask(task)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTask(undefined)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Hata: {error}</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8"
    >
      {/* Bildirim bileşeni */}
      <Toaster />

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Görevler</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Yeni Görev
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full text-center py-8 bg-gray-50 rounded-lg"
          >
            <p className="text-gray-600">Henüz hiç görev eklenmemiş</p>
          </motion.div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={() => handleDeleteTask(task.id!)}
              onEdit={() => handleEditTask(task.id!)}
            />
          ))
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editTask={selectedTask}
      />
    </motion.div>
  )
}

export default Tasks
