export function attachLogoutHandler(buttonId, logoutFn, redirectUrl = '/loginPage') {
    const logoutBtn = document.getElementById(buttonId);
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
        const confirmed = confirm("정말 로그아웃 하시겠습니까?");
        if (!confirmed) return;

        logoutFn().finally(() => {
            alert("성공적으로 로그아웃 되었습니다.");
            window.location.replace(redirectUrl);
        });
    });
}

export function attachGoToHomeHandler(buttonIds = ['homeLogo', 'goHomeBtn'], defaultUrl = '/index.html') {
    buttonIds.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        btn.addEventListener('click', () => {
            const userId = localStorage.getItem('userId');
            if (userId) {
                window.location.href = `${defaultUrl}?userId=${userId}`;
            } else {
                window.location.href = defaultUrl;
            }
        });
    });
}

