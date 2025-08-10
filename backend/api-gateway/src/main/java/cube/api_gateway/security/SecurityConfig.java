package cube.api_gateway.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .authorizeExchange(exchange -> exchange
                        .pathMatchers("/auth/**").permitAll() // доступ к auth-service
                        .anyExchange().authenticated()        // всё остальное требует аутентификацию
                )
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .build();
    }
}
