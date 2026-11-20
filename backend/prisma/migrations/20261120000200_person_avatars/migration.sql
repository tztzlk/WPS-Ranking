-- WCA profile photo thumbnails for people shown in lists. Filled by the pipeline.
CREATE TABLE "person_avatars" (
    "person_id" VARCHAR(10) NOT NULL,
    "thumb_url" TEXT NOT NULL,

    CONSTRAINT "person_avatars_pkey" PRIMARY KEY ("person_id")
);

-- Same as the other tables: no access through the Supabase Data API.
ALTER TABLE "person_avatars" ENABLE ROW LEVEL SECURITY;
