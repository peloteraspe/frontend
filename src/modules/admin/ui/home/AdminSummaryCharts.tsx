'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TrendPoint = { label: string; value: number };
type BreakdownPoint = { name: string; value: number };
type Tone = 'neutral' | 'positive' | 'warning';

export type AdminSummaryChartsData = {
  events: {
    total: number;
    upcoming: number;
    finished: number;
    trend: TrendPoint[];
    levelDistribution: BreakdownPoint[];
  };
  payments: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    trend: TrendPoint[];
    stateDistribution: BreakdownPoint[];
  };
  paymentMethods: {
    total: number;
    active: number;
    inactive: number;
    typeDistribution: BreakdownPoint[];
    statusDistribution: BreakdownPoint[];
  };
  createEventFunnel?: {
    entryViews: number;
    activationCompleted: number;
    paymentSetupViews: number;
    paymentMethodSaved: number;
    draftStarts: number;
    draftCreated: number;
    publishAttempts: number;
    publishBlocked: number;
    publishSucceeded: number;
    funnelStages: BreakdownPoint[];
    blockerDistribution: BreakdownPoint[];
    stepViewDistribution: BreakdownPoint[];
  };
  users?: {
    total: number;
    complete: number;
    incomplete: number;
    trend: TrendPoint[];
    completionDistribution: BreakdownPoint[];
  };
};

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-white',
  positive: 'border-emerald-200 bg-emerald-50/60',
  warning: 'border-amber-200 bg-amber-50/70',
};

const BAR_COLORS = ['bg-mulberry', 'bg-[#F0815B]', 'bg-teal-600', 'bg-[#A68CB1]'];

function hasData(values: Array<{ value: number }>) {
  return values.some((item) => Number(item.value) > 0);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-28 items-center justify-center rounded-xl bg-slate-50 px-4 text-center">
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      <div className="mt-4 h-[220px] w-full">{children}</div>
    </article>
  );
}

function LineChartBlock({ data }: { data: TrendPoint[] }) {
  if (!hasData(data)) return <EmptyState label="Aún no hay movimiento en este periodo." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#54086F"
          strokeWidth={3}
          dot={{ r: 3, fill: '#54086F' }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarChartBlock({ data }: { data: BreakdownPoint[] }) {
  if (!hasData(data)) return <EmptyState label="No hay datos suficientes para este gráfico." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Bar dataKey="value" fill="#F0815B" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DashboardKpi({
  label,
  value,
  helper,
  href,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  helper: string;
  href: string;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-mulberry/30 hover:shadow-sm ${TONE_CLASSES[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span aria-hidden="true" className="text-sm text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-mulberry">
          →
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </Link>
  );
}

function DistributionList({
  data,
  emptyLabel = 'Aún no hay datos para mostrar.',
}: {
  data: BreakdownPoint[];
  emptyLabel?: string;
}) {
  const visibleData = data.filter((item) => item.value > 0);
  const total = visibleData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {visibleData.map((item, index) => {
        const percentage = Math.round((item.value / total) * 100);

        return (
          <div key={item.name}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-slate-600">{item.name}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {item.value} · {percentage}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                style={{ width: `${Math.max(percentage, 3)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModuleSummaryCard({
  title,
  description,
  href,
  stats,
  distributionTitle,
  distribution,
}: {
  title: string;
  description: string;
  href: string;
  stats: Array<{ label: string; value: number }>;
  distributionTitle: string;
  distribution: BreakdownPoint[];
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <Link href={href} className="shrink-0 text-xs font-semibold text-mulberry hover:underline">
          Abrir
        </Link>
      </div>

      <div className="my-5 grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{distributionTitle}</p>
      <DistributionList data={distribution} />
    </article>
  );
}

function AttentionItem({
  title,
  description,
  href,
  tone = 'warning',
}: {
  title: string;
  description: string;
  href: string;
  tone?: 'warning' | 'critical';
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-mulberry/25 hover:shadow-sm"
    >
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <span aria-hidden="true" className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-mulberry">
        →
      </span>
    </Link>
  );
}

function FunnelAnalytics({ data }: { data: NonNullable<AdminSummaryChartsData['createEventFunnel']> }) {
  const [expanded, setExpanded] = useState(false);
  const conversion = data.entryViews > 0 ? Math.round((data.publishSucceeded / data.entryViews) * 100) : 0;
  const detailedStats = [
    { label: 'Entradas', value: data.entryViews },
    { label: 'Activaciones', value: data.activationCompleted },
    { label: 'Vistas de pagos', value: data.paymentSetupViews },
    { label: 'Métodos guardados', value: data.paymentMethodSaved },
    { label: 'Borradores iniciados', value: data.draftStarts },
    { label: 'Borradores creados', value: data.draftCreated },
    { label: 'Intentos de publicar', value: data.publishAttempts },
    { label: 'Bloqueos', value: data.publishBlocked },
    { label: 'Publicados', value: data.publishSucceeded },
  ];

  return (
    <section aria-labelledby="funnel-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="funnel-title" className="text-lg font-semibold text-slate-950">
              Analítica de creación
            </h2>
            <span className="rounded-full bg-mulberry/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mulberry">
              Superadmin
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Conversión del flujo para crear y publicar un evento.</p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex h-9 w-fit items-center justify-center rounded-full border border-slate-300 px-4 text-xs font-semibold text-slate-700 transition hover:border-mulberry hover:text-mulberry"
        >
          {expanded ? 'Ocultar detalle' : 'Ver detalle analítico'}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-xs text-slate-500">Eventos publicados</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{data.publishSucceeded}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-3">
          <p className="text-xs text-emerald-700">Conversión entrada → publicación</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-800">{conversion}%</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-3">
          <p className="text-xs text-amber-700">Bloqueos al publicar</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800">{data.publishBlocked}</p>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {detailedStats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-200 px-3 py-2.5">
                <p className="text-[11px] text-slate-500">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard title="Etapas del flujo">
              <BarChartBlock data={data.funnelStages} />
            </ChartCard>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">Bloqueos más frecuentes</h3>
              <div className="mt-5">
                <DistributionList data={data.blockerDistribution} emptyLabel="No se registraron bloqueos." />
              </div>
            </article>
            <ChartCard title="Pasos más visitados">
              <BarChartBlock data={data.stepViewDistribution} />
            </ChartCard>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function AdminSummaryCharts({ data }: { data: AdminSummaryChartsData }) {
  const attentionItems: Array<{
    title: string;
    description: string;
    href: string;
    tone?: 'warning' | 'critical';
  }> = [];

  if (data.payments.pending > 0) {
    attentionItems.push({
      title: `${data.payments.pending} ${data.payments.pending === 1 ? 'pago pendiente' : 'pagos pendientes'}`,
      description: 'Revisa la evidencia y actualiza su estado.',
      href: '/admin/payments?state=pending',
    });
  }

  if (data.paymentMethods.total === 0) {
    attentionItems.push({
      title: 'No hay formas de pago configuradas',
      description: 'Agrega una para poder recibir inscripciones.',
      href: '/admin/payment-methods',
      tone: 'critical',
    });
  } else if (data.paymentMethods.inactive > 0) {
    attentionItems.push({
      title: `${data.paymentMethods.inactive} ${data.paymentMethods.inactive === 1 ? 'forma de pago inactiva' : 'formas de pago inactivas'}`,
      description: 'Comprueba si deben volver a estar disponibles.',
      href: '/admin/payment-methods',
    });
  }

  if (data.users && data.users.incomplete > 0) {
    attentionItems.push({
      title: `${data.users.incomplete} ${data.users.incomplete === 1 ? 'perfil incompleto' : 'perfiles incompletos'}`,
      description: 'Revisa quiénes aún no terminan su registro.',
      href: '/admin/users',
    });
  }

  const fourthKpi = data.users
    ? {
        label: 'Perfiles incompletos',
        value: data.users.incomplete,
        helper: 'Aún no terminan su registro',
        href: '/admin/users',
        tone: data.users.incomplete > 0 ? ('warning' as const) : ('positive' as const),
      }
    : {
        label: 'Pagos aprobados',
        value: data.payments.approved,
        helper: 'Solicitudes confirmadas',
        href: '/admin/payments?state=approved',
        tone: 'positive' as const,
      };

  return (
    <div className="space-y-7 pb-8 sm:space-y-8">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mulberry">Panel operativo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Resumen</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Revisa lo que requiere atención y el estado general de tu operación.
          </p>
        </div>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Link
            href="/admin/events"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-mulberry hover:text-mulberry"
          >
            Ver eventos
          </Link>
          <Link
            href="/admin/scan"
            className="inline-flex h-10 items-center justify-center rounded-full bg-mulberry px-4 text-sm font-semibold text-white transition hover:bg-[#6a1286]"
          >
            Validar QR
          </Link>
        </div>
      </header>

      <section aria-label="Indicadores principales" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpi
          label="Próximos eventos"
          value={data.events.upcoming}
          helper="Listos para gestionar"
          href="/admin/events?period=upcoming"
          tone={data.events.upcoming > 0 ? 'positive' : 'neutral'}
        />
        <DashboardKpi
          label="Pagos pendientes"
          value={data.payments.pending}
          helper={data.payments.pending > 0 ? 'Requieren revisión' : 'Todo está al día'}
          href="/admin/payments?state=pending"
          tone={data.payments.pending > 0 ? 'warning' : 'positive'}
        />
        <DashboardKpi
          label="Formas de pago activas"
          value={data.paymentMethods.active}
          helper="Disponibles para cobrar"
          href="/admin/payment-methods"
          tone={data.paymentMethods.active > 0 ? 'positive' : 'warning'}
        />
        <DashboardKpi {...fourthKpi} />
      </section>

      <section aria-labelledby="attention-title" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="mb-4">
          <h2 id="attention-title" className="text-lg font-semibold text-slate-950">
            Necesita atención
          </h2>
          <p className="mt-1 text-sm text-slate-500">Pendientes que puedes resolver ahora.</p>
        </div>

        {attentionItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
            {attentionItems.map((item) => (
              <AttentionItem key={item.title} {...item} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Todo está bajo control</p>
              <p className="text-xs text-emerald-700">No encontramos pendientes operativos.</p>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="activity-title">
        <div className="mb-4">
          <h2 id="activity-title" className="text-xl font-semibold text-slate-950">
            Actividad reciente
          </h2>
          <p className="mt-1 text-sm text-slate-500">Tendencias para detectar cambios, no solo totales acumulados.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Eventos creados" description="Últimas 8 semanas">
            <LineChartBlock data={data.events.trend} />
          </ChartCard>
          <ChartCard title="Solicitudes de pago" description="Últimas 8 semanas">
            <LineChartBlock data={data.payments.trend} />
          </ChartCard>
        </div>
      </section>

      <section aria-labelledby="modules-title">
        <div className="mb-4">
          <h2 id="modules-title" className="text-xl font-semibold text-slate-950">
            Estado por módulo
          </h2>
          <p className="mt-1 text-sm text-slate-500">Un desglose compacto para entender dónde profundizar.</p>
        </div>

        <div
          className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${
            data.users ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
          }`}
        >
          <ModuleSummaryCard
            title="Eventos"
            description="Programación y distribución por nivel."
            href="/admin/events"
            stats={[
              { label: 'Total', value: data.events.total },
              { label: 'Próximos', value: data.events.upcoming },
              { label: 'Finalizados', value: data.events.finished },
            ]}
            distributionTitle="Por nivel"
            distribution={data.events.levelDistribution}
          />
          <ModuleSummaryCard
            title="Pagos"
            description="Solicitudes y resultado de la revisión."
            href="/admin/payments"
            stats={[
              { label: 'Solicitudes', value: data.payments.total },
              { label: 'Pendientes', value: data.payments.pending },
              { label: 'Aprobados', value: data.payments.approved },
              { label: 'Rechazados', value: data.payments.rejected },
            ]}
            distributionTitle="Por estado"
            distribution={data.payments.stateDistribution}
          />
          <ModuleSummaryCard
            title="Formas de pago"
            description="Disponibilidad y mix de cobro."
            href="/admin/payment-methods"
            stats={[
              { label: 'Total', value: data.paymentMethods.total },
              { label: 'Activas', value: data.paymentMethods.active },
              { label: 'Inactivas', value: data.paymentMethods.inactive },
            ]}
            distributionTitle="Por tipo"
            distribution={data.paymentMethods.typeDistribution}
          />
          {data.users ? (
            <ModuleSummaryCard
              title="Usuarios"
              description="Crecimiento y avance del registro."
              href="/admin/users"
              stats={[
                { label: 'Perfiles', value: data.users.total },
                { label: 'Completos', value: data.users.complete },
                { label: 'Incompletos', value: data.users.incomplete },
              ]}
              distributionTitle="Estado del perfil"
              distribution={data.users.completionDistribution}
            />
          ) : null}
        </div>
      </section>

      {data.createEventFunnel ? <FunnelAnalytics data={data.createEventFunnel} /> : null}
    </div>
  );
}
