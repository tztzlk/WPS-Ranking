package cube.auth_service.repository;

import cube.auth_service.model.WcaUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthRepository extends JpaRepository<WcaUser , Long> {
}
