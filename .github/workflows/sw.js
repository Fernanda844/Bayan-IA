// sw.js

const CACHE_NAME = 'bayan-ia-cache-v1';
// Estes são os arquivos principais para o shell do aplicativo.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  // Na configuração exclusiva deste projeto, o index.tsx é buscado diretamente.
  // Em uma compilação típica, seria um arquivo JS empacotado.
  '/index.tsx', 
];

// Evento de instalação: abre o cache e adiciona os arquivos do shell do aplicativo a ele.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Armazenando o shell do aplicativo em cache');
      return cache.addAll(urlsToCache);
    }).catch(error => {
      console.error('Falha ao armazenar o shell do aplicativo em cache:', error);
    })
  );
});

// Evento de ativação: limpa caches antigos.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deletando cache antigo', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Evento de busca: serve ativos do cache ou da rede.
// Usa uma estratégia "Cache-First" para velocidade.
self.addEventListener('fetch', (event) => {
    // Queremos lidar apenas com solicitações GET.
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Para solicitações de navegação (como abrir o aplicativo), use uma estratégia de Network-first
    // para garantir que o usuário sempre obtenha o HTML mais recente.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Para outras solicitações (CSS, JS, imagens), use uma estratégia Cache-first.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Se o recurso estiver no cache, sirva-o.
            if (cachedResponse) {
                return cachedResponse;
            }

            // Caso contrário, vá para a rede.
            return fetch(event.request).then((networkResponse) => {
                // Se recebermos uma resposta válida, clone-a, armazene-a em cache e retorne-a.
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            });
        })
    );
});
