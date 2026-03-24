'use client';

import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TrendPoint = { label: string; value: number };
type BreakdownPoint = { name: string; value: number };

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
  users?: {
    total: number;
    complete: number;
    incomplete: number;
    trend: TrendPoint[];
    completionDistribution: BreakdownPoint[];
  };
};

const PIE_COLORS = ['#54086F', '#F0815B', '#744D7C', '#A68CB1', '#C9B3D2', '#D7C8DE'];

function hasData(values: Array<{ value: number }>) {
  return values.some((item) => Number(item.value) > 0);
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-xs text-slate-500">{label}</p>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <div className="mt-3 h-[220px] w-full sm:h-64">{children}</div>
    </article>
  );
}

function Kpi({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'positive' | 'warning';
}) {
  const toneClass =
    tone === 'positive'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'warning'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold leading-tight">{value}</p>
    </div>
  );
}

function PieChartBlock({ data }: { data: BreakdownPoint[] }) {
  if (!hasData(data)) return <EmptyState label="No hay datos suficientes para este gráfico." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function LineChartBlock({ data }: { data: TrendPoint[] }) {
  if (!hasData(data)) return <EmptyState label="Aún no hay movimiento en este periodo." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#54086F" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarChartBlock({ data }: { data: BreakdownPoint[] }) {
  if (!hasData(data)) return <EmptyState label="No hay datos suficientes para este gráfico." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" fill="#F0815B" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ModuleHeader({
  title,
  href,
  subtitle,
}: {
  title: string;
  href: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold text-mulberry">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
      <Link
        href={href}
        className="inline-flex w-fit rounded-md border border-mulberry px-3 py-1.5 text-xs font-semibold text-mulberry transition-colors hover:bg-mulberry hover:text-white"
      >
        Ir al módulo
      </Link>
    </div>
  );
}

export default function AdminSummaryCharts({ data }: { data: AdminSummaryChartsData }) {
  return (
    <div className="mt-2 space-y-4 sm:space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
        <ModuleHeader
          title="Eventos"
          href="/admin/events"
          subtitle="Actividad reciente de creación y distribución por nivel de juego."
        />
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi label="Total eventos" value={data.events.total} />
          <Kpi label="Próximos" value={data.events.upcoming} tone="positive" />
          <Kpi label="Finalizados" value={data.events.finished} tone="warning" />
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
          <ChartCard title="Eventos creados (últimas 8 semanas)">
            <LineChartBlock data={data.events.trend} />
          </ChartCard>
          <ChartCard title="Eventos por nivel">
            <BarChartBlock data={data.events.levelDistribution} />
          </ChartCard>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
        <ModuleHeader
          title="Pagos"
          href="/admin/payments"
          subtitle="Seguimiento de solicitudes y estados de aprobación."
        />
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Solicitudes" value={data.payments.total} />
          <Kpi label="Pendientes" value={data.payments.pending} tone="warning" />
          <Kpi label="Aprobados" value={data.payments.approved} tone="positive" />
          <Kpi label="Rechazados" value={data.payments.rejected} />
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
          <ChartCard title="Solicitudes por semana (últimas 8)">
            <LineChartBlock data={data.payments.trend} />
          </ChartCard>
          <ChartCard title="Distribución por estado">
            <PieChartBlock data={data.payments.stateDistribution} />
          </ChartCard>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
        <ModuleHeader
          title="Formas de pago"
          href="/admin/payment-methods"
          subtitle="Estado y mix de métodos que tienes configurados."
        />
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi label="Métodos totales" value={data.paymentMethods.total} />
          <Kpi label="Activos" value={data.paymentMethods.active} tone="positive" />
          <Kpi label="Inactivos" value={data.paymentMethods.inactive} />
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
          <ChartCard title="Distribución por tipo">
            <PieChartBlock data={data.paymentMethods.typeDistribution} />
          </ChartCard>
          <ChartCard title="Estado activo/inactivo">
            <BarChartBlock data={data.paymentMethods.statusDistribution} />
          </ChartCard>
        </div>
      </section>

      {data.users ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
          <ModuleHeader
            title="Usuarios"
            href="/admin/users"
            subtitle="Crecimiento y nivel de completitud del onboarding."
          />
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi label="Perfiles" value={data.users.total} />
            <Kpi label="Completos" value={data.users.complete} tone="positive" />
            <Kpi label="Incompletos" value={data.users.incomplete} tone="warning" />
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
            <ChartCard title="Nuevos perfiles (últimos 6 meses)">
              <LineChartBlock data={data.users.trend} />
            </ChartCard>
            <ChartCard title="Estado de onboarding">
              <PieChartBlock data={data.users.completionDistribution} />
            </ChartCard>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#54086F]/15 bg-[linear-gradient(135deg,rgba(84,8,111,0.08),rgba(15,118,110,0.08))] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-mulberry">Validar QR</h3>
            <p className="text-sm text-gray-600">
              Escanea con cámara, revisa la ficha y marca asistencia desde el mismo flujo.
            </p>
          </div>
          <a
            href="/admin/scan"
            className="inline-flex h-10 items-center justify-center rounded-full bg-mulberry px-4 text-sm font-semibold text-white transition hover:bg-[#6a1286]"
          >
            Abrir módulo QR
          </a>
        </div>
      </section>
    </div>
  );
}
