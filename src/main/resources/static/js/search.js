// 검색 기능 관리
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search');
    const searchButton = document.querySelector('.search-btn');
    const searchResults = document.getElementById('searchResults');
    const currentUserId = localStorage.getItem('userId');

    // 현재 로그인한 사용자의 팔로잉 목록 가져오기
    async function getCurrentUserFollowings() {
        try {
            if (!currentUserId) {
                console.error('로컬 스토리지에 userId가 없습니다.');
                return [];
            }

            const response = await fetch(`/follow/${currentUserId}/followings`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return [];

            const result = await response.json();
            return result.data || [];
        } catch (error) {
            console.error('팔로잉 목록 조회 중 오류:', error);
            return [];
        }
    }

    // URL에서 검색 결과를 가져와서 표시
    const urlParams = new URLSearchParams(window.location.search);
    const results = urlParams.get('results');

    if (results) {
        try {
            const searchData = JSON.parse(results);
            displaySearchResults(searchData);
        } catch (error) {
            console.error('검색 결과 파싱 오류:', error);
        }
    }

    // 검색 결과 표시 함수
    async function displaySearchResults(users) {
        if (!Array.isArray(users) || users.length === 0) {
            searchResults.innerHTML = '<p class="empty-message">검색 결과가 없습니다.</p>';
            return;
        }

        // 현재 사용자의 팔로잉 목록 가져오기
        const currentUserFollowings = await getCurrentUserFollowings();

        searchResults.innerHTML = users.map(user => {
            console.log("검색 결과 user:", user);
            const isFollowing = currentUserFollowings.some(following => following.id === user.userId);
            const isSelf = String(user.userId) === localStorage.getItem('userId');

            return `
                <li class="user-list-item">
                    <div class="user-container" data-user-id="${user.userId}">
                        <div class="user-info">
                            <img src="${user.profileImage || '/images/default-profile.png'}" 
                                 alt="사용자 프로필" 
                                 class="user-profile-image"
                                 onerror="this.src='/images/default-profile.png'">
                            <div class="user-details">
                                <span class="user-name">${user.nickname}</span>
                                ${user.intro ? `<p class="user-intro">${user.intro}</p>` : ''}
                            </div>
                        </div>
                        ${!isSelf ? `
                            <button class="follow-button ${isFollowing ? 'following' : 'not-following'}"
                                    data-user-id="${user.userId}">
                                ${isFollowing ? '팔로잉' : '팔로우'}
                            </button>
                        ` : ''}
                    </div>
                </li>
            `;
        }).join('');

        attachFollowButtonListeners();
        attachProfileClickListeners();
    }

    function attachFollowButtonListeners() {
        const followButtons = document.querySelectorAll('.follow-button');
        followButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const userId = button.dataset.userId;
                const isFollowing = button.classList.contains('following');
                const followingId = Number(userId);

                if (!isFollowing && (isNaN(followingId) || followingId <= 0)) {
                    console.error('잘못된 followingId:', followingId);
                    alert('팔로우할 수 없는 사용자입니다.');
                    return;
                }

                try {
                    const response = await fetch(`/follow${isFollowing ? `/${followingId}` : ''}`, {
                        method: isFollowing ? 'DELETE' : 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: !isFollowing ? JSON.stringify({ followingId }) : null
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || '팔로우 처리 실패');
                    }

                    button.classList.toggle('following');
                    button.classList.toggle('not-following');
                    button.textContent = isFollowing ? '팔로우' : '팔로잉';
                } catch (error) {
                    console.error('팔로우 처리 중 오류 발생:', error);
                    alert(error.message || '팔로우 처리 중 오류가 발생했습니다.');
                }
            });
        });
    }

    // 프로필 클릭 시 해당 유저의 할 일 목록으로 이동
    function attachProfileClickListeners() {
        const containers = document.querySelectorAll('.user-container');
        containers.forEach(container => {
            container.addEventListener('click', function(e) {
                // 팔로우 버튼 클릭 시는 무시
                if (e.target.closest('.follow-button')) return;
                const userId = container.dataset.userId;

                if(userId===localStorage.getItem(`userId`)){
                    window.location.href = `/index.html`;
                }
                else if (userId) {
                    window.location.href = `/user.html?userId=${userId}`;
                }
            });
        });
    }

    // 검색 실행 함수
    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            alert('검색어를 입력해주세요.');
            return;
        }

        try {
            const response = await fetch(`/users?nickname=${encodeURIComponent(searchTerm)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('검색 중 오류가 발생했습니다.');
            }

            const result = await response.json();

            if (result.data && result.data.length > 0) {
                // 검색 결과가 있으면 검색 결과 페이지로 이동
                const searchParams = new URLSearchParams();
                searchParams.append('keyword', searchTerm);
                searchParams.append('results', JSON.stringify(result.data));
                window.location.href = `/search.html?${searchParams.toString()}`;
            } else {
                alert('검색 결과가 없습니다.');
            }
        } catch (error) {
            console.error('검색 오류:', error);
            alert('검색 중 오류가 발생했습니다.');
        }
    }

    // 검색 버튼 클릭 이벤트
    searchButton.addEventListener('click', performSearch);

    // 엔터 키 이벤트
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}); 