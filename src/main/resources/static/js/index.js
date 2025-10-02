import {apiFetch} from "./token-reissue.js";
import {fetchAndRenderTasks} from './main.js';
import {attachGoToHomeHandler, attachLogoutHandler} from "./header.js";

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const currentUserId = localStorage.getItem("userId");
    console.log("currentUserId:", currentUserId);

    const targetUserId = params.get("userId");
    console.log("targetUserId:", targetUserId);

    const userIdToShow = targetUserId || currentUserId;
    console.log("userIdToShow:", userIdToShow);

    const calendarContainer = document.getElementById("calendar");
    buildCalendar(calendarContainer, userIdToShow);

    // 페이지 로드 시 오늘 날짜의 할 일을 자동으로 가져옵니다

    fetchAndRenderTasks(new Date(), userIdToShow);

    attachGoToHomeHandler()

    attachLogoutHandler('logoutBtn', () => fetch("/users/logout", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        }
    }));
});

async function fetchTaskSummary(year, month, userId) {
    const url = `/tasks/summary?userId=${userId}&year=${year}&month=${month}`;
    try {
        const res = await apiFetch(url, { credentials: "include" });
        if (!res.ok) return {};
        const data = await res.json();
        const map = {};
        (data.data.dailySummaries || []).forEach(d => {
            map[d.date] = d.taskCount;
        });
        return map;
    } catch (err) {
        console.error("할 일 summary 조회 실패:", err);
        return {};
    }
}

export function buildCalendar(container, targetUserId, date = new Date()) {
    container.innerHTML = "";

    const state = {
        today: new Date(),
        current: new Date(date.getFullYear(), date.getMonth(), 1),
        selected: new Date(),
    };

    const header = document.createElement("div");
    header.className = "calendar-header";

    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L12.17 12z"/></svg>';

    const title = document.createElement("span");
    title.className = "calendar-title";

    header.append(prevBtn, title, nextBtn);
    container.appendChild(header);

    const dayNamesEl = document.createElement("div");
    dayNamesEl.className = "day-names";
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    dayNames.forEach(d => {
        const dn = document.createElement("div");
        dn.textContent = d;
        dayNamesEl.appendChild(dn);
    });
    container.appendChild(dayNamesEl);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    container.appendChild(grid);

    async function render() {
        title.textContent = state.current.toLocaleString("default", {
            month: "long",
            year: "numeric",
        });

        grid.innerHTML = "";
        const firstDayIdx = state.current.getDay();
        const lastDate = new Date(state.current.getFullYear(), state.current.getMonth() + 1, 0).getDate();

        // fetch summary for this month
        const year = state.current.getFullYear();
        const month = state.current.getMonth() + 1;
        const summaryMap = await fetchTaskSummary(year, month, targetUserId);

        for (let i = 0; i < firstDayIdx; i++) {
            const blank = document.createElement("div");
            grid.appendChild(blank);
        }

        for (let d = 1; d <= lastDate; d++) {
            const dateEl = document.createElement("div");
            dateEl.className = "date";
            dateEl.textContent = d;

            const thisDate = new Date(state.current.getFullYear(), state.current.getMonth(), d);
            if (thisDate.toDateString() === state.today.toDateString()) {
                dateEl.classList.add("today");
            }
            if (
                state.selected &&
                thisDate.toDateString() === state.selected.toDateString()
            ) {
                dateEl.classList.add("selected");
            }

            // 날짜 문자열 yyyy-MM-dd
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const count = summaryMap[dateStr] || 0;
            if (count > 0) {
                const badge = document.createElement("span");
                badge.className = "task-badge";
                badge.textContent = count > 9 ? "9+" : count;
                dateEl.appendChild(badge);
            }

            dateEl.addEventListener("click", () => {
                state.selected = thisDate;
                render();
                fetchAndRenderTasks(state.selected, targetUserId)
            });

            grid.appendChild(dateEl);
        }
    }

    prevBtn.addEventListener("click", () => {
        state.current.setMonth(state.current.getMonth() - 1);
        render();
    });
    nextBtn.addEventListener("click", () => {
        state.current.setMonth(state.current.getMonth() + 1);
        render();
    });

    render();

    fetchAndRenderTasks(state.selected, targetUserId);
}

document.getElementById("profileBtn").addEventListener("click", () => {
    window.location.href = "/mypage";
});