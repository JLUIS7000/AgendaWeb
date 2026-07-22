/* =========================================================
   VITALIS — script.js
   Calendario con FullCalendar. Los bloques marcados con
   "// PHP:" son los puntos exactos donde reemplazas datos
   de ejemplo por llamadas fetch() a tus endpoints reales
   (ej. api/eventos.php, api/holds.php, api/citas.php).

   IMPORTANTE sobre el conteo de 5 minutos:
   El temporizador de este archivo es SOLO visual, para que
   el usuario sepa cuánto tiempo le queda. La prevención real
   de citas duplicadas debe vivir en el backend: al seleccionar
   un horario, PHP debe insertar un registro en una tabla
   `reservas_temporales` con una columna `expira_en`
   (NOW() + INTERVAL 5 MINUTE), y esa fila debe bloquear el
   horario para cualquier otra persona (por ejemplo con un
   índice único sobre servicio+fecha+hora, o una transacción
   con bloqueo de fila). Un proceso programado (cron) o una
   verificación en cada consulta debe borrar las reservas
   vencidas para liberar el horario automáticamente.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Menú móvil ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  /* ---------- Servicios — expandir detalles ---------- */
  document.querySelectorAll('.service-toggle').forEach(btn => {
    const details = btn.parentElement.querySelector('.service-details');
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      details.style.maxHeight = expanded ? null : details.scrollHeight + 'px';
      btn.firstChild.textContent = expanded ? 'Ver detalles ' : 'Ocultar detalles ';
    });
  });

  /* =========================================================
     CONFIGURACIÓN DE SERVICIOS
     ========================================================= */
  const SERVICE_DURATIONS = {
    'fisioterapia': 50,
    'masoterapia': 40,
    'rehab-deportiva': 60,
    'nutricion': 45
  };
  const SERVICE_LABELS = {
    'fisioterapia': 'Fisioterapia',
    'masoterapia': 'Masoterapia',
    'rehab-deportiva': 'Rehabilitación deportiva',
    'nutricion': 'Consulta nutricional'
  };

  const bookingServiceEl = document.getElementById('bookingService');

  /* =========================================================
     EVENTOS DE EJEMPLO (simulan lo que hoy vendría de tu BD)
     PHP: reemplaza generarEventosSimulados() por un fetch a
     api/eventos.php?servicio=X&start=Y&end=Z que devuelva JSON
     con las citas ya confirmadas de ese servicio.
     ========================================================= */
  function generarEventosSimulados(servicio, rangeStart, rangeEnd){
    const eventos = [];
    const dur = SERVICE_DURATIONS[servicio] || 50;
    const horasBase = [9, 10, 11, 13, 16, 17];
    // Semilla simple para que cada servicio tenga horarios "ocupados" distintos y estables
    let seed = servicio.split('').reduce((a,c) => a + c.charCodeAt(0), 0);

    const cursor = new Date(rangeStart);
    let dia = 0;
    while (cursor < rangeEnd) {
      const dow = cursor.getDay();
      if (dow !== 0) { // sin citas los domingos
        const nOcupados = (seed + dia) % 3; // 0,1 o 2 ocupados por día
        for (let i = 0; i < nOcupados; i++) {
          const hora = horasBase[(seed + dia + i * 3) % horasBase.length];
          const start = new Date(cursor);
          start.setHours(hora, 0, 0, 0);
          const end = new Date(start.getTime() + dur * 60000);
          eventos.push({
            id: `busy-${servicio}-${start.toISOString()}`,
            title: 'Ocupado',
            start: start.toISOString(),
            end: end.toISOString(),
            classNames: ['evt-ocupado'],
            editable: false,
            extendedProps: { tipo: 'ocupado', servicio }
          });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
      dia++;
    }
    return eventos;
  }

  /* =========================================================
     CALENDARIO
     ========================================================= */
  const calendarEl = document.getElementById('calendar');
  let holdEvent = null; // referencia al evento de reserva temporal activo

  const calendar = new FullCalendar.Calendar(calendarEl, {
    locale: 'es',
    height: '100%',
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' },
    firstDay: 1,
    slotMinTime: '09:00:00',
    slotMaxTime: '19:00:00',
    allDaySlot: false,
    nowIndicator: true,
    selectable: true,
    selectMirror: true,
    selectOverlap: false,
    businessHours: [
      { daysOfWeek: [1,2,3,4,5], startTime: '09:00', endTime: '19:00' },
      { daysOfWeek: [6], startTime: '09:00', endTime: '14:00' }
    ],
    selectConstraint: 'businessHours',

    /* PHP: fuente de eventos — reemplazar por fetch real */
    events: function (fetchInfo, successCallback, failureCallback) {
      const servicio = bookingServiceEl.value;

      // PHP: const url = `api/eventos.php?servicio=${servicio}&start=${fetchInfo.startStr}&end=${fetchInfo.endStr}`;
      //      fetch(url).then(r => r.json()).then(successCallback).catch(failureCallback);

      try {
        const eventos = generarEventosSimulados(servicio, fetchInfo.start, fetchInfo.end);
        successCallback(eventos);
      } catch (err) {
        failureCallback(err);
      }
    },

    select: function (info) {
      const servicio = bookingServiceEl.value;
      const dur = SERVICE_DURATIONS[servicio] || 50;
      const start = info.start;
      const end = new Date(start.getTime() + dur * 60000);

      calendar.unselect();

      if (info.view.type === 'dayGridMonth') {
        // En vista mensual solo se elige el día; se cambia a vista de día para escoger hora.
        calendar.changeView('timeGridDay', start);
        return;
      }

      iniciarReservaTemporal(servicio, start, end);
    },

    eventClick: function (info) {
      if (info.event.extendedProps.tipo === 'hold') {
        // Click sobre tu propia reserva temporal: reabre el panel
        abrirPanelHold();
      }
    }
  });

  calendar.render();

  bookingServiceEl.addEventListener('change', () => {
    cancelarReservaTemporal({ silencioso: true });
    calendar.refetchEvents();
  });

  /* =========================================================
     RESERVA TEMPORAL DE 5 MINUTOS
     ========================================================= */
  const HOLD_SECONDS = 5 * 60;
  const RING_CIRCUMFERENCE = 100.5;

  const holdPanel = document.getElementById('holdPanel');
  const holdSummary = document.getElementById('holdSummary');
  const holdForm = document.getElementById('holdForm');
  const holdTimeLabel = document.getElementById('holdTimeLabel');
  const holdRingFg = document.getElementById('holdRingFg');
  const holdCancelBtn = document.getElementById('holdCancel');
  const holdCloseBtn = document.getElementById('holdClose');

  let holdTimer = null;
  let holdSecondsLeft = HOLD_SECONDS;
  let holdData = null; // { servicio, start, end }

  function iniciarReservaTemporal(servicio, start, end){
    // Si ya había una reserva activa, se libera primero.
    cancelarReservaTemporal({ silencioso: true });

    /* PHP: aquí se debe POSTear a api/holds.php ANTES de mostrar
       el panel, para que el backend registre el bloqueo real:
       fetch('api/holds.php', { method:'POST', body: JSON.stringify({
         servicio, inicio: start.toISOString(), fin: end.toISOString()
       })})
       .then(r => r.json())
       .then(resp => { if (!resp.ok) { alert('Ese horario ya no está disponible'); calendar.refetchEvents(); return; }
                        holdData = { servicio, start, end, holdId: resp.holdId };
                        mostrarPanelHold(); })
       Por ahora, como no hay backend conectado, se simula localmente: */

    holdData = { servicio, start, end };

    holdEvent = calendar.addEvent({
      id: 'hold-actual',
      title: 'Reservado (temporal)',
      start,
      end,
      classNames: ['evt-hold'],
      editable: false,
      extendedProps: { tipo: 'hold' }
    });

    mostrarPanelHold();
  }

  function mostrarPanelHold(){
    const { servicio, start, end } = holdData;
    const fechaTexto = start.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const horaInicio = start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const horaFin = end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    holdSummary.textContent = `${SERVICE_LABELS[servicio]} · ${fechaTexto}, ${horaInicio} – ${horaFin}`;

    holdSecondsLeft = HOLD_SECONDS;
    actualizarRelojHold();
    holdPanel.hidden = false;
    holdPanel.classList.remove('is-expiring');

    clearInterval(holdTimer);
    holdTimer = setInterval(() => {
      holdSecondsLeft--;
      actualizarRelojHold();
      if (holdSecondsLeft <= 60) holdPanel.classList.add('is-expiring');
      if (holdSecondsLeft <= 0) {
        cancelarReservaTemporal({ expirado: true });
      }
    }, 1000);
  }

  function abrirPanelHold(){
    if (holdData) holdPanel.hidden = false;
  }

  function actualizarRelojHold(){
    const m = Math.floor(holdSecondsLeft / 60);
    const s = holdSecondsLeft % 60;
    holdTimeLabel.textContent = `${m}:${String(s).padStart(2, '0')}`;
    const progreso = holdSecondsLeft / HOLD_SECONDS;
    holdRingFg.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progreso));
  }

  function cancelarReservaTemporal({ expirado = false, silencioso = false } = {}){
    clearInterval(holdTimer);
    holdTimer = null;

    if (holdEvent) {
      /* PHP: si había un hold activo, avisar al backend para borrarlo:
         fetch('api/holds.php?id=' + holdData.holdId, { method:'DELETE' }); */
      holdEvent.remove();
      holdEvent = null;
    }

    holdPanel.hidden = true;
    holdPanel.classList.remove('is-expiring');
    holdForm.reset();
    holdData = null;

    if (expirado && !silencioso) {
      alert('El tiempo de reserva expiró. El horario quedó disponible de nuevo, puedes elegir otro.');
    }
  }

  holdCancelBtn.addEventListener('click', () => cancelarReservaTemporal());
  holdCloseBtn.addEventListener('click', () => cancelarReservaTemporal());

  holdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!holdData) return;

    /* PHP: aquí se envía el formulario completo a api/citas.php (POST)
       con servicio, inicio, fin, datos del cliente y el holdId, para:
       1) insertar la cita definitiva en la tabla `citas`
       2) insertar o actualizar el cliente en la tabla `clientes`
       3) borrar la fila correspondiente en `reservas_temporales`
       El backend responde { ok: true } o un error si alguien más
       confirmó ese mismo horario primero. */

    const nombre = document.getElementById('bkName').value;
    const { servicio, start } = holdData;
    const fechaTexto = start.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const horaTexto = start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    clearInterval(holdTimer);
    holdTimer = null;
    holdPanel.hidden = true;
    holdForm.reset();
    holdEvent = null; // se reemplaza por el evento confirmado al refrescar
    holdData = null;

    calendar.refetchEvents();

    alert(`Cita confirmada para ${nombre}: ${SERVICE_LABELS[servicio]} el ${fechaTexto} a las ${horaTexto}.`);
  });

  /* =========================================================
     ACCESO — tabs cliente / admin
     ========================================================= */
  const accessTabs = document.querySelectorAll('.access-tab');
  const accessSubmit = document.getElementById('accessSubmit');
  const accessForm = document.getElementById('accessForm');

  accessTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      accessTabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      const role = tab.dataset.role;
      accessSubmit.textContent = role === 'admin' ? 'Entrar como administrador' : 'Entrar como cliente';
      accessForm.dataset.role = role;
    });
  });

  accessForm.addEventListener('submit', (e) => {
    e.preventDefault();
    /* PHP: enviar { email, password, role } a api/login.php vía POST.
       El backend valida contra la tabla `usuarios` (contraseñas
       hasheadas) y responde con sesión/token. Según el rol, se
       redirige a panel-cliente.php o panel-admin.php. */
    const role = accessForm.dataset.role || 'cliente';
    alert(
      role === 'admin'
        ? 'Vista de administrador: aquí cargará el panel de gestión de citas, servicios y clientes.'
        : 'Vista de cliente: aquí cargará tu historial de citas y paquetes.'
    );
  });

});
