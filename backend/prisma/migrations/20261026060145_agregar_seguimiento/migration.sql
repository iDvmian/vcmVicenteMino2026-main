-- CreateTable
CREATE TABLE `HistorialEtapa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitudId` INTEGER NOT NULL,
    `etapa` ENUM('SOLICITUD_CREADA', 'SOLICITUD_APROBADA', 'SOLICITUD_RECHAZADA', 'PLANTEAMIENTO_CREADO', 'PLANTEAMIENTO_APROBADO', 'PLANTEAMIENTO_RECHAZADO', 'PROYECTO_CREADO', 'PROYECTO_EN_PROCESO', 'PROYECTO_PAUSADO', 'PROYECTO_FINALIZADO', 'PROYECTO_CANCELADO') NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` INTEGER NULL,
    `aproximado` BOOLEAN NOT NULL DEFAULT false,

    INDEX `HistorialEtapa_solicitudId_fecha_idx`(`solicitudId`, `fecha`),
    INDEX `HistorialEtapa_etapa_fecha_idx`(`etapa`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HistorialEtapa` ADD CONSTRAINT `HistorialEtapa_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `Solicitud`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialEtapa` ADD CONSTRAINT `HistorialEtapa_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
