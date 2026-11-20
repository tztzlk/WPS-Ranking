-- Search by any word of a name ("garrett" finds "Luke Garrett"): LIKE '% q%'
-- cannot use the btree prefix index, so a trigram index serves it (~22 MB).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_person_name_trgm" ON "persons" USING GIN ("name_lower" gin_trgm_ops);
