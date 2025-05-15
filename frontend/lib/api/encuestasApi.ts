const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const BASE_URL = `${API_BASE_URL}/api/encuestas`;

export interface EnvioEncuesta {
  idcalificacion: number;
  asesor: string | null;
  nombres: string | null;
  ruc: string | null;
  correo: string | null;
  segmento: string | null;
  documento: string | null;
  tipo: string | null;
  calificacion: string | null;
  observaciones: string | null;
  timestamp: string; // ISO Date string
  grupo: string | null;
  fecha_calificacion: string | null; // ISO Date string or null
  conformidad: string | null;
  conformidad_obs: string | null;
  conformidad_timestamp: string | null; // ISO Date string or null
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido en la respuesta del servidor' }));
    console.error('Error en la respuesta de la API:', response.status, errorData);
    throw new Error(errorData?.error || `Error ${response.status} de la API`);
  }
  return response.json();
}

export const getAllEnviosEncuestas = async (): Promise<EnvioEncuesta[]> => {
  try {
    const response = await fetch(`${BASE_URL}/envios`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Aquí podrías añadir headers de autenticación si son necesarios
        // 'Authorization': `Bearer ${token}`,
      },
    });
    const result = await handleResponse<EnvioEncuesta[]>(response);
    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error(result.error || result.message || 'No se pudieron obtener los envíos de encuestas');
    }
  } catch (error) {
    console.error('Error en getAllEnviosEncuestas:', error);
    throw error; // Re-lanzar para que el componente pueda manejarlo
  }
};

// Interfaz para el payload de actualización de conformidad
interface UpdateConformidadPayload {
  conformidad: string | null;
  conformidad_obs: string | null;
  // El backend se encargará del conformidad_timestamp
}

/**
 * Actualiza los datos de conformidad para un envío de encuesta específico.
 * @param idcalificacion - El ID del envío de encuesta a actualizar.
 * @param payload - Los datos de conformidad a actualizar.
 * @returns La encuesta actualizada.
 */
export async function actualizarConformidadEncuesta(
  idcalificacion: number,
  payload: UpdateConformidadPayload
): Promise<EnvioEncuesta> {
  const response = await fetch(`${BASE_URL}/envios/${idcalificacion}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Añadir token de autenticación si es necesario en el futuro
      // 'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  // Extraer el campo 'data' de la respuesta manejada
  const result = await handleResponse<EnvioEncuesta>(response);
  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.error || result.message || 'No se pudo actualizar la conformidad de la encuesta');
  }
}

// Si necesitas más funciones CRUD, añádelas aquí, por ejemplo:
// export async function createEnvioEncuesta(data: Omit<EnvioEncuesta, 'idcalificacion' | 'timestamp'>): Promise<EnvioEncuesta> { ... }
// export async function deleteEnvioEncuesta(idcalificacion: number): Promise<void> { ... } 