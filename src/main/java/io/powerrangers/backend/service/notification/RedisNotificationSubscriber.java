package io.powerrangers.backend.service.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class RedisNotificationSubscriber implements MessageListener {

    private final ObjectMapper om = new ObjectMapper();
    private final SseEmitterService sse;

    private final ConcurrentHashMap<String, Long> recent = new ConcurrentHashMap<>();
    private static final long DEDUPE_TTL_MS = 30_000;

    public void onMessage(Message message, byte[] pattern){
        try{
            String json = new String(message.getBody(), StandardCharsets.UTF_8);
            log.info("[SUB] message={}", json);

            @SuppressWarnings("unchecked")
            Map<String, Object> payload = om.readValue(json, Map.class);

            payload.remove("@class");

            Object u = payload.get("userId");
            if (u == null) {
                log.warn("[SUB] skip: userId missing. payload={}", payload);
                return;
            }
            String userId = (u instanceof Number)
                ? String.valueOf(((Number) u).longValue())
                : String.valueOf(u).trim();

            String eventId = toStringOrNull(payload.get("eventId"));
            if (eventId == null || eventId.isBlank()) {
                String content = toStringOrEmpty(payload.get("content"));
                eventId = Integer.toHexString((userId + "|" + content).hashCode());
            }
            if (isDuplicate(eventId)) {
                log.info("[SUB] drop duplicate eventId={}", eventId);
                return;
            }

            sse.sendToUser(userId, payload);
            log.info("[SUB->SSE] pushed to user={} payload={}", userId, payload);
        } catch (Exception e) {
            log.error("[SUB] error parsing or delivering message", e);
        }
    }

    private boolean isDuplicate(String key) {
        long now = System.currentTimeMillis();
        Long prev = recent.putIfAbsent(key, now);

        recent.entrySet().removeIf(e -> now - e.getValue() > DEDUPE_TTL_MS);
        return prev != null;
    }

    private static String toStringOrNull(Object o) {
        return (o == null) ? null : String.valueOf(o);
    }

    private static String toStringOrEmpty(Object o) {
        return (o == null ) ? "" : String.valueOf(o);
    }
}
