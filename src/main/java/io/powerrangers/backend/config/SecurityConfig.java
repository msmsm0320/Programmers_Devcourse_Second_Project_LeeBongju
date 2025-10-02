package io.powerrangers.backend.config;

import io.powerrangers.backend.exception.CustomOAuth2AuthenticationFailureHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final Oauth2SuccessHandler oauth2SuccessHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomOAuth2AuthenticationFailureHandler customOAuth2AuthenticationFailureHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .httpBasic(AbstractHttpConfigurer::disable)
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(
                        session -> session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/loginPage")
                        .successHandler(oauth2SuccessHandler)
                        .failureHandler(customOAuth2AuthenticationFailureHandler))
                .authorizeHttpRequests(auth ->
                        auth
                                .requestMatchers("/admin/**")
                                    .hasAuthority("ADMIN")
                                .requestMatchers("/test/**",
                                        "/index.html",
                                        "/favicon.ico",
                                        "/css/**",
                                        "/js/**",
                                        "/users/reissue",
                                        "/loginPage",
                                        "/images/**",
                                        "/fonts/**",
                                        "/search.html",
                                        "/follow-list.html",
                                    "/api/notifications/**")
                                    .permitAll()
                                .anyRequest()
                                    .authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
