/* =========================================================
   VITALIS — script.js
   Toda la data de aquí (servicios, horarios ocupados, etc.)
   es de EJEMPLO. Al migrar a PHP, los bloques marcados con
   "// PHP:" son los puntos donde reemplazas datos estáticos
   por fetch() a tus endpoints (ej. api/horarios.php,
   api/citas.php, api/login.php).
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Menú móvil ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  /* =========================================================
     DATOS DE EJEMPLO
     PHP: esto vendría de una consulta a la tabla `horarios_ocupados`
     filtrada por servicio y fecha.
     ========================================================= */
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const HORAS = ['09:00','10:00','11:00','12:00','13:00','16:00','17:00','18:00'];

  // Horas ya ocupadas por día (índice 0-5 = próximos 6 días) y servicio.
  const OCUPADAS = {
    fisioterapia:     { 0:['10:00','16:00'], 1:['09:00'], 2:[], 3:['11:00','17:00'], 4:[], 5:['12:00'] },
    masoterapia:      { 0:['09:00'], 1:[], 2:['13:00'], 3:[], 4:['16:00'], 5:[] },
    'rehab-deportiva':{ 0:[], 1:['10:00','11:00'], 2:[], 3:[], 4:['09:00'], 5:['18:00'] },
    nutricion:        { 0:['17:00'], 1:[], 2:['10:00'], 3:[], 4:[], 5:[] }
  };

  function proximosDias(n){
    const out = [];
    const hoy = new Date();
    for(let i=0;i<n;i++){
      const d = new Date(hoy);
      d.setDate(hoy.getDate()+i);
      out.push(d);
    }
    return out;
  }

  /* =========================================================
     WIDGET MINI (hero)
     ========================================================= */
  const miniDaysEl = document.getElementById('miniDays');
  const miniServiceEl = document.getElementById('miniService');
  const miniSlotsEl = document.getElementById('miniSlots');
  const miniConfirmBtn = document.getElementById('miniConfirm');
  const miniConfirmedNote = document.getElementById('miniConfirmedNote');

  const dias5 = proximosDias(5);
  let miniSelectedDay = 0;
  let miniSelectedSlot = null;

  function renderMiniDays(){
    miniDaysEl.innerHTML = '';
    dias5.forEach((d, idx) => {
      const btn = document.createElement('button');
      btn.className = 'day-chip' + (idx === miniSelectedDay ? ' is-selected' : '');
      btn.type = 'button';
      btn.innerHTML = `<span class="dow">${DIAS[d.getDay()]}</span><span class="num">${d.getDate()}</span>`;
      btn.addEventListener('click', () => {
        miniSelectedDay = idx;
        miniSelectedSlot = null;
        renderMiniDays();
        renderMiniSlots();
        updateMiniButton();
      });
      miniDaysEl.appendChild(btn);
    });
  }

  function renderMiniSlots(){
    const servicio = miniServiceEl.value;
    const ocupadas = (OCUPADAS[servicio] && OCUPADAS[servicio][miniSelectedDay]) || [];
    miniSlotsEl.innerHTML = '';
    HORAS.slice(0,6).forEach(hora => {
      const busy = ocupadas.includes(hora);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn' + (miniSelectedSlot === hora ? ' is-selected' : '');
      btn.textContent = hora;
      btn.disabled = busy;
      btn.addEventListener('click', () => {
        miniSelectedSlot = hora;
        renderMiniSlots();
        updateMiniButton();
      });
      miniSlotsEl.appendChild(btn);
    });
  }

  function updateMiniButton(){
    if(miniSelectedSlot){
      miniConfirmBtn.disabled = false;
      miniConfirmBtn.textContent = `Confirmar ${miniSelectedSlot}`;
    } else {
      miniConfirmBtn.disabled = true;
      miniConfirmBtn.textContent = 'Selecciona un horario';
      miniConfirmedNote.hidden = true;
    }
  }

  miniServiceEl.addEventListener('change', () => {
    miniSelectedSlot = null;
    renderMiniSlots();
    updateMiniButton();
  });

  miniConfirmBtn.addEventListener('click', () => {
    /* PHP: aquí iría un fetch POST a api/citas.php con
       { servicio, fecha, hora } y la sesión del usuario. */
    miniConfirmedNote.hidden = false;
    document.getElementById('agenda').scrollIntoView({ behavior:'smooth' });
  });

  renderMiniDays();
  renderMiniSlots();

  /* =========================================================
     SERVICIOS — expandir detalles
     ========================================================= */
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
     AGENDA COMPLETA (sección #agenda)
     ========================================================= */
  const bookingServiceEl = document.getElementById('bookingService');
  const bookingWeekEl = document.getElementById('bookingWeek');
  const bookingSlotsEl = document.getElementById('bookingSlots');
  const bookingForm = document.getElementById('bookingForm');
  const bookingSuccess = document.getElementById('bookingSuccess');
  const bookingSummary = document.getElementById('bookingSummary');
  const bookingReset = document.getElementById('bookingReset');

  const dias6 = proximosDias(6);
  let bkSelectedDay = 0;
  let bkSelectedSlot = null;

  function renderBookingWeek(){
    bookingWeekEl.innerHTML = '';
    dias6.forEach((d, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day-chip' + (idx === bkSelectedDay ? ' is-selected' : '');
      btn.innerHTML = `<span class="dow">${DIAS[d.getDay()]}</span><span class="num">${d.getDate()}</span>`;
      btn.addEventListener('click', () => {
        bkSelectedDay = idx;
        bkSelectedSlot = null;
        renderBookingWeek();
        renderBookingSlots();
        toggleBookingForm(false);
      });
      bookingWeekEl.appendChild(btn);
    });
  }

  function renderBookingSlots(){
    const servicio = bookingServiceEl.value;
    const ocupadas = (OCUPADAS[servicio] && OCUPADAS[servicio][bkSelectedDay]) || [];
    bookingSlotsEl.innerHTML = '';
    HORAS.forEach(hora => {
      const busy = ocupadas.includes(hora);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn' + (bkSelectedSlot === hora ? ' is-selected' : '');
      btn.textContent = hora;
      btn.disabled = busy;
      btn.addEventListener('click', () => {
        bkSelectedSlot = hora;
        renderBookingSlots();
        toggleBookingForm(true);
      });
      bookingSlotsEl.appendChild(btn);
    });
  }

  function toggleBookingForm(show){
    bookingForm.hidden = !show;
    bookingSuccess.hidden = true;
  }

  bookingServiceEl.addEventListener('change', () => {
    bkSelectedSlot = null;
    renderBookingSlots();
    toggleBookingForm(false);
  });

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    /* PHP: aquí se envía el formulario completo a api/citas.php
       (POST) con servicio, fecha, hora y datos del cliente,
       para insertarse en la tabla `citas` y `clientes`. */
    const nombre = document.getElementById('bkName').value;
    const fecha = dias6[bkSelectedDay];
    const fechaTexto = fecha.toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' });
    const servicioTexto = bookingServiceEl.options[bookingServiceEl.selectedIndex].text;

    bookingSummary.textContent = `${nombre}, tu cita de ${servicioTexto} quedó para el ${fechaTexto} a las ${bkSelectedSlot}.`;
    bookingForm.hidden = true;
    bookingSuccess.hidden = false;
  });

  bookingReset.addEventListener('click', () => {
    bookingForm.reset();
    bkSelectedSlot = null;
    renderBookingSlots();
    bookingSuccess.hidden = true;
    bookingForm.hidden = true;
  });

  renderBookingWeek();
  renderBookingSlots();

  /* =========================================================
     ACCESO — tabs cliente / admin
     ========================================================= */
  const accessTabs = document.querySelectorAll('.access-tab');
  const accessSubmit = document.getElementById('accessSubmit');
  const accessForm = document.getElementById('accessForm');

  accessTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      accessTabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected','true');
      const role = tab.dataset.role;
      accessSubmit.textContent = role === 'admin' ? 'Entrar como administrador' : 'Entrar como cliente';
      accessForm.dataset.role = role;
    });
  });

  accessForm.addEventListener('submit', (e) => {
    e.preventDefault();
    /* PHP: aquí se envía { email, password, role } a api/login.php
       vía POST. El backend valida contra la tabla `usuarios`
       (con contraseñas hasheadas) y responde con sesión/token.
       Según el rol, se redirige a panel-cliente.php o panel-admin.php. */
    const role = accessForm.dataset.role || 'cliente';
    alert(
      role === 'admin'
        ? 'Vista de administrador: aquí cargará el panel de gestión de citas, servicios y clientes.'
        : 'Vista de cliente: aquí cargará tu historial de citas y paquetes.'
    );
  });

});
