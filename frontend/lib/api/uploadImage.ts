/**
 * Servicio para subir imágenes al servidor
 */

/**
 * Sube una imagen al servidor
 * @param formData FormData con la imagen a subir (clave 'image')
 * @returns Promise con la respuesta: { url: string }
 */
export const uploadImage = async (formData: FormData): Promise<{ url: string }> => {
  try {
    const response = await fetch('/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al subir la imagen');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en uploadImage:', error);
    throw error;
  }
};

/**
 * Elimina una imagen del servidor
 * @param imageUrl URL de la imagen a eliminar
 * @returns Promise vacío
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    const response = await fetch('/api/images/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: imageUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar la imagen');
    }
  } catch (error) {
    console.error('Error en deleteImage:', error);
    throw error;
  }
}; 