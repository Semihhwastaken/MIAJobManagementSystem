import React, { useEffect, useState } from 'react';
import { Table, Space, Button, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import taskService, { TaskItem } from '../../services/taskService';
import { format } from 'date-fns';

const TaskList: React.FC = () => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await taskService.getMyTasks(); // getAllTasks yerine getMyTasks kullanıyoruz
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
                return 'success';
            case 'in progress':
                return 'processing';
            case 'pending':
                return 'warning';
            default:
                return 'default';
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
