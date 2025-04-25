FROM rabbitmq:3-management

# RabbitMQ yapılandırmasını ve eklentilerini etkinleştir
RUN rabbitmq-plugins enable --offline rabbitmq_management rabbitmq_prometheus

# Sağlık kontrolü için bekletme süresi ayarları
ENV RABBITMQ_PID_FILE /var/lib/rabbitmq/mnesia/rabbitmq

# Önerilen yapılandırma ayarları - Render'ın kaynak sınırlarına uygun
ENV RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS="-rabbit tcp_listeners [5672] -rabbit vm_memory_high_watermark 0.6 -rabbit disk_free_limit 1073741824"

# Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
    CMD rabbitmq-diagnostics -q ping

EXPOSE 5672 15672
