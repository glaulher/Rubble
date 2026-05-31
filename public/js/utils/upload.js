async function uploadFile({ accept = '.pdf', multiple = false, uploadType, onSuccess, onError }) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;
  input.onchange = async function () {
    const files = this.files;
    if (!files || files.length === 0) return;
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);
      try {
        const res = await fetch('/app/api/index.php?route=pv&action=upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          onSuccess(data.data.filename, file);
        } else {
          onError(data.message || 'Erro no upload', file);
        }
      } catch (err) {
        onError('Erro de conexao', file);
      }
    }
  };
  input.click();
}
