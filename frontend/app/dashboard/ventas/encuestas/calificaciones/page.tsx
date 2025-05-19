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
} from '../../../../../lib/utils/dateUtils';

// Importaciones de MUI y ApexCharts
import {
  Grid,
  Card,
  CardContent,
  Stack,
  Box,
  Typography,
  Avatar,
  Container,
  TextField,
  IconButton, // <-- Añadir IconButton
} from '@mui/material';
import Chart from 'react-apexcharts';
import { IconArrowUpLeft, IconArrowDownRight } from '@tabler/icons-react';
import ClearIcon from '@mui/icons-material/Clear'; // <-- Añadir ClearIcon (o CloseIcon)
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'; // <-- Importar el icono de chat

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

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement, BarElement
);

// Definir interfaces para los datos del gráfico
interface LineChartDataset { label: string; data: number[]; borderColor: string; backgroundColor: string; tension: number; fill?: boolean; }
interface PieChartDataset { label?: string; data: number[]; backgroundColor: string[]; borderColor: string[]; borderWidth?: number; }
interface ChartDataState<T = LineChartDataset | PieChartDataset> { labels: string[]; datasets: T[]; }

// --- INICIO: Nuevo componente SummaryStatCard y configuración de ApexCharts ---

interface SummaryStatCardProps {
  title: string;
  value: string | number;
  seriesData: { name: string; color: string; data: number[] }[];
  trendDirection?: 'up' | 'down';      // Para la flecha en la esquina sup. der.
  variationPercentage?: string; // Para el % de variación en la esquina sup. der.
  previousPeriodAbsoluteValue?: string | number; // NUEVA PROP: Valor absoluto del período anterior
  valueSubtitle?: string;       // Para el % de totalidad debajo del valor principal
}

const defaultApexAreaOptions: any = {
  chart: { type: 'area', fontFamily: "'Plus Jakarta Sans', sans-serif;", foreColor: '#adb0bb', toolbar: { show: false }, height: 45, sparkline: { enabled: true }, group: 'sparklines' },
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'solid', opacity: 0.05 },
  markers: { size: 0 },
  tooltip: { theme: 'dark', x: { show: false }, y: { formatter: (val: number) => val.toString(), title: { formatter: (seriesName: string) => '' } } },
  xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { show: false } },
  grid: { show: false, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
};

const SummaryStatCard: React.FC<SummaryStatCardProps> = ({
  title,
  value,
  seriesData,
  trendDirection,       // Para la flecha
  variationPercentage,  // Para el % de variación
  previousPeriodAbsoluteValue, // NUEVA PROP
  valueSubtitle,        // Para el subtítulo (porcentaje de totalidad)
}) => {
  const TrendIcon = trendDirection === 'up' ? IconArrowUpLeft : IconArrowDownRight;
  const trendIconColor = trendDirection === 'up' ? '#39B69A' : '#FA896B';

  const chartOptions = {
    ...defaultApexAreaOptions,
    colors: seriesData.map(s => s.color),
    fill: { ...defaultApexAreaOptions.fill, colors: seriesData.map(s => s.color) },
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
      <CardContent sx={{ padding: '10px', paddingBottom: '2px !important' }}> 
        <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" mb={0.15}> 
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={700} mb={0.15} lineHeight={1.2}> 
          {value}
        </Typography>
        {/* Subtítulo/Porcentaje de Totalidad (debajo del valor principal) */}
        {valueSubtitle && (
          <Typography variant="caption" fontWeight="600" sx={{ fontSize: '0.7rem' }} display="block" mb={0.25}> 
            {valueSubtitle}
          </Typography>
        )}
      </CardContent>

      {/* Indicador de tendencia y variación (esquina superior derecha) */}
      {trendDirection && variationPercentage && (
        <Box sx={{ position: 'absolute', top: '10px', right: '10px', textAlign: 'right' }}>
          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
            <Avatar sx={{ bgcolor: trendDirection === 'up' ? 'success.light' : 'error.light', width: 18, height: 18 }}> 
              <TrendIcon width={12} color={trendIconColor} /> 
            </Avatar>
            <Typography variant="caption" fontWeight="600" sx={{ fontSize: '0.7rem' }}> 
              {variationPercentage}
            </Typography>
          </Stack>
          {/* Valor absoluto del período anterior, debajo de la variación */}
          {previousPeriodAbsoluteValue !== undefined && (
            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block', lineHeight: 1.2 }}>
              vs {previousPeriodAbsoluteValue} ant.
            </Typography>
          )}
        </Box>
      )}

      {seriesData && seriesData.length > 0 && seriesData[0].data.length > 0 && (
         <Box sx={{ marginTop: '4px', width: '100%' }}>
            <Chart options={chartOptions} series={seriesData} type="area" height="45px" width="100%" /> 
        </Box>
      )}
    </Card>
  );
};

// --- FIN: Nuevo componente SummaryStatCard ---

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
  const [filtroCalificacion, setFiltroCalificacion] = useState<string>(''); // Mantener como string para "todos", "1-3", "4-6", "7-10"
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('ultimos15dias'); // MODIFICADO: Filtro por defecto
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState<string>('');
  const [fechaFinFiltro, setFechaFinFiltro] = useState<string>('');
  const [filtroDocumento, setFiltroDocumento] = useState<string>('');
  const [valorInputDocumento, setValorInputDocumento] = useState<string>(''); // Estado para el valor inmediato del input

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
    labels: ['7-10', '4-6', '1-3'], // ACTUALIZADO
    datasets: [],
  });
  const [ventasPieChartOptions, setVentasPieChartOptions] = useState({});

  // Estados para el gráfico de pastel de Coordinador
  const [coordinadorPieChartData, setCoordinadorPieChartData] = useState<ChartDataState<PieChartDataset>>({
    labels: ['7-10', '4-6', '1-3'], // ACTUALIZADO
    datasets: [],
  });
  const [coordinadorPieChartOptions, setCoordinadorPieChartOptions] = useState({});

  // Estados para el gráfico de barras de Percepción por Grupo
  const [percepcionGrupoBarChartData, setPercepcionGrupoBarChartData] = useState<ChartDataState<LineChartDataset>>({
    labels: [],
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
      // Filtro por Documento, Nombre o RUC (MODIFICADO)
      if (filtroDocumento) {
        const terminoBusqueda = filtroDocumento.toLowerCase().trim();
        const nombreEncuesta = encuesta.nombres ? encuesta.nombres.toLowerCase().trim() : '';
        const documentoEncuesta = encuesta.documento ? encuesta.documento.toLowerCase().trim() : '';
        const rucEncuesta = encuesta.ruc ? encuesta.ruc.toLowerCase().trim() : '';

        if (!(
          nombreEncuesta.includes(terminoBusqueda) || 
          documentoEncuesta.includes(terminoBusqueda) || 
          rucEncuesta.includes(terminoBusqueda)
        )) {
          return false;
        }
      }

      if (filtroAsesor && (!encuesta.asesor || encuesta.asesor.toLowerCase() !== filtroAsesor.toLowerCase())) {
        return false;
      }
      if (filtroGrupo && (!encuesta.grupo || encuesta.grupo.toLowerCase() !== filtroGrupo.toLowerCase())) {
        return false;
      }
      // NUEVA LÓGICA PARA FILTRO DE CALIFICACIÓN NUMÉRICA
      if (filtroCalificacion && filtroCalificacion !== 'todos') {
        const calificacionNum = Number(encuesta.calificacion); // Asumir que encuesta.calificacion es o será un número
        if (isNaN(calificacionNum)) return false; // Si no es un número válido, no incluir

        switch (filtroCalificacion) {
          case '1-3': // Malo
            if (!(calificacionNum >= 1 && calificacionNum <= 3)) return false;
            break;
          case '4-6': // Regular
            if (!(calificacionNum >= 4 && calificacionNum <= 6)) return false;
            break;
          case '7-10': // Bueno
            if (!(calificacionNum >= 7 && calificacionNum <= 10)) return false;
            break;
          // Se podría añadir casos para números individuales si el select lo permite
          default:
            // Si filtroCalificacion es un número específico (ej. "7")
            const filtroNum = Number(filtroCalificacion);
            if (!isNaN(filtroNum)) {
              if (calificacionNum !== filtroNum) return false;
            } else {
              return true; // Si el filtro no es un rango conocido ni un número, no filtrar por calificación
            }
        }
      }
      
      // Lógica de filtro por periodo (timestamp)
      if (filtroPeriodo && filtroPeriodo !== 'todos' && filtroPeriodo !== '') {
        const hoy = new Date();
        let fechaInicioRango: Date | null = null;
        let fechaFinRango: Date | null = null;

        switch (filtroPeriodo) {
          case 'ultimos15dias':
            const hoyPara15 = new Date();
            const hace15Dias = new Date(hoyPara15);
            hace15Dias.setDate(hoyPara15.getDate() - 14); // -14 para incluir hoy como uno de los 15 días
            fechaInicioRango = getStartOfDay(hace15Dias);
            fechaFinRango = getEndOfDay(hoyPara15);
            break;
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
  }, [allEncuestas, filtroAsesor, filtroGrupo, filtroCalificacion, filtroPeriodo, fechaInicioFiltro, fechaFinFiltro, filtroDocumento]); // <-- CORRECTO: filtroDocumento SÍ afecta a encuestasFiltradas

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
  }, [allEncuestas, filtroAsesor, filtroGrupo, filtroCalificacion, filtroPeriodo, fechaInicioFiltro, fechaFinFiltro, filtroDocumento]); // <-- Añadir filtroDocumento a las dependencias

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
          case 'ultimos15dias':
            const hoyPara15 = new Date();
            const hace15Dias = new Date(hoyPara15);
            hace15Dias.setDate(hoyPara15.getDate() - 14); // -14 para incluir hoy como uno de los 15 días
            fechaInicioRango = getStartOfDay(hace15Dias);
            fechaFinRango = getEndOfDay(hoyPara15);
            break;
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
  }, [allEncuestas, filtroAsesor, filtroGrupo, filtroPeriodo, fechaInicioFiltro, fechaFinFiltro]); // <-- CORREGIDO: filtroDocumento NO debe estar aquí

  // Datos para las tarjetas de resumen
  const summaryDataForCards = useMemo(() => {
    // Obtener el rango del período anterior
    const { start: prevPeriodStart, end: prevPeriodEnd } = getPreviousPeriodRange(filtroPeriodo, fechaInicioFiltro, fechaFinFiltro);

    let encuestasDelPeriodoAnterior: EnvioEncuesta[] = [];
    if (prevPeriodStart && prevPeriodEnd) {
      encuestasDelPeriodoAnterior = allEncuestas.filter(encuesta => 
        encuesta.timestamp && isDateInRange(encuesta.timestamp, prevPeriodStart, prevPeriodEnd)
      );
    }

    // Total de encuestas sin filtro de tiempo
    const totalEncuestasSinFiltroTiempo = allEncuestas.length;

    // Contadores para el período actual (usando encuestasParaKPIsYPasteles)
    const currentData = {
      total: encuestasParaKPIsYPasteles.length,
      bueno: encuestasParaKPIsYPasteles.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 7 && calNum <= 10; }).length,
      malo: encuestasParaKPIsYPasteles.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 1 && calNum <= 3; }).length,
      regular: encuestasParaKPIsYPasteles.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 4 && calNum <= 6; }).length,
      calificadas: encuestasParaKPIsYPasteles.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && e.calificacion !== null && e.calificacion !== undefined && String(e.calificacion).trim() !== ''; }).length,
      confirmadas: encuestasParaKPIsYPasteles.filter(e => e.conformidad && e.conformidad.trim() !== '' && e.conformidad !== 'Pendiente').length,
    };

    // Contadores para el período anterior
    const previousData = {
      total: encuestasDelPeriodoAnterior.length,
      bueno: encuestasDelPeriodoAnterior.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 7 && calNum <= 10; }).length,
      malo: encuestasDelPeriodoAnterior.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 1 && calNum <= 3; }).length,
      regular: encuestasDelPeriodoAnterior.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 4 && calNum <= 6; }).length,
      calificadas: encuestasDelPeriodoAnterior.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && e.calificacion !== null && e.calificacion !== undefined && String(e.calificacion).trim() !== ''; }).length,
      confirmadas: encuestasDelPeriodoAnterior.filter(e => e.conformidad && e.conformidad.trim() !== '' && e.conformidad !== 'Pendiente').length,
    };

    const cardTypes: Array<{ type: 'Total' | 'Bueno' | 'Malo' | 'Regular' | 'Calificadas' | 'Confirmadas'; title: string; color: string; }> = [
      { type: 'Total', title: 'Encuestas Totales', color: '#5D87FF' },
      { type: 'Bueno', title: 'Calf. (7-10)', color: '#39B69A' },
      { type: 'Regular', title: 'Calf. (4-6)', color: '#FFAE1F' },
      { type: 'Malo', title: 'Calf. (1-3)', color: '#FA896B' },
      { type: 'Calificadas', title: 'Calificadas', color: '#7460EE' },
      { type: 'Confirmadas', title: 'Confirmadas', color: '#6A1B9A' },
    ];

    const miniChartDataPoints = 10;
    let valorActualEncuestasTotales = 0; // Para calcular porcentajes de otras tarjetas

    const results = cardTypes.map(cardConfig => {
      const currentValue = currentData[cardConfig.type.toLowerCase() as keyof typeof currentData];
      const previousValue = previousData[cardConfig.type.toLowerCase() as keyof typeof previousData];
      
      if (cardConfig.type === 'Total') {
        valorActualEncuestasTotales = currentValue;
      }

      let trendDirection: 'up' | 'down' | undefined = undefined;
      let percentageVariationString = '-';

      if (previousValue > 0) {
        const variation = ((currentValue - previousValue) / previousValue) * 100;
        percentageVariationString = variation.toFixed(1) + '%';
        if (variation > 0) trendDirection = 'up';
        else if (variation < 0) trendDirection = 'down';
      } else if (currentValue > 0) { // Si antes era 0 y ahora no, es un aumento infinito (o grande)
        percentageVariationString = '∞%'; // O podría ser 'N/A' o 100% si se prefiere
        trendDirection = 'up';
      } else {
        // Si ambos son 0, o previous es 0 y current es 0, no hay cambio o no se puede calcular.
        percentageVariationString = '0.0%';
      }
      if (currentValue === previousValue) { // Asegurar que si son iguales, no haya tendencia y sea 0%
          trendDirection = undefined;
          percentageVariationString = '0.0%';
      }

      // La serie para el minigráfico sigue siendo del período actual
      const seriesForMiniChart = generateDailySeriesData(encuestasParaKPIsYPasteles, cardConfig.type, miniChartDataPoints);
      // const trendForMiniChart = calculateTrendFromSeries(seriesForMiniChart); // Ya no usamos esta tendencia para el ícono principal

      let valueSubtitleString = '';
      if (cardConfig.type === 'Total') {
        if (totalEncuestasSinFiltroTiempo > 0) {
          valueSubtitleString = `${((currentValue / totalEncuestasSinFiltroTiempo) * 100).toFixed(1)}% del total`;
        } else {
          valueSubtitleString = '0.0% del total';
        }
      } else {
        if (valorActualEncuestasTotales > 0) {
          valueSubtitleString = `${((currentValue / valorActualEncuestasTotales) * 100).toFixed(1)}% de totales`;
        } else {
          valueSubtitleString = '0.0% de totales';
        }
      }

      return {
        title: cardConfig.title,
        value: currentValue,
        series: [{ name: cardConfig.title, data: seriesForMiniChart, color: cardConfig.color }],
        trendDirection: trendDirection, 
        variationPercentage: percentageVariationString, 
        previousPeriodAbsoluteValue: previousValue, // Pasar el valor absoluto del período anterior
        valueSubtitle: valueSubtitleString, // Usar el nuevo subtítulo calculado
      };
    });

    // Asegurarse de que valorActualEncuestasTotales se calcula primero o que el map se hace en dos pasadas si es necesario.
    // Para este caso, la dependencia es hacia adelante, así que un solo map debería funcionar si 'Total' es el primer elemento.
    // Si el orden de cardTypes cambia, esto podría necesitar un ajuste (ej. calcular 'Total' primero fuera del map).
    // Confirmando que 'Total' es el primer elemento en cardTypes, el enfoque actual es correcto.

    return results;

  }, [encuestasParaKPIsYPasteles, allEncuestas, filtroPeriodo, fechaInicioFiltro, fechaFinFiltro]); // Dependencias actualizadas

  // Top 7 Asesores por cantidad de calificaciones "Bueno"
  const topAsesoresPorBuenas = useMemo(() => {
    if (!encuestasParaKPIsYPasteles || encuestasParaKPIsYPasteles.length === 0) return [];

    const conteoPorAsesor: { [asesor: string]: { buenas: number, nombre: string } } = {};

    encuestasParaKPIsYPasteles.forEach(encuesta => {
      if (encuesta.asesor) {
        if (!conteoPorAsesor[encuesta.asesor]) {
          conteoPorAsesor[encuesta.asesor] = { buenas: 0, nombre: encuesta.asesor };
        }
        const calNum = Number(encuesta.calificacion);
        if (!isNaN(calNum) && calNum >= 7 && calNum <= 10) { // Rango 7-10
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
      const calNum = Number(encuesta.calificacion);
      if (encuesta.asesor && !isNaN(calNum)) { 
        if (!percepcionPorAsesor[encuesta.asesor]) {
          percepcionPorAsesor[encuesta.asesor] = { nombre: encuesta.asesor, totalPuntos: 0, maxPuntos: 0, percepcion: 0, calificadas: 0 };
        }

        let puntos = 0;
        if (calNum >= 7 && calNum <= 10) puntos = 3; // Bueno
        else if (calNum >= 4 && calNum <= 6) puntos = 2; // Regular
        else if (calNum >= 1 && calNum <= 3) puntos = 1; // Malo

        percepcionPorAsesor[encuesta.asesor].totalPuntos += puntos;
        percepcionPorAsesor[encuesta.asesor].maxPuntos += 3; // Max 3 puntos por encuesta calificada numéricamente
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

  // REEMPLAZAR calificacionesUnicas con opciones fijas para la nueva escala
  const opcionesFiltroCalificacion = [
    { value: 'todos', label: 'Todas las calificaciones' },
    { value: '7-10', label: 'Bueno (7-10)' },
    { value: '4-6', label: 'Regular (4-6)' },
    { value: '1-3', label: 'Malo (1-3)' },
    // Podríamos añadir opciones para cada número si se desea una granularidad mayor
    // { value: '10', label: '10' }, { value: '9', label: '9' }, ...
  ];

  // Efecto para procesar datos para el gráfico cuando las encuestas filtradas cambien
  useEffect(() => {
    // Usar las encuestas ya filtradas por periodo, asesor, grupo

    // Procesar datos para el gráfico de LÍNEAS (Tendencia de Calificaciones)
    // ESTE GRÁFICO DEBE USAR encuestasParaKPIsYPasteles para NO ser afectado por filtroDocumento
    if (!loading && encuestasParaKPIsYPasteles.length > 0) {
      const procesarDatosParaGraficoLineas = () => {
        const agrupadoPorFecha: { [fecha: string]: { '1-3': number, '4-6': number, '7-10': number } } = {};

        encuestasParaKPIsYPasteles.forEach(encuesta => { 
          const calNum = Number(encuesta.calificacion);
          if (encuesta.timestamp && !isNaN(calNum)) {
            const fecha = new Date(encuesta.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            if (!agrupadoPorFecha[fecha]) {
              agrupadoPorFecha[fecha] = { '1-3': 0, '4-6': 0, '7-10': 0 };
            }
            if (calNum >= 1 && calNum <= 3) agrupadoPorFecha[fecha]['1-3']++;
            else if (calNum >= 4 && calNum <= 6) agrupadoPorFecha[fecha]['4-6']++;
            else if (calNum >= 7 && calNum <= 10) agrupadoPorFecha[fecha]['7-10']++;
          }
        });

        const labelsOrdenados = Object.keys(agrupadoPorFecha).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('/');
            const [dayB, monthB, yearB] = b.split('/');
            return new Date(`${yearA}-${monthA}-${dayA}`).getTime() - new Date(`${yearB}-${monthB}-${dayB}`).getTime();
        });

        setChartData({
          labels: labelsOrdenados,
          datasets: [
            {
              label: 'Calf. (1-3)', // Malo
              data: labelsOrdenados.map(fecha => agrupadoPorFecha[fecha]['1-3']),
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              tension: 0.1,
            },
            {
              label: 'Calf. (4-6)', // Regular
              data: labelsOrdenados.map(fecha => agrupadoPorFecha[fecha]['4-6']),
              borderColor: 'rgba(255, 206, 86, 1)',
              backgroundColor: 'rgba(255, 206, 86, 0.2)',
              tension: 0.1,
            },
            {
              label: 'Calf. (7-10)', // Bueno
              data: labelsOrdenados.map(fecha => agrupadoPorFecha[fecha]['7-10']),
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
              position: 'top' as const,
            },
            title: {
              display: false,
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
            },
          },
        });
      };
      procesarDatosParaGraficoLineas();
    } else if (!loading && encuestasParaKPIsYPasteles.length === 0) { // <-- CAMBIO AQUÍ también para la condición de limpieza
        setChartData({ labels: [], datasets: [] });
    }

    // Procesar datos para el gráfico de pastel de VENTAS (ya usa encuestasParaKPIsYPasteles, correcto)
    if (!loading && encuestasParaKPIsYPasteles && encuestasParaKPIsYPasteles.length > 0) {
      const encuestasVentas = encuestasParaKPIsYPasteles.filter(
        (e: EnvioEncuesta) => e.tipo === 'Ventas (OT)' || e.tipo === 'Ventas (OC)'
      );

      if (encuestasVentas.length > 0) {
        const count1_3 = encuestasVentas.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 1 && calNum <= 3; }).length;
        const count4_6 = encuestasVentas.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 4 && calNum <= 6; }).length;
        const count7_10 = encuestasVentas.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 7 && calNum <= 10; }).length;

        setVentasPieChartData({
          labels: ['7-10 (Bueno)', '4-6 (Regular)', '1-3 (Malo)'],
          datasets: [
            {
              label: 'Calificaciones Ventas',
              data: [count7_10, count4_6, count1_3],
              backgroundColor: [
                'rgba(75, 192, 192, 0.7)', // 7-10 (Bueno)
                'rgba(255, 206, 86, 0.7)', // 4-6 (Regular)
                'rgba(255, 99, 132, 0.7)',  // 1-3 (Malo)
              ],
              borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(255, 99, 132, 1)',
              ],
              borderWidth: 1,
            } as PieChartDataset, 
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
        setVentasPieChartData({ labels: ['7-10 (Bueno)', '4-6 (Regular)', '1-3 (Malo)'], datasets: [] });
      }

      // Procesar datos para el gráfico de pastel de COORDINADOR
      const encuestasCoordinador = encuestasParaKPIsYPasteles.filter(
        (e: EnvioEncuesta) => e.tipo === 'Coordinador (Conformidad)'
      );

      if (encuestasCoordinador.length > 0) {
        const count1_3_coord = encuestasCoordinador.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 1 && calNum <= 3; }).length;
        const count4_6_coord = encuestasCoordinador.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 4 && calNum <= 6; }).length;
        const count7_10_coord = encuestasCoordinador.filter(e => { const calNum = Number(e.calificacion); return !isNaN(calNum) && calNum >= 7 && calNum <= 10; }).length;

        setCoordinadorPieChartData({
          labels: ['7-10 (Bueno)', '4-6 (Regular)', '1-3 (Malo)'],
          datasets: [
            {
              label: 'Calificaciones Coordinador',
              data: [count7_10_coord, count4_6_coord, count1_3_coord],
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
            } as PieChartDataset, 
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
        setCoordinadorPieChartData({ labels: ['7-10 (Bueno)', '4-6 (Regular)', '1-3 (Malo)'], datasets: [] });
      }
    } else if (!loading) {
        setVentasPieChartData({ labels: ['7-10 (Bueno)', '4-6 (Regular)', '1-3 (Malo)'], datasets: [] });
        setCoordinadorPieChartData({ labels: ['7-10 (Bueno)', '4-6 (Regular)', '1-3 (Malo)'], datasets: [] });
        setPercepcionGrupoBarChartData({ labels: [], datasets: [] }); 
    }

    // Procesar datos para el gráfico de barras de PERCEPCIÓN POR GRUPO
    if (!loading && encuestasParaKPIsYPasteles && encuestasParaKPIsYPasteles.length > 0) {
      const percepcionPorGrupo: { [grupo: string]: { totalPuntos: number; maxPuntos: number, count: number } } = {};

      encuestasParaKPIsYPasteles.forEach((encuesta: EnvioEncuesta) => {
        const calNum = Number(encuesta.calificacion);
        if (encuesta.grupo && !isNaN(calNum)) { 
          if (!percepcionPorGrupo[encuesta.grupo]) {
            percepcionPorGrupo[encuesta.grupo] = { totalPuntos: 0, maxPuntos: 0, count: 0 };
          }

          let puntos = 0;
          if (calNum >= 7 && calNum <= 10) puntos = 3;       // Bueno: 3 puntos
          else if (calNum >= 4 && calNum <= 6) puntos = 2;  // Regular: 2 puntos
          else if (calNum >= 1 && calNum <= 3) puntos = 1;  // Malo: 1 punto

          percepcionPorGrupo[encuesta.grupo].totalPuntos += puntos;
          percepcionPorGrupo[encuesta.grupo].maxPuntos += 3; // Máximo 3 puntos por encuesta
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

  }, [loading, encuestasParaKPIsYPasteles, setChartData, setChartOptions, setVentasPieChartData, setVentasPieChartOptions, setCoordinadorPieChartData, setCoordinadorPieChartOptions, setPercepcionGrupoBarChartData, setPercepcionGrupoBarChartOptions]); // Añadidas todas las funciones de estado de los gráficos como dependencias

  // Efecto para debounce del filtro de documento
  useEffect(() => {
    const timerId = setTimeout(() => {
      setFiltroDocumento(valorInputDocumento);
    }, 500); // 500ms de debounce, puedes ajustarlo

    return () => {
      clearTimeout(timerId);
    };
  }, [valorInputDocumento, setFiltroDocumento]); // Añadido setFiltroDocumento como dependencia

  if (loading && !allEncuestas.length) {
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
    <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3, md: 4 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h1" color="text.primary" fontWeight={600}>
          Registro de Calificaciones
        </Typography>
        <TextField 
          variant="outlined"
          size="small"
          placeholder="Buscar por documento..."
          value={valorInputDocumento} // Usar el estado del valor inmediato del input
          onChange={(e) => setValorInputDocumento(e.target.value)} // Actualizar el valor inmediato del input
          sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 250 } }} // Ancho responsivo
          InputProps={{
            endAdornment: (
              valorInputDocumento && ( // Mostrar la X basado en valorInputDocumento
                <IconButton
                  aria-label="limpiar búsqueda"
                  onClick={() => {
                    setValorInputDocumento('');
                    // setFiltroDocumento(''); // Opcional: limpiar filtro inmediatamente o dejar que el debounce lo haga
                  }}
                  edge="end"
                  size="small"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )
            )
          }}
        />
      </Box>
      
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
                    <span className={`font-semibold ml-1 ${
                      (() => {
                        const calNum = Number(detalleSeleccionado.calificacion);
                        if (isNaN(calNum)) return 'text-gray-600';
                        if (calNum >= 7 && calNum <= 10) return 'text-green-600';
                        if (calNum >= 4 && calNum <= 6) return 'text-yellow-600';
                        if (calNum >= 1 && calNum <= 3) return 'text-red-600';
                        return 'text-gray-600';
                      })()
                    }`}>
                      {detalleSeleccionado.calificacion ? Number(detalleSeleccionado.calificacion).toString() : 'N/D'}
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
      
      {/* NUEVA SECCIÓN DE TARJETAS DE RESUMEN con MUI y ApexCharts */}
      <Grid
        container
        spacing={1} // Mantenemos el spacing reducido
        // wrap="wrap" // wrap es el comportamiento por defecto, no es estrictamente necesario
        // justifyContent="space-between" // Podría ser útil si sobra espacio, pero con flexBasis debería ser exacto
        mb={4}
      >
        {summaryDataForCards.map((cardData, index) => (
          // @ts-ignore 
          <Grid
            item
            key={index}
            xs={12}  // 1 tarjeta por fila en extra-small
            sm={6}   // 2 tarjetas por fila en small (50%)
            md={2}   // Esto se anulará por el sx de abajo, pero es bueno tenerlo para claridad
            sx={{
              flexGrow: 1, // Permitir que crezca si hay espacio (aunque maxWidth lo limita)
              flexShrink: 0, // No permitir que se encoja más de su flexBasis
              flexBasis: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(16.6667% - 8px)' }, // 8px es aprox el spacing (1 * 8px)
              maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(16.6667% - 8px)' },
              // Ajuste para el espaciado: el spacing={1} añade 4px de padding a cada lado del item.
              // Para que 6 items con spacing 1 ocupen el 100%, cada uno debe ser un poco menos de 16.6667%
              // Alternativamente, el contenedor Grid podría tener márgenes negativos para compensar, lo cual MUI hace por defecto.
              // La solución más simple si `md={2}` y `spacing={1}` no funcionan es ajustar el `flexBasis` y `maxWidth` como arriba.
            }}
          >
            <SummaryStatCard
              title={cardData.title} 
              value={cardData.value} 
              seriesData={cardData.series}
              trendDirection={cardData.trendDirection as 'up' | 'down' | undefined}
              variationPercentage={cardData.variationPercentage}
              previousPeriodAbsoluteValue={cardData.previousPeriodAbsoluteValue} // Usar la nueva prop
              valueSubtitle={cardData.valueSubtitle}
            />
          </Grid>
        ))}
      </Grid>
      
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
            {opcionesFiltroCalificacion.map(opcion => (
              <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
            ))}
          </select>
          
          <div className="flex-1 min-w-[150px] flex flex-col">
            <select 
              className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
              onChange={manejarCambioFiltroFechas}
              value={filtroPeriodo} // Asegurarse que el valor del select está controlado
            >
              <option value="">Todos los periodos</option>
              <option value="ultimos15dias">Últimos 15 días</option> {/* AÑADIDO */}
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
                        (() => {
                          const calNum = Number(item.calificacion);
                          if (isNaN(calNum)) return 'bg-gray-100 text-gray-800';
                          if (calNum >= 7 && calNum <= 10) return 'bg-green-100 text-green-800';
                          if (calNum >= 4 && calNum <= 6) return 'bg-yellow-100 text-yellow-800';
                          if (calNum >= 1 && calNum <= 3) return 'bg-red-100 text-red-800';
                          return 'bg-gray-100 text-gray-800';
                        })()
                      }`}>
                        {item.calificacion ? Number(item.calificacion).toString() : 'N/D'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800">{item.tipo || 'N/A'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                        {item.observaciones && item.observaciones.trim() !== '' && (
                          <ChatBubbleOutlineOutlinedIcon 
                            sx={{ 
                              color: '#ef4444', // Rojo similar a text-red-600 de Tailwind
                              fontSize: '1rem'  // Tamaño pequeño, ajustar si es necesario
                            }}
                          />
                        )}
                        <button
                          onClick={() => abrirModalDetalles(item.idcalificacion)}
                          className="inline-flex items-center justify-center p-1 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                          aria-label="Ver detalles"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </Box>
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
    </Container>
  );
} 

// Nueva función auxiliar para generar datos de series diarias para los minigráficos
const generateDailySeriesData = (
  encuestas: EnvioEncuesta[],
  type: 'Total' | 'Bueno' | 'Malo' | 'Regular' | 'Calificadas' | 'Confirmadas', // Tipos existentes, la lógica interna se adapta
  numPoints: number = 10 
): number[] => {
  if (!encuestas || encuestas.length === 0) {
    return Array(numPoints).fill(0);
  }

  const dailyCounts: { [dateKey: string]: number } = {};

  encuestas.forEach(encuesta => {
    if (!encuesta.timestamp) return;

    let matchesCriteria = false;
    const calNum = Number(encuesta.calificacion); // Convertir a número aquí

    switch (type) {
      case 'Total': matchesCriteria = true; break;
      case 'Bueno': // Corresponde a 7-10
        matchesCriteria = !isNaN(calNum) && calNum >= 7 && calNum <= 10;
        break;
      case 'Malo': // Corresponde a 1-3
        matchesCriteria = !isNaN(calNum) && calNum >= 1 && calNum <= 3;
        break;
      case 'Regular': // Corresponde a 4-6
        matchesCriteria = !isNaN(calNum) && calNum >= 4 && calNum <= 6;
        break;
      case 'Calificadas': 
        matchesCriteria = !isNaN(calNum) && encuesta.calificacion !== null && encuesta.calificacion !== undefined && String(encuesta.calificacion).trim() !== '';
        break;
      case 'Confirmadas': 
        matchesCriteria = !!(encuesta.conformidad && encuesta.conformidad.trim() !== '' && encuesta.conformidad !== 'Pendiente'); 
        break;
    }

    if (matchesCriteria) {
      const dateKey = new Date(encuesta.timestamp).toISOString().split('T')[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    }
  });

  const sortedDateKeys = Object.keys(dailyCounts).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  const series = sortedDateKeys.map(key => dailyCounts[key]); // Usar 'key' o 'dateKey' como parámetro del map

  if (series.length >= numPoints) {
    return series.slice(-numPoints);
  } else if (series.length > 0) {
    return Array(numPoints - series.length).fill(0).concat(series);
  }
  
  return Array(numPoints).fill(0);
};

// Nueva función auxiliar para calcular tendencia desde una serie de datos
const calculateTrendFromSeries = (seriesData: number[]): { direction?: 'up' | 'down'; percentage?: string } => {
  if (!seriesData || seriesData.length < 2) {
    return { direction: undefined, percentage: undefined };
  }

  const firstPoint = seriesData[0];
  const lastPoint = seriesData[seriesData.length - 1];

  let trendDirection: 'up' | 'down' | undefined = undefined;
  if (lastPoint > firstPoint) {
    trendDirection = 'up';
  } else if (lastPoint < firstPoint) {
    trendDirection = 'down';
  }

  let trendPercentage: string | undefined = undefined;
  if (firstPoint !== 0) {
    const change = ((lastPoint - firstPoint) / firstPoint) * 100;
    trendPercentage = `${Math.abs(change).toFixed(1)}%`;
  } else if (lastPoint > 0) {
    trendPercentage = '∞%';
  } else {
    trendPercentage = '0.0%';
  }
  
  if (firstPoint === lastPoint) {
    trendPercentage = '0.0%';
    trendDirection = undefined;
  }

  return { direction: trendDirection, percentage: trendPercentage };
};

// CORREGIDA: Nueva función para obtener el rango del período anterior
const getPreviousPeriodRange = (
  currentPeriod: string,
  currentStartDateFromFilter?: string,
  currentEndDateFromFilter?: string
): { start?: Date; end?: Date } => {
  const hoy = new Date();
  let startCurrent: Date;
  let endCurrent: Date;

  // 1. Determinar las fechas de inicio y fin del PERÍODO ACTUAL
  switch (currentPeriod) {
    case 'ultimos15dias':
      endCurrent = getEndOfDay(hoy);
      startCurrent = getStartOfDay(new Date(new Date().setDate(hoy.getDate() - 14)));
      break;
    case 'hoy':
      startCurrent = getStartOfDay(hoy);
      endCurrent = getEndOfDay(hoy);
      break;
    case 'ayer':
      const ayer = new Date(new Date().setDate(hoy.getDate() - 1));
      startCurrent = getStartOfDay(ayer);
      endCurrent = getEndOfDay(ayer);
      break;
    case 'semana':
      startCurrent = getStartOfWeek(hoy);
      endCurrent = getEndOfWeek(hoy);
      break;
    case 'mes':
      startCurrent = getStartOfMonth(hoy);
      endCurrent = getEndOfMonth(hoy);
      break;
    case 'mes-1': // Último mes completo
      const firstDayThisMonthForMes1 = getStartOfMonth(hoy);
      endCurrent = getEndOfDay(new Date(new Date(firstDayThisMonthForMes1).setDate(0))); // Fin del mes pasado
      startCurrent = getStartOfMonth(endCurrent); // Inicio del mes pasado
      break;
    case 'mes-3': // Últimos 3 meses completos, terminando el mes pasado
      const firstDayThisMonthForMes3 = getStartOfMonth(hoy);
      const lastDayLastMonthForMes3 = getEndOfDay(new Date(new Date(firstDayThisMonthForMes3).setDate(0)));
      endCurrent = lastDayLastMonthForMes3;
      startCurrent = getStartOfMonth(new Date(lastDayLastMonthForMes3.getFullYear(), lastDayLastMonthForMes3.getMonth() - 2, 1));
      break;
    case 'mes-6': // Últimos 6 meses completos, terminando el mes pasado
      const firstDayThisMonthForMes6 = getStartOfMonth(hoy);
      const lastDayLastMonthForMes6 = getEndOfDay(new Date(new Date(firstDayThisMonthForMes6).setDate(0)));
      endCurrent = lastDayLastMonthForMes6;
      startCurrent = getStartOfMonth(new Date(lastDayLastMonthForMes6.getFullYear(), lastDayLastMonthForMes6.getMonth() - 5, 1));
      break;
    case 'año': // Año actual en curso
      startCurrent = getStartOfDay(new Date(hoy.getFullYear(), 0, 1));
      endCurrent = getEndOfDay(new Date(hoy.getFullYear(), 11, 31));
      break;
    case 'personalizado':
      if (!currentStartDateFromFilter || !currentEndDateFromFilter) {
        // console.warn("Rango personalizado actual incompleto para getPreviousPeriodRange.");
        return {}; // Necesita ambas fechas para el periodo actual
      }
      const parsedStart = new Date(currentStartDateFromFilter);
      const parsedEnd = new Date(currentEndDateFromFilter);
      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        // console.warn("Fechas personalizadas actuales inválidas para getPreviousPeriodRange.");
        return {};
      }
      startCurrent = getStartOfDay(parsedStart);
      endCurrent = getEndOfDay(parsedEnd);
      break;
    default:
      // Si currentPeriod es "" (Todos los periodos) o desconocido, no podemos calcular el anterior.
      // console.warn(\`Período actual desconocido o no aplicable para getPreviousPeriodRange: \'\${currentPeriod}\'\`);
      return {};
  }

  // Si llegamos aquí, startCurrent y endCurrent DEBEN estar definidos y ser válidos.

  // 2. Calcular las fechas de inicio y fin del PERÍODO ANTERIOR
  let startPrevious: Date;
  let endPrevious: Date;

  // Calcular la duración en días del período actual.
  // Se suma 1 porque, por ejemplo, de Lunes 00:00 a Lunes 23:59 es 1 día.
  // getTime() da milisegundos. (end - start) / ms_por_dia.
  const durationMs = endCurrent.getTime() - startCurrent.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24)) + 1;


  if (currentPeriod === 'mes' || currentPeriod === 'mes-1') {
    const firstDayOfCurrentReferencedMonth = startCurrent;
    endPrevious = getEndOfDay(new Date(new Date(firstDayOfCurrentReferencedMonth).setDate(0)));
    startPrevious = getStartOfMonth(endPrevious);
  } else if (currentPeriod === 'mes-3') {
    endPrevious = getEndOfDay(new Date(new Date(startCurrent).setDate(0)));
    startPrevious = getStartOfMonth(new Date(new Date(endPrevious).setMonth(endPrevious.getMonth() - 2)));
  } else if (currentPeriod === 'mes-6') {
    endPrevious = getEndOfDay(new Date(new Date(startCurrent).setDate(0)));
    startPrevious = getStartOfMonth(new Date(new Date(endPrevious).setMonth(endPrevious.getMonth() - 5)));
  } else if (currentPeriod === 'año') {
    // Si el período actual es el año en curso, el anterior es el año pasado completo.
    startPrevious = getStartOfDay(new Date(startCurrent.getFullYear() - 1, 0, 1));
    endPrevious = getEndOfDay(new Date(startCurrent.getFullYear() - 1, 11, 31));
  } else if ( // Estos son los casos que dependen de la duración exacta
    currentPeriod === 'ultimos15dias' ||
    currentPeriod === 'hoy' ||
    currentPeriod === 'ayer' ||
    currentPeriod === 'semana' ||
    currentPeriod === 'personalizado'
  ) {
    // El período anterior termina el día antes de que comience el período actual.
    endPrevious = getEndOfDay(new Date(new Date(startCurrent).setDate(startCurrent.getDate() - 1)));
    // El período anterior comienza 'durationDays' antes (contando endPrevious).
    startPrevious = getStartOfDay(new Date(new Date(endPrevious).setDate(endPrevious.getDate() - (durationDays - 1))));
  } else {
    // Esta rama teóricamente no debería alcanzarse si el switch de arriba es exhaustivo
    // y todos los valores de currentPeriod válidos están cubiertos en los if/else if anteriores.
    // Pero para satisfacer a TypeScript y como salvaguarda:
    // console.error(\`Lógica para calcular período anterior no implementada para: \'\${currentPeriod}\'\`);
    return {}; // Asegura que no se intente usar startPrevious/endPrevious sin asignar.
  }

  // Verificación final de que las fechas calculadas son válidas
  if (startPrevious === undefined || endPrevious === undefined || isNaN(startPrevious.getTime()) || isNaN(endPrevious.getTime())) {
    // console.error("Cálculo de período anterior resultó en fechas inválidas para:", currentPeriod, startPrevious, endPrevious);
    return {};
  }

  return { start: startPrevious, end: endPrevious };
};