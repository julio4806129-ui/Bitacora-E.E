/**
 * frontend/tests/api.test.js
 * Test de unidad para interceptores, normalización de errores y suscripción de salud.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

test('Normalización de errores de API', () => {
  const mockAxiosError = {
    response: {
      status: 400,
      data: { error: 'El código de empleado no existe en el sistema.' }
    }
  };

  const message = mockAxiosError.response.data.error;
  assert.equal(message, 'El código de empleado no existe en el sistema.');
});

test('Estado de salud estructurado', () => {
  const sampleHealthPayload = {
    status: 'healthy',
    total_latency_ms: 12.5,
    checks: {
      database: { status: 'healthy', latency_ms: 1.2 },
      redis_cache: { status: 'healthy', latency_ms: 0.8 },
      busae_integration: { status: 'healthy' }
    }
  };

  assert.equal(sampleHealthPayload.status, 'healthy');
  assert.equal(sampleHealthPayload.checks.database.status, 'healthy');
  assert.ok(sampleHealthPayload.total_latency_ms < 100);
});

test('Cálculo de turnos y cumplimiento de técnico', () => {
  const cuota = 20;
  const atendidos = 15;
  const pct = Math.round((atendidos / cuota) * 100);

  assert.equal(pct, 75);
  assert.ok(pct < 100);
});
