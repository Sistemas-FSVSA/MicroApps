document.getElementById('btnRegresarInicio').addEventListener('click', () => {
  window.location.href = '/';
});

document.querySelectorAll('.sala-card').forEach(card => {
  card.addEventListener('click', () => {
    const salaId     = card.dataset.salaId;
    const salaNombre = card.dataset.salaNombre;

    sessionStorage.setItem('salaId', salaId);
    sessionStorage.setItem('salaNombre', salaNombre);

    window.location.href = '/agenda';
  });
});