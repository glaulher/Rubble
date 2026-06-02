function openPvEmailModal(options) {
  const isBatch = options && options.batch;
  const pv = isBatch ? null : pvEmailPvData;
  const pvs = isBatch ? (options.pvs || []) : null;

  if (!isBatch && !pv) {
    showToast('Erro: dados da PV n\u00e3o dispon\u00edveis', 'error');
    return;
  }

  if (isBatch && (!pvs || pvs.length === 0)) {
    showToast('Erro: dados das PVs n\u00e3o dispon\u00edveis', 'error');
    return;
  }

  const firstPv = isBatch ? pvs[0] : pv;
  const uf = firstPv.uf || '';
  const allOs = isBatch
    ? pvs.map(p => p.os || '').filter(Boolean).join(', ')
    : (pv.os || '-');
  const allPvNums = isBatch
    ? pvs.map(p => p.numero_pv || '-').join(', ')
    : (pv.numero_pv || '-');
  const subjectPrefix = isBatch ? 'PVs: ' + allPvNums : 'PV: ' + (pv.numero_pv || '-');

  const localGroup = document.getElementById('pvEmailLocalGroup');
  const localInput = document.getElementById('pvEmailLocal');
  const isFornecimento = isBatch ? false : (firstPv.equipamento_id == 229);
  const displayLocal = isFornecimento ? '' : (firstPv.local || '');
  const displayAddress = firstPv.local_do_endereco || firstPv.local || '';

  localInput.value = firstPv.local || '';
  if (isFornecimento) {
    localGroup.classList.remove('hidden');
  } else {
    localGroup.classList.add('hidden');
  }

  function buildSubject(localVal) {
    const loc = localVal || displayLocal || '-';
    const addr = localVal || displayAddress || '-';
    return {
      materiais: subjectPrefix + ' - ' + loc + ' - Aquisi\u00e7\u00e3o de Materiais - ' + addr + ' - ' + allOs,
      servicos: subjectPrefix + ' - ' + loc + ' - Execu\u00e7\u00e3o de servi\u00e7os - ' + addr + ' - ' + allOs,
      contratacao: subjectPrefix + ' - ' + loc + ' - Contrata\u00e7\u00e3o de Servi\u00e7os - ' + addr + ' - ' + allOs,
    };
  }

  let subjects = buildSubject('');

  document.getElementById('subjectMateriais').textContent = subjects.materiais;
  document.getElementById('subjectServicos').textContent = subjects.servicos;
  document.getElementById('subjectContratacao').textContent = subjects.contratacao;

  document.querySelectorAll('input[name="pvSubject"]').forEach((r) => (r.checked = false));

  const ufGroup = document.getElementById('pvUfGroup');
  if (isBatch || uf === 'ES' || uf === 'RJ') {
    ufGroup.classList.add('hidden');
  } else {
    ufGroup.classList.remove('hidden');
    document.querySelectorAll('input[name="pvUf"]').forEach((r) => (r.checked = false));
  }

  localInput.oninput = function () {
    const val = this.value.trim() || firstPv.local || '';
    subjects = buildSubject(val);
    document.getElementById('subjectMateriais').textContent = subjects.materiais;
    document.getElementById('subjectServicos').textContent = subjects.servicos;
    document.getElementById('subjectContratacao').textContent = subjects.contratacao;
  };

  if (isBatch) {
    pvEmailPvId = null;
    pvEmailPvData = null;
    pvEmailBatchIds = options.ids || [];
    pvEmailBatchUf = firstPv.uf || '';
  } else {
    pvEmailBatchIds = null;
    hideModal('pvItemModal');
  }
  showModal('pvEmailModal');
}

function closePvEmailModal() {
  pvEmailBatchIds = null;
  pvEmailBatchUf = null;
  hideModal('pvEmailModal');
}

async function sendPvEmail() {
  const selected = document.querySelector('input[name="pvSubject"]:checked');
  if (!selected) {
    showToast('Selecione um assunto', 'error');
    return;
  }

  const isBatch = pvEmailBatchIds !== null && pvEmailBatchIds.length > 0;

  const ufEl = document.querySelector('input[name="pvUf"]:checked');
  const uf = isBatch ? pvEmailBatchUf : (ufEl?.value || pvEmailPvData?.uf || '');
  if (!uf && !isBatch) {
    showToast('Selecione a UF', 'error');
    return;
  }

  const local = document.getElementById('pvEmailLocal').value.trim() || '';

  const btn = document.getElementById('btnSendPvEmail');
  const originalText = btn ? btn.textContent : 'Enviar';
  if (btn) {
    btn.textContent = 'Enviando...';
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
  }

  if (!isBatch && !pvEmailPvId) {
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
    showToast('Erro: dados da PV n\u00e3o dispon\u00edveis', 'error');
    return;
  }

  const endpoint = isBatch ? 'send-batch-email' : 'send-email';
  const body = isBatch
    ? { ids: pvEmailBatchIds, subject: selected.value, uf, local }
    : { id: pvEmailPvId, subject: selected.value, uf, local };

  try {
    const response = await fetch('/app/api/index.php?route=pv&action=' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (result.success) {
      if (!isBatch) {
        const statusRes = await fetch('/app/api/index.php?route=pv', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pv_id: pvEmailPvId, status: 'E-mail de lib. aquisi\u00e7\u00e3o/servi\u00e7o' }),
        });
        if (!statusRes.ok) {
          showToast('E-mail enviado, mas falha ao atualizar status', 'error');
        } else {
          showToast(result.message, 'success');
        }
      } else {
        showToast(result.message, 'success');
      }
      closePvEmailModal();
      resetPvState(pvSearch, pvStatusFilter, pvCycleFilter, true);
      await loadPvs();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('Erro ao enviar e-mail', 'error');
    console.error(err);
  } finally {
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
  }
}
