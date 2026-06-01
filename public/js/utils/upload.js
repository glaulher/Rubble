function uploadWithProgress(url, formData, { onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'text';
    const token = typeof getToken === 'function' ? getToken() : null;
    if (token) {
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(data.message || 'Erro no upload'));
        } else {
          resolve(data);
        }
      } catch {
        reject(new Error(xhr.status >= 400 ? 'Erro no upload' : 'Resposta invalida do servidor'));
      }
    };
    xhr.onerror = () => reject(new Error('Erro de conexao'));
    xhr.send(formData);
  });
}

function uploadFile({ accept = '.pdf', multiple = false, uploadType, onSuccess, onError, onProgress, onStart }) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = async function () {
      const files = this.files;
      if (!files || files.length === 0) { resolve(); return; }
      if (onStart) onStart(files.length);
      const total = files.length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', uploadType);
        try {
          const data = await uploadWithProgress(
            '/app/api/index.php?route=pv&action=upload',
            formData,
            {
              onProgress: (pct) => {
                if (onProgress) onProgress(pct, file, i, total);
              },
            }
          );
          if (data.success) {
            onSuccess(data.data.filename, file);
          } else {
            onError(data.message || 'Erro no upload', file);
          }
        } catch (err) {
          onError(err.message || 'Erro de conexao', file);
        }
      }
      resolve();
    };
    input.click();
  });
}
