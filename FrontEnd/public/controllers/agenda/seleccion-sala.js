document.getElementById('btnRegresarInicio').addEventListener('click', () => {
  window.location.href = '/';
});

// ─── Click en cards ────────────────────────────────────────────────────────
// Las restricciones de Sala Unidad de Duelo (salaId = 3) se validan
// en agenda.js al momento de crear la reservación, NO aquí.
document.querySelectorAll('.sala-card').forEach(card => {
  card.addEventListener('click', () => {
    const salaId     = card.dataset.salaId;
    const salaNombre = card.dataset.salaNombre;

    sessionStorage.setItem('salaId', salaId);
    sessionStorage.setItem('salaNombre', salaNombre);
    window.location.href = '/agenda';
  });
});