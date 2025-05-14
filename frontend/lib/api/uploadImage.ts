/**
 * Servicio para subir imágenes al servidor
 */

/**
 * Sube una imagen al servidor
 * @param formData FormData con la imagen a subir (clave 'image')
 * @returns Promise con la respuesta: { url: string }
 */
export const uploadImage = async (formData: FormData): Promise<{ url: string }> => {
  console.log("API Call: uploadImage", formData.get('image'));
  try {
    const response = await fetch('/api/images/upload', { // Asume endpoint global
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: response.statusText || 'Error desconocido al subir imagen' };
      }
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
  console.log(`API Call: deleteImage para URL: ${imageUrl}`);
  try {
    const response = await fetch('/api/images/delete', { // Asume endpoint global
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: imageUrl }),
    });
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: response.statusText || 'Error desconocido al eliminar imagen' };
      }
      throw new Error(errorData.error || 'Error al eliminar la imagen');
    }
    // No se espera contenido en la respuesta para un DELETE exitoso (204 No Content)
  } catch (error) {
    console.error('Error en deleteImage:', error);
    throw error;
  }
}; 