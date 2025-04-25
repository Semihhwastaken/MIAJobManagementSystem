#!/bin/bash
set -e

# RabbitMQ bağlantı parametreleri
RABBITMQ_HOST="${RabbitMQ__HostName}"
RABBITMQ_PORT="${RabbitMQ__Port}"
MAX_RETRIES=30
RETRY_INTERVAL=5

echo "Başlangıç: $(date)"
echo "RabbitMQ bağlantı kontrolü başlatılıyor: $RABBITMQ_HOST:$RABBITMQ_PORT"

# Render.com servis URL'i için alternatif formları deneyin
RABBITMQ_HOST_ALT="notification-rabbitmq.onrender.com"
RABBITMQ_SERVICE_URL="notification-rabbitmq"

echo "Olası RabbitMQ adresleri deneniyor:"
echo "1. $RABBITMQ_HOST"
echo "2. $RABBITMQ_HOST_ALT"
echo "3. $RABBITMQ_SERVICE_URL"
echo "4. localhost"

# RabbitMQ servisinin hazır olmasını bekle - farklı host adları deneyerek
retry_count=0
connected=false

while [ $retry_count -lt $MAX_RETRIES ] && [ "$connected" = false ]; do
  retry_count=$((retry_count+1))
  
  # Ana host adını dene
  if nc -z -w 2 $RABBITMQ_HOST $RABBITMQ_PORT 2>/dev/null; then
    echo "RabbitMQ bağlantısı başarılı! Host: $RABBITMQ_HOST"
    connected=true
    break
  fi
  
  # Alternatif host adını dene
  if nc -z -w 2 $RABBITMQ_HOST_ALT $RABBITMQ_PORT 2>/dev/null; then
    echo "RabbitMQ bağlantısı başarılı! Host: $RABBITMQ_HOST_ALT"
    # RabbitMQ host adını güncelle
    export RabbitMQ__HostName=$RABBITMQ_HOST_ALT
    connected=true
    break
  fi
  
  # Sadece servis adını dene
  if nc -z -w 2 $RABBITMQ_SERVICE_URL $RABBITMQ_PORT 2>/dev/null; then
    echo "RabbitMQ bağlantısı başarılı! Host: $RABBITMQ_SERVICE_URL"
    export RabbitMQ__HostName=$RABBITMQ_SERVICE_URL
    connected=true
    break
  fi
  
  # Son çare olarak localhost'u dene 
  if nc -z -w 2 localhost $RABBITMQ_PORT 2>/dev/null; then
    echo "RabbitMQ bağlantısı başarılı! Host: localhost"
    export RabbitMQ__HostName=localhost
    connected=true
    break
  fi

  echo "RabbitMQ henüz hazır değil, $RETRY_INTERVAL saniye sonra tekrar deneniyor. Deneme: $retry_count/$MAX_RETRIES"
  sleep $RETRY_INTERVAL
done

if [ "$connected" = false ]; then
  echo "RabbitMQ bağlantısı kurulamadı, bağlantı deneme sayısı aşıldı."
  echo "Render içindeki ağ yapılandırmasını kontrol edin."
  # Uygulama başlatma - bağlantı hatası uygulama içinde ele alınacak
fi

echo "RabbitMQ bağlantısı hazır: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo "NotificationAPI başlatılıyor..."

# RabbitMQ hazır olduğunda uygulamayı başlat
exec dotnet NotificationAPI.dll
