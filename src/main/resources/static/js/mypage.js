import {attachGoToHomeHandler, attachLogoutHandler} from "./header.js";

document.addEventListener("DOMContentLoaded", async () => {
    const userId = localStorage.getItem("userId");

    // 로그인 확인
    if (!userId) {
        alert("로그인이 필요합니다.");
        window.location.href = "/loginPage";
        return;
    }

    // 홈 / 로그아웃
    document.getElementById("goHomeBtn")?.addEventListener("click", () => {
        const userId = localStorage.getItem("userId");
        if (userId) {
            window.location.href = `/index.html?userId=${userId}`;
        } else {
            window.location.href = "/index.html";
        }
    });

    attachGoToHomeHandler()

    attachLogoutHandler('logoutBtn', () => fetch("/users/logout", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        }
    }));

    // 유저 정보 불러오기
    try {
        const res = await fetch(`/users/${userId}`, {
            method: "GET",
            credentials: "include"
        });

        const json = await res.json();
        const user = json.data;
        if (!res.ok || !user) throw new Error("유저 정보 없음");

        document.getElementById("nickname").textContent = user.nickname || "";
        document.getElementById("intro-box").textContent = user.intro || "자기소개가 없습니다.";
        document.getElementById("profile-img").src = user.profileImage || "/images/default-profile.png";
    } catch (err) {
        console.error("유저 정보 실패:", err);
        alert("유저 정보를 불러올 수 없습니다.");
    }

    // 팔로우 수 불러오기
    try {
        const res = await fetch(`/follow/${userId}`, {
            credentials: "include"
        });

        const json = await res.json();
        const data = json.data;

        document.getElementById("follower-count").textContent = data.followerCount || "0";
        document.getElementById("following-count").textContent = data.followingCount || "0";
    } catch (err) {
        console.error("팔로우 정보 실패:", err);
    }

    // 오늘의 할 일 목록 불러오기
    try {
        // const today = new Date().toISOString().split("T")[0];
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedToday = `${yyyy}-${mm}-${dd}`;
        const res = await fetch(`/users/${userId}/tasks?date=${formattedToday}`, {
            credentials: "include"
        });

        const json = await res.json();
        const tasks = json.data || [];

        const todoList = document.getElementById("todo-list");
        todoList.innerHTML = "";

        if (tasks.length === 0) {
            const p = document.createElement("p");
            p.textContent = "오늘의 할 일이 없습니다!";
            p.style.color = "#666";
            p.style.fontStyle = "italic";
            todoList.appendChild(p);
        } else {
            tasks.forEach(task => {
                const li = document.createElement("li");
                li.className = "custom-todo";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = (task.status === "COMPLETE");
                checkbox.disabled = true;

                const span = document.createElement("span");
                span.textContent = task.content;

                if (task.status === "COMPLETE") {
                    span.style.textDecoration = "line-through";
                    span.style.color = "#888";
                }

                li.appendChild(checkbox);
                li.appendChild(span);
                todoList.appendChild(li);
            });
        }
    } catch (err) {
        console.error("할 일 목록 실패:", err);
    }

    try {
        const res = await fetch(`/tasks/${userId}/images`, {
            credentials: "include"
        });

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
                        const res = await fetch(`/tasks/${task.taskId}`, {
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
        console.error("이미지 로딩 실패:", err);
    }

    // 프로필 수정 버튼
    const editButton = document.querySelector("footer button");
    if (editButton) {
        editButton.onclick = () => {
            window.location.href = `/mypage/update`;
        };
    }

    // 팔로우/팔로잉 링크 이동
    document.getElementById("follower-link")?.addEventListener("click", () => {
        window.location.href = `/follow-list.html?userId=${userId}&type=followers`;
    });

    document.getElementById("following-link")?.addEventListener("click", () => {
        window.location.href = `/follow-list.html?userId=${userId}&type=followings`;
    });

    // ✅ 회원 탈퇴 버튼 클릭 이벤트
    const deleteButton = document.getElementById("delete-account-btn");
    if (deleteButton) {
        deleteButton.addEventListener("click", async () => {
            const confirmed = confirm("정말로 회원 탈퇴하시겠습니까? 탈퇴 시 모든 정보가 삭제되며 복구할 수 없습니다.");
            if (!confirmed) return;

            try {
                const response = await fetch(`/users/${userId}`, {
                    method: "DELETE",
                    credentials: "include"
                });

                if (!response.ok) {
                    throw new Error("회원 탈퇴 실패");
                }

                alert("회원 탈퇴가 완료되었습니다.");
                localStorage.clear();
                window.location.href = "/loginPage";
            } catch (err) {
                console.error("회원 탈퇴 오류:", err);
                alert("회원 탈퇴 중 오류가 발생했습니다.");
            }
        });
    }

});
