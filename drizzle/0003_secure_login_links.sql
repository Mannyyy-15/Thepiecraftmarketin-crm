CREATE TABLE `login_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `user_id` int NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `purpose` enum('onboarding','direct_login') NOT NULL DEFAULT 'direct_login',
  `created_by_id` int NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used_at` timestamp NULL,
  `revoked_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `login_links_id` PRIMARY KEY (`id`),
  CONSTRAINT `login_links_token_hash_unique` UNIQUE (`token_hash`),
  CONSTRAINT `login_links_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `login_links_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `login_links_creator_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `login_links_user_active_idx` (`organization_id`,`user_id`,`used_at`,`revoked_at`),
  INDEX `login_links_expiry_idx` (`expires_at`)
);
