package cube.auth_service.controller;

import cube.auth_service.model.WcaUser;
import cube.auth_service.service.WcaOAuthService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
@RestController
public class OAuthController {
    // | Method | Endpoint    | Description                |
    //| ------ | ----------- | -------------------------- |
    //| GET    | `/login`    | Перенаправляет на WCA      |
    //| GET    | `/callback` | Получает токен и user info |
    //| GET    | `/me`       | Проверяет кто залогинен    |
    private final WcaOAuthService wcaOAuthService;

    @Autowired
    public OAuthController(WcaOAuthService wcaOAuthService) {
        this.wcaOAuthService = wcaOAuthService;
    }

    @GetMapping("/login")
    public RedirectView login() {
        String authorizationUrl = wcaOAuthService.getAuthorizationUrl();
        return new RedirectView(authorizationUrl);
    }

    @GetMapping("/callback")
    public String callback(@RequestParam("code") String code) {
        WcaUser user = wcaOAuthService.exchangeCodeForToken(code);

        // Генерация JWT
        // Храните в конфигурации
        String jwtSecret = "your_secret_key";
        String jwt = Jwts.builder()
                .setSubject(user.getWcaId())
                .setIssuedAt(new Date())
                .setExpiration(Date.from(Instant.now().plus(1, ChronoUnit.DAYS)))
                .signWith(SignatureAlgorithm.HS256, jwtSecret)
                .compact();

        // Интеграция с profile-service (пример)
        registerUserInProfileService(user, jwt);

        return "Login successful. Your JWT: " + jwt;
    }

    @GetMapping("/me")
    public String me() {
        // Здесь должна быть логика получения текущего пользователя по JWT
        return "Current user info (implement JWT validation)";
    }

    private void registerUserInProfileService(WcaUser user, String jwt) {
        // Пример отправки запроса в profile-service
        // Реализуйте через RestTemplate или WebClient
    }
}
