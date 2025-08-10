package cube.auth_service.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "wca_user")
public class WcaUser {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private Long id;

    private String name;
    private String email;
    private String accessToken;
    private String refreshToken;
    private LocalDateTime expiresAt;

    public void setWcaId(String wcaId) {
    }

    public String getWcaId() {
        return null;
    }
}