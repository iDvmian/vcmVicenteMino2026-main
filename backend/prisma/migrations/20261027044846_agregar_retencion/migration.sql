-- AlterTable
ALTER TABLE `solicitud` ADD COLUMN `avisoRetencionEn` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `RegistroDepuracion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitudId` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `estadoFinal` VARCHAR(191) NOT NULL,
    `fechaCierre` DATETIME(3) NOT NULL,
    `archivosBorrados` INTEGER NOT NULL DEFAULT 0,
    `borradoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RegistroDepuracion_borradoEn_idx`(`borradoEn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
