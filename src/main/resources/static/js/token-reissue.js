// src/utils/apiFetch.js
let refreshInFlight = null;
let refreshFailed = false;

export async function apiFetch(url, options = {}, retry = true) {
    const cfg = { credentials: "include", ...options };
    const resp = await fetch(url, cfg);

    if (resp.status !== 401 || !retry) return resp;

    console.log("access token 토큰 재발급 시도 !!")

    if (!refreshInFlight) {
        refreshInFlight = fetch("/users/reissue", {
            method: "POST",
            credentials: "include",
        }).then(r => {
            if (!r.ok) throw new Error("Refresh failed");
            return r;
        }).finally(() => {
            refreshInFlight = null;
        });
    }

    try {
        await refreshInFlight;
    } catch (_) {
        if (!refreshFailed) {
            refreshFailed = true;
            alert("세션이 만료되었습니다. 다시 로그인해주세요.");
            window.location.replace("/loginPage");
        }
        throw _;
    }

    console.log("access token 토큰 재발급 성공 !!")
    return fetch(url, cfg);
}
