/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Chart } from 'chart.js';
import autoTable from 'jspdf-autotable';
import { generateTeamAnalysis, isAiAnalysisEnabled } from './aiAnalysisService';

// Add the missing type definition for jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

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

interface ReportData {
  teamName: string;
  timePeriod: string;
  taskStats: TaskStats;
  teamActivity?: TeamActivity;
  topContributors: TopContributor[];
  lineChartUrl: string;
  doughnutChartUrl: string;
  generatedDate: Date;
  aiAnalysis?: string; // New field for AI analysis
}

// Helper function to convert chart to image data URL
export const chartToImageURL = (chart: Chart): Promise<string> => {
  return new Promise((resolve) => {
    resolve(chart.toBase64Image());
  });
};

// Helper function to get time period display text
const getTimePeriodText = (period: string): string => {
  switch (period) {
    case 'week':
      return 'Haftalık';
    case 'month':
      return 'Aylık';
    case 'year':
      return 'Yıllık';
    default:
      return 'Genel';
  }
};

// Helper function to format date
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  });
};

// Helper function to replace Turkish characters for PDF compatibility
const replaceTurkishChars = (text: string): string => {
  return text
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C');
};

// Helper function to convert markdown-like text to properly formatted text
const formatMarkdownText = (text: string): string => {
  return text
    // Remove markdown headers (##, ###, etc.)
    .replace(/^#{1,6}\s*/gm, '')
    // Convert bold markdown (**text** or __text__) to plain text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Convert italic markdown (*text* or _text_) to plain text
    .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_(?!_)([^_]+)_(?!_)/g, '$1')
    // Remove markdown list indicators
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Convert line breaks and clean up spacing
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    // Remove any remaining markdown syntax
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
};

// Helper function to add a section title to PDF
const addSectionTitle = (doc: jsPDF, text: string, y: number): number => {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(text, 20, y); // Increased left margin
  doc.setLineWidth(0.5);
  doc.line(20, y + 2, 190, y + 2); // Adjusted line width
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  return y + 10;
};

// Function to generate performance analysis text
const generatePerformanceAnalysis = (taskStats: TaskStats, teamActivity?: TeamActivity): string => {
  let analysis = '';
  
  // Debug: Log team activity data
  console.log('Team Activity Data:', teamActivity);
  
  // Task completion analysis
  const completionRate = taskStats.completed / taskStats.total * 100 || 0;
  
  if (completionRate >= 80) {
    analysis += `Gorev tamamlama orani %${completionRate.toFixed(1)} ile mukemmel seviyede. `;
  } else if (completionRate >= 60) {
    analysis += `Gorev tamamlama orani %${completionRate.toFixed(1)} ile iyi seviyede. `;
  } else {
    analysis += `Gorev tamamlama orani %${completionRate.toFixed(1)} ile gelistirilmesi gereken bir seviyede. `;
  }
  
  // Growth trend analysis
  const totalGrowth = parseFloat(taskStats.totalGrowth.replace('+', '').replace('%', ''));
  const completedGrowth = parseFloat(taskStats.completedGrowth.replace('+', '').replace('%', ''));
  
  if (completedGrowth > totalGrowth) {
    analysis += `Tamamlanan gorevlerdeki %${completedGrowth.toFixed(1)} artis, toplam gorev artisindan (%${totalGrowth.toFixed(1)}) daha yuksek oldugu icin verimlilik artisi gozlemlenmektedir. `;
  } else if (completedGrowth > 0) {
    analysis += `Tamamlanan gorevlerde %${completedGrowth.toFixed(1)} artis gorulmektedir. `;
  } else {
    analysis += `Tamamlanan gorevlerde %${Math.abs(completedGrowth).toFixed(1)} dusus gozlemlenmektedir. Bu durum incelenmelidir. `;
  }
  
  // Overdue analysis
  const overdueRate = taskStats.overdue / taskStats.total * 100 || 0;
  if (overdueRate > 20) {
    analysis += `Geciken gorevlerin orani %${overdueRate.toFixed(1)} ile yuksek seviyededir. Bu durum ivedilikle ele alinmalidir. `;
  } else if (overdueRate > 10) {
    analysis += `Geciken gorevlerin orani %${overdueRate.toFixed(1)} seviyesindedir. Iyilestirme icin planlama yapilmasi onerilir. `;
  } else {
    analysis += `Geciken gorevlerin orani %${overdueRate.toFixed(1)} ile kontrol altindadir. `;
  }
  
  // Team activity analysis if available  
  if (teamActivity && typeof teamActivity === 'object') {
    analysis += `\n\n--- EKIP PERFORMANS DETAYLARI ---\n`;
    
    // Performance Score Analysis
    if (teamActivity.performanceScore !== undefined && teamActivity.performanceScore !== null) {
      analysis += `Ekip performans puani ${teamActivity.performanceScore.toFixed(1)} olarak hesaplanmistir. `;
      
      if (teamActivity.performanceScore >= 90) {
        analysis += "Ekip ustun bir performans gostermektedir. ";
      } else if (teamActivity.performanceScore >= 70) {
        analysis += "Ekip iyi bir performans gostermektedir. ";
      } else if (teamActivity.performanceScore >= 50) {
        analysis += "Ekip orta seviyede bir performans gostermektedir. Iyilestirme calismalari yapilabilir. ";
      } else {
        analysis += "Ekip performansinin artirilmasi icin acil onlemler alinmasi gerekmektedir. ";
      }
    }
    
    // Average Task Duration Analysis
    if (teamActivity.averageTaskDuration !== undefined && teamActivity.averageTaskDuration !== null) {
      analysis += `\n\nOrtalama gorev tamamlama suresi ${teamActivity.averageTaskDuration.toFixed(1)} gundur. `;
      
      if (teamActivity.averageTaskDuration > 14) {
        analysis += "Gorev tamamlama sureleri oldukca uzundur. Sureclerin optimize edilmesi onerilir. ";
      } else if (teamActivity.averageTaskDuration > 7) {
        analysis += "Gorev tamamlama sureleri kabul edilebilir durumdadir. ";
      } else {
        analysis += "Gorev tamamlama sureleri verimli bir sekilde yonetilmektedir. ";
      }
    }
    
    // Completion Rate Analysis
    if (teamActivity.completionRate !== undefined && teamActivity.completionRate !== null) {
      analysis += `\n\nEkip tamamlama orani %${teamActivity.completionRate.toFixed(1)} seviyesindedir. `;
      
      if (teamActivity.completionRate >= 80) {
        analysis += "Bu oran mukemmel bir seviyeyi gostermektedir.";
      } else if (teamActivity.completionRate >= 60) {
        analysis += "Bu oran iyi bir seviyeyi gostermektedir.";
      } else if (teamActivity.completionRate >= 40) {
        analysis += "Bu oran orta seviyededir, iyilestirme alanları bulunmaktadir.";
      } else {
        analysis += "Bu oran dusuk seviyededir, acil mudahale gerekmektedir.";
      }
    }
  }
  
  return analysis;
};

// Function to generate recommendations based on the stats
const generateRecommendations = (taskStats: TaskStats, teamActivity?: TeamActivity): string[] => {
  const recommendations: string[] = [];
  
  // Task completion recommendations
  const completionRate = taskStats.completed / taskStats.total * 100 || 0;
  if (completionRate < 60) {
    recommendations.push("Gorev tamamlama oranini artirmak icin kaynak planlamasi ve onceliklendirme stratejileri gozden gecirilmelidir.");
  }
  
  // Overdue recommendations
  const overdueRate = taskStats.overdue / taskStats.total * 100 || 0;
  if (overdueRate > 15) {
    recommendations.push("Geciken gorevlerin sayisini azaltmak icin zaman yonetimi egitimleri duzenlenebilir ve takip mekanizmalari guclendirilebilir.");
  }
  
  // Growth trend recommendations
  const completedGrowth = parseFloat(taskStats.completedGrowth.replace('+', '').replace('%', ''));
  if (completedGrowth < 0) {
    recommendations.push("Tamamlanan gorevlerdeki dusus trendini tersine cevirmek icin motivasyon artirici yontemler ve ekip calismasini guclendirici aktiviteler planlanabilir.");
  }
  
  // Team specific recommendations
  if (teamActivity) {
    if (teamActivity.performanceScore < 70) {
      recommendations.push("Ekip performansini artirmak icin egitim programlari duzenlenebilir ve mentorluk sistemi kurulabilir.");
    }
    
    if (teamActivity.averageTaskDuration > 10) {
      recommendations.push("Gorev tamamlama surelerini kisaltmak icin is surecleri analiz edilebilir ve darbogazlar tespit edilip giderilebilir.");
    }
    
    if (teamActivity.completionRate < 70) {
      recommendations.push("Gorev tamamlama oranini artirmak icin gorev dagilimi ve kaynak tahsisi yeniden degerlendirilebilir.");
    }
  }
  
  // Add general recommendations if list is too short
  if (recommendations.length < 3) {
    recommendations.push("Duzenli ekip toplantilari ile gorev takibi yapilarak sureclerin seffaf bir sekilde yonetilmesi saglanabilir.");
    recommendations.push("Basarili gorev tamamlamalarini tesvik etmek icin odul mekanizmalari gelistirilebilir.");
  }
  
  return recommendations;
};

// Main report generation function
export const generatePdfReport = async (reportData: ReportData): Promise<Blob> => {
  // Try to add AI analysis if enabled in environment
  if (!reportData.aiAnalysis && isAiAnalysisEnabled()) {
    try {
      // Prepare data for AI analysis
      const aiAnalysisData = {
        teamName: typeof reportData.teamName === 'string' ? reportData.teamName : 'Tüm Ekipler',
        period: reportData.timePeriod,
        taskStats: reportData.taskStats,
        teamActivity: reportData.teamActivity,
        topContributors: reportData.topContributors || []
      };
      
      // Generate AI analysis using environment API key
      const analysis = await generateTeamAnalysis(aiAnalysisData);
      
      // Add AI analysis to report data
      if (analysis) {
        reportData.aiAnalysis = analysis;
      }
    } catch (error) {
      console.error("AI analizi oluşturulurken hata:", error);
      // Continue without AI analysis on error
    }
  }

  // Create a new PDF document with better margin settings
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });

  // Set margins by adjusting the coordinate system
  doc.setProperties({
    title: 'Performance Report',
    creator: 'MIA Job Tracking System'
  });

  
  let yPos = 20;
  
  // Add report header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  
  // Replace Turkish characters in header and use center alignment
  const headerText = `${replaceTurkishChars(getTimePeriodText(reportData.timePeriod))} Performans Raporu`;
  doc.text(headerText, 105, yPos, { align: 'center' });
  yPos += 10;
  
  // Add company logo or name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('MIA Is Takip Sistemi', 105, yPos, { align: 'center' });
  yPos += 8;
  
  // Add report details
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  
  // Format team name display based on selection
  let teamDisplay = reportData.teamName;
  if (reportData.teamName === "all") {
    teamDisplay = "Tum Ekipler";
  } else if (reportData.teamName === "me") {
    teamDisplay = "Kisisel";
  } else {
    teamDisplay = replaceTurkishChars(teamDisplay);
  }
  
  // Replace Turkish characters in report details
  const reportDetails = [
    `Ekip: ${teamDisplay}`,
    `Donem: ${replaceTurkishChars(getTimePeriodText(reportData.timePeriod))}`,
    `Olusturulma Tarihi: ${formatDate(reportData.generatedDate)}`
  ];
  
  doc.text(reportDetails, 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Add executive summary
  yPos = addSectionTitle(doc, '1. Yonetici Ozeti', yPos);
  
  // Replace Turkish characters in executive summary
  const executiveSummary = 
    `Bu rapor, ${teamDisplay} icin ${replaceTurkishChars(getTimePeriodText(reportData.timePeriod).toLowerCase())} performans verilerini icermektedir. ` +
    `Rapor donemi icerisinde toplam ${reportData.taskStats.total} gorev kaydedilmis, bunlardan ${reportData.taskStats.completed} tanesi tamamlanmis, ` +
    `${reportData.taskStats.inProgress} tanesi devam etmekte ve ${reportData.taskStats.overdue} tanesi gecikmis durumdadir. ` +
    `Bir onceki doneme gore toplam gorev sayisinda ${reportData.taskStats.totalGrowth} degisim gozlenmistir.`;
  
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  
  // Use proper text wrapping with improved margins
  const executiveSummaryLines = doc.splitTextToSize(executiveSummary, 170);
  doc.text(executiveSummaryLines, 20, yPos);
  yPos += executiveSummaryLines.length * 6 + 5;
  
  // Add task statistics section
  yPos = addSectionTitle(doc, '2. Gorev Istatistikleri', yPos);
  
  // Create a table for task statistics with better styling
  autoTable(doc, {
    startY: yPos,
    head: [['Metrik', 'Deger', 'Degisim']],
    body: [
      ['Toplam Gorev', reportData.taskStats.total.toString(), reportData.taskStats.totalGrowth],
      ['Tamamlanan', reportData.taskStats.completed.toString(), reportData.taskStats.completedGrowth],
      ['Devam Eden', reportData.taskStats.inProgress.toString(), reportData.taskStats.inProgressGrowth],
      ['Geciken', reportData.taskStats.overdue.toString(), reportData.taskStats.overdueGrowth]
    ],
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    styles: { 
      fontSize: 10,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'left'
    },
    margin: { left: 20, right: 20 },
    theme: 'grid'
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Add team activity section if available
  if (reportData.teamActivity) {
    yPos = addSectionTitle(doc, '3. Ekip Performans Gostergeleri', yPos);
    
    // Create a table for team activity with better styling
    autoTable(doc, {
      startY: yPos,
      head: [['Metrik', 'Deger']],
      body: [
        ['Tamamlanan Gorev Sayisi', reportData.teamActivity.completedTasksCount.toString()],
        ['Tamamlanma Orani', `%${reportData.teamActivity.completionRate.toFixed(1)}`],
        ['Ortalama Gorev Suresi', `${reportData.teamActivity.averageTaskDuration.toFixed(1)} gun`],
        ['Performans Puani', reportData.teamActivity.performanceScore.toFixed(1)]
      ],
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      styles: { 
        fontSize: 10,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left' 
      },
      margin: { left: 20, right: 20 },
      theme: 'grid'
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Add performance analysis
  const nextSectionNumber = reportData.teamActivity ? '4' : '3';
  yPos = addSectionTitle(doc, `${nextSectionNumber}. Performans Analizi`, yPos);
  
  // Generate analysis and replace Turkish characters
  const analysis = generatePerformanceAnalysis(reportData.taskStats, reportData.teamActivity);
  const processedAnalysis = replaceTurkishChars(analysis);
  
  // Set font properties for analysis text
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  
  // Improve text wrapping and layout with better line spacing
  const analysisLines = doc.splitTextToSize(processedAnalysis, 170);
  
  // Add each line with proper spacing
  analysisLines.forEach((line: string, index: number) => {
    doc.text(line, 20, yPos + (index * 7)); // Increased line spacing from 6 to 7
  });
  
  yPos += analysisLines.length * 7 + 8;
  
  // Check if we need a new page for charts
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  // Add charts section
  const chartsSectionNumber = reportData.teamActivity ? '5' : '4';
  yPos = addSectionTitle(doc, `${chartsSectionNumber}. Grafiksel Analiz`, yPos);
  
  // Add line chart with better positioning
  doc.text("Gorev Ilerlemesi:", 20, yPos);
  yPos += 5;
  
  // Adjust chart size and position for better layout
  try {
    doc.addImage(reportData.lineChartUrl, 'PNG', 20, yPos, 170, 70);
    yPos += 80;
  } catch (err) {
    console.error("Chart rendering error:", err);
    doc.text("Grafik yuklenemedi", 20, yPos);
    yPos += 10;
  }
  
  // Check if we need to add page break before the second chart
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  // Add doughnut chart with better centering
  doc.text("Gorev Dagilimi:", 20, yPos);
  yPos += 5;
  
  try {
    // Center the doughnut chart
    doc.addImage(reportData.doughnutChartUrl, 'PNG', 65, yPos, 80, 80);
    yPos += 90;
  } catch (err) {
    console.error("Chart rendering error:", err);
    doc.text("Grafik yuklenemedi", 20, yPos);
    yPos += 10;
  }
  
  // Check if we need a new page for contributors
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  }
  
  // Add top contributors section if there are any
  if (reportData.topContributors.length > 0) {
    const contributorsSectionNumber = reportData.teamActivity ? '6' : '5';
    yPos = addSectionTitle(doc, `${contributorsSectionNumber}. En Cok Katki Saglayan Ekip Uyeleri`, yPos);
    
    // Process data to remove Turkish characters
    const contributorsData = reportData.topContributors.map(contributor => [
      replaceTurkishChars(contributor.name),
      replaceTurkishChars(contributor.role),
      contributor.tasksCompleted.toString(),
      `${contributor.performanceScore.toFixed(1)}%`
    ]);
    
    // Create table with improved formatting
    autoTable(doc, {
      startY: yPos,
      head: [['Isim', 'Rol', 'Tamamlanan Gorev', 'Performans']],
      body: contributorsData,
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      styles: { 
        fontSize: 10,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left' 
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' }
      },
      margin: { left: 20, right: 20 },
      theme: 'grid'
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Add recommendations section
  const hasAiAnalysis = reportData.aiAnalysis && reportData.aiAnalysis.trim() !== '';
  
  let recommendationsSectionNumber = reportData.teamActivity ? 
    (reportData.topContributors.length > 0 ? '7' : '6') : 
    (reportData.topContributors.length > 0 ? '6' : '5');
    
  // Increment section number if there will be an AI analysis section
  if (hasAiAnalysis) {
    recommendationsSectionNumber = (parseInt(recommendationsSectionNumber) + 1).toString();
  }
  
  yPos = addSectionTitle(doc, `${recommendationsSectionNumber}. Oneriler ve Gelecek Adimlar`, yPos);
  
  // Replace Turkish characters in recommendations
  const recommendations = generateRecommendations(reportData.taskStats, reportData.teamActivity);
  
  // Improve recommendation formatting
  recommendations.forEach((recommendation, index) => {
    const recommendationText = `${index + 1}. ${recommendation}`;
    const recommendationLines = doc.splitTextToSize(recommendationText, 170);
    doc.text(recommendationLines, 20, yPos);
    yPos += recommendationLines.length * 6 + 3;
    
    // Add page break if needed
    if (yPos > 270 && index < recommendations.length - 1) {
      doc.addPage();
      yPos = 20;
    }
  });
  
  // Add AI Analysis section if available
  if (hasAiAnalysis) {
    // Start a new page for AI analysis
    doc.addPage();
    yPos = 20;
    
    // Calculate AI analysis section number
    const aiAnalysisSectionNumber = reportData.teamActivity ? 
      (reportData.topContributors.length > 0 ? '6' : '5') : 
      (reportData.topContributors.length > 0 ? '5' : '4');
    
    yPos = addSectionTitle(doc, `${aiAnalysisSectionNumber}. Yapay Zeka Ekip Analizi`, yPos);
    
    // Add subtitle for AI analysis source
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text('Google Gemini 2.0 Flash Experimental model tarafindan olusturulmustur', 20, yPos);
    yPos += 8;
    
    // Reset font for analysis content
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    
    // Format and add AI analysis with better text wrapping
    if (reportData.aiAnalysis) {
      // First format markdown to clean text, then apply Turkish character replacement
      let formattedAnalysis = formatMarkdownText(reportData.aiAnalysis);
      
      // Clean up AI analysis specific formatting issues
      formattedAnalysis = formattedAnalysis
        .replace(/\[Raporun Olusturuldugu T[^\]]*\]/g, formatDate(reportData.generatedDate))
        .replace(/\[Is Analistinin Adi Soyadi\]/g, 'MIA Sistem Analisti')
        .replace(/Unvan: Is Analisti/g, 'Unvan: Sistem Analisti')
        .replace(/Hazirlayan: \[Is Analistinin Adi Soyadi\]/g, 'Hazirlayan: MIA Sistem Analisti');
      
      const processedAnalysis = replaceTurkishChars(formattedAnalysis);
      
      // Split the analysis into logical sections
      const sections = processedAnalysis.split('\n\n').filter(s => s.trim() !== '');
      
      // Add each section with proper formatting
      sections.forEach((section, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        // Check if this looks like a section header (short line, all caps, or ends with colon)
        const isHeader = section.length < 100 && (
          section.toUpperCase() === section ||
          section.endsWith(':') ||
          /^[A-ZÜĞŞÇIÖ\s]+:?$/.test(section) ||
          section.includes('Raporu') ||
          section.includes('Analiz')
        );
        
        if (isHeader) {
          // Format as subsection header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(41, 128, 185);
          const headerLines = doc.splitTextToSize(section, 170);
          doc.text(headerLines, 20, yPos);
          yPos += headerLines.length * 6 + 3;
          
          // Reset to normal formatting
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
        } else {
          // Format as regular paragraph
          const lines = doc.splitTextToSize(section, 170);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 6 + 5; // Add spacing between paragraphs
        }
      });
    }
  }
  
  // Add footer with improved positioning
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `MIA Is Takip Sistemi - ${formatDate(reportData.generatedDate)} - Sayfa ${i}/${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
  }
  
  // Return the PDF as a blob
  return doc.output('blob');
};