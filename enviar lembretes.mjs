// Roda no GitHub Actions, uma vez por dia. Lê o ciclo no Firestore, calcula a previsão
// a partir do último primeiro dia registrado e envia o aviso quando faltam 5, 3 ou 0 dias.

import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const messaging = admin.messaging();

const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function diaUTC(s){ const p = s.split('-').map(Number); return Date.UTC(p[0], p[1]-1, p[2]); }
function isoDeUTC(ms){
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,'0');
  const dia = String(d.getUTCDate()).padStart(2,'0');
  return y+'-'+m+'-'+dia;
}
function porExtenso(s){ const p = s.split('-').map(Number); return p[2]+' de '+meses[p[1]-1]; }

// data de hoje no fuso de Brasília
const hojeStr = new Intl.DateTimeFormat('en-CA', {
  timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit'
}).format(new Date());

// lê o ciclo
const snap = await db.collection('ciclo').doc('principal').get();
if(!snap.exists){ console.log('Documento de ciclo não encontrado.'); process.exit(0); }

const ciclo = snap.data();
const periods = (ciclo.periods || []).slice().sort();
if(periods.length === 0){ console.log('Sem datas registradas.'); process.exit(0); }

const duracaoCiclo = ciclo.duracaoCiclo || 28;
const ultimo = periods[periods.length-1];
const predStr = isoDeUTC(diaUTC(ultimo) + duracaoCiclo*86400000);
const diff = Math.round((diaUTC(predStr) - diaUTC(hojeStr)) / 86400000);

let texto = null;
if(diff === 5) texto = 'Faltam 5 dias. Sua menstruação deve começar em '+porExtenso(predStr)+'.';
else if(diff === 3) texto = 'Faltam 3 dias. Sua menstruação deve começar em '+porExtenso(predStr)+'.';
else if(diff === 0) texto = 'É hoje. Sua menstruação deve começar hoje, '+porExtenso(predStr)+'. Registre quando ela chegar.';

if(!texto){ console.log('Hoje não é dia de aviso. Faltam '+diff+' dias para a previsão.'); process.exit(0); }

// lê os tokens
const tdocs = await db.collection('tokens').get();
const tokens = tdocs.docs.map(d => d.data().token).filter(Boolean);
if(tokens.length === 0){ console.log('Nenhum token cadastrado.'); process.exit(0); }

const resposta = await messaging.sendEachForMulticast({
  tokens,
  notification: { title: 'Minha menstruação', body: texto }
});
console.log('Aviso de '+diff+' dias. Enviadas: '+resposta.successCount+'. Falhas: '+resposta.failureCount+'.');

// remove tokens inválidos
resposta.responses.forEach((r, i) => {
  if(!r.success){
    const codigo = (r.error && r.error.code) || '';
    if(codigo.includes('registration-token-not-registered') || codigo.includes('invalid-argument')){
      db.collection('tokens').doc(tokens[i]).delete();
    }
  }
});
