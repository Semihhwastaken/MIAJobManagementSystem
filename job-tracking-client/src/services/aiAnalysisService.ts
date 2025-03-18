import axios from 'axios';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  tasksCompleted: number;
  performanceScore: number;
}

interface TeamAnalysisRequest {
  teamName: string;
  period: string;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    totalGrowth: string;
    completedGrowth: string;
    inProgressGrowth: string;
    overdueGrowth: string;
  };
  teamActivity?: {
    completedTasksCount: number;
    completionRate: number;
    averageTaskDuration: number;
    performanceScore: number;
  };
  topContributors: TeamMember[];
}

// Get API key from environment variables
const getApiKey = (): string => {
  return import.meta.env.VITE_OPENROUTER_API_KEY || '';
};

// Check if AI analysis is enabled in environment
export const isAiAnalysisEnabled = (): boolean => {
  return import.meta.env.VITE_ENABLE_AI_ANALYSIS === 'true';
};

// Validate API key - these are legacy functions that may be removed in future
export const validateApiKey = (key: string): boolean => {
  return key && key.startsWith('sk-or-v1-') && key.length > 30;
};

export const getStoredApiKey = (): string => {
  return localStorage.getItem('openrouter_api_key') || '';
};

export const saveApiKey = (key: string): void => {
  localStorage.setItem('openrouter_api_key', key);
};

export const clearApiKey = (): void => {
  localStorage.removeItem('openrouter_api_key');
};

// OpenRouter API client for team analysis
export async function generateTeamAnalysis(
  data: TeamAnalysisRequest
): Promise<string> {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      throw new Error('API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.');
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MIA Job Management System'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct', // Use Mistral 7B model which is more widely available
        messages: [
          {
            role: 'system',
            content: 'Deneyimli bir iş analisti olarak ekip performansı verilerini inceleyip profesyonel raporlar oluşturuyorsun. Türkçe yanıt ver.'
          },
          {
            role: 'user',
            content: createAnalysisPrompt(data)
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'AI analizi oluşturulurken bir hata meydana geldi.');
    }

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error: any) {
    console.error('AI analizi oluşturma hatası:', error);
    throw new Error(error.message || 'AI analizi oluşturulurken bir hata meydana geldi.');
  }
}

// Helper function to create a detailed prompt based on team data
function createAnalysisPrompt(data: TeamAnalysisRequest): string {
  // Format time period for better context
  let periodText = '';
  switch (data.period) {
    case 'week':
      periodText = 'haftalık';
      break;
    case 'month':
      periodText = 'aylık';
      break;
    case 'year':
      periodText = 'yıllık';
      break;
    default:
      periodText = 'güncel';
  }

  // Start building the prompt
  let prompt = `${data.teamName} ekibinin ${periodText} performans verilerini detaylı olarak analiz et.

TEMEL VERİLER:
- Toplam Görev: ${data.taskStats.total} (Değişim: ${data.taskStats.totalGrowth})
- Tamamlanan Görev: ${data.taskStats.completed} (Değişim: ${data.taskStats.completedGrowth})
- Devam Eden Görev: ${data.taskStats.inProgress} (Değişim: ${data.taskStats.inProgressGrowth})
- Geciken Görev: ${data.taskStats.overdue} (Değişim: ${data.taskStats.overdueGrowth})
`;

  // Add team activity data if available
  if (data.teamActivity) {
    prompt += `
EKİP AKTİVİTESİ:
- Tamamlanan Görev Sayısı: ${data.teamActivity.completedTasksCount}
- Tamamlanma Oranı: %${(data.teamActivity.completionRate * 100).toFixed(1)}
- Ortalama Görev Süresi: ${data.teamActivity.averageTaskDuration.toFixed(1)} gün
- Performans Skoru: %${(data.teamActivity.performanceScore * 100).toFixed(1)}
`;
  }

  // Add contributor data if available
  if (data.topContributors && data.topContributors.length > 0) {
    prompt += `
EN ÇOK KATKI SAĞLAYANLAR:
${data.topContributors.map((contributor, index) => 
  `${index + 1}. ${contributor.name} (${contributor.role}) - ${contributor.tasksCompleted} görev, %${contributor.performanceScore.toFixed(1)} performans`
).join('\n')}
`;
  }

  // Add instruction for analysis
  prompt += `
Bu verilere dayanarak:
1. Ekibin genel performansı hakkında kısa bir özet
2. Güçlü yanlar ve gelişim alanları
3. Görev tamamlama ve gecikme oranlarının değerlendirilmesi
4. Ekip içi iş dağılımı analizi
5. Gelecek dönem için tavsiyeler

Yanıtın profesyonel, yapıcı ve yöneticiler için faydalı olsun. İyileştirme önerileri sun.`;

  return prompt;
}
