const fs = require('fs-extra');
const path = require('path');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// NDJSON dosyasını parse eden yardımcı fonksiyon
function parseNDJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const metrics = {
    http_reqs: { count: 0 },
    http_req_duration: { avg: 0, p95: 0 },
    errors: { rate: 0 },
    http_reqs_status: {}
  };

  let totalDuration = 0;
  let durationPoints = [];

  lines.forEach(line => {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'Point' && obj.metric === 'http_req_duration') {
        totalDuration += obj.data.value;
        durationPoints.push(obj.data.value);
      }
      if (obj.type === 'Point' && obj.metric === 'http_reqs') {
        metrics.http_reqs.count++;
        const status = obj.data.tags.status;
        metrics.http_reqs_status[status] = (metrics.http_reqs_status[status] || 0) + 1;
      }
    } catch (e) {
      console.warn('Invalid JSON line:', e.message);
    }
  });

  // İstatistikleri hesapla
  if (durationPoints.length > 0) {
    metrics.http_req_duration.avg = totalDuration / durationPoints.length;
    durationPoints.sort((a, b) => a - b);
    const p95Index = Math.floor(durationPoints.length * 0.95);
    metrics.http_req_duration.p95 = durationPoints[p95Index] || 0;
  }

  return { metrics };
}

// PDF raporu oluşturan ana fonksiyon
async function generateReport() {
  console.log('PDF rapor oluşturuluyor...');
  
  // Rapor klasörünü oluştur
  const reportsDir = path.join(__dirname, 'reports');
  fs.ensureDirSync(reportsDir);
  
  // Geçici JSON sonuçlarının konumu
  const resultsDir = path.join(__dirname, 'results');
  fs.ensureDirSync(resultsDir);
  
  // Tarih bilgisini alarak rapor dosya adını oluşturma
  const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
  const reportFilePath = path.join(reportsDir, `api-tests-report-${timestamp}.pdf`);
  
  // Mevcut JSON sonuç dosyalarını okuma
  const testFiles = [
    { name: 'Auth API', file: path.join(resultsDir, 'auth-api-results.json') },
    { name: 'Users API', file: path.join(resultsDir, 'users-api-results.json') },
    { name: 'Tasks API', file: path.join(resultsDir, 'tasks-api-results.json') }
  ];
  
  // Test sonuçlarını topla
  const testResults = [];
  
  for (const test of testFiles) {
    try {
      if (fs.existsSync(test.file)) {
        const data = parseNDJSON(test.file);
        testResults.push({
          name: test.name,
          data: data
        });
      }
    } catch (error) {
      console.error(`${test.name} sonuçları okunamadı: ${error.message}`);
    }
  }
  
  // PDF oluşturma işlemi
  await createPdf(reportFilePath, testResults);
  
  console.log(`PDF rapor başarıyla oluşturuldu: ${reportFilePath}`);
  return reportFilePath;
}

// PDF dosyasını oluşturan fonksiyon
async function createPdf(filePath, testResults) {
  // PDF dokümanı oluşturma
  const doc = new PDFDocument({ 
    margin: 50, 
    size: 'A4'
  });
  
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  
  // Varsayılan font encoding'ini ayarla
  doc.font('Helvetica');
  
  // Başlık ve özet bilgileri
  addHeader(doc);
  
  // Her test için sonuçları ekle
  let yOffset = 150;
  
  if (testResults.length === 0) {
    doc.fontSize(12).text('Hiçbir test sonucu bulunamadı.', 50, yOffset);
    yOffset += 30;
  } else {
    for (const result of testResults) {
      yOffset = await addTestResults(doc, result, yOffset);
      
      if (yOffset > 700) {
        doc.addPage();
        yOffset = 50;
      } else {
        yOffset += 30;
      }
    }
  }
  
  // Özet grafikleri
  if (testResults.length > 0) {
    doc.addPage();
    await addSummaryCharts(doc, testResults);
  }
  
  // Rapor altbilgisi
  doc.fontSize(10).text(`Rapor oluşturma tarihi: ${moment().format('DD.MM.YYYY HH:mm:ss')}`, 50, doc.page.height - 50, {
    align: 'center'
  });
  
  doc.end();
  
  return new Promise((resolve) => {
    stream.on('finish', resolve);
  });
}

// PDF başlık bölümü
function addHeader(doc) {
  doc.fontSize(20).text('API Performans Test Raporu', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Olusturulma Tarihi: ${moment().format('DD.MM.YYYY HH:mm:ss')}`, { align: 'center' });
  doc.moveDown();
  doc.moveTo(50, 120).lineTo(doc.page.width - 50, 120).stroke();
  doc.moveDown();
}

// Test sonuçları ekleme fonksiyonu
async function addTestResults(doc, result, yOffset) {
  // Test başlığı
  doc.fontSize(16).text(result.name, 50, yOffset);
  yOffset += 25;
  
  // Test verileri yoksa bilgi mesajı göster
  if (!result.data || !result.data.metrics) {
    doc.fontSize(12).text('Test sonuçları bulunamadı veya eksik.', 50, yOffset);
    return yOffset + 20;
  }
  
  // Metrikleri ekleme
  const metrics = result.data.metrics;
  
  // Özet metrikleri
  doc.fontSize(12).text('Özet Metrikler:', 50, yOffset);
  yOffset += 20;
  
  const summaryTable = [
    ['Metrik', 'Değer'],
    ['İstek Sayısı', formatNumber(metrics.http_reqs?.count || 0)],
    ['Ortalama İstek Süresi', formatDuration(metrics.http_req_duration?.avg || 0)],
    ['95. Yüzdelik İstek Süresi', formatDuration(metrics.http_req_duration?.p95 || 0)],
    ['Hata Oranı', `${formatNumber((metrics.errors?.rate || 0) * 100)}%`],
  ];
  
  yOffset = drawTable(doc, summaryTable, 50, yOffset);
  yOffset += 30;
  
  // HTTP durum kodları
  if (metrics.http_reqs_status) {
    doc.fontSize(12).text('HTTP Durum Kodları:', 50, yOffset);
    yOffset += 20;
    
    const statusTable = [['Durum Kodu', 'Sayı', 'Yüzde']];
    
    Object.entries(metrics.http_reqs_status || {}).forEach(([status, count]) => {
      if (status !== 'count') {
        const percentage = (count / metrics.http_reqs.count) * 100;
        statusTable.push([
          status,
          formatNumber(count),
          `${formatNumber(percentage)}%`
        ]);
      }
    });
    
    yOffset = drawTable(doc, statusTable, 50, yOffset);
  }
  
  return yOffset;
}

// Grafik ekleme fonksiyonu
async function addSummaryCharts(doc, testResults) {
  doc.fontSize(16).text('Performans Karşılaştırma Grafikleri', { align: 'center' });
  doc.moveDown();
  
  // API'lar arası performans karşılaştırma grafiği
  const requestDurations = testResults.map(test => ({
    name: test.name,
    avg: test.data?.metrics?.http_req_duration?.avg || 0,
    p95: test.data?.metrics?.http_req_duration?.p95 || 0
  }));
  
  if (requestDurations.length > 0) {
    // İstek süresi grafiği oluştur
    const durationChart = await createBarChart(
      'Ortalama İstek Süreleri (ms)',
      requestDurations.map(item => item.name),
      [
        {
          label: 'Ortalama',
          data: requestDurations.map(item => item.avg),
          backgroundColor: 'rgba(54, 162, 235, 0.5)'
        },
        {
          label: '95. Yüzdelik',
          data: requestDurations.map(item => item.p95),
          backgroundColor: 'rgba(255, 99, 132, 0.5)'
        }
      ]
    );
    
    doc.image(durationChart, 50, 150, { width: 500 });
    
    // Hata oranları grafiği
    const errorRates = testResults.map(test => ({
      name: test.name,
      rate: (test.data?.metrics?.errors?.rate || 0) * 100
    }));
    
    const errorChart = await createBarChart(
      'Hata Oranları (%)',
      errorRates.map(item => item.name),
      [
        {
          label: 'Hata Oranı',
          data: errorRates.map(item => item.rate),
          backgroundColor: 'rgba(255, 206, 86, 0.5)'
        }
      ]
    );
    
    doc.image(errorChart, 50, 400, { width: 500 });
  }
}

// Tablo çizim fonksiyonu
function drawTable(doc, data, x, y) {
  const cellPadding = 5;
  const colWidths = calculateColumnWidths(doc, data);
  let startY = y;
  
  // Başlık satırı
  doc.font('Helvetica-Bold');
  drawTableRow(doc, data[0], x, startY, colWidths, cellPadding);
  startY += 20;
  doc.font('Helvetica');
  
  // Veri satırları
  for (let i = 1; i < data.length; i++) {
    drawTableRow(doc, data[i], x, startY, colWidths, cellPadding);
    startY += 20;
  }
  
  return startY + 5;
}

// Tablo satırı çizimi
function drawTableRow(doc, rowData, x, y, colWidths, padding) {
  let currentX = x;
  
  rowData.forEach((cell, index) => {
    // Türkçe karakterler için encoding düzeltmesi
    const text = cell.toString()
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
    
    doc.text(text, currentX + padding, y + padding, {
      width: colWidths[index] - (padding * 2),
      align: 'left'
    });
    currentX += colWidths[index];
  });
}

// Sütun genişliği hesaplama
function calculateColumnWidths(doc, data) {
  const totalWidth = doc.page.width - 100;
  const numColumns = data[0].length;
  
  // Basit eşit genişlik dağılımı
  return Array(numColumns).fill(totalWidth / numColumns);
}

// Grafik oluşturma fonksiyonu
async function createBarChart(title, labels, datasets) {
  const width = 600;
  const height = 400;
  
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
    width, 
    height, 
    backgroundColour: 'white'
  });
  
  const configuration = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 18 }
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };
  
  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// Sayı formatlama yardımcı fonksiyonu
function formatNumber(value) {
  return Number(value).toFixed(2).replace(/\.00$/, '');
}

// Süre formatlama yardımcı fonksiyonu
function formatDuration(ms) {
  return `${formatNumber(ms)} ms`;
}

// Ana fonksiyonu çalıştır
generateReport().catch(error => {
  console.error('Rapor oluşturma hatası:', error);
  process.exit(1);
});