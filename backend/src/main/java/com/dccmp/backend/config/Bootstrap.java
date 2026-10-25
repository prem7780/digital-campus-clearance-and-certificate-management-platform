package com.dccmp.backend.config;

import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class Bootstrap {
    @Bean
    CommandLineRunner initAdmin(StaffRepository repo, PasswordEncoder encoder, @Value("${app.admin-code:}") String code, @Value("${app.admin-password:}") String pass) {
        return args -> {
            if (code.isBlank() || pass.isBlank()) {
                System.out.println("DCCMP: No bootstrap ADMIN_CODE/ADMIN_PASSWORD; configure them to create an administrator.");
                return;
            }
            if (pass.length() < 12)
                throw new IllegalArgumentException("ADMIN_PASSWORD must contain at least 12 characters");
            if (repo.findByCode(code.trim().toUpperCase()).isEmpty()) {
                Staff s = new Staff();
                s.code = code.trim().toUpperCase();
                s.name = "System Administrator";
                s.role = "ADMIN";
                s.active = true;
                s.passwordHash = encoder.encode(pass);
                repo.save(s);
                System.out.println("DCCMP: created initial admin account " + s.code);
            }
        };
    }
}
