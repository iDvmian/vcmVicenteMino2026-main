-- AlterTable
ALTER TABLE `solicitud` ADD COLUMN `nombreOrganizacion` VARCHAR(150) NULL,
    ADD COLUMN `origen` ENUM('EXTERNA', 'DOCENTE') NOT NULL DEFAULT 'EXTERNA',
    ADD COLUMN `personasPrevistas` INTEGER NULL;
