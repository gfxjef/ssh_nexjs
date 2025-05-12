@echo off
echo Configurando el proyecto...

:: Crear entorno virtual si no existe
if not exist backend\venv (
    echo Creando entorno virtual...
    python -m venv backend\venv
) else (
    echo El entorno virtual ya existe.
)

:: Activar entorno virtual e instalar dependencias
echo Instalando dependencias del backend...
cd backend
call venv\Scripts\activate.bat
pip install -r requirements.txt

:: Volver al directorio principal
cd ..

:: Instalar dependencias del frontend
echo Instalando dependencias del frontend...
cd frontend
call npm install

:: Volver al directorio principal
cd ..

echo.
echo Configuración completada exitosamente!
echo.
echo Para iniciar la aplicación, ejecute: start.bat
echo.
pause
