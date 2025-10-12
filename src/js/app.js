/*======= SHOW MENU =======*/
const showMenu = (toggleId, navId) => {
    const toggle = document.getElementById(toggleId),
        nav = document.getElementById(navId);

    toggle.addEventListener('click', () => {
        nav.classList.toggle('show-menu');
        toggle.classList.toggle('show-icon');
    });

    const dropdownToggle = document.querySelector('.navM__dropdown-toggle');
    const dropdownParent = document.querySelector('.navM__dropdown');

    // Cierra menú al hacer clic en cualquier link que NO sea el botón de dropdown
    const navLinks = document.querySelectorAll(`#${navId} .navM__link`);
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Si NO es el botón del dropdown, cierra menú y dropdown
            if (!link.classList.contains('navM__dropdown-toggle')) {
                nav.classList.remove('show-menu');
                toggle.classList.remove('show-icon');
                if (dropdownParent.classList.contains('active')) {
                    dropdownParent.classList.remove('active');
                }
            }
        });
    });

    // Activa el dropdown al tocar "Productos"
    if (dropdownToggle && dropdownParent) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault(); // evita que navegue
            dropdownParent.classList.toggle('active');
        });
    }
};

showMenu('navM-toggle', 'navM-menu');


/*==================== VALIDAR FORMULARIO ====================*/

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.contact__form');
  const inputs = Array.from(form.querySelectorAll('.contact__input, .contact__textarea'));
  const submitBtn = form.querySelector('.contact__button');
  const flash = form.querySelector('#contactFlash');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const stripSpaces = (s) => (s || '').replace(/\s/g, '');
  const isBlankIgnoringSpaces = (s) => stripSpaces(s) === '';

  function getErrorEl(field){ return field.closest('.contact__field').querySelector('.contact__error'); }
  function showError(field, msg){ const el = getErrorEl(field); el.textContent = msg; el.classList.add('is-visible'); }
  function clearError(field){ const el = getErrorEl(field); el.textContent = ''; el.classList.remove('is-visible'); }

  function validateField(field){
    const name = field.name;
    const value = (field.value || '').trim();

    if (name === 'name'){
      if (isBlankIgnoringSpaces(value)){ showError(field, 'Por favor, ingresa tu nombre completo.'); return false; }
      clearError(field); return true;
    }
    if (name === 'email'){
      if (isBlankIgnoringSpaces(value)){ showError(field, 'Por favor, ingresa tu correo electrónico.'); return false; }
      if (!emailRegex.test(value)){ showError(field, 'El correo no es válido.'); return false; }
      clearError(field); return true;
    }
    if (name === 'message'){
      const realChars = stripSpaces(field.value);
      if (realChars.length < 10){ showError(field, 'El mensaje debe tener al menos 10 caracteres.'); return false; }
      clearError(field); return true;
    }
    return true;
  }

  function validateForm(){
    let ok = true;
    inputs.forEach(f => { if (!validateField(f)) ok = false; });
    submitBtn.disabled = !ok;
    return ok;
  }

  inputs.forEach(f => {
    f.addEventListener('input', validateForm);
    f.addEventListener('blur', () => validateField(f));
  });

  let hideTimer = null;
  function showFlash(html){
    flash.innerHTML = html;
    flash.hidden = false;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { flash.hidden = true; }, 3000);
  }

  async function sendWithWeb3Forms(){
    const action = form.getAttribute('action') || 'https://api.web3forms.com/submit';
    const fd = new FormData(form);
    const res = await fetch(action, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    // Web3Forms responde JSON con { success: true/false, message: "" }
    return await res.json();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Usamos AJAX para mostrar el toast sin recargar

    if (!validateForm()){
      const firstInvalid = inputs.find(f => !validateField(f));
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    submitBtn.disabled = true;

    try {
      const data = await sendWithWeb3Forms();
      const ok = data && data.success === true;

      if (ok){
        showFlash('¡Mensaje enviado!<br>En breve nos pondremos en contacto con usted.');
        form.reset();
        inputs.forEach(clearError);
      } else {
        showFlash('Hubo un error al enviar: ' + (data && data.message ? data.message : 'Intenta de nuevo.'));
      }
    } catch (err){
      console.error(err);
      showFlash('Hubo un error al enviar. Verifica tu conexión o inténtalo más tarde.');
    } finally {
      submitBtn.disabled = true; // Se re-habilita automáticamente cuando el usuario vuelva a escribir
    }
  });

  submitBtn.disabled = true; // inicio
});



/*======= ACTUALIZAR AÑO FOOTER =======*/
document.getElementById("year").textContent = new Date().getFullYear(); 