import { showToast } from '/public/js/core/dom.js';

let lastGeneratedBlob = null;
let lastDownloadFileName = 'Preditiva_preenchida.xlsx';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function initPreditivaParse() {
  lastGeneratedBlob = null;

  const form = document.getElementById('preditivaParseForm');
  const climaDropzone = document.getElementById('climaDropzone');
  const climaFileInput = document.getElementById('climaFileInput');
  const climaPlaceholder = document.getElementById('climaPlaceholder');
  const climaFileInfo = document.getElementById('climaFileInfo');
  const climaFileName = document.getElementById('climaFileName');
  const climaFileSize = document.getElementById('climaFileSize');
  const removeClimaFileBtn = document.getElementById('removeClimaFileBtn');

  const toggleAccordionBtn = document.getElementById('toggleTemplateAccordionBtn');
  const accordionContent = document.getElementById('templateAccordionContent');
  const accordionArrow = document.getElementById('accordionArrow');
  const templateFileInput = document.getElementById('templateFileInput');

  const processBtn = document.getElementById('processBtn');
  const processBtnText = document.getElementById('processBtnText');
  const processBtnIcon = document.getElementById('processBtnIcon');

  const resultsPanel = document.getElementById('resultsPanel');
  const statTotalRows = document.getElementById('statTotalRows');
  const statMatchedRows = document.getElementById('statMatchedRows');
  const statUnmatchedRows = document.getElementById('statUnmatchedRows');
  const downloadGeneratedBtn = document.getElementById('downloadGeneratedBtn');

  if (!form || !climaDropzone || !climaFileInput) return;

  function updateSelectedClimaFile(file) {
    if (!file) {
      climaFileInput.value = '';
      climaPlaceholder.classList.remove('hidden');
      climaFileInfo.classList.add('hidden');
      climaFileName.textContent = '';
      climaFileSize.textContent = '';
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      showToast('Por favor, selecione um arquivo no formato .xlsx', 'error');
      updateSelectedClimaFile(null);
      return;
    }

    climaFileName.textContent = file.name;
    climaFileSize.textContent = formatBytes(file.size);
    climaPlaceholder.classList.add('hidden');
    climaFileInfo.classList.remove('hidden');
    climaFileInfo.classList.add('flex');
  }

  // Eventos de clique na Dropzone
  climaDropzone.addEventListener('click', (e) => {
    if (e.target.closest('#removeClimaFileBtn')) return;
    climaFileInput.click();
  });

  climaFileInput.addEventListener('change', () => {
    if (climaFileInput.files && climaFileInput.files[0]) {
      updateSelectedClimaFile(climaFileInput.files[0]);
    }
  });

  removeClimaFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateSelectedClimaFile(null);
  });

  // Drag and Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    climaDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      climaDropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    climaDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      climaDropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
    });
  });

  climaDropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      climaFileInput.files = dt.files;
      updateSelectedClimaFile(dt.files[0]);
    }
  });

  // Accordion Template Opcional
  if (toggleAccordionBtn && accordionContent) {
    toggleAccordionBtn.addEventListener('click', () => {
      const isHidden = accordionContent.classList.contains('hidden');
      if (isHidden) {
        accordionContent.classList.remove('hidden');
        if (accordionArrow) accordionArrow.innerHTML = '&#9662;';
      } else {
        accordionContent.classList.add('hidden');
        if (accordionArrow) accordionArrow.innerHTML = '&#9656;';
      }
    });
  }

  // Baixar Novamente
  if (downloadGeneratedBtn) {
    downloadGeneratedBtn.addEventListener('click', () => {
      if (!lastGeneratedBlob) {
        showToast('Nenhum arquivo gerado em cache.', 'error');
        return;
      }
      triggerBlobDownload(lastGeneratedBlob, lastDownloadFileName);
    });
  }

  // Submit do formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const climaFile = climaFileInput.files ? climaFileInput.files[0] : null;
    if (!climaFile) {
      showToast('Por favor, selecione a planilha CLIMA antes de processar.', 'error');
      return;
    }

    const token = sessionStorage.getItem('rubble_token');
    if (!token) {
      showToast('Sessão expirada. Faça login novamente.', 'error');
      window.location.hash = '#/login';
      return;
    }

    const formData = new FormData();
    formData.append('clima_file', climaFile);

    if (templateFileInput && templateFileInput.files && templateFileInput.files[0]) {
      formData.append('template_file', templateFileInput.files[0]);
    }

    setProcessingState(true);

    try {
      showToast('Cruzando dados das planilhas...', 'loading');

      const response = await fetch('/app/api/index.php?route=preditiva-parse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMsg = 'Erro ao processar planilha.';
        try {
          const errData = await response.json();
          if (errData && errData.message) errorMsg = errData.message;
        } catch (_) {}
        showToast(errorMsg, 'error');
        setProcessingState(false);
        return;
      }

      // Lê estatísticas do header
      const statsHeader = response.headers.get('X-Parse-Stats');
      let stats = { total_rows: 0, matched_rows: 0, unmatched_rows: 0 };
      if (statsHeader) {
        try {
          stats = JSON.parse(statsHeader);
        } catch (_) {}
      }

      // Lê nome do arquivo do header ou gera default
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'Preditiva_preenchida_' + new Date().toISOString().slice(0, 10) + '.xlsx';
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      lastGeneratedBlob = blob;
      lastDownloadFileName = filename;

      // Atualiza o painel de métricas
      statTotalRows.textContent = stats.total_rows || 0;
      statMatchedRows.textContent = stats.matched_rows || 0;
      statUnmatchedRows.textContent = stats.unmatched_rows || 0;
      resultsPanel.classList.remove('hidden');

      // Baixa automaticamente
      triggerBlobDownload(blob, filename);

      showToast('Planilha processada e baixada com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao processar:', err);
      showToast('Erro de comunicação com o servidor.', 'error');
    } finally {
      setProcessingState(false);
    }
  });

  function setProcessingState(isProcessing) {
    processBtn.disabled = isProcessing;
    if (isProcessing) {
      processBtnText.textContent = 'Processando...';
      processBtnIcon.innerHTML = `
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      `;
      processBtnIcon.classList.add('animate-spin');
    } else {
      processBtnText.textContent = 'Processar e Gerar Planilha';
      processBtnIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
      processBtnIcon.classList.remove('animate-spin');
    }
  }

  function triggerBlobDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}
