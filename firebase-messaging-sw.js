// Este arquivo precisa ficar na raiz do repositório, com este nome exato.
// O Firebase procura por ele neste caminho para entregar avisos com o app fechado.

importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDXHFqvF3z_el6kYxNBX9hZjdW5QA7yyp4",
  authDomain: "menstruacao-c9792.firebaseapp.com",
  projectId: "menstruacao-c9792",
  storageBucket: "menstruacao-c9792.firebasestorage.app",
  messagingSenderId: "364523453341",
  appId: "1:364523453341:web:e387647da7d48d0d8dcd74"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const titulo = (payload.notification && payload.notification.title) || 'Lembrete';
  const opcoes = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/icone.png'
  };
  self.registration.showNotification(titulo, opcoes);
});
