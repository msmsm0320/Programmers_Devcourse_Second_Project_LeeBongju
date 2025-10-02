import {apiFetch} from "./token-reissue.js";
import {buildCalendar} from "./index.js";
import {initCommentFeature} from "./main.js";
import {attachGoToHomeHandler} from "./header.js";

const params = new URLSearchParams(window.location.search);
const targetUserId = params.get("userId");

document.addEventListener("DOMContentLoaded", async () => {
    const calendarContainer = document.getElementById("calendar");
    buildCalendar(calendarContainer, targetUserId);

    if (!targetUserId) {
        alert("유저 ID가 없습니다.");
        return;
    }

    try {
        const res = await fetch(`/users/${targetUserId}`);
        if (!res.ok) throw new Error("프로필 조회 실패");

        const responseBody = await res.json();
        const user = responseBody.data; // BaseResponse 내부의 data

        const profileHeader = document.getElementById("userProfileHeader");

        // 유저 프로필 이미지 + 닉네임 동적으로 삽입
        profileHeader.innerHTML = `
            <img src="${user.profileImage ?? "/images/default-profile.png"}" 
                 alt="프로필 이미지" 
                 class="w-12 h-12 rounded-full object-cover border" />
            <span class="text-xl font-semibold">${user.nickname}</span>
        `;

        if (targetUserId) {
            initFollowToggleButton(targetUserId);
        }
        document.getElementById("profileBtn").addEventListener("click", () => {
            window.location.href = "/mypage";
        });
    } catch (err) {
        console.error(err);
        alert("프로필 정보를 불러오는 데 실패했습니다.");
    }

    initCommentFeature()

    // 프로필 보기 버튼 동작
    const viewProfileBtn = document.getElementById("viewProfileBtn");
    viewProfileBtn.addEventListener("click", () => {
        // 현재 페이지를 targetUserId 기준으로 다시 로드
        window.location.href = `/user-page.html?userId=${targetUserId}`;
    });

    attachGoToHomeHandler()
});

export async function initFollowToggleButton(targetUserId) {
    const button = document.getElementById("followToggleBtn");
    try {
        // 현재 팔로우 상태 확인
        const res = await apiFetch(`/follow/check?userId=${targetUserId}`, {
            credentials: "include"
        });
        const result = await res.json();
        let isFollowing = result.data.following;

        // 초기 버튼 세팅
        button.classList.remove("hidden");
        button.textContent = isFollowing ? "언팔로우" : "팔로우";

        // 버튼 클릭 이벤트
        button.addEventListener("click", async () => {
            try {
                const response = await apiFetch(
                    isFollowing ? `/follow/${targetUserId}` : `/follow`,
                    {
                        method: isFollowing ? "DELETE" : "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: isFollowing ? null : JSON.stringify({ followingId: parseInt(targetUserId) }),
                        credentials: "include"
                    }
                );

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || "팔로우 처리 실패");
                }

                // 상태 토글
                isFollowing = !isFollowing;
                button.textContent = isFollowing ? "언팔로우" : "팔로우";
            } catch (error) {
                console.error("팔로우 토글 실패:", error);
                alert("처리 중 오류가 발생했습니다.");
            }
        });
    } catch (err) {
        console.error("팔로우 상태 확인 실패:", err);
    }
}