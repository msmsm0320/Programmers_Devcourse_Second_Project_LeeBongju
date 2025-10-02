package io.powerrangers.backend.service.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisNotificationPublisher {
    private final StringRedisTemplate stringRedisTemplate;
    private final ChannelTopic notifyTopic;
    private final ObjectMapper om = new ObjectMapper();

    public void publish(Map<String,Object> message) {
        try {
            String json = om.writeValueAsString(message);
            log.info("[PUB] topic={} json={}", notifyTopic.getTopic(), json);
            stringRedisTemplate.convertAndSend(notifyTopic.getTopic(), json);
        } catch (Exception e) { log.error("[PUB] serialize error", e); }
    }
}
