import { Task } from '../types/task';
import { mockUsers } from '../types/task';

export const mockTasks: Task[] = [
    {
        id: '1',
        title: 'Frontend Geliştirmeleri',
        description: 'React uygulamasında yeni özellikler eklenecek',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2025-03-01',
        assignedUsers: [mockUsers[0], mockUsers[1]],
        subTasks: [
            { id: '1-1', title: 'TaskCard bileşeni', completed: true },
            { id: '1-2', title: 'TaskModal bileşeni', completed: false },
        ],
        dependencies: [],
        attachments: [
            {
                id: '1-a1',
                fileName: 'tasarim.fig',
                fileUrl: '/files/tasarim.fig',
                fileType: 'application/fig',
                uploadDate: '2025-02-15',
            },
        ],
        createdAt: '2025-02-15',
        updatedAt: '2025-02-15',
    },
    {
        id: '2',
        title: 'API Entegrasyonu',
        description: 'Backend servisleri ile bağlantı kurulacak',
        status: 'todo',
        priority: 'medium',
        dueDate: '2025-03-15',
        assignedUsers: [mockUsers[2]],
        subTasks: [
            { id: '2-1', title: 'Auth servisi', completed: false },
            { id: '2-2', title: 'Task servisi', completed: false },
        ],
        dependencies: ['1'],
        attachments: [],
        createdAt: '2025-02-15',
        updatedAt: '2025-02-15',
    },
];
