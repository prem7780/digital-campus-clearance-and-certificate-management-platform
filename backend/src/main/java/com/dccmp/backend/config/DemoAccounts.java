
package com.dccmp.backend.config;

import com.dccmp.backend.entity.Department;
import com.dccmp.backend.entity.Staff;
import com.dccmp.backend.repository.DepartmentRepository;
import com.dccmp.backend.repository.StaffRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Configuration
public class DemoAccounts {

    @Bean
    public CommandLineRunner seedDemoAccounts(
            StaffRepository staff,
            DepartmentRepository departments,
            PasswordEncoder encoder,
            @Value("${DEMO_SEED_STAFF:false}") boolean enabled,
            @Value("${DEMO_STAFF_PASSWORD:}") String password
    ) {

        return args -> {

            if (!enabled) {
                return;
            }

            if (password == null || password.length() < 12) {
                throw new IllegalArgumentException(
                        "DEMO_STAFF_PASSWORD must have at least 12 characters"
                );
            }

            // Initialize accounts for all 17 departments.
            for (Department department : departments.findAll()) {

                String code = department.code
                        .toUpperCase(Locale.ROOT);

                String oldCode = "DEMO_" + code;

                // If the new account already exists, skip it.
                if (staff.findByCode(code).isPresent()) {
                    continue;
                }

                // Rename an existing account without
                // changing its password or database ID.
                Staff existing = staff.findByCode(oldCode)
                        .orElse(null);

                if (existing != null) {

                    existing.code = code;
                    existing.name = department.name + " Officer";

                    staff.save(existing);

                    System.out.println(
                            "Renamed staff account: "
                                    + oldCode + " -> " + code
                    );

                    continue;
                }

                // Create a new department staff account.
                Staff newStaff = new Staff();

                newStaff.code = code;
                newStaff.name = department.name + " Officer";
                newStaff.role = "STAFF";
                newStaff.departmentId = department.id;
                newStaff.passwordHash = encoder.encode(password);
                newStaff.active = true;

                staff.save(newStaff);

                System.out.println(
                        "Created staff account: " + code
                );
            }

            // Initialize or rename the Principal account.
            String principalCode = "PRINCIPAL001";

            if (staff.findByCode(principalCode).isEmpty()) {

                Staff existingPrincipal = staff
                        .findByCode("DEMO_PRINCIPAL")
                        .orElse(null);

                if (existingPrincipal != null) {

                    existingPrincipal.code = principalCode;
                    existingPrincipal.name = "Principal";

                    staff.save(existingPrincipal);

                    System.out.println(
                            "Renamed Principal account to "
                                    + principalCode
                    );

                } else {

                    Staff principal = new Staff();

                    principal.code = principalCode;
                    principal.name = "Principal";
                    principal.role = "PRINCIPAL";
                    principal.departmentId = null;
                    principal.passwordHash = encoder.encode(password);
                    principal.active = true;

                    staff.save(principal);

                    System.out.println(
                            "Created Principal account: "
                                    + principalCode
                    );
                }
            }

            System.out.println(
                    "DCCMP: Staff account initialization completed."
            );
        };
    }
}
