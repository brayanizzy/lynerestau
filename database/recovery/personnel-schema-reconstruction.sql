-- AlterTable
ALTER TABLE `users` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `roles` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_titles` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `job_titles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(30) NOT NULL,
    `staff_number` VARCHAR(30) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `gender` VARCHAR(20) NULL,
    `phone` VARCHAR(40) NULL,
    `address` VARCHAR(500) NULL,
    `hired_at` DATE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `salary` DECIMAL(12, 2) NULL,
    `notes` VARCHAR(2000) NULL,
    `photo_key` VARCHAR(50) NULL,
    `archived_at` DATETIME(3) NULL,
    `archive_reason` VARCHAR(500) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `department_id` VARCHAR(30) NULL,
    `job_title_id` VARCHAR(30) NULL,
    `user_id` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_staff_number_key`(`staff_number`),
    UNIQUE INDEX `employees_user_id_key`(`user_id`),
    INDEX `employees_archived_at_full_name_id_idx`(`archived_at`, `full_name`, `id`),
    INDEX `employees_status_idx`(`status`),
    INDEX `employees_department_id_idx`(`department_id`),
    INDEX `employees_job_title_id_idx`(`job_title_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_job_title_id_fkey` FOREIGN KEY (`job_title_id`) REFERENCES `job_titles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
