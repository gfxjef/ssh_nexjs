import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { IncomingForm, File, Fields, Files } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Crear directorio de uploads si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Configurar formidable para procesar el archivo
    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB límite
    });

    // Procesar el archivo
    return new Promise<void>((resolve, reject) => {
      form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
        if (err) {
          console.error('Error al procesar el formulario:', err);
          res.status(500).json({ error: 'Error al procesar la imagen' });
          return resolve();
        }

        // Obtener el archivo de imagen
        const fileArray = files.image;
        const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

        if (!file) {
          res.status(400).json({ error: 'No se encontró ninguna imagen' });
          return resolve();
        }

        // Generar nombre de archivo único
        const originalFilename = file.originalFilename || 'image.jpg';
        const fileName = `image-${Date.now()}${path.extname(originalFilename)}`;
        const filePath = path.join(uploadDir, fileName);

        // Mover el archivo a su ubicación final
        try {
          fs.renameSync(file.filepath, filePath);

          // Generar URL pública
          const publicUrl = `/uploads/${fileName}`;
          res.status(200).json({ url: publicUrl });
          return resolve();
        } catch (error) {
          console.error('Error al mover el archivo:', error);
          res.status(500).json({ error: 'Error al guardar la imagen' });
          return resolve();
        }
      });
    });
  } catch (error) {
    console.error('Error del servidor:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
} 