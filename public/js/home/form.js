async function loadHomeForm() {
  const form = document.getElementById('ticketForm');

  if (!form) return;

  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */
  const currentDateEl = document.getElementById('currentDate');
  if (currentDateEl) {
    currentDateEl.textContent = new Date().toLocaleDateString('pt-BR');
  }

  /*
  |--------------------------------------------------------------------------
  | QUERY PARAMS
  |--------------------------------------------------------------------------
  */
  const hash = window.location.hash;

  const queryString = hash.split('?')[1];

  const params = new URLSearchParams(queryString);

  const equipmentId = params.get('id');

  const ticketId = params.get('ticket');

  /*
  |--------------------------------------------------------------------------
  | SET EQUIPMENT
  |--------------------------------------------------------------------------
  */
  const equipmentField = document.getElementById('equipmentId');

  if (equipmentField && equipmentId) {
    equipmentField.value = equipmentId;
  }

  /*
  |--------------------------------------------------------------------------
  | EDIT
  |--------------------------------------------------------------------------
  */
  if (ticketId) {
    document.getElementById('formTitle').textContent = 'Editar manutenção';

    document.getElementById('buttonText').textContent = 'Atualizar registro';

    try {
      const response = await fetch(
        `/app/api/index.php?route=tickets&id=${ticketId}`
      );

      const result = await response.json();

      if (result.success && result.data) {
        const r = result.data;

        document.querySelector('[name="os"]').value = r.os || '';

        document.querySelector('[name="data"]').value = r.data || '';

        document.querySelector('[name="equipe"]').value = r.equipe || '';

        document.querySelector('[name="status"]').value = r.status || '';

        toggleCompletionDate(r.status || '');

        document.querySelector('[name="data_concluido"]').value = r.data_concluido || '';

        document.querySelector('[name="data_planejada"]').value = r.data_planejada || '';

        togglePlannedDate(r.status || '');

        document.querySelector('[name="material"]').value = r.material || '';

        document.querySelector('[name="obs"]').value = r.obs || '';

        document.getElementById('equipmentId').value =
          r.equipamento_id || '';

        document.getElementById('ticketId').value = r.id || '';
      }
    } catch (error) {
      console.error(error);

      showToast('Erro ao carregar registro', 'error');
    }
  }

  /*
  |--------------------------------------------------------------------------
  | STATUS -> COMPLETION DATE
  |--------------------------------------------------------------------------
  */
  function toggleCompletionDate(status) {
    const group = document.getElementById('completionDateGroup');
    const input = document.getElementById('completionDateInput');
    if (!group || !input) return;

    if (status === 'Concluído') {
      group.style.display = 'block';
      input.disabled = false;
      if (!input.value) {
        input.value = new Date().toISOString().split('T')[0];
      }
    } else {
      group.style.display = 'none';
      input.disabled = true;
    }
  }

  function togglePlannedDate(status) {
    const group = document.getElementById('plannedDateGroup');
    const input = document.getElementById('plannedDateInput');
    if (!group || !input) return;

    if (status === 'Planejado') {
      group.style.display = 'block';
      input.disabled = false;
    } else {
      group.style.display = 'none';
      input.disabled = true;
    }
  }

  const statusSelect = document.querySelector('[name="status"]');
  if (statusSelect) {
    statusSelect.addEventListener('change', function () {
      toggleCompletionDate(this.value);
      togglePlannedDate(this.value);
    });
  }

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */
  if (form._submitController) {
    form._submitController.abort();
  }
  form._submitController = new AbortController();
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const data = {
      id: document.getElementById('ticketId').value || null,

      equipamento_id: document.getElementById('equipmentId').value,

      os: document.querySelector('[name="os"]').value.trim(),

      data: document.querySelector('[name="data"]').value,

      equipe: document.querySelector('[name="equipe"]').value.trim(),

      status: document.querySelector('[name="status"]').value,

      data_concluido: document.querySelector('[name="data_concluido"]').value || null,

      data_planejada: document.querySelector('[name="data_planejada"]').value || null,

      material: document.querySelector('[name="material"]').value,

      obs: document.querySelector('[name="obs"]').value.trim(),
    };

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!data.equipamento_id) {
      showToast('Equipamento não encontrado', 'error');

      return;
    }

    if (!data.os) {
      showToast('Informe a OS', 'error');

      return;
    }

    if (!data.data) {
      showToast('Informe a data', 'error');

      return;
    }

    if (!data.equipe) {
      showToast('Informe a equipe', 'error');

      return;
    }

    if (!data.status) {
      showToast('Selecione o status', 'error');

      return;
    }

    if (data.status === 'Planejado' && !data.data_planejada) {
      showToast('Informe a data planejada', 'error');

      return;
    }

    if (!data.material) {
      showToast('Informe material', 'error');

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */
    try {
      const response = await fetch('/app/api/index.php?route=tickets', {
        method: data.id ? 'PUT' : 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        showToast(result.message, 'error');

        return;
      }

      showToast(result.message, 'success');

      setTimeout(() => {
        window.location.hash = '#/';
      }, 800);
    } catch (error) {
      console.error(error);

      showToast('Erro ao salvar registro', 'error');
    }
  }, { signal: form._submitController.signal });
}
