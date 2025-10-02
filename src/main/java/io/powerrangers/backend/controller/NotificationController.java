package io.powerrangers.backend.controller;

import io.powerrangers.backend.service.notification.SseEmitterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {

    private final SseEmitterService sse;

    @GetMapping(value = "/subscribe/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(
        @PathVariable String userId,
        @RequestParam(name = "cid", required = false) String clientId
    ) {
        String cid = (clientId == null || clientId.isBlank()) ? "default" : clientId;
        return sse.subscribe(userId, cid);
    }

}
