package io.powerrangers.backend.service.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class SseEmitterService {

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    private static String key(String userId, String clientId) {
        return userId + "|" + clientId;
    }

    public SseEmitter subscribe(String userId, String clientId) {
        String k = key(userId, clientId);

        SseEmitter old = emitters.remove(k);
        if (old != null) {
            try { old.complete(); } catch (Exception ignored) {}
        }

        SseEmitter emitter = new SseEmitter(0L);
        emitters.put(k, emitter);

        emitter.onCompletion(() -> emitters.remove(k, emitter));
        emitter.onTimeout(() -> emitters.remove(k, emitter));
        emitter.onError(e -> emitters.remove(k, emitter));

        try {
            emitter.send(SseEmitter.event()
                .name("connect")
                .data("ok", MediaType.TEXT_PLAIN));
        } catch (IOException ignored) {
            emitters.remove(k, emitter);
        }

        log.info("[SSE] subscribed userId={} clientId={}", userId, clientId);
        return emitter;
    }

    public void sendToUser(String userId, Object payload) {
        String prefix = userId + "|";
        emitters.forEach((k, emitter) -> {
            if (!k.startsWith(prefix)) return;
            try {
                emitter.send(SseEmitter.event()
                    .name("notification")
                    .data(payload, MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                emitters.remove(k, emitter);
            }
        });
    }
}
