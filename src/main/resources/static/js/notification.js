// notification.js
import Toastify from 'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify-es.js';

const typeStyles = {
    FOLLOW_CREATED:  { emoji: "🧲", bg: "linear-gradient(to right, #10B981, #059669)" },
    COMMENT_CREATED: { emoji: "💬", bg: "linear-gradient(to right, #6366F1, #3B82F6)" },
    LIKE_ADDED:      { emoji: "❤️", bg: "linear-gradient(to right, #EF4444, #F97316)" },
    TASK_ASSIGNED:   { emoji: "📝", bg: "linear-gradient(to right, #22D3EE, #06B6D4)" },
    TASK_DUE_SOON:   { emoji: "⏰", bg: "linear-gradient(to right, #F59E0B, #D97706)" },
    DEFAULT:         { emoji: "📬", bg: "linear-gradient(to right, #6B7280, #374151)" }
};

// 탭 전역 싱글톤 키
const ES_KEY = "__SSE_EVENT_SOURCE__";
const INIT_KEY = "__SSE_INIT__";
// 디듀프 캐시
const seenIds = new Set();

function getClientId() {
    const KEY = "notif_client_id";
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + "-" + Math.random());
        localStorage.setItem(KEY, id);
    }
    return id;
}

export async function setupNotification() {
    // 중복 초기화 방지 (이미 열려 있으면 종료 상태만 재시도)
    if (window[INIT_KEY]) {
        if (window[ES_KEY] && window[ES_KEY].readyState !== 2 /* CLOSED */) return;
    }
    window[INIT_KEY] = true;

    try {
        const res = await fetch('/users/me');
        if (!res.ok) throw new Error("인증 필요");
        const { data: userId } = await res.json();

        const cid = getClientId();

        // 기존 연결 닫기
        if (window[ES_KEY]?.close) {
            try { window[ES_KEY].close(); } catch {}
            window[ES_KEY] = null;
        }

        const es = new EventSource(`/api/notifications/subscribe/${userId}?cid=${encodeURIComponent(cid)}`);
        window[ES_KEY] = es;
        console.log(`✅ SSE 연결 시도: userId=${userId}, cid=${cid}`);

        es.addEventListener("connect", (e) => {
            console.log("✅ SSE 연결 성공:", e.data);
        });

        let __seq = 0;

        es.addEventListener("notification", (event) => {
            const data = JSON.parse(event.data);
            const seq = ++__seq;
            console.log(`[SSE#${seq}] type=`, data.type, 'eventId=', data.eventId, 'payload=', data);

            // 1) eventId 디듀프
            if (data.eventId) {
                if (seenIds.has(data.eventId)) return;
                seenIds.add(data.eventId);
                if (seenIds.size > 200) {
                    const it = seenIds.values(); seenIds.delete(it.next().value);
                }
            }

            // 2) 타입 보정(대문자) + 스타일
            const key = (data.type || "DEFAULT").toString().toUpperCase();
            const t = typeStyles[key] || typeStyles.DEFAULT;

            // 3) 클릭 이동 링크 해석
            const url = resolveLink(data);

            Toastify({
                text: `${t.emoji} ${data.content}`,
                duration: 4000,
                gravity: "top",
                position: "right",
                close: true,
                onClick: () => {
                    if (!url) return;
                    if (url.startsWith('/task.html')) {
                        openCenteredPopup(url);         // ✅ task는 팝업으로
                    } else {
                        window.location.href = url;     // ✅ 그 외는 현재 탭
                    }
                },
                style: {
                    background: t.bg,
                    fontSize: "15px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    cursor: url ? "pointer" : "default"
                }
            }).showToast();
        });

        es.onerror = (e) => {
            console.error("❌ SSE 오류:", e);
            try { es.close(); } catch {}
            window[ES_KEY] = null;
            window[INIT_KEY] = false; // 재연결 허용
        };

        window.addEventListener("beforeunload", () => {
            if (window[ES_KEY]) {
                try { window[ES_KEY].close(); } catch {}
                window[ES_KEY] = null;
                window[INIT_KEY] = false;
            }
        });
    } catch (e) {
        console.error("알림 설정 실패:", e);
        window[INIT_KEY] = false;
    }
}

function resolveLink(data) {
    if (data.link) {
        // /tasks/{id} → user-page.html?userId=taskOwnerId&taskId={id}
        const mTask = data.link.match(/^\/tasks\/(\d+)(?:\/)?$/);
        if (mTask && data.taskOwnerId) {
            return `/user-page.html?userId=${encodeURIComponent(data.taskOwnerId)}&taskId=${encodeURIComponent(mTask[1])}`;
        }
        // /users/{id} → user.html?userId={id}
        const mUser = data.link.match(/^\/users\/(\d+)(?:\/)?$/);
        if (mUser) return `/user.html?userId=${encodeURIComponent(mUser[1])}`;
        return data.link;
    }

    const key = (data.type || "").toUpperCase();
    switch (key) {
        case "FOLLOW_CREATED": {
            const id = data.followerId || data.userId;
            return id ? `/user.html?userId=${encodeURIComponent(id)}` : null;
        }
        case "COMMENT_CREATED": {
            const t = data.taskId, c = data.commentId;
            // ✅ 메인으로 보내서 댓글 모달 자동 오픈
            if (t && c) return `/index.html?openCommentTaskId=${encodeURIComponent(t)}&commentId=${encodeURIComponent(c)}#comment-${encodeURIComponent(c)}`;
            if (t)     return `/index.html?openCommentTaskId=${encodeURIComponent(t)}`;
            return null;
        }
        case "TASK_ASSIGNED":
        case "TASK_DUE_SOON": {
            const u = data.taskOwnerId, t = data.taskId;
            return (u && t) ? `/user-page.html?userId=${encodeURIComponent(u)}&taskId=${encodeURIComponent(t)}` : null;
        }
        default:
            return null;
    }
}

function openCenteredPopup(url, width = 720, height = 820, name = 'taskPopup') {
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop  = window.screenTop  !== undefined ? window.screenTop  : window.screenY;

    const w = window.innerWidth  || document.documentElement.clientWidth  || screen.width;
    const h = window.innerHeight || document.documentElement.clientHeight || screen.height;

    const left = dualScreenLeft + Math.max(0, (w - width)  / 2);
    const top  = dualScreenTop  + Math.max(0, (h - height) / 2);

    const features = [
        `width=${width}`,
        `height=${height}`,
        `top=${Math.round(top)}`,
        `left=${Math.round(left)}`,
        'resizable=yes',
        'scrollbars=yes',
        'noopener',
        'noreferrer'
    ].join(',');

    const win = window.open(url, name, features);
    if (win) win.focus();
}
