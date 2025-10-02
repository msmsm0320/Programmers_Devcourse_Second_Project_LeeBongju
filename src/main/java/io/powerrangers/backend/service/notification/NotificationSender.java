package io.powerrangers.backend.service.notification;

import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationSender {

    private final RedisNotificationPublisher publisher;

    public void send(String userId, NotificationType type, String content,Map<String, Object> extra){
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", userId);
        payload.put("type", type.name());
        payload.put("content", content);
        payload.put("eventId", java.util.UUID.randomUUID().toString());
        if (extra != null) payload.putAll(extra);

        publisher.publish(payload);
    }

}
