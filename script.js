/* ============================================================
   VITALIS — interacciones de interfaz
   Nota: esto es solo capa visual/UX. La lógica real de reservas,
   autenticación y verificación de usuarios se conecta después
   (PHP + base de datos). Aquí todo se simula en el cliente.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initRouter();
  initNavToggle();
  initActiveNav();
  initServiceCards();
  initLiveMap();
  initAccessPage();
});

/* ---------- router de vistas ----------
   Todo vive en index.html. Cambiar de vista oculta la anterior y
   muestra solo la elegida (limpia header/nav/footer según el caso),
   sin recargar la página. El hash permite compartir el enlace y
   que el botón "atrás" del navegador funcione. */
let calendarFullInstance = null;

function initRouter() {
  document.body.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-nav]");
    if (!trigger) return;

    const href = trigger.getAttribute("href");
    const isSectionAnchor = href && href.startsWith("#") && href.length > 1;

    if (isSectionAnchor) {
      // Enlace a una sección de "Inicio" (ej. #servicios): si ya estamos
      // en Inicio, se deja el desplazamiento normal del navegador.
      // Si estamos en otra vista, primero mostramos Inicio y luego saltamos.
      if (viewFromHash() !== "home") {
        e.preventDefault();
        applyView("home");
        window.location.hash = href;
      }
      return;
    }

    e.preventDefault();
    goToView(trigger.dataset.nav);
  });

  window.addEventListener("hashchange", () => {
    const raw = window.location.hash.replace(/^#\/?/, "");
    applyView(viewFromHash());
    // Solo forzamos scroll arriba cuando el hash es una vista (home/acceso/agenda),
    // no cuando es un ancla de sección como #servicios (ese scroll lo hace el navegador).
    if (raw === "" || ["home", "acceso", "agenda"].includes(raw)) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  });
  applyView(viewFromHash());
}

function viewFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return ["home", "acceso", "agenda"].includes(hash) ? hash : "home";
}

function goToView(name) {
  window.location.hash = name === "home" ? "" : `/${name}`;
  applyView(name);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function applyView(name) {
  document.querySelectorAll(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });

  const isHome = name === "home";
  const mainNav = document.getElementById("mainNav");
  const navAcceder = document.getElementById("navAcceder");
  const navVolver = document.getElementById("navVolver");
  const navAgendarCta = document.getElementById("navAgendarCta");
  const footer = document.getElementById("siteFooter");

  if (mainNav) mainNav.hidden = !isHome;
  if (navAcceder) navAcceder.hidden = !isHome;
  if (navAgendarCta) navAgendarCta.hidden = !isHome;
  if (navVolver) navVolver.hidden = isHome;
  if (footer) footer.hidden = !isHome;

  if (name === "agenda") ensureCalendarFull();
}

/* ---------- menú móvil ---------- */
function initNavToggle() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

/* ---------- resalta el link activo del nav al hacer scroll ---------- */
function initActiveNav() {
  const links = document.querySelectorAll(".main-nav a");
  const sections = Array.from(links)
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove("is-active"));
        const match = document.querySelector(`.main-nav a[href="#${entry.target.id}"]`);
        if (match) match.classList.add("is-active");
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((s) => observer.observe(s));
}

/* ---------- tarjetas de servicio expandibles ---------- */
function initServiceCards() {
  document.querySelectorAll(".service-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".service-card");
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      card.classList.toggle("is-open", !expanded);
      btn.childNodes[0].textContent = !expanded ? "Ocultar detalles " : "Ver detalles ";
    });
  });
}

/* ---------- calendario completo (vista "agenda") ----------
   Se crea la primera vez que se entra a la vista (mientras está
   oculta, FullCalendar mediría 0 de ancho) y luego solo se
   actualiza el tamaño en las siguientes visitas. */
function ensureCalendarFull() {
  const el = document.getElementById("calendarFull");
  if (!el || typeof FullCalendar === "undefined") return;

  if (calendarFullInstance) {
    calendarFullInstance.updateSize();
    return;
  }

  const demoEvents = buildDemoEvents();
  const holdBanner = document.getElementById("holdBanner");

  calendarFullInstance = new FullCalendar.Calendar(el, {
    locale: "es",
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" },
    initialView: "timeGridWeek",
    height: "auto",
    slotMinTime: "08:00:00",
    slotMaxTime: "20:00:00",
    allDaySlot: false,
    events: demoEvents,
    eventClassNames: (arg) => (arg.event.extendedProps.busy ? "is-busy" : "is-free"),
    dateClick: (info) => {
      if (holdBanner) {
        holdBanner.hidden = false;
        holdBanner.querySelector("strong").textContent = info.dateStr;
        startHoldCountdown(holdBanner);
      }
    },
  });
  calendarFullInstance.render();
}

function buildDemoEvents() {
  const today = new Date();
  const day = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  return [
    { title: "Ocupado", start: `${day(0)}T09:00:00`, end: `${day(0)}T10:00:00`, busy: true },
    { title: "Ocupado", start: `${day(1)}T11:00:00`, end: `${day(1)}T12:00:00`, busy: true },
    { title: "Disponible", start: `${day(1)}T15:00:00`, end: `${day(1)}T16:00:00`, busy: false },
    { title: "Ocupado", start: `${day(2)}T09:30:00`, end: `${day(2)}T10:30:00`, busy: true },
    { title: "Disponible", start: `${day(3)}T13:00:00`, end: `${day(3)}T14:00:00`, busy: false },
    { title: "Ocupado", start: `${day(4)}T17:00:00`, end: `${day(4)}T18:00:00`, busy: true },
  ];
}

function startHoldCountdown(banner) {
  const timeEl = banner.querySelector(".hold-time");
  let remaining = 5 * 60;
  clearInterval(banner._t);
  banner._t = setInterval(() => {
    remaining -= 1;
    const m = String(Math.floor(remaining / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    if (timeEl) timeEl.textContent = `${m}:${s}`;
    if (remaining <= 0) {
      clearInterval(banner._t);
      banner.hidden = true;
    }
  }, 1000);
}

/* ---------- ubicación (solo el negocio) ----------
   Por norma de privacidad, este mapa muestra únicamente la
   ubicación fija del consultorio. No se solicita ni se usa la
   ubicación del visitante para nada. */
function initLiveMap() {
  const container = document.getElementById("liveMap");
  if (!container || typeof L === "undefined") return;

  const clinic = { lat: 17.0654, lng: -96.7237 }; // Oaxaca de Juárez (referencia)
  const map = L.map(container, { zoomControl: true, attributionControl: false }).setView([clinic.lat, clinic.lng], 16);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  const clinicIcon = L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#B8492F;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>', iconSize: [16, 16] });
  L.marker([clinic.lat, clinic.lng], { icon: clinicIcon }).addTo(map).bindPopup("Consultorio Vitalis");
}

/* ---------- página de acceso: iniciar sesión o crear cuenta ----------
   Un solo formulario para todos: clientes nuevos se registran aquí
   mismo, y clientes existentes (incluidos administradores) inician
   sesión por la misma puerta. La distinción de rol la hará el
   backend según las credenciales, no la interfaz. */
function initAccessPage() {
  const form = document.getElementById("accessForm");
  if (!form) return;

  const roleLabel = document.getElementById("roleLabel");
  const submitBtn = document.getElementById("accessSubmit");
  const toggleBtn = document.getElementById("toggleRegister");
  const fieldName = document.getElementById("fieldName");
  const fieldConfirm = document.getElementById("fieldConfirm");
  const accessName = document.getElementById("accessName");
  const accessConfirm = document.getElementById("accessConfirm");
  let mode = "login";

  function render() {
    const isRegister = mode === "register";
    roleLabel.textContent = isRegister ? "Crea tu cuenta de cliente" : "Inicia sesión con tu cuenta";
    submitBtn.textContent = isRegister ? "Crear cuenta" : "Entrar";
    fieldName.hidden = !isRegister;
    fieldConfirm.hidden = !isRegister;
    if (accessName) accessName.required = isRegister;
    if (accessConfirm) accessConfirm.required = isRegister;
    toggleBtn.textContent = isRegister ? "Ya tengo cuenta, iniciar sesión" : "¿Primera vez? Crea tu cuenta";
  }

  toggleBtn?.addEventListener("click", () => {
    mode = mode === "login" ? "register" : "login";
    render();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // El registro y la verificación reales contra la base de datos
    // se conectan después. Por ahora, "entrar" solo cambia a la
    // vista de agenda dentro de la misma página.
    goToView("agenda");
  });

  render();
}
