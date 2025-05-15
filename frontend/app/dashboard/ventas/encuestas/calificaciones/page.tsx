'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAllEnviosEncuestas, EnvioEncuesta, actualizarConformidadEncuesta } from '../../../../../lib/api/encuestasApi';
import {
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  isDateInRange
} from '../../../../../lib/utils/dateUtils'; // Importar utilidades de fecha

// Importaciones de Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

// Registrar los componentes de Chart.js que vamos a utilizar
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement
);

// Definir interfaces para los datos del gráfico
interface LineChartDataset { // Renombrado para claridad
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  fill?: boolean; 
}

interface PieChartDataset {
  label?: string; // Label para el dataset general, puede ser opcional para pastel
  data: number[];
  backgroundColor: string[];
  borderColor: string[];
  borderWidth?: number;
}

interface ChartDataState<T = LineChartDataset | PieChartDataset> { // Hacerlo genérico
  labels: string[];
  datasets: T[];
}

// Datos de ejemplo para la tabla
const datosCalificaciones = [
  { id: 1, asesor: 'Juan Pérez', nombres: 'Importadora XYZ S.A.C.', calificacion: 'Bueno', tipo: 'Venta (OT)' },
  { id: 2, asesor: 'María García', nombres: 'Distribuidora ABC E.I.R.L.', calificacion: 'Regular', tipo: 'Conformidad' },
  { id: 3, asesor: 'Carlos López', nombres: 'Comercial 123 S.A.', calificacion: 'Malo', tipo: 'Venta (OT)' },
  { id: 4, asesor: 'Ana Martínez', nombres: 'Inversiones DEF S.R.L.', calificacion: 'Bueno', tipo: 'Conformidad' },
  { id: 5, asesor: 'Pedro Sánchez', nombres: 'Corporación GHI S.A.C.', calificacion: 'Bueno', tipo: 'Venta (OT)' },
];

export default function RegistroCalificaciones() {
  // Estados para modales
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false);
  const [mostrarModalConformidad, setMostrarModalConformidad] = useState(false);
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<EnvioEncuesta | null>(null);

  // Estados para datos y carga
  const [allEncuestas, setAllEncuestas] = useState<EnvioEncuesta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para filtros (inicializarlos según sea necesario)
  const [filtroAsesor, setFiltroAsesor] = useState<string>('');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('');
  const [filtroCalificacion, setFiltroCalificacion] = useState<string>('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('');
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState<string>('');
  const [fechaFinFiltro, setFechaFinFiltro] = useState<string>('');

  // Estados para la paginación de la tabla principal
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [registrosPorPagina] = useState<number>(25);

  // Estados para el formulario del modal de conformidad
  const [estadoConformidadSeleccionado, setEstadoConformidadSeleccionado] = useState<string>('Pendiente');
  const [observacionesConformidadInput, setObservacionesConformidadInput] = useState<string>('');
  const [isSavingConformidad, setIsSavingConformidad] = useState<boolean>(false);

  // Opciones y datos para el gráfico de tendencias
  const [chartOptions, setChartOptions] = useState({});
  const [chartData, setChartData] = useState<ChartDataState<LineChartDataset>>({
    labels: [],
    datasets: [],
  });

  // Estados para el gráfico de pastel de Ventas
  const [ventasPieChartData, setVentasPieChartData] = useState<ChartDataState<PieChartDataset>>({
    labels: ['Bueno', 'Regular', 'Malo'],
    datasets: [],
  });
  const [ventasPieChartOptions, setVentasPieChartOptions] = useState({});

  // Estados para el gráfico de pastel de Coordinador
  const [coordinadorPieChartData, setCoordinadorPieChartData] = useState<ChartDataState<PieChartDataset>>({
    labels: ['Bueno', 'Regular', 'Malo'],
    datasets: [],
  });
  const [coordinadorPieChartOptions, setCoordinadorPieChartOptions] = useState({});

  // Estados para el gráfico de barras de Percepción por Grupo
  const [percepcionGrupoBarChartData, setPercepcionGrupoBarChartData] = useState<ChartDataState<LineChartDataset>>({
    labels: [], // Los grupos serán las etiquetas
    datasets: [],
  });
  const [percepcionGrupoBarChartOptions, setPercepcionGrupoBarChartOptions] = useState({});

  useEffect(() => {
    const fetchEncuestas = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllEnviosEncuestas();
        setAllEncuestas(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Error al cargar los datos de encuestas');
      } finally {
        setLoading(false);
      }
    };
    fetchEncuestas();
  }, []);

  // Función para abrir modal de detalles
  const abrirModalDetalles = (id: number) => {
    console.log('[DEBUG] abrirModalDetalles llamado con ID:', id);
    console.log('[DEBUG] Contenido de allEncuestas ANTES de find:', allEncuestas);
    const detalle = allEncuestas.find(item => item.idcalificacion === id);
    console.log('[DEBUG] Detalle encontrado:', detalle);
    setDetalleSeleccionado(detalle || null);
    setMostrarModalDetalles(true);
    console.log('[DEBUG] setMostrarModalDetalles(true) ejecutado.');
  };

  // Función para abrir modal de conformidad
  const abrirModalConformidad = () => {
    if (detalleSeleccionado) {
      setEstadoConformidadSeleccionado(detalleSeleccionado.conformidad || 'Pendiente');
      setObservacionesConformidadInput(detalleSeleccionado.conformidad_obs || '');
    } else {
      // Resetea por si acaso, aunque detalleSeleccionado debería existir
      setEstadoConformidadSeleccionado('Pendiente');
      setObservacionesConformidadInput('');
    }
    setMostrarModalConformidad(true);
    setMostrarModalDetalles(false); // Asegúrate de que el modal de detalles se cierre si estaba abierto
  };

  const handleGuardarConformidad = async () => {
    if (!detalleSeleccionado || !detalleSeleccionado.idcalificacion) {
      console.error("No hay detalle seleccionado o falta ID para guardar conformidad.");
      // Aquí podrías mostrar una notificación de error al usuario
      alert("Error: No se ha seleccionado ninguna encuesta para registrar conformidad.");
      return;
    }

    setIsSavingConformidad(true); // Indicar que se está guardando

    try {
      const payload = {
        conformidad: estadoConformidadSeleccionado,
        conformidad_obs: observacionesConformidadInput,
      };

      const encuestaActualizada = await actualizarConformidadEncuesta(detalleSeleccionado.idcalificacion, payload);

      // Actualizar la UI localmente
      setAllEncuestas(prevEncuestas => 
        prevEncuestas.map(enc => 
          enc.idcalificacion === encuestaActualizada.idcalificacion ? encuestaActualizada : enc
        )
      );

      setMostrarModalConformidad(false);
      // Mostrar notificación de éxito (asumiendo que tienes un sistema de notificaciones)
      alert("Conformidad registrada exitosamente."); // Placeholder para notificación

    } catch (error) {
      console.error("Error al guardar conformidad:", error);
      // Mostrar notificación de error
      alert(`Error al guardar conformidad: ${error instanceof Error ? error.message : 'Error desconocido'}`); // Placeholder
    } finally {
      setIsSavingConformidad(false); // Indicar que el guardado ha terminado (éxito o error)
    }
  };

  // Manejar cambio de filtro de fechas
  const manejarCambioFiltroFechas = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value;
    setFiltroPeriodo(valor);
    if (valor === 'personalizado') {
      setMostrarPersonalizado(true);
    } else {
      setMostrarPersonalizado(false);
    }
  };

  // Lógica de filtrado (versión inicial, se refinará)
  const encuestasFiltradas = useMemo(() => {
    return allEncuestas.filter(encuesta => {
      if (filtroAsesor && (!encuesta.asesor || encuesta.asesor.toLowerCase() !== filtroAsesor.toLowerCase())) {
        return false;
      }
      if (filtroGrupo && (!encuesta.grupo || encuesta.grupo.toLowerCase() !== filtroGrupo.toLowerCase())) {
        return false;
      }
      if (filtroCalificacion && (!encuesta.calificacion || encuesta.calificacion.toLowerCase() !== filtroCalificacion.toLowerCase())) {
        return false;
      }
      
      // Lógica de filtro por periodo (timestamp)
      if (filtroPeriodo && filtroPeriodo !== 'todos' && filtroPeriodo !== '') {
        const hoy = new Date();
        let fechaInicioRango: Date | null = null;
        let fechaFinRango: Date | null = null;

        switch (filtroPeriodo) {
          case 'hoy':
            fechaInicioRango = getStartOfDay(hoy);
            fechaFinRango = getEndOfDay(hoy);
            break;
          case 'ayer':
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            fechaInicioRango = getStartOfDay(ayer);
            fechaFinRango = getEndOfDay(ayer);
            break;
          case 'semana':
            fechaInicioRango = getStartOfWeek(hoy);
            fechaFinRango = getEndOfWeek(hoy);
            break;
          case 'mes':
            fechaInicioRango = getStartOfMonth(hoy);
            fechaFinRango = getEndOfMonth(hoy);
            break;
          case 'mes-1': // Último mes completo
            const inicioMesActual = getStartOfMonth(hoy);
            fechaFinRango = getEndOfDay(new Date(inicioMesActual.setDate(inicioMesActual.getDate() -1))); // Último día del mes anterior
            fechaInicioRango = getStartOfMonth(fechaFinRango); // Principio de ese mes anterior
            break;
          case 'mes-3':
            const finMes3 = getEndOfMonth(hoy); // Fin del mes actual
            fechaInicioRango = getStartOfMonth(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)); // Inicio de hace 2 meses (para cubrir 3 meses completos hasta hoy)
            fechaFinRango = finMes3; // Podríamos ajustar a getEndOfDay(hoy) si queremos hasta el día actual de los 3 meses
            // Para 3 meses completos sería: 
            // fechaFinRango = getEndOfMonth(new Date(hoy.getFullYear(), hoy.getMonth() -1, 1)); // Fin del mes pasado
            // fechaInicioRango = getStartOfMonth(new Date(hoy.getFullYear(), hoy.getMonth() -3, 1)); // Inicio de hace 3 meses
            break;
          case 'mes-6':
            const finMes6 = getEndOfMonth(hoy);
            fechaInicioRango = getStartOfMonth(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1));
            fechaFinRango = finMes6;
            break;
          case 'año':
            fechaInicioRango = getStartOfDay(new Date(hoy.getFullYear(), 0, 1));
            fechaFinRango = getEndOfDay(new Date(hoy.getFullYear(), 11, 31));
            break;
          case 'personalizado':
            if (fechaInicioFiltro) {
              fechaInicioRango = getStartOfDay(new Date(fechaInicioFiltro));
            }
            if (fechaFinFiltro) {
              fechaFinRango = getEndOfDay(new Date(fechaFinFiltro));
            }
            break;
        }

        if (fechaInicioRango && fechaFinRango) {
          if (!encuesta.timestamp || !isDateInRange(encuesta.timestamp, fechaInicioRango, fechaFinRango)) {
            return false;
          }
        } else if (filtroPeriodo === 'personalizado' && (fechaInicioFiltro || fechaFinFiltro)) {
          // Si es personalizado y solo una fecha está definida, podríamos no filtrar o filtrar desde/hasta esa fecha abierta
          // Por ahora, si el rango no es completo y válido, no se filtra por fecha personalizada
           if (fechaInicioFiltro && !isDateInRange(encuesta.timestamp, getStartOfDay(new Date(fechaInicioFiltro)), getEndOfDay(new Date('9999-12-31')))) return false;
           if (fechaFinFiltro && !isDateInRange(encuesta.timestamp, getStartOfDay(new Date('0000-01-01')), getEndOfDay(new Date(fechaFinFiltro)))) return false;
           if (!fechaInicioFiltro && !fechaFinFiltro) return true; // No hay fechas, no filtrar por personalizado
        }
      }

      return true;
    });
  }, [allEncuestas, filtroAsesor, filtroGrupo, filtroCalificacion, filtroPeriodo, fechaInicioFiltro, fechaFinFiltro]);

  // Lógica de paginación para la tabla principal
  const encuestasPaginadas = useMemo(() => {
    if (!encuestasFiltradas) return []; // Añadir esta guarda por si encuestasFiltradas es undefined inicialmente
    const indiceInicio = (paginaActual - 1) * registrosPorPagina;
    const indiceFin = paginaActual * registrosPorPagina;
    return encuestasFiltradas.slice(indiceInicio, indiceFin);
  }, [encuestasFiltradas, paginaActual, registrosPorPagina]);

  const totalPaginas = useMemo(() => {
    if (!encuestasFiltradas) return 0; // Añadir guarda
    return Math.ceil(encuestasFiltradas.length / registrosPorPagina);
  }, [encuestasFiltradas, registrosPorPagina]);

  // Funciones para cambiar de página
  const irAPaginaSiguiente = () => {
    setPaginaActual((prev) => Math.min(prev + 1, totalPaginas));
  };

  const irAPaginaAnterior = () => {
    setPaginaActual((prev) => Math.max(prev - 1, 1));
  };

  // Este efecto se asegura de que la paginación se reinicie cuando los filtros cambian
  // y también cuando el conjunto de datos `allEncuestas` cambia (por ejemplo, al cargar inicialmente).
  useEffect(() => {
    setPaginaActual(1);
  }, [allEncuestas, filtroAsesor, filtroGrupo, filtroCalificacion, filtroPeriodo, fechaInicioFiltro, fechaFinFiltro]);

  // Encuestas filtradas solo por asesor, grupo y período (para tarjetas y gráficos de pastel)
  const encuestasParaKPIsYPasteles = useMemo(() => {
    return allEncuestas.filter(encuesta => {
      // Aplicar filtro de asesor
      if (filtroAsesor && (!encuesta.asesor || encuesta.asesor.toLowerCase() !== filtroAsesor.toLowerCase())) {
        return false;
      }
      // Aplicar filtro de grupo
      if (filtroGrupo && (!encuesta.grupo || encuesta.grupo.toLowerCase() !== filtroGrupo.toLowerCase())) {
        return false;
      }
      
      // Aplicar filtro de período (lógica idéntica a encuestasFiltradas)
      if (filtroPeriodo && filtroPeriodo !== 'todos' && filtroPeriodo !== '') {
        const hoy = new Date();
        let fechaInicioRango: Date | null = null;
        let fechaFinRango: Date | null = null;

        switch (filtroPeriodo) {
          case 'hoy':
            fechaInicioRango = getStartOfDay(hoy);
            fechaFinRango = getEndOfDay(hoy);
            break;
          case 'ayer':
            const ayer = new Date(hoy);
            ayer.setDate(hoy.getDate() - 1);
            fechaInicioRango = getStartOfDay(ayer);
            fechaFinRango = getEndOfDay(ayer);
            break;
          case 'semana':
            fechaInicioRango = getStartOfWeek(hoy);
            fechaFinRango = getEndOfWeek(hoy);
            break;
          case 'mes':
            fechaInicioRango = getStartOfMonth(hoy);
            fechaFinRango = getEndOfMonth(hoy);
            break;
          case 'mes-1':
            const inicioMesActual = getStartOfMonth(hoy);
            fechaFinRango = getEndOfDay(new Date(inicioMesActual.setDate(inicioMesActual.getDate() -1)));
            fechaInicioRango = getStartOfMonth(fechaFinRango);
            break;
          case 'mes-3':
            const finMes3 = getEndOfMonth(hoy);
            fechaInicioRango = getStartOfMonth(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1));
            fechaFinRango = finMes3;
            break;
          case 'mes-6':
            const finMes6 = getEndOfMonth(hoy);
            fechaInicioRango = getStartOfMonth(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1));
            fechaFinRango = finMes6;
            break;
          case 'año':
            fechaInicioRango = getStartOfDay(new Date(hoy.getFullYear(), 0, 1));
            fechaFinRango = getEndOfDay(new Date(hoy.getFullYear(), 11, 31));
            break;
          case 'personalizado':
            if (fechaInicioFiltro) {
              fechaInicioRango = getStartOfDay(new Date(fechaInicioFiltro));
            }
            if (fechaFinFiltro) {
              fechaFinRango = getEndOfDay(new Date(fechaFinFiltro));
            }
            break;
        }

        if (fechaInicioRango && fechaFinRango) {
          if (!encuesta.timestamp || !isDateInRange(encuesta.timestamp, fechaInicioRango, fechaFinRango)) {
            return false;
          }
        } else if (filtroPeriodo === 'personalizado' && (fechaInicioFiltro || fechaFinFiltro)) {
           if (fechaInicioFiltro && !isDateInRange(encuesta.timestamp, getStartOfDay(new Date(fechaInicioFiltro)), getEndOfDay(new Date('9999-12-31')))) return false;
           if (fechaFinFiltro && !isDateInRange(encuesta.timestamp, getStartOfDay(new Date('0000-01-01')), getEndOfDay(new Date(fechaFinFiltro)))) return false;
           if (!fechaInicioFiltro && !fechaFinFiltro) return true; 
        }
      }
      return true;
    });
  }, [allEncuestas, filtroAsesor, filtroGrupo, filtroPeriodo, fechaInicioFiltro, fechaFinFiltro]);

  // Datos para las tarjetas de resumen
  const summaryCardData = useMemo(() => {
    return {
      total: encuestasParaKPIsYPasteles.length,
      bueno: encuestasParaKPIsYPasteles.filter((e: EnvioEncuesta) => e.calificacion === 'Bueno').length,
      malo: encuestasParaKPIsYPasteles.filter((e: EnvioEncuesta) => e.calificacion === 'Malo').length,
      regular: encuestasParaKPIsYPasteles.filter((e: EnvioEncuesta) => e.calificacion === 'Regular').length,
      calificadas: encuestasParaKPIsYPasteles.filter((e: EnvioEncuesta) => e.calificacion && e.calificacion.trim() !== '').length,
      confirmadas: encuestasParaKPIsYPasteles.filter((e: EnvioEncuesta) => e.conformidad && e.conformidad.trim() !== '').length,
    };
  }, [encuestasParaKPIsYPasteles]);

  // Top 7 Asesores por cantidad de calificaciones "Bueno"
  const topAsesoresPorBuenas = useMemo(() => {
    if (!encuestasParaKPIsYPasteles || encuestasParaKPIsYPasteles.length === 0) return [];

    const conteoPorAsesor: { [asesor: string]: { buenas: number, nombre: string } } = {};

    encuestasParaKPIsYPasteles.forEach(encuesta => {
      if (encuesta.asesor) {
        if (!conteoPorAsesor[encuesta.asesor]) {
          conteoPorAsesor[encuesta.asesor] = { buenas: 0, nombre: encuesta.asesor };
        }
        if (encuesta.calificacion === 'Bueno') {
          conteoPorAsesor[encuesta.asesor].buenas++;
        }
      }
    });

    return Object.values(conteoPorAsesor)
      .sort((a, b) => b.buenas - a.buenas)
      .slice(0, 7);
  }, [encuestasParaKPIsYPasteles]);

  // Top 7 Asesores por percepción de satisfacción
  const topAsesoresPorPercepcion = useMemo(() => {
    if (!encuestasParaKPIsYPasteles || encuestasParaKPIsYPasteles.length === 0) return [];

    const percepcionPorAsesor: { [asesor: string]: { nombre: string, totalPuntos: number, maxPuntos: number, percepcion: number, calificadas: number } } = {};

    encuestasParaKPIsYPasteles.forEach(encuesta => {
      if (encuesta.asesor && encuesta.calificacion) { // Asegurar que haya calificacion para contarla
        if (!percepcionPorAsesor[encuesta.asesor]) {
          percepcionPorAsesor[encuesta.asesor] = { nombre: encuesta.asesor, totalPuntos: 0, maxPuntos: 0, percepcion: 0, calificadas: 0 };
        }

        let puntos = 0;
        if (encuesta.calificacion === 'Bueno') puntos = 2;
        else if (encuesta.calificacion === 'Regular') puntos = 1;

        percepcionPorAsesor[encuesta.asesor].totalPuntos += puntos;
        percepcionPorAsesor[encuesta.asesor].maxPuntos += 2; 
        percepcionPorAsesor[encuesta.asesor].calificadas += 1;
      }
    });

    return Object.values(percepcionPorAsesor)
      .filter(asesor => asesor.calificadas > 0) // Incluir solo asesores con encuestas calificadas
      .map(asesor => ({
        ...asesor,
        percepcion: asesor.maxPuntos > 0 ? Math.round((asesor.totalPuntos / asesor.maxPuntos) * 100) : 0,
      }))
      .sort((a, b) => b.percepcion - a.percepcion)
      .slice(0, 7);
  }, [encuestasParaKPIsYPasteles]);

  // Opciones dinámicas para los selectores (ejemplo para asesor)
  const asesoresUnicos = useMemo(() => {
    const asesores = new Set(
      allEncuestas
        .map(e => e.asesor)
        .filter((asesor): asesor is string => typeof asesor === 'string') // Asegurar que solo sean strings
    );
    return Array.from(asesores).sort();
  }, [allEncuestas]);

  const gruposUnicos = useMemo(() => {
    const grupos = new Set(
      allEncuestas
        .map(e => e.grupo)
        .filter((grupo): grupo is string => typeof grupo === 'string') // Asegurar que solo sean strings
    );
    return Array.from(grupos).sort();
  }, [allEncuestas]);

  const calificacionesUnicas = useMemo(() => {
    const calificaciones = new Set(
      allEncuestas
        .map(e => e.calificacion)
        .filter((calif): calif is string => typeof calif === 'string') // Asegurar que solo sean strings
    );
    return Array.from(calificaciones).sort();
  }, [allEncuestas]);

  // Efecto para procesar datos para el gráfico cuando las encuestas filtradas cambien
  useEffect(() => {
    // Usar las encuestas ya filtradas por periodo, asesor, grupo

    if (!loading && encuestasFiltradas.length > 0) {
      // Procesar encuestasFiltradas para generar labels y datasets para el gráfico de LÍNEAS
      const procesarDatosParaGraficoLineas = () => {
        // Agrupar por fecha (timestamp) y contar calificaciones
        const agrupadoPorFecha: { [fecha: string]: { Malo: number, Regular: number, Bueno: number } } = {};

        encuestasFiltradas.forEach(encuesta => {
          if (encuesta.timestamp && encuesta.calificacion) {
            const fecha = new Date(encuesta.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            if (!agrupadoPorFecha[fecha]) {
              agrupadoPorFecha[fecha] = { Malo: 0, Regular: 0, Bueno: 0 };
            }
            if (encuesta.calificacion === 'Malo') agrupadoPorFecha[fecha].Malo++;
            else if (encuesta.calificacion === 'Regular') agrupadoPorFecha[fecha].Regular++;
            else if (encuesta.calificacion === 'Bueno') agrupadoPorFecha[fecha].Bueno++;
          }
        });

        // Ordenar las fechas
        const labelsOrdenados = Object.keys(agrupadoPorFecha).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('/');
            const [dayB, monthB, yearB] = b.split('/');
            return new Date(`${yearA}-${monthA}-${dayA}`).getTime() - new Date(`${yearB}-${monthB}-${dayB}`).getTime();
        });

        setChartData({
          labels: labelsOrdenados,
          datasets: [
            {
              label: 'Malo',
              data: labelsOrdenados.map(fecha => agrupadoPorFecha[fecha].Malo),
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              tension: 0.1, // Para suavizar la línea
              // fill: true, // Si se quiere rellenar el área bajo la línea
            },
            {
              label: 'Regular',
              data: labelsOrdenados.map(fecha => agrupadoPorFecha[fecha].Regular),
              borderColor: 'rgba(255, 206, 86, 1)',
              backgroundColor: 'rgba(255, 206, 86, 0.2)',
              tension: 0.1,
            },
            {
              label: 'Bueno',
              data: labelsOrdenados.map(fecha => agrupadoPorFecha[fecha].Bueno),
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.1,
            },
          ],
        });

        setChartOptions({
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top' as const, // 'top' | 'left' | 'bottom' | 'right' | 'chartArea'
            },
            title: {
              display: false, // El título ya está en el div contenedor
              text: 'Tendencia de Calificaciones',
            },
            tooltip: {
              mode: 'index' as const,
              intersect: false,
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Fecha',
              },
            },
            y: {
              title: {
                display: true,
                text: 'Cantidad de Calificaciones',
              },
              beginAtZero: true,
              // Sugerir un máximo basado en los datos o permitir que sea automático
              // suggestedMax: ...
            },
          },
        });
      };

      procesarDatosParaGraficoLineas();
    } else if (!loading && encuestasFiltradas.length === 0) {
        // Si no hay datos filtrados, limpiar el gráfico de líneas
        setChartData({ labels: [], datasets: [] });
    }

    // Procesar datos para el gráfico de pastel de VENTAS
    if (!loading && encuestasParaKPIsYPasteles && encuestasParaKPIsYPasteles.length > 0) {
      const encuestasVentas = encuestasParaKPIsYPasteles.filter(
        (e: EnvioEncuesta) => e.tipo === 'Ventas (OT)' || e.tipo === 'Ventas (OC)'
      );

      if (encuestasVentas.length > 0) {
        const buenoCount = encuestasVentas.filter((e: EnvioEncuesta) => e.calificacion === 'Bueno').length;
        const regularCount = encuestasVentas.filter((e: EnvioEncuesta) => e.calificacion === 'Regular').length;
        const maloCount = encuestasVentas.filter((e: EnvioEncuesta) => e.calificacion === 'Malo').length;

        setVentasPieChartData({
          labels: ['Bueno', 'Regular', 'Malo'],
          datasets: [
            {
              label: 'Calificaciones Ventas',
              data: [buenoCount, regularCount, maloCount],
              backgroundColor: [
                'rgba(75, 192, 192, 0.7)', // Bueno
                'rgba(255, 206, 86, 0.7)', // Regular
                'rgba(255, 99, 132, 0.7)',  // Malo
              ],
              borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(255, 99, 132, 1)',
              ],
              borderWidth: 1,
            } as PieChartDataset, // Tipado correcto
          ],
        });
        setVentasPieChartOptions({
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom' as const,
            },
            title: {
              display: false, // El título ya está en el div
            },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            label += context.parsed;
                        }
                        const total = context.dataset.data.reduce((acc: number, val: number) => acc + val, 0);
                        const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%';
                        return `${label} (${percentage})`;
                    }
                }
            }
          },
        });
      } else {
        setVentasPieChartData({ labels: ['Bueno', 'Regular', 'Malo'], datasets: [] });
      }

      // Procesar datos para el gráfico de pastel de COORDINADOR
      const encuestasCoordinador = encuestasParaKPIsYPasteles.filter(
        (e: EnvioEncuesta) => e.tipo === 'Coordinador (Conformidad)'
      );

      if (encuestasCoordinador.length > 0) {
        const buenoCountCoord = encuestasCoordinador.filter((e: EnvioEncuesta) => e.calificacion === 'Bueno').length;
        const regularCountCoord = encuestasCoordinador.filter((e: EnvioEncuesta) => e.calificacion === 'Regular').length;
        const maloCountCoord = encuestasCoordinador.filter((e: EnvioEncuesta) => e.calificacion === 'Malo').length;

        setCoordinadorPieChartData({
          labels: ['Bueno', 'Regular', 'Malo'],
          datasets: [
            {
              label: 'Calificaciones Coordinador',
              data: [buenoCountCoord, regularCountCoord, maloCountCoord],
              backgroundColor: [
                'rgba(75, 192, 192, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(255, 99, 132, 0.7)',
              ],
              borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(255, 99, 132, 1)',
              ],
              borderWidth: 1,
            } as PieChartDataset, // Tipado correcto
          ],
        });
        setCoordinadorPieChartOptions({
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom' as const,
            },
            title: {
              display: false,
            },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            label += context.parsed;
                        }
                        const total = context.dataset.data.reduce((acc: number, val: number) => acc + val, 0);
                        const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%';
                        return `${label} (${percentage})`;
                    }
                }
            }
          },
        });
      } else {
        setCoordinadorPieChartData({ labels: ['Bueno', 'Regular', 'Malo'], datasets: [] });
      }
    } else if (!loading) {
        setVentasPieChartData({ labels: ['Bueno', 'Regular', 'Malo'], datasets: [] });
        setCoordinadorPieChartData({ labels: ['Bueno', 'Regular', 'Malo'], datasets: [] });
        setPercepcionGrupoBarChartData({ labels: [], datasets: [] }); // Limpiar también este gráfico
    }

    // Procesar datos para el gráfico de barras de PERCEPCIÓN POR GRUPO
    if (!loading && encuestasParaKPIsYPasteles && encuestasParaKPIsYPasteles.length > 0) {
      const percepcionPorGrupo: { [grupo: string]: { totalPuntos: number; maxPuntos: number, count: number } } = {};

      encuestasParaKPIsYPasteles.forEach((encuesta: EnvioEncuesta) => {
        if (encuesta.grupo && encuesta.calificacion) { // Asegurarse que hay grupo y calificación
          if (!percepcionPorGrupo[encuesta.grupo]) {
            percepcionPorGrupo[encuesta.grupo] = { totalPuntos: 0, maxPuntos: 0, count: 0 };
          }

          let puntos = 0;
          if (encuesta.calificacion === 'Bueno') puntos = 2;
          else if (encuesta.calificacion === 'Regular') puntos = 1;
          // Malo obtiene 0 puntos, no es necesario sumar

          percepcionPorGrupo[encuesta.grupo].totalPuntos += puntos;
          percepcionPorGrupo[encuesta.grupo].maxPuntos += 2; // Máximo 2 puntos por encuesta calificada
          percepcionPorGrupo[encuesta.grupo].count += 1;
        }
      });

      const labelsGrupos = Object.keys(percepcionPorGrupo);
      if (labelsGrupos.length > 0) {
        const dataPercepcion = labelsGrupos.map(grupo => {
          const { totalPuntos, maxPuntos } = percepcionPorGrupo[grupo];
          return maxPuntos > 0 ? Math.round((totalPuntos / maxPuntos) * 100) : 0;
        });

        setPercepcionGrupoBarChartData({
          labels: labelsGrupos,
          datasets: [
            {
              label: 'Percepción del Cliente (%)',
              data: dataPercepcion,
              backgroundColor: 'rgba(54, 162, 235, 0.6)', // Un color azul, por ejemplo
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            } as any, // Tipar correctamente, similar a LineChartDataset pero sin tension
          ],
        });

        setPercepcionGrupoBarChartOptions({
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y' as const, // Para barras horizontales, si se prefiere
          plugins: {
            legend: {
              display: false, // La etiqueta del dataset es suficiente
            },
            title: {
              display: false, // Título ya está en la tarjeta del dashboard
            },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  return `${context.label}: ${context.raw}%`;
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Nivel de Percepción (%)',
              },
              beginAtZero: true,
              max: 100, // El porcentaje va de 0 a 100
            },
            y: {
              title: {
                display: true,
                text: 'Grupo',
              },
            },
          },
        });
      } else {
        setPercepcionGrupoBarChartData({ labels: [], datasets: [] });
      }
    } else if (!loading) {
      setPercepcionGrupoBarChartData({ labels: [], datasets: [] });
    }

  }, [encuestasFiltradas, loading, encuestasParaKPIsYPasteles]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#d48b45]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500 text-xl">Error: {error}</p>
        <p className="mt-2">No se pudieron cargar los datos de las encuestas. Inténtalo de nuevo más tarde.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#2e3954] mb-6">Registro de Calificaciones</h1>
      
      {/* Modal de Detalles */}
      {mostrarModalDetalles && detalleSeleccionado && (
        <>
          {(() => { 
            console.log('[DEBUG] Renderizando modal, detalleSeleccionado:', detalleSeleccionado);
            return null; // No renderizar nada visible
          })()}
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-[#2e3954]">Detalles de la Calificación</h2>
                <button 
                  onClick={() => setMostrarModalDetalles(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                  aria-label="Cerrar modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  <p><strong className="font-medium text-gray-600">ID Calificación:</strong> {detalleSeleccionado.idcalificacion}</p>
                  <p><strong className="font-medium text-gray-600">Asesor:</strong> {detalleSeleccionado.asesor || 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">RUC:</strong> {detalleSeleccionado.ruc || 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">Cliente:</strong> {detalleSeleccionado.nombres || 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">Correo:</strong> {detalleSeleccionado.correo || 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">Segmento:</strong> {detalleSeleccionado.segmento || 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">Documento:</strong> {detalleSeleccionado.documento || 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">Tipo Encuesta:</strong> {detalleSeleccionado.tipo || 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">Calificación:</strong> 
                    <span className={`font-semibold ml-1 ${detalleSeleccionado.calificacion === 'Bueno' ? 'text-green-600' : detalleSeleccionado.calificacion === 'Regular' ? 'text-yellow-600' : detalleSeleccionado.calificacion === 'Malo' ? 'text-red-600' : 'text-gray-600'}`}>
                      {detalleSeleccionado.calificacion || 'N/D'}
                    </span>
                  </p>
                  <p><strong className="font-medium text-gray-600">Grupo:</strong> {detalleSeleccionado.grupo || 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">Fecha Calificación:</strong> {detalleSeleccionado.fecha_calificacion ? new Date(detalleSeleccionado.fecha_calificacion).toLocaleDateString('es-ES') : 'N/A'}</p>
                  <p><strong className="font-medium text-gray-600">Fecha Registro:</strong> {new Date(detalleSeleccionado.timestamp).toLocaleString('es-ES')}</p>
                </div>
                
                <div className="pt-2">
                  <p className="font-medium text-gray-600">Observaciones:</p>
                  <p className="mt-1 p-2 bg-gray-50 rounded-md min-h-[40px]">{detalleSeleccionado.observaciones || 'Sin observaciones'}</p>
                </div>

                {detalleSeleccionado.tipo === 'Coordinador (Conformidad)' && (
                  <>
                    <hr className="my-3"/>
                    <h3 className="text-md font-semibold text-[#2e3954] mb-2">Datos de Conformidad</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                        <p><strong className="font-medium text-gray-600">Conformidad:</strong> 
                            <span className={`font-semibold ml-1 ${detalleSeleccionado.conformidad === 'Conforme' ? 'text-green-600' : detalleSeleccionado.conformidad === 'No Conforme' ? 'text-red-600' : 'text-gray-600'}`}>
                            {detalleSeleccionado.conformidad || 'N/D'}
                            </span>
                        </p>
                        <p><strong className="font-medium text-gray-600">Fecha Conformidad:</strong> {detalleSeleccionado.conformidad_timestamp ? new Date(detalleSeleccionado.conformidad_timestamp).toLocaleString('es-ES') : 'N/A'}</p>
                    </div>
                    <div className="pt-2">
                      <p className="font-medium text-gray-600">Obs. Conformidad:</p>
                      <p className="mt-1 p-2 bg-gray-50 rounded-md min-h-[40px]">{detalleSeleccionado.conformidad_obs || 'Sin observaciones de conformidad'}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={abrirModalConformidad}
                  className="px-4 py-2 text-sm bg-[#8dbba3] text-white rounded-md hover:bg-opacity-90 transition hover:shadow-md"
                >
                  Registrar Conformidad
                </button>
                <button
                  onClick={() => setMostrarModalDetalles(false)}
                  className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md font-medium text-gray-700 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Modal de Conformidad */}
      {mostrarModalConformidad && detalleSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"> {/* Aumentar z-index si es necesario */}
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[#2e3954]">Registrar Conformidad</h2>
              <button 
                onClick={() => setMostrarModalConformidad(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Cerrar modal"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">Cliente: <span className="font-medium">{detalleSeleccionado.nombres}</span></p>
            <p className="text-sm text-gray-600 mb-4">Documento: <span className="font-medium">{detalleSeleccionado.documento}</span></p>
            
            {/* Aquí irían los campos del formulario de conformidad */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="conformidad_status" className="block text-sm font-medium text-gray-700">Estado de Conformidad</label>
                    <select id="conformidad_status" name="conformidad_status" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-800" value={estadoConformidadSeleccionado} onChange={(e) => setEstadoConformidadSeleccionado(e.target.value)}>
                        <option value="Conforme">Conforme</option>
                        <option value="No Conforme">No Conforme</option>
                        <option value="Pendiente">Pendiente</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="conformidad_obs" className="block text-sm font-medium text-gray-700">Observaciones de Conformidad</label>
                    <textarea id="conformidad_obs" name="conformidad_obs" rows={3} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-white text-gray-800 p-2 focus:ring-indigo-500 focus:border-indigo-500" value={observacionesConformidadInput} onChange={(e) => setObservacionesConformidadInput(e.target.value)} placeholder="Añadir observaciones..."></textarea>
                </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setMostrarModalConformidad(false)}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md font-medium text-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarConformidad}
                disabled={isSavingConformidad} // Deshabilitar mientras se guarda
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingConformidad ? 'Guardando...' : 'Guardar Conformidad'} {/* Cambiar texto del botón */}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Encuestas Totales</h3>
          <p className="text-2xl font-semibold text-[#2e3954]">{summaryCardData.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Buenas</h3>
          <p className="text-2xl font-semibold text-green-600">{summaryCardData.bueno}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Malas</h3>
          <p className="text-2xl font-semibold text-red-600">{summaryCardData.malo}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Regulares</h3>
          <p className="text-2xl font-semibold text-yellow-600">{summaryCardData.regular}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Calificadas</h3>
          <p className="text-2xl font-semibold text-blue-600">{summaryCardData.calificadas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Confirmadas</h3>
          <p className="text-2xl font-semibold text-purple-600">{summaryCardData.confirmadas}</p>
        </div>
      </div>
      
      <div>
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select 
            className="flex-1 min-w-[150px] p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
            value={filtroAsesor}
            onChange={(e) => setFiltroAsesor(e.target.value)}
          >
            <option value="">Todos los asesores</option>
            {asesoresUnicos.map(asesor => (
              <option key={asesor} value={asesor}>{asesor}</option>
            ))}
          </select>
          
          <select 
            className="flex-1 min-w-[150px] p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
          >
            <option value="">Todos los grupos</option>
            {gruposUnicos.map(grupo => (
              <option key={grupo} value={grupo}>{grupo}</option>
            ))}
          </select>
          
          <select 
            className="flex-1 min-w-[150px] p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
            value={filtroCalificacion}
            onChange={(e) => setFiltroCalificacion(e.target.value)}
          >
            <option value="">Todas las calificaciones</option>
            {calificacionesUnicas.map(calificacion => (
              <option key={calificacion} value={calificacion}>{calificacion}</option>
            ))}
          </select>
          
          <div className="flex-1 min-w-[150px] flex flex-col">
            <select 
              className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
              onChange={manejarCambioFiltroFechas}
            >
              <option value="">Todos los periodos</option>
              <option value="hoy">Hoy</option>
              <option value="ayer">Ayer</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="mes-1">Último mes</option>
              <option value="mes-3">Últimos 3 meses</option>
              <option value="mes-6">Últimos 6 meses</option>
              <option value="año">Este año</option>
              <option value="personalizado">Rango personalizado</option>
            </select>
            
            {mostrarPersonalizado && (
              <div className="mt-2 flex flex-wrap gap-2 items-end">
                <div className="flex flex-col flex-1 min-w-[140px]">
                  <label htmlFor="fechaInicio" className="text-xs mb-1 text-gray-600">Fecha inicial:</label>
                  <input 
                    type="date" 
                    id="fechaInicio" 
                    className="p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                    value={fechaInicioFiltro}
                    onChange={(e) => setFechaInicioFiltro(e.target.value)}
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-[140px]">
                  <label htmlFor="fechaFin" className="text-xs mb-1 text-gray-600">Fecha final:</label>
                  <input 
                    type="date" 
                    id="fechaFin" 
                    className="p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                    value={fechaFinFiltro}
                    onChange={(e) => setFechaFinFiltro(e.target.value)}
                  />
                </div>
                <button 
                  className="px-4 py-2 bg-[#d48b45] text-white rounded-md hover:bg-[#be7b3d] transition-colors duration-200"
                  onClick={() => { /* TODO: Aplicar filtro de fecha personalizado */ }}
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Gráfico de líneas (tendencia) */}
          <div className="bg-white rounded-xl shadow-md p-6 lg:col-span-3">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Tendencia de Calificaciones</h3>
            <div className="h-[250px] w-full bg-gray-50 rounded-lg flex items-center justify-center relative">
              {/* Renderizar el gráfico aquí */}
              {chartData.labels.length > 0 && 
               chartData.datasets.length > 0 && 
               chartData.datasets.some(dataset => dataset.data.some(d => d > 0)) ? (
                <Line options={chartOptions} data={chartData as any} /> // as any temporal por el tipo genérico de ChartDataState
              ) : (
                <p className="text-gray-400">
                  {loading ? 'Cargando datos del gráfico...' : 'No hay datos suficientes para mostrar la tendencia.'}
                </p>
              )}
            </div>
          </div>
          
          {/* Gráfico de ventas (Pastel) */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Percepción - Ventas</h3>
            <div className="h-[250px] w-full bg-gray-50 rounded-lg flex items-center justify-center relative">
              {ventasPieChartData.datasets.length > 0 && ventasPieChartData.datasets[0].data.some(d => d > 0) ? (
                <Doughnut options={ventasPieChartOptions} data={ventasPieChartData as any} />
              ) : (
                <p className="text-gray-400">
                  {loading ? 'Cargando...' : 'Sin datos para Ventas'}
                </p>
              )}
            </div>
          </div>
          
          {/* Gráfico de conformidad (Pastel) */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Percepción - Coordinador</h3>
            <div className="h-[250px] w-full bg-gray-50 rounded-lg flex items-center justify-center relative">
              {coordinadorPieChartData.datasets.length > 0 && coordinadorPieChartData.datasets[0].data.some(d => d > 0) ? (
                <Doughnut options={coordinadorPieChartOptions} data={coordinadorPieChartData as any} />
              ) : (
                <p className="text-gray-400">
                  {loading ? 'Cargando...' : 'Sin datos para Coordinador'}
                </p>
              )}
            </div>
          </div>
          
          {/* Percepción por Grupo (Gráfico de Barras) */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Percepción por Grupo</h3>
            <div className="h-[250px] w-full bg-gray-50 rounded-lg flex items-center justify-center relative">
              {percepcionGrupoBarChartData.labels && percepcionGrupoBarChartData.labels.length > 0 && percepcionGrupoBarChartData.datasets.length > 0 && percepcionGrupoBarChartData.datasets[0].data.some(d => d > 0) ? (
                <Bar options={percepcionGrupoBarChartOptions} data={percepcionGrupoBarChartData as any} />
              ) : (
                <p className="text-gray-400">
                  {loading ? 'Cargando...' : 'Sin datos para Percepción por Grupo'}
                </p>
              )}
            </div>
          </div>
          
          {/* Tabla de asesores */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Calificaciones por Asesor</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-2 text-left text-gray-600 font-semibold uppercase">Asesor</th>
                    <th className="px-2 py-2 text-center text-gray-600 font-semibold uppercase">Buenas</th>
                  </tr>
                </thead>
                <tbody>
                  {topAsesoresPorBuenas.length > 0 ? (
                    topAsesoresPorBuenas.map((asesor, index) => (
                      <tr key={asesor.nombre + index} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{asesor.nombre}</td>
                        <td className="px-2 py-2 text-center text-green-700 font-medium">{asesor.buenas}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="text-center py-3 text-gray-500">No hay datos</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Ranking de asesores */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Ranking de Satisfacción</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-2 text-center text-gray-600 font-semibold uppercase">#</th>
                    <th className="px-2 py-2 text-left text-gray-600 font-semibold uppercase">Asesor</th>
                    <th className="px-2 py-2 text-center text-gray-600 font-semibold uppercase">Percepción</th>
                  </tr>
                </thead>
                <tbody>
                  {topAsesoresPorPercepcion.length > 0 ? (
                    topAsesoresPorPercepcion.map((asesor, index) => {
                      const rowClassName = `hover:bg-gray-50 ${index === 0 ? 'bg-green-100' : index === 1 ? 'bg-green-50' : ''}`;
                      const rankClassName = `px-2 py-2 text-center ${index === 0 ? 'text-green-700 font-bold' : 'text-gray-700'}`;
                      const nameClassName = `px-2 py-2 whitespace-nowrap ${index === 0 ? 'text-green-700 font-bold' : 'text-gray-800'}`;
                      const perceptionClassName = `px-2 py-2 text-center font-medium ${asesor.percepcion >= 75 ? 'text-green-700' : asesor.percepcion >= 50 ? 'text-yellow-700' : 'text-red-700'}`;

                      return (
                        <tr key={asesor.nombre + index} className={rowClassName}>
                          <td className={rankClassName}>{index + 1}°</td>
                          <td className={nameClassName}>{asesor.nombre}</td>
                          <td className={perceptionClassName}>
                            {asesor.percepcion}%
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center py-3 text-gray-500">No hay datos</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Tabla de calificaciones */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[16%]">Asesor</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[27%]">Nombres</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">Calificación</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">Tipo</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[7%]">+</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(loading || !allEncuestas.length) ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                      {loading ? 'Cargando encuestas...' : 'No hay encuestas disponibles.'}
                    </td>
                  </tr>
                ) : encuestasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                       No se encontraron encuestas con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  encuestasPaginadas.map((item: EnvioEncuesta) => (
                  <tr key={item.idcalificacion} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800">{item.idcalificacion}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800">{item.asesor || 'N/A'}</td>
                    <td className="px-3 py-2 text-gray-800">{item.nombres || 'N/A'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2 text-xs rounded-full ${
                        item.calificacion === 'Bueno'
                          ? 'bg-green-100 text-green-800'
                          : item.calificacion === 'Regular'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.calificacion === 'Malo'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.calificacion || 'N/D'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800">{item.tipo || 'N/A'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        onClick={() => abrirModalDetalles(item.idcalificacion)}
                        className="inline-flex items-center justify-center p-1 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
          {/* Controles de Paginación */}
          {encuestasFiltradas && encuestasFiltradas.length > registrosPorPagina && (
            <div className="flex justify-between items-center mt-4 px-3 py-2 border-t border-gray-200">
              <button
                onClick={irAPaginaAnterior}
                disabled={paginaActual === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                onClick={irAPaginaSiguiente}
                disabled={paginaActual === totalPaginas || totalPaginas === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 