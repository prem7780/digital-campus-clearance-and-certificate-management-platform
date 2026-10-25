package com.dccmp.backend.exception;

import java.util.*;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiError {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, Object>> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", Objects.toString(e.getReason(), "Request rejected")));
    }

    @ExceptionHandler({org.springframework.dao.DataIntegrityViolationException.class, org.springframework.orm.ObjectOptimisticLockingFailureException.class})
    ResponseEntity<Map<String, String>> conflict(Exception e) {
        return ResponseEntity.status(409).body(Map.of("error", "Concurrent update or duplicate record. Refresh and retry."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, String>> unknown(Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500).body(Map.of("error", "Unexpected server error. Check server logs."));
    }
}
