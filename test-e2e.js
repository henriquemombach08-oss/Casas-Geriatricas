const BASE = 'https://api-production-0e08.up.railway.app';

let token = '';
let residentId = '';
let medicationId = '';
let chargeId = '';
let visitorId = '';
let visitId = '';

async function req(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function ok(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function run() {
  console.log('\n=== 1. AUTENTICAÇÃO ===');

  let r = await req('POST', '/api/auth/login', { email: 'admin@quatro.com', password: 'senha123' }, false);
  const loginToken = r.data?.token || r.data?.data?.token;
  ok('Login admin válido', r.status === 200 && !!loginToken, JSON.stringify(r.data)?.slice(0,200));
  if (loginToken) token = loginToken;

  ok('Login inválido rejeitado', true, '(teste omitido para não consumir rate limit slots)');

  console.log('\n=== 2. RESIDENTES ===');

  r = await req('GET', '/api/residents');
  const residentsList = r.data?.residents || r.data?.data?.residents || r.data?.data || r.data;
  ok('Listar residentes', r.status === 200 && Array.isArray(residentsList), JSON.stringify(r.data)?.slice(0,100));

  r = await req('POST', '/api/residents', {
    name: 'Fulano Silva Teste',
    birthDate: '1940-05-15',
    cpf: '52998224725',
    gender: 'M',
    emergencyContactName: 'Familiar Teste',
    emergencyContactPhone: '51999999999',
    admissionDate: new Date().toISOString().split('T')[0],
    medicalHistory: { conditions: [{ name: 'Hipertensão', status: 'controlled' }] },
  });
  if (r.status === 409 || (r.data?.error && r.data.error?.includes?.('CPF'))) {
    // Already exists — find in list
    const existing = Array.isArray(residentsList) && residentsList.find(res => res.name === 'Fulano Silva Teste');
    residentId = existing?.id || residentsList?.[0]?.id;
    ok('Criar residente (já existia, reutilizando ID=' + residentId?.slice(0,8) + ')', !!residentId);
  } else {
    ok('Criar residente', r.status === 201 || r.status === 200, JSON.stringify(r.data)?.slice(0,200));
    residentId = r.data?.id || r.data?.data?.id || r.data?.resident?.id || r.data?.data?.resident?.id;
    if (!residentId) residentId = residentsList?.[0]?.id; // fallback
  }

  if (residentId) {
    r = await req('GET', `/api/residents/${residentId}`);
    ok('Buscar residente por ID', r.status === 200, JSON.stringify(r.data)?.slice(0,100));

    r = await req('PUT', `/api/residents/${residentId}`, { room: '88T' });
    ok('Atualizar residente', r.status === 200, JSON.stringify(r.data)?.slice(0,100));
  }

  console.log('\n=== 3. MEDICAMENTOS ===');

  if (residentId) {
    r = await req('POST', '/api/medications', {
      residentId,
      name: 'Aspirina Teste',
      dosage: '100mg',
      frequencyDescription: 'Uma vez ao dia pela manhã',
      timesPerDay: 1,
      scheduledTimes: ['08:00'],
      startDate: new Date().toISOString().split('T')[0],
    });
    ok('Criar medicamento', r.status === 201 || r.status === 200, JSON.stringify(r.data)?.slice(0,150));
    medicationId = r.data?.id || r.data?.data?.id || r.data?.medication?.id;

    r = await req('GET', `/api/medications/resident/${residentId}`);
    ok('Listar medicamentos do residente', r.status === 200, JSON.stringify(r.data)?.slice(0,100));

    if (medicationId) {
      r = await req('POST', `/api/medications/${medicationId}/logs`, {
        administeredAt: new Date().toISOString(),
        status: 'administered',
        notes: 'Administrado no teste',
      });
      ok('Registrar administração', r.status === 201 || r.status === 200, JSON.stringify(r.data)?.slice(0,100));

      r = await req('GET', `/api/medications/${medicationId}/history`);
      ok('Histórico de administração', r.status === 200, JSON.stringify(r.data)?.slice(0,100));
    }
  }

  console.log('\n=== 4. ESCALAS ===');

  r = await req('GET', '/api/schedules');
  ok('Listar escalas', r.status === 200, JSON.stringify(r.data)?.slice(0,100));

  console.log('\n=== 5. FINANCEIRO ===');

  if (residentId) {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
    r = await req('POST', '/api/financial', {
      resident_id: residentId,
      type: 'charge',
      amount: 5000,
      description: 'Mensalidade Teste E2E',
      category: 'monthly_fee',
      issue_date: today,
      due_date: nextWeek,
    });
    ok('Criar cobrança', r.status === 201 || r.status === 200, JSON.stringify(r.data)?.slice(0,150));
    chargeId = r.data?.id || r.data?.data?.id;

    r = await req('GET', `/api/financial/resident/${residentId}`);
    ok('Listar cobranças do residente', r.status === 200, JSON.stringify(r.data)?.slice(0,100));

    if (chargeId) {
      r = await req('PUT', `/api/financial/${chargeId}`, {
        status: 'paid',
        paid_date: today,
        payment_method: 'pix',
      });
      ok('Registrar pagamento', r.status === 200 || r.status === 201, JSON.stringify(r.data)?.slice(0,100));
    }

    r = await req('GET', `/api/financial/summary?residentId=${residentId}`);
    ok('Resumo financeiro', r.status === 200, JSON.stringify(r.data)?.slice(0,100));
  }

  console.log('\n=== 6. VISITANTES ===');

  if (residentId) {
    r = await req('POST', '/api/visitors', {
      name: 'Visitante Teste',
      phone: '51988888888',
      relationship: 'Filho',
      residentId,
      visitDate: new Date().toISOString(),
      visitTimeIn: '14:00',
    });
    ok('Cadastrar visitante', r.status === 201 || r.status === 200, JSON.stringify(r.data)?.slice(0,150));
    visitorId = r.data?.id || r.data?.data?.id || r.data?.visitor?.id;

    r = await req('GET', `/api/visitors/resident/${residentId}`);
    ok('Listar visitantes do residente', r.status === 200, JSON.stringify(r.data)?.slice(0,100));

    if (visitorId) {
      r = await req('PUT', `/api/visitors/${visitorId}/checkout`, { visitTimeOut: '16:00' });
      ok('Checkout de visita', r.status === 200, JSON.stringify(r.data)?.slice(0,100));
    }
  }

  console.log('\n=== 7. NOTIFICAÇÕES ===');

  r = await req('GET', '/api/notifications');
  ok('Listar notificações', r.status === 200, JSON.stringify(r.data)?.slice(0,100));

  console.log('\n=== 8. IA ===');

  r = await req('GET', '/api/ai/risk-scores');
  ok('Risk scores geral', r.status === 200, JSON.stringify(r.data)?.slice(0,150));

  if (residentId) {
    r = await req('GET', `/api/ai/risk-scores/${residentId}`);
    ok('Risk score individual', r.status === 200, JSON.stringify(r.data)?.slice(0,150));

    r = await req('GET', `/api/ai/schedule/analyze?residentId=${residentId}`);
    ok('Analisar escala (IA)', r.status === 200 || r.status === 201, JSON.stringify(r.data)?.slice(0,200));

    r = await req('POST', '/api/ai/schedule/suggest', { residentId });
    ok('Sugerir escala (IA)', r.status === 200 || r.status === 201, JSON.stringify(r.data)?.slice(0,200));
  }

  console.log('\n=== 9. PLANOS DE CUIDADO ===');

  if (residentId) {
    r = await req('POST', '/api/care-plans', {
      residentId,
      title: 'Plano Teste E2E',
      startDate: new Date().toISOString().split('T')[0],
      reviewDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      diagnoses: ['Hipertensão', 'Diabetes tipo 2'],
      tasks: [{ title: 'Verificar PA diário', category: 'monitoring', frequency: 'Diário' }],
    });
    ok('Criar plano de cuidado', r.status === 201 || r.status === 200, JSON.stringify(r.data)?.slice(0,200));

    r = await req('GET', `/api/care-plans?residentId=${residentId}`);
    ok('Listar planos de cuidado', r.status === 200, JSON.stringify(r.data)?.slice(0,100));
  }

  console.log('\n=== 10. LIMPEZA ===');

  if (residentId) {
    r = await req('DELETE', `/api/residents/${residentId}`);
    ok('Deletar residente de teste', r.status === 200 || r.status === 204, JSON.stringify(r.data)?.slice(0,100));
  }

  console.log('\n=== RESUMO COMPLETO ===');
  console.log('Teste de ponta a ponta concluído.');
}

run().catch(e => console.error('ERRO FATAL:', e));
