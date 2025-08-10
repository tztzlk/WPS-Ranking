package cube.profile_service.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "user_profile")
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", nullable = false)
    private Long id;

    private String name;          // Имя пользователя
    private String email;         // Email пользователя
    private String country;       // Страна
    private String avatarUrl;     // URL аватара

    @Column(name = "wca_id")
    private String wcaId;
}