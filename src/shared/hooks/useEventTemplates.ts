'use client';

import { useEffect, useState } from 'react';

export type EventTemplate = {
  id: string;
  title: string;
  eventTypeId: number;
  levelId: number;
  locationText: string;
  district: string;
  lat: number;
  lng: number;
  price: number;
  minUsers: number;
  maxUsers: number;
  description?: string;
  dayOfWeek?: number;
  timeOfDay?: string;
  usageCount: number;
};

export function useEventTemplates(userId?: string) {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState< string | null>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/events/templates?userId=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load templates');
        return res.json();
      })
      .then((data) => {
        const templatesData = Array.isArray(data) ? data : data.templates || [];
        setTemplates(templatesData);
      })
      .catch((err) => {
        setError(err.message);
        console.error('Error loading event templates:', err);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const useTemplate = (template: EventTemplate) => {
    return {
      title: template.title,
      description: template.description,
      eventTypeId: template.eventTypeId,
      levelId: template.levelId,
      locationText: template.locationText,
      district: template.district,
      lat: template.lat,
      lng: template.lng,
      price: template.price,
      minUsers: template.minUsers,
      maxUsers: template.maxUsers,
    };
  };

  const getMostUsedTemplate = (): EventTemplate | null => {
    if (templates.length === 0) return null;
    return templates.reduce((prev, current) =>
      current.usageCount > prev.usageCount ? current : prev
    );
  };

  const getTemplatesByLocation = (district: string): EventTemplate[] => {
    return templates.filter((t) => t.district === district);
  };

  return {
    templates,
    loading,
    error,
    useTemplate,
    getMostUsedTemplate,
    getTemplatesByLocation,
  };
}
