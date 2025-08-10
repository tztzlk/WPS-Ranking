package cube.profile_service.repository;

import cube.profile_service.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile , String> {
}
