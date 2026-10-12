# vcmVicenteMino2026-main
Proyeccto de tesis
1. Comprobar que MySQL está corriendo (opcional)

netstat -ano | findstr :3306

Si aparece LISTENING, está bien. Si no aparece nada, abrí services.msc, buscá MySQL80 y presioná “Iniciar”.

2. Terminal 1: backend

cd C:\Users\damia\Desktop\vcmVicenteMino2026-main\backend
npm run start:dev

Esperá a ver “Nest application successfully started”.

3. Terminal 2: frontend

cd C:\Users\damia\Desktop\vcmVicenteMino2026-main\frontend
npm start

Esperá a que termine de compilar.

4. Abrir el sistema

Sistema: http://localhost:4200
Documentación de la API: http://localhost:3000/api/docs
Ingresá con damian@ucm.cl y la contraseña que usaste al registrarte.

   npx prisma db seed

   para la peuqeña base de datos de prueba