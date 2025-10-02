import {apiFetch} from "./token-reissue.js";
import {attachGoToHomeHandler, attachLogoutHandler} from "./header.js";

document.addEventListener("DOMContentLoaded", async () => {
    const targetUserId = new URLSearchParams(window.location.search).get("userId");

    if (!targetUserId) {
        alert("유저 정보가 없습니다.");
        window.location.href = "/loginPage"; // 혹은 에러 페이지
        return;
    }


    // ✅ 홈 링크 설정
    const homeLink = document.getElementById("home-link");
    if (homeLink) {
        homeLink.href = `/index.html?userId=${targetUserId}`;
    }

    // ✅ 프로필 정보 불러오기
    try {
        const response = await apiFetch(`/users/${targetUserId}`, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) throw new Error("유저 정보 불러오기 실패");

        const result = await response.json();
        const data = result.data;
        console.log(data);

        document.getElementById("nickname").textContent = data.nickname;
        document.getElementById("intro-box").textContent = data.intro || "자기소개가 없습니다.";
        document.getElementById("profile-img").src = data.profileImage || "/images/default-profile.png";
    } catch (err) {
        console.error("유저 정보 로딩 실패:", err);
        document.getElementById("intro-box").textContent = "정보를 불러오지 못했습니다.";
    }

    // ✅ 팔로우 정보 불러오기 (단일 요청)
    try {
        const res = await apiFetch(`/follow/${targetUserId}`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });

        if (!res.ok) throw new Error("응답 실패");

        const data = await res.json();
        const result = data.data;

        document.getElementById("follower-count").textContent = result.followerCount || 0;
        document.getElementById("following-count").textContent = result.followingCount || 0;
    } catch (err) {
        console.error("팔로우 정보 로딩 실패:", err);
        document.getElementById("follower-count").textContent = "0";
        document.getElementById("following-count").textContent = "0";
    }

    // ✅ 오늘의 TODO 불러오기
    try {
        const today = new Date().toISOString().split("T")[0];

        const todoRes = await apiFetch(`/users/${targetUserId}/tasks?date=${today}`, {
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const todoData = await todoRes.json();
        const tasks = todoData.data || [];

        console.log("할일 : " + tasks);
        console.log("할일 갯수 : "+tasks.length);

        const todoList = document.getElementById("todo-list");
        todoList.innerHTML = "";

        if (tasks.length === 0) {
            const emptyMsg = document.createElement("p");
            emptyMsg.textContent = "오늘의 할 일이 없습니다! 오늘도 계획을 짜서 힘찬 하루를 시작해보는 것은 어떤가요?";
            emptyMsg.style.color = "#666";
            emptyMsg.style.fontStyle = "italic";
            todoList.appendChild(emptyMsg);
        } else {
            tasks.forEach(task => {
                const li = document.createElement("li");
                li.className = "custom-todo";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = (task.status === "COMPLETE");
                checkbox.disabled = true;

                const text = document.createElement("span");
                text.textContent = ` ${task.content}`;

                if (task.status === "COMPLETE") {
                    text.style.textDecoration = "line-through";
                    text.style.color = "#888";
                }

                li.appendChild(checkbox);
                li.appendChild(text);
                todoList.appendChild(li);
            });
        }
    } catch (err) {
        console.error("할 일 목록 로딩 실패:", err);
    }

    // ✅ This Month's Memories 불러오기
    try {
        const res = await apiFetch(`/tasks/${targetUserId}/images`);

        const json = await res.json();
        const taskImages = json.data || [];


        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const memories = taskImages
            .filter(task => {
                const date = new Date(task.dueDate);
                return task.status === "COMPLETE" &&
                    task.imageUrl &&
                    date.getMonth() === thisMonth &&
                    date.getFullYear() === thisYear;
            })
            .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
            .slice(0, 4);

        const gallery = document.getElementById("memory-gallery");
        gallery.innerHTML = "";

        if (memories.length === 0) {
            gallery.innerHTML = "<p>이번 달 추억이 아직 없어요 😊</p>";
        } else {
            memories.forEach(task => {
                const img = document.createElement("img");
                img.src = task.imageUrl;
                img.className = "memory-img";

                // ✅ 이미지 클릭 시 상세 정보 fetch & 모달 표시
                img.addEventListener("click", async () => {
                    try {
                        const res = await apiFetch(`/tasks/${task.taskId}`, {
                            credentials: "include"
                        });

                        if (!res.ok) throw new Error("할 일 정보 로딩 실패");

                        const detail = (await res.json()).data;

                        document.getElementById("modal-img").src = detail.taskImage;
                        document.getElementById("modal-date").textContent = detail.dueDate?.split("T")[0];
                        document.getElementById("modal-status").textContent = detail.status;
                        document.getElementById("modal-content").textContent = detail.content;
                        document.getElementById("modal-category").textContent = detail.category;

                        document.getElementById("task-modal").classList.remove("hidden");
                    } catch (err) {
                        console.error("상세 할 일 조회 실패:", err);
                        alert("할 일 정보를 불러오지 못했습니다.");
                    }
                });

                gallery.appendChild(img);
            });

            // ✅ 모달 닫기 이벤트
            document.querySelector(".close-btn").addEventListener("click", () => {
                document.getElementById("task-modal").classList.add("hidden");
            });

            // ✅ 배경 클릭 시 모달 닫기
            document.getElementById("task-modal").addEventListener("click", (e) => {
                if (e.target.id === "task-modal") {
                    document.getElementById("task-modal").classList.add("hidden");
                }
            });
        }
    } catch (err) {
        console.error("This Month's Memories 불러오기 실패:", err);
    }
    const followBtn = document.getElementById("follow-btn");
    const currentUserId = localStorage.getItem("userId");
    if (followBtn && targetUserId && currentUserId && targetUserId !== currentUserId) {
        let isFollowing = false;

        // 1. 현재 팔로우 상태 불러오기
        fetch(`/follow/check?userId=${targetUserId}`, {
            credentials: "include"
        })
            .then(res => res.json())
            .then(data => {
                isFollowing = data.data.following;
                followBtn.textContent = isFollowing ? "언팔로우" : "팔로우";
            })
            .catch(err => {
                console.error("팔로우 상태 확인 실패:", err);
            });

        // 2. 버튼 클릭 이벤트
        followBtn.addEventListener("click", async () => {
            try {
                const response = await fetch(
                    isFollowing ? `/follow/${targetUserId}` : `/follow`,
                    {
                        method: isFollowing ? "DELETE" : "POST",
                        headers: { "Content-Type": "application/json" },
                        body: isFollowing ? null : JSON.stringify({ followingId: parseInt(targetUserId) }),
                        credentials: "include"
                    }
                );

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || "팔로우 요청 실패");
                }

                isFollowing = !isFollowing;
                followBtn.textContent = isFollowing ? "언팔로우" : "팔로우";
            } catch (err) {
                console.error("팔로우 토글 실패:", err);
                alert("처리 중 오류가 발생했습니다.");
            }
        });
    }

    // ✅ 팔로우 링크 클릭 시 follow-list.html로 이동
    const followerLink = document.getElementById("follower-link");
    const followingLink = document.getElementById("following-link");

    if (followerLink && followingLink) {
        followerLink.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = `/follow-list.html?userId=${targetUserId}&type=followers`;
        });

        followingLink.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = `/follow-list.html?userId=${targetUserId}&type=followings`;
        });
    }

    attachGoToHomeHandler()

    attachLogoutHandler('logoutBtn', () => fetch("/users/logout", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        }
    }));
});

// === 페이지 로드 시 query/hash로 모달 자동 오픈 ===
document.addEventListener("DOMContentLoaded", initFromQuery);

async function initFromQuery() {
    try {
        const params = new URLSearchParams(location.search);
        const userId = params.get("userId");
        const taskId = params.get("taskId");
        const anchor = location.hash ? location.hash.slice(1) : null; // e.g. 'comment-123'

        // 1) 기존 유저 페이지 데이터 렌더(이미 함수가 있으면 호출, 없으면 무시)
        if (userId && typeof loadUserPage === "function") {
            await loadUserPage(userId);
        }

        // 2) taskId가 있으면 모달용 데이터 로드 & 오픈
        if (taskId) {
            const detail = await (await fetch(`/tasks/${taskId}`)).json();
            const t = detail.data;

            // user-page.js의 기존 로직과 동일하게 모달 필드 채우기
            document.getElementById("modal-img").src = t.taskImage ?? "";
            if (!t.taskImage) { document.getElementById("modal-img").classList.add("hidden"); }
            else { document.getElementById("modal-img").classList.remove("hidden"); }

            document.getElementById("modal-date").textContent     = (t.dueDate || "").split("T")[0];
            document.getElementById("modal-status").textContent   = t.status ?? "";
            document.getElementById("modal-content").textContent  = t.content ?? "";
            document.getElementById("modal-category").textContent = t.category ?? "";

            // 모달 오픈
            document.getElementById("task-modal").classList.remove("hidden");

            // 3) 댓글 목록 렌더(프로젝트 API 경로에 맞게)
            //    user-page.js에 댓글 렌더 코드가 있다면 그걸 호출하고,
            //    없다면 아래 fetch/append를 간단히 추가
            try {
                const cRes = await fetch(`/api/comments?taskId=${encodeURIComponent(taskId)}`);
                const cJson = await cRes.json();
                const comments = Array.isArray(cJson.data) ? cJson.data : [];
                const ul = document.getElementById("comments") || createCommentsList();
                ul.innerHTML = "";
                comments.forEach(c => appendCommentNode(ul, c));
            } catch (e) {
                console.warn("[initFromQuery] 댓글 로딩 실패", e);
            }

            // 4) 해시가 #comment-XXX 이면 스크롤
            if (anchor) {
                const el = document.getElementById(anchor);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    } catch (e) {
        console.error("[initFromQuery] 오류", e);
    }
}

// 없으면 만들어주는 유틸
function createCommentsList() {
    const box = document.querySelector("#task-modal .task-modal-content");
    const ul = document.createElement("ul");
    ul.id = "comments";
    ul.className = "mt-3 space-y-2";
    box.appendChild(ul);
    return ul;
}

function appendCommentNode(container, c) {
    const li = document.createElement("li");
    li.id = `comment-${c.id}`;
    li.className = "p-2 rounded bg-gray-50";
    li.innerHTML = `
    <div class="text-sm text-gray-500">${escapeHtml(c.nickname ?? "")}</div>
    <div class="text-base">${escapeHtml(c.content ?? "")}</div>
  `;
    container.appendChild(li);
    if (Array.isArray(c.children)) c.children.forEach(ch => appendCommentNode(container, ch));
}

function escapeHtml(s="") {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

