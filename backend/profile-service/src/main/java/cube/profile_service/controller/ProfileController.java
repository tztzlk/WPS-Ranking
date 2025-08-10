package cube.profile_service.controller;

import cube.profile_service.model.UserProfile;
import cube.profile_service.repository.UserProfileRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.Optional;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final UserProfileRepository userProfileRepository;
    private final String jwtSecret;

    public ProfileController(UserProfileRepository userProfileRepository, @Value("${security.jwt.secret}") String jwtSecret) {
        this.userProfileRepository = userProfileRepository;
        this.jwtSecret = jwtSecret;
    }

    @GetMapping("/{wcaId}")
    public ResponseEntity<UserProfile> getProfile(@PathVariable String wcaId, HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null || !validateToken(token, wcaId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<UserProfile> profile = userProfileRepository.findById(wcaId);
        return profile.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserProfile> createProfile(@RequestBody UserProfile profile, HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null || !validateToken(token, profile.getWcaId())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (userProfileRepository.existsById(profile.getWcaId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        UserProfile savedProfile = userProfileRepository.save(profile);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedProfile);
    }

    @PutMapping("/{wcaId}")
    public ResponseEntity<UserProfile> updateProfile(@PathVariable String wcaId, @RequestBody UserProfile profile, HttpServletRequest request) {
        String token = extractToken(request);
        if (token == null || !validateToken(token, wcaId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!userProfileRepository.existsById(wcaId)) {
            return ResponseEntity.notFound().build();
        }
        profile.setWcaId(wcaId);
        UserProfile updatedProfile = userProfileRepository.save(profile);
        return ResponseEntity.ok(updatedProfile);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private boolean validateToken(String token, String wcaId) {
        try {
            Claims claims = Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token).getBody();
            return claims.getSubject().equals(wcaId);
        } catch (Exception e) {
            return false;
        }
    }

}
