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
    { name: 'Tasks API', file: path.join(resultsDir, 'tasks-api-results.json') },
    { name: 'Calendar API', file: path.join(resultsDir, 'calendar-api-results.json') },
    { name: 'Notification API', file: path.join(resultsDir, 'notification-api-results.json') },
    { name: 'Team API', file: path.join(resultsDir, 'team-api-results.json') },
    { name: 'Message API', file: path.join(resultsDir, 'message-api-results.json') },
    { name: 'Feedback API', file: path.join(resultsDir, 'feedback-api-results.json') }
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
  // PDF dokümanı oluşturma - marjinleri optimize edelim
  const doc = new PDFDocument({ 
    margin: 40, 
    size: 'A4',
    bufferPages: true  // Sayfa tamponlamayı etkinleştir
  });
  
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  
  // Varsayılan font encoding'ini ayarla
  doc.font('Helvetica');
  
  // İlk sayfayı oluştur
  // Başlık ve özet bilgileri
  addHeader(doc);
  
  // Her test için sonuçları ekle
  let yOffset = 100; // Başlangıç y-pozisyonunu biraz daha azaltalım
  
  if (testResults.length === 0) {
    doc.fillColor('black').fontSize(12).text('Hiçbir test sonucu bulunamadı.', 50, yOffset);
    yOffset += 30;
  } else {
    // Tüm testleri tek sayfada göstermeye çalış
    for (let i = 0; i < testResults.length; i++) {
      const result = testResults[i];
      
      // Sayfa taşma kontrolü - daha hassas
      const estimatedHeight = estimateTestResultHeight(result);
      
      // Eğer bu test sonucu mevcut sayfaya sığmayacaksa yeni sayfa ekle
      if (yOffset + estimatedHeight > doc.page.height - 70) {
        doc.addPage();
        yOffset = 60; // Üst margin'i daha da azaltalım
        
        // Yeni sayfada başlık ekle - daha kompakt
        doc.rect(0, 0, doc.page.width, 40).fill('#336699');
        doc.fillColor('white').fontSize(16).text('API Performans Test Raporu (Devam)', 40, 15, { align: 'center' });
        doc.fillColor('black');
      }
      
      // Test sonuçlarını ekle
      yOffset = await addTestResults(doc, result, yOffset);
      
      // Testler arası boşluk - son test için boşluk ekleme
      if (i < testResults.length - 1) {
        yOffset += 15; // Testler arası boşluğu azaltalım
      }
    }
  }
  
  // Özet grafikleri - sadece verimli veri varsa ekleme yap
  let hasValidData = false;
  
  // Geçerli veri var mı kontrol et
  if (testResults.length > 0) {
    const requestDurations = testResults.map(test => ({
      name: test.name,
      avg: test.data?.metrics?.http_req_duration?.avg || 0,
      p95: test.data?.metrics?.http_req_duration?.p95 || 0
    }));
    
    // Eğer en az bir testte geçerli veri varsa grafik sayfasını ekle
    hasValidData = !requestDurations.every(d => d.avg === 0 && d.p95 === 0);
    
    if (hasValidData) {
      doc.addPage();
      await addSummaryCharts(doc, testResults);
    }
  }
  
  // Sayfa numaralarını dök
  const totalPages = doc.bufferedPageRange().count;
  
  // Sayfa numarası ve alt bilgiler
  for (let i = 0; i < totalPages; i++) {
    try {
      doc.switchToPage(i);
      addFooter(doc, i + 1, totalPages);
    } catch (err) {
      console.warn(`Sayfa ${i} için altbilgi eklenirken bir sorun oluştu:`, err.message);
      // Hata ile devam et, raporun tamamen başarısız olmasını engelle
    }
  }
  
  // Dokümanı tamamla
  doc.end();
  
  return new Promise((resolve) => {
    stream.on('finish', resolve);
  });
}

// Test sonucu için tahmini yükseklik hesaplama
function estimateTestResultHeight(result) {
  // Test başlığı: ~30px
  // Boş veri mesajı: ~20px
  if (!result.data || !result.data.metrics) {
    return 50; // Başlık + boş veri mesajı
  }
  
  // Metrikler tablosu: ~5 satır * 25px = 125px
  // HTTP durum kodları tablosu: tahmini 3 satır * 25px = 75px
  // Marjinler ve boşluklar: ~40px
  return 250; // Tahmini toplam yükseklik
}

// PDF başlık bölümü - daha kompakt
function addHeader(doc) {
  // Başlık arkaplanı
  doc.rect(0, 0, doc.page.width, 70).fill('#336699');
  
  // Başlık metni - beyaz renk
  doc.fillColor('white')
     .fontSize(22)
     .text('API Performans Test Raporu', 40, 25, { align: 'center' });
  
  // Alt bilgi çizgisi - beyaz renk ile daha görünür
  doc.fillColor('white')
     .fontSize(10)
     .text(`Olusturulma Tarihi: ${moment().format('DD.MM.YYYY HH:mm:ss')}`, 40, 50, { align: 'right' });
  
  // Rengi siyaha geri ayarla
  doc.fillColor('black');
}

// Test sonuçları ekleme fonksiyonu - daha kompakt düzen
async function addTestResults(doc, result, yOffset) {
  // Başlangıç yOffset değerini kaydet
  const startYOffset = yOffset;
  
  // Modern test başlığı - daha az yükseklik
  doc.rect(40, yOffset, doc.page.width - 80, 25).fillAndStroke('#336699', '#336699');
  
  // Başlık metni - beyaz renkte, daha küçük font
  doc.fillColor('white')
     .fontSize(14)
     .text(result.name, 50, yOffset + 6, { width: doc.page.width - 100 });
     
  doc.fillColor('black');
  yOffset += 30; // Başlık sonrası boşluğu azalttık
  
  // Test verileri yoksa bilgi mesajı göster
  if (!result.data || !result.data.metrics) {
    doc.fillColor('black').fontSize(11).text('Test sonuçları bulunamadı veya eksik.', 50, yOffset);
    return yOffset + 20;
  }
  
  // Metrikleri ekleme
  const metrics = result.data.metrics;
  
  // Özet metrikleri - daha kompakt tablo
  const summaryTable = [
    ['Metrik', 'Değer'],
    ['İstek Sayısı', formatNumber(metrics.http_reqs?.count || 0)],
    ['Ortalama İstek Süresi', formatDuration(metrics.http_req_duration?.avg || 0)],
    ['95. Yüzdelik İstek Süresi', formatDuration(metrics.http_req_duration?.p95 || 0)],
    ['Hata Oranı', `${formatNumber((metrics.errors?.rate || 0) * 100)}%`],
  ];
  
  yOffset = drawTable(doc, summaryTable, 50, yOffset, true);
  yOffset += 15; // Tablolar arası boşluğu azalttık
  
  // HTTP durum kodları - sadece veri varsa göster
  if (metrics.http_reqs_status && Object.keys(metrics.http_reqs_status).length > 0) {
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
    
    // Durum kodları tablosunu çiz - eğer veri varsa
    if (statusTable.length > 1) {
      yOffset = drawTable(doc, statusTable, 50, yOffset, false);
    }
  }
  
  // Kullanılan toplam yüksekliği döndür
  return yOffset;
}

// Grafik ekleme fonksiyonu - Modern ve kompakt tasarım
async function addSummaryCharts(doc, testResults) {
  // API'lar arası performans karşılaştırma grafiği için verileri hazırla
  const requestDurations = testResults.map(test => ({
    name: test.name,
    avg: test.data?.metrics?.http_req_duration?.avg || 0,
    p95: test.data?.metrics?.http_req_duration?.p95 || 0
  }));
  
  // Eğer veri yoksa boş sayfa eklemeyi önle
  if (requestDurations.length === 0 || requestDurations.every(d => d.avg === 0 && d.p95 === 0)) {
    // Veri yoksa veya tüm değerler sıfırsa grafik sayfasını ekleme
    return;
  }
  
  // Modern başlık arkaplanı
  doc.rect(0, 0, doc.page.width, 40).fill('#336699');
  
  doc.fillColor('white')
     .fontSize(16)
     .text('Performans Karsilastirma Grafikleri', 40, 15, { align: 'center' });
  
  doc.fillColor('black');
  
  let yPosition = 60; // Başlangıç y pozisyonu
  
  // İstek süresi grafiği oluştur - modern renkler
  const durationChart = await createBarChart(
    'Ortalama İstek Süreleri (ms)',
    requestDurations.map(item => item.name),
    [
      {
        label: 'Ortalama',
        data: requestDurations.map(item => item.avg),
        backgroundColor: 'rgba(53, 162, 235, 0.7)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: '95. Yüzdelik',
        data: requestDurations.map(item => item.p95),
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }
    ]
  );
  
  // Grafik genişliğini sayfaya optimize et
  const chartWidth = Math.min(450, doc.page.width - 100);
  const chartHeight = chartWidth * 0.7;
  
  doc.image(durationChart, (doc.page.width - chartWidth) / 2, yPosition, { width: chartWidth });
  yPosition += chartHeight + 30;
  
  // Hata oranları grafiği
  const errorRates = testResults.map(test => ({
    name: test.name,
    rate: (test.data?.metrics?.errors?.rate || 0) * 100
  }));
  
  // Eğer ekran yeterli değilse yeni sayfa eklemeyi önle, grafiği sıkıştır
  if (yPosition + chartHeight > doc.page.height - 70) {
    yPosition = doc.page.height - chartHeight - 60; // Alt marjini ayarla
  }
  
  const errorChart = await createBarChart(
    'Hata Oranları (%)',
    errorRates.map(item => item.name),
    [
      {
        label: 'Hata Oranı',
        data: errorRates.map(item => item.rate),
        backgroundColor: 'rgba(255, 159, 64, 0.7)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1
      }
    ]
  );
  
  doc.image(errorChart, (doc.page.width - chartWidth) / 2, yPosition, { width: chartWidth });
}

// Modern altbilgi ekleme - sayfa numarası ile
function addFooter(doc, currentPage, totalPages) {
  const pageHeight = doc.page.height;
  
  // Altbilgi çizgisi
  doc.moveTo(40, pageHeight - 40)
     .lineTo(doc.page.width - 40, pageHeight - 40)
     .strokeColor('#336699')
     .lineWidth(1)
     .stroke();
  
}

// Modern tablo çizim fonksiyonu - daha net ve kompakt
function drawTable(doc, data, x, y, isAlternateRows = false) {
  const cellPadding = 5;
  const colWidths = calculateColumnWidths(doc, data);
  const rowHeight = 22; // Daha kompakt satır yüksekliği
  let startY = y;
  
  // Başlık satırı
  doc.rect(x, startY, doc.page.width - 100, rowHeight)
     .fillAndStroke('#336699', '#336699');
     
  doc.fillColor('white');
  drawTableRow(doc, data[0], x, startY, colWidths, cellPadding);
  startY += rowHeight;
  doc.fillColor('black');
  
  // Veri satırları
  for (let i = 1; i < data.length; i++) {
    // Alternatif satır renklendirmesi
    if (isAlternateRows && i % 2 === 0) {
      doc.rect(x, startY, doc.page.width - 100, rowHeight)
         .fillAndStroke('#f5f5f5', '#e0e0e0');
    }
    
    doc.fillColor('black'); // Her satır için yazı rengini belirgin şekilde siyah yap
    drawTableRow(doc, data[i], x, startY, colWidths, cellPadding); // cellPadding olarak değiştirdim
    startY += rowHeight;
  }
  
  return startY;
}

// Tablo satırı çizimi - optimize edilmiş ve yazı rengi ayarlaması ile
function drawTableRow(doc, rowData, x, y, colWidths, padding) {
  let currentX = x;
  
  rowData.forEach((cell, index) => {
    // Türkçe karakterler için encoding düzeltmesi
    const text = cell.toString()
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C');
    
    // Metni hizalamak için yükseklik hesaplama
    const textHeight = doc.heightOfString(text, {
      width: colWidths[index] - (padding * 2)
    });
    const verticalCenter = Math.max(0, (22 - textHeight) / 2); // Daha kompakt yükseklik ayarı
    
    doc.text(text, currentX + padding, y + padding + verticalCenter, {
      width: colWidths[index] - (padding * 2),
      align: index === 0 ? 'left' : 'right'
    });
    currentX += colWidths[index];
  });
}

// Sütun genişliği hesaplama - optimize edilmiş
function calculateColumnWidths(doc, data) {
  const totalWidth = doc.page.width - 100;
  const numColumns = data[0].length;
  
  // İlk sütuna daha fazla alan ayır
  if (numColumns === 2) {
    return [totalWidth * 0.6, totalWidth * 0.4];
  } else if (numColumns === 3) {
    return [totalWidth * 0.5, totalWidth * 0.25, totalWidth * 0.25];
  }
  
  // Diğer durumlar için eşit dağıt
  return Array(numColumns).fill(totalWidth / numColumns);
}

// Grafik oluşturma fonksiyonu - modern stil
async function createBarChart(title, labels, datasets) {
  const width = 800;  // Daha yüksek çözünürlük
  const height = 500;
  
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
      responsive: true,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 18, weight: 'bold' },
          color: '#000000', // Siyah renk - daha görünür
          padding: 20
        },
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            font: { size: 12 },
            color: '#000000' // Siyah renk - daha görünür
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)', // Daha koyu arkaplan
          titleColor: '#ffffff', // Beyaz başlık
          bodyColor: '#ffffff', // Beyaz içerik
          padding: 10,
          cornerRadius: 4
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(200, 200, 200, 0.3)'
          },
          ticks: {
            font: { size: 12 },
            color: '#000000', // Siyah renk - daha görünür
            precision: 0
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { size: 12 },
            color: '#000000' // Siyah renk - daha görünür
          }
        }
      },
      layout: {
        padding: 20
      },
      elements: {
        bar: {
          borderRadius: 4
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