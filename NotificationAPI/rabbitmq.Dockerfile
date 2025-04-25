FROM rabbitmq:3-management

# RabbitMQ yapılandırmasını ve eklentilerini etkinleştir
RUN rabbitmq-plugins enable --offline rabbitmq_management rabbitmq_prometheus

# Sağlık kontrolü için bekletme süresi ayarları
ENV RABBITMQ_PID_FILE=/var/lib/rabbitmq/mnesia/rabbitmq

# Render'da servisler arası iletişim için gerekli yapılandırmalar
ENV RABBITMQ_DEFAULT_USER=render_user
ENV RABBITMQ_DEFAULT_PASS=rabbit_password
# Tüm arabirimlerden bağlantıları kabul et - guest kullanıcısını kısıtlamaları kaldırıyoruz
ENV RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS="-rabbit tcp_listeners [5672] -rabbit loopback_users [] -rabbit vm_memory_high_watermark 0.6 -rabbit disk_free_limit 1073741824"

# Yapılandırma dosyasını oluştur
RUN mkdir -p /etc/rabbitmq
RUN echo '[{rabbit, [{loopback_users, []}]}].' > /etc/rabbitmq/rabbitmq.config

# Sağlık kontrolü - daha liberal bir timeout ile
HEALTHCHECK --interval=30s --timeout=20s --start-period=60s --retries=5 \
    CMD rabbitmq-diagnostics -q ping

EXPOSE 5672 15672
