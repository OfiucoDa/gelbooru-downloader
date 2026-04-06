browser.storage.local.get('downloadPath').then((result) => {
    document.getElementById('downloadPath').value = result.downloadPath || '';
});

document.getElementById('save').addEventListener('click', () => {
    const downloadPath = document.getElementById('downloadPath').value;
    const status = document.getElementById('status');

    browser.storage.local.set({ downloadPath })
        .then(() => {
            status.textContent = 'Configuración guardada correctamente';
            status.className = 'status success';
            status.style.display = 'block';
        })
        .catch((error) => {
            status.textContent = 'Error al guardar la configuración: ' + error.message;
            status.className = 'status error';
            status.style.display = 'block';
        });

    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}); 