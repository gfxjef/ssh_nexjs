import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL de imagen no proporcionada o inválida' });
    }

    // Extraer nombre de archivo de la URL
    const fileName = url.split('/').pop();
    
    if (!fileName) {
      return res.status(400).json({ error: 'URL de imagen inválida' });
    }
    
    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }

    // Eliminar archivo
    fs.unlinkSync(filePath);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error del servidor:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
} 