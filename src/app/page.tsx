"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  FileUp,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings,
  TrendingUp,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Status = "MISSED" | "HELD" | "SOLD" | "PENDING";
type Appointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: Status;
  patientName: string;
  sdrName: string;
  doctorName: string;
  notes: string;
  rawData: Record<string, string>;
};
type Stats = {
  total: number;
  missed: number;
  held: number;
  sold: number;
  pending: number;
};
const info: Record<
  Status,
  { label: string; color: string; className: string }
> = {
  MISSED: { label: "Missed", color: "#ee6b5d", className: "status-missed" },
  HELD: { label: "Held", color: "#2563EB", className: "status-held" },
  SOLD: { label: "Sold", color: "#e6b84d", className: "status-sold" },
  PENDING: {
    label: "Pending / Unassigned",
    color: "#8b96a3",
    className: "status-pending",
  },
};
const emptyStats = { total: 0, missed: 0, held: 0, sold: 0, pending: 0 };
const pct = (value: number, total: number) =>
  total ? `${Math.round((value / total) * 100)}%` : "0%";
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
const sourceValue = (rawData: Record<string, string>, keys: string[]) => {
  const key = Object.keys(rawData || {}).find((candidate) =>
    keys.includes(candidate.trim().toLowerCase()),
  );
  return key ? String(rawData[key] || "").trim() : "";
};
export default function Home() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const [doctor, setDoctor] = useState("");
  const [sdrName, setSdrName] = useState("");
  const [sdrNames, setSdrNames] = useState<string[]>([]);
  const [sort, setSort] = useState("booked-by");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportDetailsOpen, setReportDetailsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pageSize = 25;
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    [
      ["q", query],
      ["status", status],
      ["year", year],
      ["month", month],
      ["date", date],
      ["doctor", doctor],
      ["sdr", sdrName],
      ["sort", sort],
    ].forEach(([key, value]) => value && params.set(key, value));
    try {
      const response = await fetch(`/api/appointments?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAppointments(data.appointments);
      setStats(data.stats);
      setSdrNames(data.sdrNames || []);
      setCurrentPage(1);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to reach the database.",
      );
    } finally {
      setLoading(false);
    }
  }, [date, doctor, month, query, sdrName, sort, status, year]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const chartData = useMemo(
    () => [
      { name: "Missed", count: stats.missed, fill: info.MISSED.color },
      { name: "Held", count: stats.held, fill: info.HELD.color },
      { name: "Sold", count: stats.sold, fill: info.SOLD.color },
      { name: "Pending", count: stats.pending, fill: info.PENDING.color },
    ],
    [stats],
  );
  const sdrReport = useMemo(() => {
    const grouped = new Map<
      string,
      {
        name: string;
        total: number;
        held: number;
        sold: number;
        missed: number;
        pending: number;
      }
    >();
    appointments.forEach((appointment) => {
      const name = appointment.sdrName || "Unassigned";
      const current = grouped.get(name) || {
        name,
        total: 0,
        held: 0,
        sold: 0,
        missed: 0,
        pending: 0,
      };
      current.total += 1;
      current[
        appointment.status.toLowerCase() as
          "held" | "sold" | "missed" | "pending"
      ] += 1;
      grouped.set(name, current);
    });
    return [...grouped.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [appointments]);
  const totalPages = Math.max(1, Math.ceil(appointments.length / pageSize));
  const visibleAppointments = appointments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const clear = () => {
    setQuery("");
    setStatus("");
    setYear("");
    setMonth("");
    setDate("");
    setDoctor("");
    setSdrName("");
  };
  const importCsv = async (file?: File) => {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/import", { method: "POST", body });
    const data = await response.json();
    setMessage(
      response.ok
        ? `Imported ${data.imported} appointments from the spreadsheet export.`
        : data.error,
    );
    if (response.ok) void load();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this appointment? This cannot be undone."))
      return;
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    void load();
  };
  const years = Array.from({ length: 7 }, (_, index) =>
    String(new Date().getFullYear() - index),
  );
  const viewLabel = date
    ? formatDate(`${date}T00:00:00Z`)
    : year
      ? `${year}${month ? ` / ${new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, Number(month) - 1, 1)))}` : ""}`
      : "All time";
  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <CalendarDays size={19} />
          </div>
          <div>
            <strong>appointment</strong>
            <span>TRACKER</span>
          </div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          <button className="nav-item active">
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById("appointments")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Clock3 size={18} />
            Appointments <span className="nav-count">{stats.total}</span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={18} />
            Add appointment
          </button>
          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById("reports")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <BarChart3 size={18} />
            Reports
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item">
            <Settings size={18} />
            Settings
          </button>
          <div className="user-chip">
            <div className="avatar">AT</div>
            <div>
              <strong>Appointment team</strong>
              <small>Operations workspace</small>
            </div>
          </div>
        </div>
      </aside>
      {navOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div>
            <p className="eyebrow">OPERATIONS / OVERVIEW</p>
            <h1>
              Good morning, team <span className="wave">✦</span>
            </h1>
            <p className="hero-subtitle">
              Here&apos;s what&apos;s happening with your appointments today.
            </p>
          </div>
          <div className="top-actions">
            <button
              className="outline-button"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} />
              Import file
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={17} />
              New appointment
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(event) => {
                void importCsv(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </header>
        <section className="filter-strip">
          <div className="filter-heading">
            <span className="filter-dot" />
            Viewing <strong>{viewLabel}</strong>
          </div>
          <div className="filter-controls">
            <label className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search patient, provider..."
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="MISSED">Missed</option>
              <option value="HELD">Held</option>
              <option value="SOLD">Sold</option>
              <option value="PENDING">Pending / Unassigned</option>
            </select>
            <select
              value={sdrName}
              onChange={(event) => setSdrName(event.target.value)}
              aria-label="Filter by booked by"
            >
              <option value="">All booked by</option>
              {sdrNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                setDate("");
              }}
            >
              <option value="">All years</option>
              {years.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              disabled={!year}
            >
              <option value="">All months</option>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index} value={index + 1}>
                  {new Intl.DateTimeFormat("en-US", { month: "long" }).format(
                    new Date(2020, index, 1),
                  )}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort appointments"
            >
              <option value="booked-by">Sort: booked by</option>
              <option value="name">Sort: client name</option>
              <option value="date-desc">Sort: newest date</option>
              <option value="status">Sort: status</option>
            </select>
            <input
              className="date-filter"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setYear("");
                setMonth("");
              }}
            />
            <button className="reset-button" onClick={clear}>
              Reset
            </button>
          </div>
        </section>
        {message && (
          <div
            className={`notice ${message.startsWith("Imported") ? "notice-success" : "notice-error"}`}
          >
            <CircleAlert size={17} />
            {message}
          </div>
        )}
        <section className="welcome-row">
          <div>
            <p className="eyebrow">LIVE SNAPSHOT</p>
            <h2>Appointment performance</h2>
            <p className="muted">
              Real-time totals for the records in your current view.
            </p>
          </div>
        </section>
        <section className="metric-grid">
          <Metric
            label="Total appointments"
            value={stats.total}
            detail="In current view"
            icon={<CalendarDays size={19} />}
            tone="blue"
          />
          <Metric
            label="Missed"
            value={stats.missed}
            detail={`${pct(stats.missed, stats.total)} of total`}
            icon={<CircleAlert size={19} />}
            tone="red"
          />
          <Metric
            label="Held"
            value={stats.held}
            detail={`${pct(stats.held, stats.total)} of total`}
            icon={<Check size={19} />}
            tone="green"
          />
          <Metric
            label="Sold"
            value={stats.sold}
            detail={`${pct(stats.sold, stats.total)} conversion`}
            icon={<TrendingUp size={19} />}
            tone="gold"
          />
          <Metric
            label="Pending / unassigned"
            value={stats.pending}
            detail={`${pct(stats.pending, stats.total)} of total`}
            icon={<Clock3 size={19} />}
            tone="slate"
          />
        </section>
        <section className="secondary-metrics">
          <div>
            <span>Held conversion</span>
            <strong>{pct(stats.held, stats.total)}</strong>
            <small>Held / all appointments</small>
          </div>
          <div>
            <span>Sold conversion</span>
            <strong>{pct(stats.sold, stats.total)}</strong>
            <small>Sold / all appointments</small>
          </div>
          <div>
            <span>Missed percentage</span>
            <strong>{pct(stats.missed, stats.total)}</strong>
            <small>Missed / all appointments</small>
          </div>
          <div>
            <span>Daily average</span>
            <strong>{stats.total.toFixed(1)}</strong>
            <small>Across current view</small>
          </div>
        </section>
        <section className="chart-grid">
          <div className="panel chart-panel">
            <PanelTitle
              eyebrow="STATUS MIX"
              title="What is happening?"
              meta={viewLabel}
            />
            <div className="chart-wrap">
              {stats.total ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={42}>
                    <CartesianGrid vertical={false} stroke="#e8e9e5" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#798078", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#798078", fontSize: 12 }}
                    />
                    <Tooltip cursor={{ fill: "#f5f6f2" }} />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="Import your spreadsheet export to see status trends." />
              )}
            </div>
          </div>
          <div className="panel chart-panel">
            <PanelTitle eyebrow="DISTRIBUTION" title="Status breakdown" />
            <div className="donut-wrap">
              {stats.total ? (
                <>
                  <ResponsiveContainer width="52%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={4}
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="legend">
                    {chartData.map((item) => (
                      <div key={item.name}>
                        <i style={{ background: item.fill }} />
                        <span>{item.name}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyChart message="Your live distribution will appear here." />
              )}
            </div>
          </div>
        </section>
        <section className="panel reports-panel" id="reports">
          <div className="panel-heading table-heading">
            <div>
              <p className="eyebrow">REPORTS / SDR PERFORMANCE</p>
              <h3>
                Booked appointment report{" "}
                <span className="table-count">{sdrReport.length} SDRs</span>
              </h3>
            </div>
            <div className="report-actions">
              <span className="panel-period">{viewLabel}</span>
              <button
                className="outline-button report-toggle"
                onClick={() => setReportDetailsOpen((open) => !open)}
              >
                {reportDetailsOpen ? "Hide details" : "Show details"}
              </button>
            </div>
          </div>
          <div className="report-summary-grid">
            {sdrReport.map((report) => (
              <div className="report-summary" key={report.name}>
                <strong>{report.name}</strong>
                <span>{report.total} appointments</span>
                <small>
                  Held {report.held} · Sold {report.sold} · Missed{" "}
                  {report.missed} · Pending {report.pending}
                </small>
              </div>
            ))}
          </div>
          {reportDetailsOpen && (
            <div className="table-scroll">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Booked by / SDR</th>
                    <th>Client / practice</th>
                    <th>Appointment date</th>
                    <th>Appointment time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAppointments.map((appointment) => (
                    <tr key={`report-${appointment.id}`}>
                      <td>
                        <strong>{appointment.sdrName || "Unassigned"}</strong>
                      </td>
                      <td>{appointment.patientName || "Unnamed client"}</td>
                      <td>
                        <strong>
                          {formatDate(appointment.appointmentDate)}
                        </strong>
                      </td>
                      <td>{appointment.appointmentTime || "Time not set"}</td>
                      <td>
                        <span
                          className={`status-badge ${info[appointment.status].className}`}
                        >
                          <i />
                          {info[appointment.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel appointments-panel" id="appointments">
          <div className="panel-heading table-heading">
            <div>
              <p className="eyebrow">RECORDS</p>
              <h3>
                Appointments <span className="table-count">{stats.total}</span>
              </h3>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} />
              Add appointment
            </button>
          </div>
          {loading ? (
            <div className="table-empty">Loading records...</div>
          ) : appointments.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Booked date</th>
                      <th>SDR Name</th>
                      <th>Doctor&apos;s Name</th>
                      <th>Date of Appt</th>
                      <th>Time of Appt</th>
                      <th>STATUS</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>
                          {sourceValue(appointment.rawData, [
                            "date",
                            "date??",
                          ]) || "Date not set"}
                        </td>
                        <td>
                          <strong>{appointment.sdrName || "Unassigned"}</strong>
                        </td>
                        <td>{appointment.doctorName || "Unassigned"}</td>
                        <td>
                          <strong>
                            {sourceValue(appointment.rawData, [
                              "date of appt",
                              "date of appointment",
                              "appointment date",
                            ]) || formatDate(appointment.appointmentDate)}
                          </strong>
                        </td>
                        <td>
                          {sourceValue(appointment.rawData, [
                            "time of appt",
                            "time of appointment (est)",
                            "appointment time",
                          ]) ||
                            appointment.appointmentTime ||
                            "Time not set"}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${info[appointment.status].className}`}
                          >
                            <i />
                            {info[appointment.status].label}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              onClick={() => {
                                setEditing(appointment);
                                setFormOpen(true);
                              }}
                              aria-label="Edit appointment"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button danger"
                              onClick={() => void remove(appointment.id)}
                              aria-label="Delete appointment"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination-bar">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, appointments.length)} of{" "}
                  {appointments.length}
                </span>
                <div className="pagination-actions">
                  <button
                    className="icon-button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  <strong>
                    Page {currentPage} of {totalPages}
                  </strong>
                  <button
                    className="icon-button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <FileUp size={23} />
              </div>
              <h3>No appointment records yet</h3>
              <p>
                Import the existing Google Sheets CSV export to preserve your
                records, or add the first appointment.
              </p>
              <div className="empty-actions">
                <button
                  className="primary-button"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={16} />
                  Import spreadsheet CSV
                </button>
                <button
                  className="outline-button"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus size={16} />
                  Add manually
                </button>
              </div>
            </div>
          )}
        </section>
        <footer>
          <span>Appointment Tracker</span>
          <span>Persistent workspace · Data sourced from your database</span>
        </footer>
      </main>
      {formOpen && (
        <AppointmentForm
          appointment={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value.toLocaleString()}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}
function PanelTitle({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      {meta && <span className="panel-period">{meta}</span>}
    </div>
  );
}
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="empty-chart">
      <BarChart3 size={25} />
      <span>{message}</span>
    </div>
  );
}

function AppointmentForm({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    appointmentDate: appointment?.appointmentDate.slice(0, 10) || "",
    appointmentTime: appointment?.appointmentTime || "",
    patientName: appointment?.patientName || "",
    sdrName: appointment?.sdrName || "",
    doctorName: appointment?.doctorName || "",
    status: appointment?.status || "MISSED",
    notes: appointment?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const change = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(
      appointment ? `/api/appointments/${appointment.id}` : "/api/appointments",
      {
        method: appointment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const data = await response.json();
    if (!response.ok) setError(data.error || "Unable to save appointment.");
    else onSaved();
    setSaving(false);
  };
  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <section className="form-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              {appointment ? "EDIT RECORD" : "NEW RECORD"}
            </p>
            <h2>{appointment ? "Edit appointment" : "Add appointment"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <label>
              Appointment date
              <input
                required
                type="date"
                value={form.appointmentDate}
                onChange={(event) =>
                  change("appointmentDate", event.target.value)
                }
              />
            </label>
            <label>
              Appointment time
              <input
                type="time"
                value={form.appointmentTime}
                onChange={(event) =>
                  change("appointmentTime", event.target.value)
                }
              />
            </label>
            <label className="wide">
              Patient / client name
              <input
                required
                placeholder="e.g. Jordan Lee"
                value={form.patientName}
                onChange={(event) => change("patientName", event.target.value)}
              />
            </label>
            <label>
              Booked by / SDR name
              <input
                placeholder="e.g. Christine Abella"
                value={form.sdrName}
                onChange={(event) => change("sdrName", event.target.value)}
              />
            </label>
            <label>
              Doctor / provider
              <input
                placeholder="e.g. Dr. Morgan"
                value={form.doctorName}
                onChange={(event) => change("doctorName", event.target.value)}
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) => change("status", event.target.value)}
              >
                <option value="MISSED">Missed</option>
                <option value="HELD">Held</option>
                <option value="SOLD">Sold</option>
                <option value="PENDING">Pending / Unassigned</option>
              </select>
            </label>
            <label className="wide">
              Notes
              <textarea
                rows={4}
                placeholder="Add context from the original record..."
                value={form.notes}
                onChange={(event) => change("notes", event.target.value)}
              />
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" disabled={saving}>
              {saving
                ? "Saving..."
                : appointment
                  ? "Save changes"
                  : "Create appointment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
