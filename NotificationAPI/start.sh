#!/bin/bash
set -e

# RabbitMQ bağlantı parametreleri
RABBITMQ_HOST="${RabbitMQ__HostName}"
RABBITMQ_PORT="${RabbitMQ__Port}"
MAX_RETRIES=30
RETRY_INTERVAL=5

echo "Başlangıç: $(date)"
echo "RabbitMQ bağlantı kontrolü başlatılıyor: $RABBITMQ_HOST:$RABBITMQ_PORT"

# RabbitMQ servisinin hazır olmasını bekle
retry_count=0
while ! nc -z $RABBITMQ_HOST $RABBITMQ_PORT; do
  retry_count=$((retry_count+1))
  if [ $retry_count -ge $MAX_RETRIES ]; then
    echo "RabbitMQ bağlantısı kurulamadı, bağlantı deneme sayısı aşıldı."
    exit 1
  fi
  echo "RabbitMQ henüz hazır değil, $RETRY_INTERVAL saniye sonra tekrar deneniyor. Deneme: $retry_count/$MAX_RETRIES"
  sleep $RETRY_INTERVAL
done

echo "RabbitMQ bağlantısı hazır: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo "NotificationAPI başlatılıyor..."

# RabbitMQ hazır olduğunda uygulamayı başlat
exec dotnet NotificationAPI.dll
