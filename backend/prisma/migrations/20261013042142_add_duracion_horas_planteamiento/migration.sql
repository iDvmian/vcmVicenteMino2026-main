-- AlterTable
ALTER TABLE `planteamiento` ADD COLUMN `duracionCantidad` INTEGER NULL,
    ADD COLUMN `duracionUnidad` ENUM('DIAS', 'SEMANAS', 'MESES') NULL,
    ADD COLUMN `horasHombre` INTEGER NULL;
