import React, { useEffect, useState } from 'react';
import { Table, Space, Button, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import taskService, { TaskItem } from '../../services/taskService';
import { format } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import { updateTaskStatus } from '../../redux/features/tasksSlice';
import { useSnackbar } from 'notistack';

const TaskList: React.FC = () => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch<AppDispatch>();
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await taskService.getMyTasks();
            setTasks(data);
        } catch (error) {
            message.error('Görevler yüklenirken bir hata oluştu');
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high':
                return 'red';
            case 'medium':
                return 'orange';
            case 'low':
                return 'green';
            default:
                return 'blue';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return '#52c41a';
            case 'in-progress':
                return '#1890ff';
            case 'todo':
                return '#faad14';
            case 'overdue':
                return '#ff4d4f';
            default:
                return '#d9d9d9';
        }
    };

    const columns: ColumnsType<TaskItem> = [
        {
            title: 'Başlık',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
            ),
        },
        {
            title: 'Öncelik',
            dataIndex: 'priority',
            key: 'priority',
            render: (priority: string) => (
                <Tag color={getPriorityColor(priority)}>{priority.toUpperCase()}</Tag>
            ),
        },
        {
            title: 'Bitiş Tarihi',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (date: string) => format(new Date(date), 'dd/MM/yyyy'),
        },
        {
            title: 'Atananlar',
            key: 'assignedUsers',
            dataIndex: 'assignedUsers',
            render: (assignedUsers: TaskItem['assignedUsers']) => (
                <>
                    {assignedUsers.map((user) => (
                        <Tag key={user.id}>{user.username}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'İşlemler',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="link" onClick={() => handleEdit(record)}>
                        Düzenle
                    </Button>
                    <Button type="link" danger onClick={() => handleDelete(record)}>
                        Sil
                    </Button>
                </Space>
            ),
        },
    ];

    const handleEdit = (task: TaskItem) => {
        // TaskModal'ı açmak için gerekli işlemler burada yapılacak
        console.log('Edit task:', task);
    };

    const handleDelete = async (task: TaskItem) => {
        try {
            await taskService.deleteTask(task.id);
            message.success('Görev başarıyla silindi');
            fetchTasks();
        } catch (error) {
            message.error('Görev silinirken bir hata oluştu');
            console.error('Error deleting task:', error);
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            await dispatch(updateTaskStatus({ taskId, status: newStatus }));
            enqueueSnackbar('Görev durumu güncellendi', { variant: 'success' });
        } catch (error) {
            console.error('Görev durumu güncellenirken hata oluştu:', error);
            enqueueSnackbar('Görev durumu güncellenirken hata oluştu', { variant: 'error' });
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Table
                columns={columns}
                dataSource={tasks}
                loading={loading}
                rowKey="id"
            />
        </div>
    );
};

export default TaskList;
