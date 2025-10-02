package io.powerrangers.backend.config;

import io.powerrangers.backend.dto.TokenBody;
import io.powerrangers.backend.dto.UserDetails;
import io.powerrangers.backend.exception.AuthTokenException;
import io.powerrangers.backend.exception.ErrorCode;
import io.powerrangers.backend.service.CookieFactory;
import io.powerrangers.backend.service.CustomOauth2UserService;
import io.powerrangers.backend.service.JwtProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtProvider jwtProvider;
    private final CustomOauth2UserService customOauth2UserService;
    private final AntPathMatcher antPathMatcher = new AntPathMatcher();

    private final List<String> WHITE_LIST = List.of(
            "/",                  // 루트 요청 (홈 화면)
            "/test/**",           // 테스트용 API
            "/favicon.ico",       // 즐겨찾기 아이콘
            "/index.html",        // 정적 index
            "/css/**",            // 정적 CSS
            "/default-ui.css",
            "/js/**",             // 정적 JS
            "/webjars/**",        // 의존성 리소스(js 라이브러리 등)
            "/error",             // 에러 페이지 (Spring 내부에서 요청)
            "/login",             // 로그인 페이지
            "/oauth2/**",         // OAuth2 관련 리디렉션 URL
            "/users/reissue",     // access token 재발급 요청
            "/search.html",            // 검색 페이지
            "/follow-list.html",       // 팔로우 목록 페이지
            "/.well-known/appspecific/com.chrome.devtools.json", // 크롬에서 날라오는 백엔드용 요청..?
            "/loginPage",
            "/images/**",
            "/fonts/**",
        "/api/notifications/**"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String token = resolveToken(request);
        if(token == null || !jwtProvider.validateToken(token)) {
            log.error("토큰 유효성 검사에 실패했습니다.");
            handleAuthTokenException(response, new AuthTokenException(ErrorCode.UNAUTHORIZED));
            return;
        }

        TokenBody tokenBody = jwtProvider.parseToken(token);
        UserDetails userDetails;
        try{
            userDetails = customOauth2UserService.getUserDetails(tokenBody.getUserId());
        } catch(AuthTokenException e){
            log.error("토큰의 주인 유저를 찾을 수 없습니다.");
            handleAuthTokenException(response, e);
            return;
        }

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }

    private void handleAuthTokenException(HttpServletResponse response, AuthTokenException e) throws IOException {
        String message = e.getErrorCode().getMessage();
        if(!Objects.equals(e.getProvider(), null)){
            message += " : " + e.getProvider();
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                String.format("{\"errorCode\": \"%s\", \"message\": \"%s\"}",
                        e.getErrorCode().getStatus(), message)
        );

    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return WHITE_LIST.stream()
                .anyMatch(pattern -> antPathMatcher.match(pattern, path));
    }

    private String resolveToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals(CookieFactory.ACCESS_TOKEN)) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
