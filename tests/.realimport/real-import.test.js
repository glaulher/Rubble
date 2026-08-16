import { describe, test, expect } from 'bun:test';
describe('import real graph', () => {
  test('planned-activity/list.js', async () => {
    const mod = await import('/public/js/planned-activity/list.js');
    expect(typeof mod.renderPlanned).toBe('function');
  });
  test('pending-tickets/list.js', async () => {
    const mod = await import('/public/js/pending-tickets/list.js');
    expect(typeof mod.initPendingTickets).toBe('function');
  });
  test('preventive-cycle/list.js', async () => {
    const mod = await import('/public/js/preventive-cycle/list.js');
    expect(typeof mod._cycleCollectSaveItems).toBe('function');
  });
  test('filter-exchanges/list.js', async () => {
    const mod = await import('/public/js/filter-exchanges/list.js');
    expect(typeof mod.initFilterExchanges).toBe('function');
  });
  test('plan-modal.js', async () => {
    const mod = await import('/public/js/components/plan-modal.js');
    expect(typeof mod.PlanModal.open).toBe('function');
  });
});
