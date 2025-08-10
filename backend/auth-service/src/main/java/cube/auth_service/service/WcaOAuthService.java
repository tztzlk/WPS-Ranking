package cube.auth_service.service;


import cube.auth_service.model.WcaUser;
import cube.auth_service.repository.OAuthRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;

@RequiredArgsConstructor
@Service
public class WcaOAuthService {

    private final OAuthRepository oAuthRepository;

    @Value("${wca.client-id}")
    private String clientId;

    @Value("${wca.client-secret}")
    private String clientSecret;

    @Value("${wca.redirect-uri}")
    private String redirectUri;

    @Value("${wca.token-uri}")
    private String tokenUri;

    @Value("${wca.user-info-uri}")
    private String userInfoUri;

    // Возвращает URL для начала процесса авторизации
    public String getAuthorizationUrl() {
        return "https://www.worldcubeassociation.org/oauth/authorize?client_id=" + clientId +
                "&redirect_uri=" + redirectUri + "&response_type=code&scope=public+email";
    }

    // Обменивает код авторизации на токены и получает информацию о пользователе
    public WcaUser exchangeCodeForToken(String code) {
        RestTemplate restTemplate = new RestTemplate();

        // Запрос токенов
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("grant_type", "authorization_code");
        map.add("code", code);
        map.add("redirect_uri", redirectUri);
        map.add("client_id", clientId);
        map.add("client_secret", clientSecret);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(tokenUri, request, String.class);

        // Парсинг ответа (в реальной реализации используйте Jackson/Gson)
        String accessToken = parseAccessToken(response.getBody()); // Пример: "parsed_access_token"
        String refreshToken = parseRefreshToken(response.getBody()); // Пример: "parsed_refresh_token"
        long expiresIn = parseExpiresIn(response.getBody()); // Пример: 3600 секунд

        // Запрос информации о пользователе
        HttpHeaders userHeaders = new HttpHeaders();
        userHeaders.setBearerAuth(accessToken);
        HttpEntity<String> userRequest = new HttpEntity<>(userHeaders);
        ResponseEntity<String> userResponse = restTemplate.exchange(userInfoUri, HttpMethod.GET, userRequest, String.class);

        // Парсинг данных пользователя (в реальной реализации используйте JSON-парсер)
        String wcaId = parseWcaId(userResponse.getBody()); // Пример: "parsed_wca_id"
        String name = parseName(userResponse.getBody()); // Пример: "parsed_name"
        String email = parseEmail(userResponse.getBody()); // Пример: "parsed_email"

        // Создание и сохранение пользователя
        WcaUser user = new WcaUser();
        user.setWcaId(wcaId);
        user.setName(name);
        user.setEmail(email);
        user.setAccessToken(accessToken);
        user.setRefreshToken(refreshToken);
        user.setExpiresAt(LocalDateTime.now().plusSeconds(expiresIn));

        oAuthRepository.save(user);
        return user;
    }
    
    // Методы-заглушки для парсинга (замените на реальный парсинг JSON)
    private String parseAccessToken(String response) { return "parsed_access_token"; }
    private String parseRefreshToken(String response) { return "parsed_refresh_token"; }
    private long parseExpiresIn(String response) { return 3600; }
    private String parseWcaId(String response) { return "parsed_wca_id"; }
    private String parseName(String response) { return "parsed_name"; }
    private String parseEmail(String response) { return "parsed_email"; }
}
