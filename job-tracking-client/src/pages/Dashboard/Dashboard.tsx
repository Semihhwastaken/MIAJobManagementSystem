/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, ChartOptions, Filler, Chart } from 'chart.js';
import { useTheme } from '../../context/ThemeContext';
import Footer from "../../components/Footer/Footer";
import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../services/axiosInstance';
import React from 'react';
import { chartToImageURL, generatePdfReport } from '../../services/reportGenerator';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { 
  
  isAiAnalysisEnabled
} from '../../services/aiAnalysisService';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';


// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  totalGrowth: string;
  completedGrowth: string;
  inProgressGrowth: string;
  overdueGrowth: string;
}

interface LineChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension: number;
  }[];
}

interface DoughnutData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderWidth: number;
  }[];
}

interface Team {
  id: string;
  name: string;
}

interface TeamActivity {
  completedTasksCount: number;
  completionRate: number;
  averageTaskDuration: number;
  performanceScore: number;
}

interface TopContributor {
  id: string;
  name: string;
  profileImage?: string;
  tasksCompleted: number;
  performanceScore: number;
  role: string;
}

const Dashboard = () => {
  const { isDarkMode } = useTheme();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    totalGrowth: '+0%',
    completedGrowth: '+0%',
    inProgressGrowth: '+0%',
    overdueGrowth: '+0%',
  });
  const [lineChartData, setLineChartData] = useState<LineChartData>({
    labels: [],
    datasets: [],
  });
  const [doughnutData, setDoughnutData] = useState<DoughnutData>({
    labels: [],
    datasets: [],
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all"); // "all" for all teams view
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Replace single isLoading with specific loading states
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Computed property to determine if any loading is happening
  const isLoading = dashboardLoading || teamsLoading || activityLoading;
  
  const [teamActivity, setTeamActivity] = useState<TeamActivity>({
    completedTasksCount: 0,
    completionRate: 0,
    averageTaskDuration: 0,
    performanceScore: 0
  });
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>("week");
  const [dataFetchError, setDataFetchError] = useState<string | null>(null);

  const calculateGrowth = useCallback((current: number, previous: number): string => {
    if (previous === 0) {
      if (current === 0) return '0%'; // Both zero - no change
      return `+${current}00%`; // New items added - show absolute number
    }
    
    if (current === previous) return '0%'; // No change
    
    const growth = ((current - previous) / previous) * 100;
    const formattedGrowth = growth.toFixed(1); // Reduced to 1 decimal for cleaner display
    
    // Add plus sign for positive values, negative values already have their sign
    return `${growth > 0 ? '+' : ''}${formattedGrowth}%`;
  }, []);
  // Helper function to format dates according to time period
  const formatDateByTimePeriod = useCallback((date: Date | string, timePeriod: string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    switch (timePeriod) {
      case 'week':
        // For weekly view, show day name and date (e.g., "Pts 25/09")
        return dateObj.toLocaleDateString('tr-TR', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit'
        });
      case 'month':
        // For monthly view, show only the date (e.g., "25/09")
        return dateObj.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit'
        });
      case 'year':
        // For yearly view, show month name (e.g., "Eylül")
        return dateObj.toLocaleDateString('tr-TR', {
          month: 'long'
        });
      default:
        return dateObj.toLocaleDateString('tr-TR');
    }
  }, []);

  // Add this new utility function to help with date processing
  const getDateIdentifier = (date: Date, timePeriod: string): string => {
    switch (timePeriod) {
      case 'week':
        // For weekly grouping, use day of week (0-6)
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case 'month':
        // For monthly grouping, use day of month (1-31)
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case 'year':
        // For yearly grouping, use month (0-11)
        return `${date.getFullYear()}-${date.getMonth()}`;
      default:
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }
  };

  // Add this function to normalize dates based on time period
  const normalizeDate = (date: Date, timePeriod: string): Date => {
    const normalized = new Date(date);
    
    if (timePeriod === 'year') {
      // For yearly view, normalize to first day of month
      normalized.setDate(1);
    }
    
    return normalized;
  };

  // Fetch available teams
  useEffect(() => {
    const fetchTeams = async () => {
      setTeamsLoading(true);
      setDataFetchError(null);
      try {
        const response = await axiosInstance.get('/team');
        if (response.status === 200) {
          setTeams(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch teams:", error);
        setDataFetchError("Ekipleri yüklerken hata oluştu.");
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const fetchDashboardData = useCallback(async (teamId: string) => {
    setDashboardLoading(true);
    setDataFetchError(null);
    try {
      let url = '/tasks/dashboard';
      
      // Modified API URL construction for different team selection scenarios
      if (teamId === "all") {
        url += '?forTeam=false';
      } else if (teamId !== "me") {
        url += `?forTeam=true&teamId=${teamId}`;
      }

      // Add time period parameter to URL
      url += `${url.includes('?') ? '&' : '?'}period=${selectedTimePeriod}`;
      
      const response = await axiosInstance.get(url);
      if (response.status !== 200) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const data = response.data;
      
      // Update task stats - recalculate inProgress as total - (completed + overdue)
      const totalTasks = data.totalTasks;
      const completedTasks = data.completedTasks;
      const overdueTasks = data.overdueTasks;
      const inProgressTasks = totalTasks - (completedTasks + overdueTasks);
      
      // Calculate previous in progress similarly
      const previousTotal = data.previousTotalTasks;
      const previousCompleted = data.previousCompletedTasks;
      const previousOverdue = data.previousOverdueTasks;
      const previousInProgress = previousTotal - (previousCompleted + previousOverdue);
      
      setTaskStats({
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        overdue: overdueTasks,
        totalGrowth: calculateGrowth(totalTasks, previousTotal),
        completedGrowth: calculateGrowth(completedTasks, previousCompleted),
        inProgressGrowth: calculateGrowth(inProgressTasks, previousInProgress),
        overdueGrowth: calculateGrowth(overdueTasks, previousOverdue),
      });

      // Process line chart data with time period normalization
      if (Array.isArray(data.lineChartData)) {
        // Create a map to store normalized data points
        const dateMap = new Map<string, {date: Date, completed: number, newTasks: number}>();
        
        // Process and normalize each data point
        data.lineChartData.forEach((item: any) => {
          const dateObj = new Date(item.date || item.Date || item.dateString || item.DateString);
          const normalizedDate = normalizeDate(dateObj, selectedTimePeriod);
          const dateKey = getDateIdentifier(normalizedDate, selectedTimePeriod);
          
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date: normalizedDate,
              completed: 0,
              newTasks: 0
            });
          }
          
          const entry = dateMap.get(dateKey)!;
          entry.completed += item.completed || item.Completed || 0;
          entry.newTasks += item.newTasks || item.NewTasks || 0;
          dateMap.set(dateKey, entry);
        });
        
        // Convert map back to array and sort by date
        const sortedData = Array.from(dateMap.values())
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Update line chart with normalized data
        setLineChartData({
          labels: sortedData.map(item => formatDateByTimePeriod(item.date, selectedTimePeriod)),
          datasets: [
            {
              label: 'Tamamlanan',
              data: sortedData.map(item => item.completed),
              borderColor: 'rgb(99, 102, 241)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Yeni Görevler',
              data: sortedData.map(item => item.newTasks),
              borderColor: 'rgb(74, 222, 128)',
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
              fill: true,
              tension: 0.4,
            },
          ],
        });
      }

      // Update doughnut chart data - use the recalculated inProgressTasks
      setDoughnutData({
        labels: ['Tamamlanan', 'Devam Eden', 'Geciken'],
        datasets: [{
          data: [completedTasks, inProgressTasks, overdueTasks],
          backgroundColor: [
            'rgb(99, 102, 241)',
            'rgb(74, 222, 128)',
            'rgb(248, 113, 113)',
          ],
          borderWidth: 0,
        }],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDataFetchError("Dashboard verilerini yüklerken hata oluştu.");
      
      // Set default empty data on error to prevent UI issues
      setTaskStats({
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        totalGrowth: '+0%',
        completedGrowth: '+0%',
        inProgressGrowth: '+0%',
        overdueGrowth: '+0%',
      });
      
      setLineChartData({
        labels: [],
        datasets: [],
      });
      
      setDoughnutData({
        labels: ['Tamamlanan', 'Devam Eden', 'Geciken'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: [
            'rgb(99, 102, 241)',
            'rgb(74, 222, 128)',
            'rgb(248, 113, 113)',
          ],
          borderWidth: 0,
        }],
      });
    } finally {
      setDashboardLoading(false);
    }
  }, [selectedTimePeriod,calculateGrowth,formatDateByTimePeriod]);

  // Fetch team activity and top contributors
  const fetchTeamActivityAndContributors = useCallback(async (teamId: string) => {
    if (teamId === "all" || teamId === "me") return;
    
    setActivityLoading(true);
    setDataFetchError(null);
    try {
      const response = await axiosInstance.get(`/team/${teamId}/activity`);
      if (response.status === 200) {
        setTeamActivity(response.data.activity || {
          completedTasksCount: 0,
          completionRate: 0,
          averageTaskDuration: 0,
          performanceScore: 0
        });
        setTopContributors(response.data.topContributors || []);
      }
    } catch (error) {
      console.error("Failed to fetch team activity:", error);
      setDataFetchError("Ekip aktivitelerini yüklerken hata oluştu.");
      
      // Set default empty data
      setTeamActivity({
        completedTasksCount: 0,
        completionRate: 0,
        averageTaskDuration: 0,
        performanceScore: 0
      });
      setTopContributors([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  // Add a special handler for "all" teams selection that fetches data from all teams
  const fetchAllTeamsData = useCallback(async () => {
    if (teams.length === 0) {
      setDashboardLoading(false); // Make sure to reset if no teams
      return;
    }
    
    setDashboardLoading(true);
    setActivityLoading(true);
    setDataFetchError(null);
    try {
      // Initialize aggregate data
      let totalTasks = 0;
      let completedTasks = 0;
      let overdueTasks = 0;
      let previousTotalTasks = 0;
      let previousCompletedTasks = 0;
      let previousOverdueTasks = 0;
      
      // Initialize team activity aggregation
      let totalCompletedTasksCount = 0;
      let weightedCompletionRate = 0;
      let weightedAverageDuration = 0;
      let weightedPerformanceScore = 0;
      let totalTeamsWithActivity = 0;
      
      // Collect all contributors across teams
      let allContributors: TopContributor[] = [];
      
      // Create a combined chart data structure with proper time period normalization
      const dateMap = new Map<string, {date: Date, completed: number, newTasks: number}>();
      
      // Process each team
      for (const team of teams) {
        // Initialize team data - ADD THIS VARIABLE
        let teamTaskCount = 0;
        
        // Fetch dashboard data
        const dashResponse = await axiosInstance.get(`/tasks/dashboard?forTeam=true&teamId=${team.id}&period=${selectedTimePeriod}`);
        if (dashResponse.status === 200) {
          const data = dashResponse.data;
          
          // Store team task count - ADD THIS LINE
          teamTaskCount = data.totalTasks || 0;
          
          // Aggregate task counts
          totalTasks += data.totalTasks || 0;
          completedTasks += data.completedTasks || 0;
          overdueTasks += data.overdueTasks || 0;
          previousTotalTasks += data.previousTotalTasks || 0;
          previousCompletedTasks += data.previousCompletedTasks || 0;
          previousOverdueTasks += data.previousOverdueTasks || 0;
          
          // Process and normalize chart data by time period
          if (Array.isArray(data.lineChartData)) {
            data.lineChartData.forEach((item: any) => {
              const dateObj = new Date(item.date || item.Date || item.dateString || item.DateString);
              const normalizedDate = normalizeDate(dateObj, selectedTimePeriod);
              const dateKey = getDateIdentifier(normalizedDate, selectedTimePeriod);
              
              if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, {
                  date: normalizedDate,
                  completed: 0,
                  newTasks: 0
                });
              }
              
              const entry = dateMap.get(dateKey)!;
              entry.completed += item.completed || item.Completed || 0;
              entry.newTasks += item.newTasks || item.NewTasks || 0;
              dateMap.set(dateKey, entry);
            });
          }
        }
        
        // Fetch team activity and contributors
        try {
          const activityResponse = await axiosInstance.get(`/team/${team.id}/activity`);
          if (activityResponse.status === 200) {
            const activityData = activityResponse.data;
            
            if (activityData.activity) {
              // Weight each team's contribution by its task count
              // FIX: Use teamTaskCount instead of data.totalTasks which is out of scope
              const teamTaskWeight = teamTaskCount > 0 ? teamTaskCount : 1;
              totalTeamsWithActivity++;
              
              // Accumulate weighted values
              totalCompletedTasksCount += activityData.activity.completedTasksCount || 0;
              weightedCompletionRate += (activityData.activity.completionRate || 0) * teamTaskWeight;
              weightedAverageDuration += (activityData.activity.averageTaskDuration || 0) * teamTaskWeight;
              weightedPerformanceScore += (activityData.activity.performanceScore || 0) * teamTaskWeight;
            }
            
            // Collect contributors
            if (activityData.topContributors && Array.isArray(activityData.topContributors)) {
              allContributors = [...allContributors, ...activityData.topContributors];
            }
          }
        } catch (activityError) {
          console.error(`Failed to fetch activity data for team ${team.id}:`, activityError);
        }
      }
      
      // Calculate in-progress tasks
      const inProgressTasks = totalTasks - (completedTasks + overdueTasks);
      const previousInProgress = previousTotalTasks - (previousCompletedTasks + previousOverdueTasks);
      
      // Update task stats
      setTaskStats({
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        overdue: overdueTasks,
        totalGrowth: calculateGrowth(totalTasks, previousTotalTasks),
        completedGrowth: calculateGrowth(completedTasks, previousCompletedTasks),
        inProgressGrowth: calculateGrowth(inProgressTasks, previousInProgress),
        overdueGrowth: calculateGrowth(overdueTasks, previousOverdueTasks),
      });
      
      // Calculate average team activity metrics
      if (totalTeamsWithActivity > 0) {
        const totalTaskWeight = Math.max(1, totalTasks);
        
        // Update team activity with aggregated values
        setTeamActivity({
          completedTasksCount: totalCompletedTasksCount,
          completionRate: weightedCompletionRate / totalTaskWeight,
          averageTaskDuration: weightedAverageDuration / totalTaskWeight,
          performanceScore: weightedPerformanceScore / totalTaskWeight
        });
        
        // Process and deduplicate contributors by ID
        const uniqueContributors = new Map<string, TopContributor>();
        allContributors.forEach(contributor => {
          if (uniqueContributors.has(contributor.id)) {
            // If contributor exists, add up their task counts and average the performance scores
            const existing = uniqueContributors.get(contributor.id)!;
            existing.tasksCompleted += contributor.tasksCompleted;
            existing.performanceScore = (existing.performanceScore + contributor.performanceScore) / 2;
            uniqueContributors.set(contributor.id, existing);
          } else {
            uniqueContributors.set(contributor.id, {...contributor});
          }
        });
        
        // Select top 5 contributors based on combined metrics
        const sortedContributors = Array.from(uniqueContributors.values())
          .sort((a, b) => b.performanceScore - a.performanceScore || b.tasksCompleted - a.tasksCompleted)
          .slice(0, 5);
          
        setTopContributors(sortedContributors);
      }
      
      // Convert map back to array and sort by date
      const chartDataArray = Array.from(dateMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Update line chart data with time-normalized values
      setLineChartData({
        labels: chartDataArray.map(item => formatDateByTimePeriod(item.date, selectedTimePeriod)),
        datasets: [
          {
            label: 'Tamamlanan',
            data: chartDataArray.map(item => item.completed),
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Yeni Görevler',
            data: chartDataArray.map(item => item.newTasks),
            borderColor: 'rgb(74, 222, 128)',
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      });
      
      // Update doughnut chart data
      setDoughnutData({
        labels: ['Tamamlanan', 'Devam Eden', 'Geciken'],
        datasets: [{
          data: [completedTasks, inProgressTasks, overdueTasks],
          backgroundColor: [
            'rgb(99, 102, 241)',
            'rgb(74, 222, 128)',
            'rgb(248, 113, 113)',
          ],
          borderWidth: 0,
        }],
      });
      
    } catch (error) {
      console.error('Error fetching all teams data:', error);
      setDataFetchError("Tüm ekiplerin verilerini yüklerken hata oluştu.");
      
      // Set default empty data
      setTaskStats({
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        totalGrowth: '+0%',
        completedGrowth: '+0%',
        inProgressGrowth: '+0%',
        overdueGrowth: '+0%',
      });
      
      setLineChartData({
        labels: [],
        datasets: [],
      });
      
      setDoughnutData({
        labels: ['Tamamlanan', 'Devam Eden', 'Geciken'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: [
            'rgb(99, 102, 241)',
            'rgb(74, 222, 128)',
            'rgb(248, 113, 113)',
          ],
          borderWidth: 0,
        }],
      });
      
      setTeamActivity({
        completedTasksCount: 0,
        completionRate: 0,
        averageTaskDuration: 0,
        performanceScore: 0
      });
      
      setTopContributors([]);
    } finally {
      setDashboardLoading(false);
      setActivityLoading(false);
    }
  }, [teams, selectedTimePeriod, calculateGrowth, formatDateByTimePeriod]);

  // Use a ref to track initial render
  const initialRender = React.useRef(true);
  
  useEffect(() => {
    // Skip the first render to prevent unnecessary API calls
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    
    // Cancel any in-progress requests if component unmounts
    const controller = new AbortController();
    
    const loadData = async () => {
      if (selectedTeamId === "all" && teams.length > 0) {
        await fetchAllTeamsData();
      } else {
        await fetchDashboardData(selectedTeamId);
        if (selectedTeamId !== "all" && selectedTeamId !== "me") {
          await fetchTeamActivityAndContributors(selectedTeamId);
        }
      }
    };
    
    loadData();
    
    // Cleanup function
    return () => {
      controller.abort();
    };
  }, [selectedTeamId, teams.length, selectedTimePeriod,fetchAllTeamsData,fetchDashboardData,fetchTeamActivityAndContributors]); // Removed function dependencies

  const handleTeamChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeamId = e.target.value;
    setSelectedTeamId(newTeamId);
  }, []);

  // Update the handleTimePeriodChange function for better transitions
  const handleTimePeriodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriod = e.target.value;
    
    // First set loading state
    setDashboardLoading(true);
    
    // Then update the time period which will trigger data refresh
    setSelectedTimePeriod(newPeriod);
  }, []);

  // Update the chart options for better time period adaptation
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? '#fff' : '#000',
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(tooltipItems) {
            // Show more detailed date in tooltip based on time period
            if (tooltipItems.length > 0) {
              const index = tooltipItems[0].dataIndex;
              if (index !== undefined && lineChartData.labels && lineChartData.labels[index]) {
                return lineChartData.labels[index].toString();
              }
            }
            return '';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#000',
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#000',
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 0
        }
      }
    },
    // Update animation options to make transitions smoother when changing time periods
    animation: {
      duration: 500
    }
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? '#fff' : '#000',
          font: {
            size: 11
          }
        }
      }
    }
  };

  // Add state for report generation
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  
  const [isGeneratingAIAnalysis, setIsGeneratingAIAnalysis] = useState<boolean>(false);
  // Update this to use environment variable directly
  const [includeAIAnalysis, setIncludeAIAnalysis] = useState<boolean>(isAiAnalysisEnabled());
  
  // Reference to the charts
  const lineChartRef = React.useRef<Chart<'line', number[], string> | null>(null);
  const doughnutChartRef = React.useRef<Chart<'doughnut', number[], string> | null>(null);

  // Update the handleDownloadReport function
  const handleDownloadReport = async () => {
    try {
      if (!currentUser) {
        toast.error('Kullanıcı bilgileri bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }
      
      // Basic plan kontrolü
      if (currentUser?.subscriptionPlan?.toLowerCase() === 'basic') {
        toast.warning('Bu özellik sadece Pro plan kullanıcıları için mevcuttur.');
        return;
      }

      setIsGeneratingReport(true);
      toast.info("Rapor hazırlanıyor, lütfen bekleyin...");
      
      // Get the current team name
      let teamName = selectedTeamId;
      if (selectedTeamId !== "all" && selectedTeamId !== "me") {
        const selectedTeam = teams.find(team => team.id === selectedTeamId);
        if (selectedTeam) {
          teamName = selectedTeam.name;
        }
      }
      
      // Generate high-quality image data URLs from the charts with higher resolution
      let lineChartUrl = '';
      let doughnutChartUrl = '';
      
      if (lineChartRef.current) {
        // Set higher quality for PDF image rendering
        lineChartUrl = await chartToImageURL(lineChartRef.current);
      }
      
      if (doughnutChartRef.current) {
        // Set higher quality for PDF image rendering
        doughnutChartUrl = await chartToImageURL(doughnutChartRef.current);
      }
      
      // Prepare report data
      const reportData = {
        teamName: teamName,
        timePeriod: selectedTimePeriod,
        taskStats: taskStats,
        teamActivity: selectedTeamId !== "all" && selectedTeamId !== "me" ? teamActivity : undefined,
        topContributors: selectedTeamId !== "all" && selectedTeamId !== "me" ? topContributors : [],
        lineChartUrl,
        doughnutChartUrl,
        generatedDate: new Date()
      };
      
      // Check if we should include AI analysis - now using environment config
      if (includeAIAnalysis && isAiAnalysisEnabled()) {
        try {
          setIsGeneratingAIAnalysis(true);
          toast.info("DeepSeek R1 ile AI analizi oluşturuluyor...");
          
          // The AI analysis will be handled internally by the report generator
          toast.success("AI analizi başarıyla oluşturuldu!");
        } catch (error) {
          console.error("AI analizi oluşturulurken hata:", error);
          toast.error("AI analizi oluşturulamadı. Rapor AI analizi olmadan hazırlanacak.");
        } finally {
          setIsGeneratingAIAnalysis(false);
        }
      }
      
      // Generate the PDF report
      const pdfBlob = await generatePdfReport(reportData);
      
      // Format the filename
      const timePeriodText = selectedTimePeriod === 'week' ? 'Haftalik' : 
                            selectedTimePeriod === 'month' ? 'Aylik' : 'Yillik';
                            
      const teamText = selectedTeamId === "all" ? "TumEkipler" : 
                      selectedTeamId === "me" ? "Kisisel" : 
                      teamName.replace(/\s+/g, '_').replace(/[ğüşıöçĞÜŞİÖÇ]/g, c => 
                        ({ 'ğ':'g', 'ü':'u', 'ş':'s', 'ı':'i', 'ö':'o', 'ç':'c',
                           'Ğ':'G', 'Ü':'U', 'Ş':'S', 'İ':'I', 'Ö':'O', 'Ç':'C' }[c] || c));
                      
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      
      const filename = `MIA_${timePeriodText}_Rapor_${teamText}_${dateStr}.pdf`;
      
      // Save the file
      saveAs(pdfBlob, filename);
      
      toast.success("Rapor başarıyla oluşturuldu!");
    } catch (error) {
      console.error("Rapor oluşturulurken hata oluştu:", error);
      toast.error("Rapor oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Mevcut loading kontrolünü LoadingScreen ile değiştirelim
  if (isLoading) {
    return <LoadingScreen />;
  }



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>Dashboard</h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {isLoading ? 'Yükleniyor...' : dataFetchError || 'Hoşgeldiniz, bugün neler olduğuna bakalım'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Ekip seçimi dropdown */}
          <select 
            value={selectedTeamId}
            onChange={handleTeamChange}
            disabled={isLoading}
            className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="all">Tüm Ekipler</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          
          {/* Time period dropdown */}
          <select 
            value={selectedTimePeriod} 
            onChange={handleTimePeriodChange}
            className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white`}
          >
            <option value="week">Bu Hafta</option>
            <option value="month">Bu Ay</option>
            <option value="year">Bu Yıl</option>
          </select>
          
          {/* Replace API key configuration button with AI analysis toggle */}
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includeAIAnalysis}
                onChange={() => setIncludeAIAnalysis(!includeAIAnalysis)}
                className="sr-only peer"
                disabled={!isAiAnalysisEnabled()}
              />
              <div className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!isAiAnalysisEnabled() ? 'opacity-50' : ''}`}></div>
              <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                AI Analizi
                {!isAiAnalysisEnabled() && (
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(API anahtarı yok)</span>
                )}
              </span>
            </label>
          </div>
          
          {/* Report download button */}
          <button 
            onClick={handleDownloadReport}
            disabled={isGeneratingReport || isLoading || !!dataFetchError}
            className={`bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-medium transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg flex items-center ${
              (isGeneratingReport || isLoading || !!dataFetchError) ? 
              'opacity-50 cursor-not-allowed hover:bg-blue-500 hover:scale-100' : 
              'hover:bg-blue-600'
            }`}
          >
            {isGeneratingReport ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                {isGeneratingAIAnalysis ? 'AI Analizi...' : 'Hazırlanıyor...'}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Rapor İndir
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message display */}
      {dataFetchError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{dataFetchError}</p>
          <button 
            onClick={() => {
              setDataFetchError(null);
              if (selectedTeamId === "all") {
                fetchAllTeamsData();
              } else {
                fetchDashboardData(selectedTeamId);
                if (selectedTeamId !== "me") {
                  fetchTeamActivityAndContributors(selectedTeamId);
                }
              }
            }}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-sm"
          >
            Yeniden Dene
          </button>
        </div>
      )}

      {/* Loading skeleton instead of showing partially loaded content */}
      {isLoading ? (
        <div className="animate-pulse space-y-8">
          {/* Skeleton for statistics cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} h-24`}></div>
            ))}
          </div>
          
          {/* Skeleton for charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} h-80`}></div>
            <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} h-80`}></div>
          </div>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Toplam Görev</p>
                  <h3 className="text-2xl font-bold mt-1">{taskStats.total}</h3>
                </div>
                <span className="text-green-500">{taskStats.totalGrowth}</span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tamamlanan</p>
                  <h3 className="text-2xl font-bold mt-1">{taskStats.completed}</h3>
                </div>
                <span className="text-green-500">{taskStats.completedGrowth}</span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Devam Eden</p>
                  <h3 className="text-2xl font-bold mt-1">{taskStats.inProgress}</h3>
                </div>
                <span className="text-yellow-500">{taskStats.inProgressGrowth}</span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Geciken</p>
                  <h3 className="text-2xl font-bold mt-1">{taskStats.overdue}</h3>
                </div>
                <span className="text-red-500">{taskStats.overdueGrowth}</span>
              </div>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Task Progress Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Görev İlerlemesi
              </h2>
              <div className="h-[250px]">
                <Line 
                  data={lineChartData} 
                  options={{
                    ...chartOptions,
                    devicePixelRatio: 3 // Higher quality for export
                  }} 
                  ref={(reference) => {
                    if (reference !== null && reference !== undefined) {
                      lineChartRef.current = reference;
                    }
                  }}
                />
              </div>
            </motion.div>

            {/* Team Performance Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Görev Dağılımı
              </h2>
              <div className="h-[250px]">
                <Doughnut 
                  data={doughnutData} 
                  options={{
                    ...doughnutOptions,
                    devicePixelRatio: 3 // Higher quality for export
                  }}
                  ref={(reference) => {
                    if (reference !== null && reference !== undefined) {
                      doughnutChartRef.current = reference;
                    }
                  }} 
                />
              </div>
            </motion.div>
          </div>

          {/* Team Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Contributors */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  En Çok Katkı Sağlayanlar
                </h2>
              </div>
              <div className="space-y-4">
                {topContributors.map((contributor, index) => (
                  <div 
                    key={contributor.id} 
                    className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {contributor.profileImage ? (
                            <img 
                              src={contributor.profileImage} 
                              alt={contributor.name} 
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              index === 0 ? 'bg-yellow-100 text-yellow-600' :
                              index === 1 ? 'bg-gray-100 text-gray-600' :
                              index === 2 ? 'bg-orange-100 text-orange-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {contributor.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {index < 3 && (
                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-400 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              'bg-orange-400 text-white'
                            }`}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {contributor.name}
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {contributor.role}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {contributor.tasksCompleted} Görev
                        </p>
                        <p className={`text-sm ${
                          contributor.performanceScore >= 90 ? 'text-green-500' :
                          contributor.performanceScore >= 70 ? 'text-blue-500' :
                          'text-yellow-500'
                        }`}>
                          {contributor.performanceScore.toFixed(2)}% Performans {/* Changed from any decimal places to exactly 2 */}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Team Activity Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Ekip Aktivite Özeti
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Tamamlanan Görevler
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {teamActivity.completedTasksCount}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                      <svg className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Tamamlanma Oranı
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        %{teamActivity.completionRate.toFixed(1)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                      <svg className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Ortalama Görev Süresi
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {teamActivity.averageTaskDuration.toFixed(1)} gün
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                      <svg className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Ekip Performans Puanı
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${
                        teamActivity.performanceScore >= 90 ? 'text-green-500' :
                        teamActivity.performanceScore >= 70 ? 'text-blue-500' :
                        'text-yellow-500'
                      }`}>
                        {teamActivity.performanceScore.toFixed(1)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'}`}>
                      <svg className={`w-6 h-6 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}

      <Footer />
    </motion.div>
  );
};

export default Dashboard;