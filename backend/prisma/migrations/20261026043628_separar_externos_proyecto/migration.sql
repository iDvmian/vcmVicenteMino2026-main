/*
  Warnings:

  - You are about to drop the column `participantesExternos` on the `proyecto` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `proyecto` DROP COLUMN `participantesExternos`,
    ADD COLUMN `participantesAlumnosExternos` INTEGER NULL,
    ADD COLUMN `participantesDocentesExternos` INTEGER NULL,
    ADD COLUMN `participantesOtrosExternos` INTEGER NULL;
