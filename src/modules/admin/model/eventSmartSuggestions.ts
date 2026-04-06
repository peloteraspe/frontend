export type SmartSuggestion = {
  category: 'timing' | 'pricing' | 'capacity' | 'field' ;
  suggestion: string;
  emoji: string;
  hint: string;
};

type LocationPriceRange = {
  min: number;
  max: number;
  avg: number;
};

const priceRangesByDistrict: Record<string, LocationPriceRange> = {
  'Miraflores': { min: 35, max: 55, avg: 45 },
  'San Isidro': { min: 40, max: 60, avg: 50 },
  'Surco': { min: 35, max: 50, avg: 42 },
  'Barranco': { min: 30, max: 45, avg: 37 },
  'Centro': { min: 25, max: 40, avg: 32 },
  'Los Olivos': { min: 25, max: 35, avg: 30 },
  'San Martín': { min: 25, max: 35, avg: 30 },
  'Breña': { min: 20, max: 35, avg: 27 },
};

const popularTimings: Record<string, { day: string; hour: number }[]> = {
  'weekday': [
    { day: 'Lunes a Viernes', hour: 19 },
    { day: 'Lunes a Viernes', hour: 20 },
  ],
  'weekend': [
    { day: 'Sábado', hour: 9 },
    { day: 'Sábado', hour: 10 },
    { day: 'Domingo', hour: 9 },
    { day: 'Domingo', hour: 10 },
  ],
};

const recommendedCapacities = [8, 10, 12, 14, 16, 18, 20];

export function getSuggestionsForEvent(options: {
  district?: string;
  startTime?: string;
  price?: number;
  maxUsers?: number;
  title?: string;
}): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  if (options.district && !options.price) {
    const range = priceRangesByDistrict[options.district];
    if (range) {
      suggestions.push({
        category: 'pricing',
        emoji: '💰',
        suggestion: `Precio sugerido para ${options.district}: S/ ${range.avg}`,
        hint: `Rango: S/ ${range.min} - S/ ${range.max} por jugadora`,
      });
    }
  }

  if (options.startTime) {
    const startDate = new Date(options.startTime);
    const hour = startDate.getHours();
    const isWeekend = startDate.getDay() === 0 || startDate.getDay() === 6;
    
    if (isWeekend && hour < 10) {
      suggestions.push({
        category: 'timing',
        emoji: '🌅',
        suggestion: 'Las mañanas de fin de semana son muy populares',
        hint: '¡Muchas jugadoras disponibles a esta hora!',
      });
    } else if (!isWeekend && (hour === 19 || hour === 20)) {
      suggestions.push({
        category: 'timing',
        emoji: '⚽',
        suggestion: `${hour}:00 es horario pico entre semana`,
        hint: 'Excelente opción para atraer participantes',
      });
    }
  }

  if (!options.maxUsers) {
    suggestions.push({
      category: 'capacity',
      emoji: '👥',
      suggestion: 'Recomendamos 10-14 jugadoras para un buen partido',
      hint: 'Capacidad ideal para pichangas en cancha de 5',
    });
  } else if (!recommendedCapacities.includes(options.maxUsers)) {
    const nearest = recommendedCapacities.reduce((prev, curr) =>
      Math.abs(curr - options.maxUsers!) < Math.abs(prev - options.maxUsers!) ? curr : prev
    );
    suggestions.push({
      category: 'capacity',
      emoji: '👥',
      suggestion: `¿Considerarías ${nearest} jugadoras?`,
      hint: `${nearest} es una capacidad común en eventos exitosos`,
    });
  }

  if (!options.title?.toLowerCase().includes('reserv')) {
    suggestions.push({
      category: 'field',
      emoji: '🏟️',
      suggestion: '¡Asegúrate de tener la cancha reservada!',
      hint: 'Confirma la reserva antes de publicar',
    });
  }

  return suggestions;
}

export function getPricingSuggestion(district?: string): string | null {
  if (!district) return null;
  const range = priceRangesByDistrict[district];
  return range ? `S/ ${range.avg}` : null;
}

export function getTimingSuggestion(): { hour: number; day: string } {
  const suggestions = popularTimings.weekday;
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

export function getCapacitySuggestion(): number {
  return recommendedCapacities[Math.floor(Math.random() * recommendedCapacities.length)];
}
