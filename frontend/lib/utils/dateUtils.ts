/**
 * Obtiene el inicio del día para una fecha dada.
 * @param date - La fecha (puede ser Date object, string ISO, o número timestamp)
 * @returns Date object representando el inicio del día (00:00:00)
 */
export const getStartOfDay = (date: Date | string | number): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Obtiene el final del día para una fecha dada.
 * @param date - La fecha
 * @returns Date object representando el final del día (23:59:59.999)
 */
export const getEndOfDay = (date: Date | string | number): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Obtiene el inicio de la semana (Lunes) para una fecha dada.
 * @param date - La fecha
 * @returns Date object representando el inicio de la semana (Lunes 00:00:00)
 */
export const getStartOfWeek = (date: Date | string | number): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que Lunes sea el primer día
  const startOfWeek = new Date(d.setDate(diff));
  return getStartOfDay(startOfWeek);
};

/**
 * Obtiene el final de la semana (Domingo) para una fecha dada.
 * @param date - La fecha
 * @returns Date object representando el final de la semana (Domingo 23:59:59.999)
 */
export const getEndOfWeek = (date: Date | string | number): Date => {
  const start = getStartOfWeek(date);
  const endOfWeek = new Date(start);
  endOfWeek.setDate(start.getDate() + 6);
  return getEndOfDay(endOfWeek);
};

/**
 * Obtiene el inicio del mes para una fecha dada.
 * @param date - La fecha
 * @returns Date object representando el inicio del mes (día 1, 00:00:00)
 */
export const getStartOfMonth = (date: Date | string | number): Date => {
  const d = new Date(date);
  const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  return getStartOfDay(startOfMonth);
};

/**
 * Obtiene el final del mes para una fecha dada.
 * @param date - La fecha
 * @returns Date object representando el final del mes (último día, 23:59:59.999)
 */
export const getEndOfMonth = (date: Date | string | number): Date => {
  const d = new Date(date);
  const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0); // Día 0 del siguiente mes es el último del actual
  return getEndOfDay(endOfMonth);
};

/**
 * Comprueba si una fecha está dentro de un rango (inclusivo).
 * @param dateToCheck - La fecha a comprobar (string ISO o Date object)
 * @param startDate - Fecha de inicio del rango (Date object)
 * @param endDate - Fecha de fin del rango (Date object)
 * @returns boolean
 */
export const isDateInRange = (dateToCheck: string | Date, startDate: Date, endDate: Date): boolean => {
  const d = new Date(dateToCheck);
  return d >= startDate && d <= endDate;
}; 