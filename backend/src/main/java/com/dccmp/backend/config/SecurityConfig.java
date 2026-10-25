package com.dccmp.backend.config;

import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;

import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder encoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain chain(HttpSecurity http) throws Exception {
        // Sessions are authorized explicitly by Access for every controller; Spring CSRF rejects forged state-changing requests.
        return http.csrf(c -> c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
                .authorizeHttpRequests(a -> a.anyRequest().permitAll())
                .formLogin(f -> f.disable()).httpBasic(h -> h.disable()).logout(l -> l.disable()).build();
    }

}
