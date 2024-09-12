const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
//userSocketMap
const userSocketMap = new Map();

const app = express();
app.use(express.json());
const server = http.createServer(app);

const staticOptions = {
  etag: false,
  maxAge: '1d',
  index: false,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.setHeader('Expires', new Date(Date.now() + 86400000).toUTCString());
  },
};

app.use(express.static(path.join(__dirname, '/dist'), staticOptions));

const api_ssr = 'https://api.armortemplate.site';

// const api_ssr = 'https://api-' + 'subdominioEdit' + '.armortemplate.site';

// app.use((req, res, next) => {
//   res.setHeader('Cache-Control', 'no-store');
//   next();
// });

const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

app.get('/message', (req, res) => {
  // const { message } = req.body;
  console.log('Mensaje recibido:');
  io.emit('message', 'hola');
  res.send('Mensaje enviado');
});

const messages = [];
// Manejador de conexiones de Socket.io
io.on('connection', (socket) => {
  console.log('Un cliente se ha conectado.');

  // io.emit('notificationSocket');
  //enviar mensaje al recibirlo

  // Manejar eventos personalizados aquí
  socket.on('MESSAGES_SERVER', () => {
    // console.log('Mensaje recibido:', msg);
    // io.emit('MESSAGES_CLIENT', messages); // Enviar el mensaje a todos los clientes
    //broadcast
    // socket.broadcast.emit("hello", "world");
    socket.emit('MESSAGES_CLIENT', messages);
  });

  socket.on('NEW_MESSAGE_SERVER', (data) => {
    console.log('Mensaje recibido:', data);
    messages.push(data);
    // io.emit('NEW_MESSAGE_CLIENT', data); // Enviar el mensaje a todos los clientes
    //BROADCAST
    // socket.emit('NEW_MESSAGE_CLIENT', data);
    socket.broadcast.emit('NEW_MESSAGE_CLIENT', data);
  });
  //

  // Manejar evento para unirse a un canal privado
  // socket.on('unirse-a-canal-privado', (userId) => {
  //   userSocketMap.set(userId, socket.id);
  //   console.log(`Usuario ${userId} se unió al canal privado.`);
  // });

  // Manejar evento para unirse a una sala privada
  socket.on('unirse-a-sala-privada', (roomId) => {
    socket.join(roomId);
    console.log(`Usuario ${socket.id} se unió a la sala privada ${roomId}`);
  });

  // Manejar evento de mensaje privado
  socket.on('mensaje-privado', ({ roomId, mensaje }) => {
    // Enviar el mensaje a todos los usuarios en la sala privada menos al remitente
    socket.broadcast.to(roomId).emit('mensaje', mensaje);
    console.log(`Mensaje enviado a la sala privada ${roomId}: ${mensaje}`);
  });

  // Manejar evento de desconexión
  socket.on('disconnect', () => {
    console.log('Un cliente se ha desconectado.');
    // Eliminar la asociación entre el ID de usuario y el ID de socket al desconectar
    // for (const [userId, socketId] of userSocketMap) {
    //   if (socketId === socket.id) {
    //     userSocketMap.delete(userId);
    //     console.log(`Usuario ${userId} desconectado.`);
    //     break;
    //   }
    // }
  });
});

function textHTML(html) {
  // Cargar la cadena HTML en Cheerio
  const $ = cheerio.load(html);

  // Utilizar la función text() para obtener el texto sin formato
  const texto = $('body').text();

  // Devolver el texto extraído
  return texto;
}

//ssr de site products
app.get('/products/:slug', async (req, res) => {
  let data = {};
  try {
    // const response = await axios.get(
    //   // `https://api.armortemplate.site/products/${req.params.id_product}`,
    //   `${api_ssr}/products/${req.params.id_product}`,
    // );
    // console.log('SSR PRODUCTS', response.data.metaData);
    // data = response.data.metaData;
    //ahora hay que hacer un find con slug
    const response = await axios.get(
      `${api_ssr}/products?slug=${req.params.slug}`,
    );
    console.log('SSR PRODUCTS', response.data.data[0]);
    data = response.data.data[0];
  } catch (error) {
    console.error(error);
  }
  //backup meta
  // const metaTags = `
  //       <title>${data.title}</title>
  //       <meta name="description" content=" ${data.content}">
  //       <meta itemprop="image" content="${data.img}">
  //       <meta property="og:image" itemprop="image" content="${data.img}">
  //       <!-- Otras metaetiquetas dinámicas -->
  //   `;

  const metaTags = `
        <!-- HTML Meta Tags -->
  <title>${data.title}</title>
  <meta name="description" content="${data.content}">

  <!-- Google / Search Engine Tags -->
  <meta itemprop="name" content="${data.title}">
  <meta itemprop="description" content="${data.content}">
  <meta itemprop="image" content="${data.metaData.img}">

  <!-- Facebook Meta Tags -->
  <meta property="og:url" content="${api_ssr}/products/${req.params.id_product}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${data.title}">
  <meta property="og:description" content="${data.content}">
  <meta property="og:image" content="${data.metaData.img}">

  <!-- Twitter Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@nombre_de_usuario_del_sitio">
  <meta name="twitter:site:id" content="ID_de_Twitter_del_sitio">
  <meta name="twitter:title" content="${data.title}">
  <meta name="twitter:description" content="${data.content}">
  <meta name="twitter:image" content="${data.metaData.img}">
    `;

  // Lee el archivo "index.html"
  const indexPath = path.join(__dirname, '/dist', 'index.html');
  fs.readFile(indexPath, 'utf-8', (err, html) => {
    const modifiedHtml = html.replace('<title></title>', `${metaTags}`);
    if (err) {
      console.error('Error al leer el archivo index.html', err);
      res.send(modifiedHtml);
      // return res.status(500).send('Error interno del servidor');
    }

    // Inserta las metaetiquetas dinámicas en el archivo "index.html" creadas en ej objeto metaTags

    // Envía el archivo "index.html" modificado con las metaetiquetas
    res.send(modifiedHtml);
  });
});

//ssr de site events
app.get('/events/:id_event', async (req, res) => {
  console.log('SSR EVENTS');
  let data = {};
  try {
    const response = await axios.get(
      // `https://api.armortemplate.site/events/${req.params.id_event}`,
      `${api_ssr}/events/${req.params.id_event}`,
    );
    console.log('SSR EVENTOS', response.data.metaData);
    data = response.data.metaData;
  } catch (error) {}

  // Aquí puedes generar dinámicamente las metaetiquetas según el ID del producto
  // Aca se puede agregar meta tags dinamicos para el caso de productos tambien se puede hacer para categorias o con cualquier ruta
  // <meta itemprop="image" content="https://i.ibb.co/BNRGXxY/140x140.png">
  //       <meta property="og:image" itemprop="image" content="https://i.ibb.co/BNRGXxY/140x140.png">
  // console.log(response.data.metaData);
  const metaTags = `
        <!-- HTML Meta Tags -->
        <title>${data.title}</title>
        <meta name="description" content="${data.content}">

        <!-- Google / Search Engine Tags -->
        <meta itemprop="name" content="${data.title}">
        <meta itemprop="description" content="${data.content}">
        <meta itemprop="image" content="${data.img}">

        <!-- Facebook Meta Tags -->
        <meta property="og:url" content="https://armor.alguientiene.com/events/${req.params.id_event}">
        <meta property="og:type" content="website">
        <meta property="og:title" content="${data.title}">
        <meta property="og:description" content="${data.content}">
        <meta property="og:image" content="${data.img}">

        <!-- Twitter Meta Tags -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:site" content="@nombre_de_usuario_del_sitio">
        <meta name="twitter:site:id" content="ID_de_Twitter_del_sitio">
        <meta name="twitter:title" content="${data.title}">
        <meta name="twitter:description" content="${data.content}">
        <meta name="twitter:image" content="${data.img}">
    `;

  // Lee el archivo "index.html"
  const indexPath = path.join(__dirname, '/dist', 'index.html');
  fs.readFile(indexPath, 'utf-8', (err, html) => {
    if (err) {
      console.error('Error al leer el archivo index.html', err);
      res.send(modifiedHtml);
      // return res.status(500).send('Error interno del servidor');
    }

    // Inserta las metaetiquetas dinámicas en el archivo "index.html" creadas en ej objeto metaTags
    const modifiedHtml = html.replace('<title></title>', `${metaTags}`);

    // Envía el archivo "index.html" modificado con las metaetiquetas
    res.send(modifiedHtml);
  });
});
//ssr de site events
app.get('/blog/:id_blog', async (req, res) => {
  console.log('SSR EVENTS');
  let data = {};
  try {
    const response = await axios.get(
      // `https://api.armortemplate.site/blogs/${req.params.id_blog}`,
      `${api_ssr}/blogs/${req.params.id_blog}`,
    );
    console.log('SSR BLOG', response.data.metaData);
    data = response.data.metaData;
  } catch (error) {}

  // Aquí puedes generar dinámicamente las metaetiquetas según el ID del producto
  // Aca se puede agregar meta tags dinamicos para el caso de productos tambien se puede hacer para categorias o con cualquier ruta
  // <meta itemprop="image" content="https://i.ibb.co/BNRGXxY/140x140.png">
  //       <meta property="og:image" itemprop="image" content="https://i.ibb.co/BNRGXxY/140x140.png">
  // console.log(response.data.metaData);
  const metaTags = `
        <!-- HTML Meta Tags -->
        <title>${data.title}</title>
        <meta name="description" content="${data.content}">

        <!-- Google / Search Engine Tags -->
        <meta itemprop="name" content="${data.title}">
        <meta itemprop="description" content="${data.content}">
        <meta itemprop="image" content="${data.img}">

        <!-- Facebook Meta Tags -->
        <meta property="og:url" content="https://armor.alguientiene.com/blog/${req.params.id_blog}">
        <meta property="og:type" content="website">
        <meta property="og:title" content="${data.title}">
        <meta property="og:description" content="${data.content}">
        <meta property="og:image" content="${data.img}">

        <!-- Twitter Meta Tags -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:site" content="@nombre_de_usuario_del_sitio">
        <meta name="twitter:site:id" content="ID_de_Twitter_del_sitio">
        <meta name="twitter:title" content="${data.title}">
        <meta name="twitter:description" content="${data.content}">
        <meta name="twitter:image" content="${data.img}">
    `;

  // Lee el archivo "index.html"
  const indexPath = path.join(__dirname, '/dist', 'index.html');
  fs.readFile(indexPath, 'utf-8', (err, html) => {
    if (err) {
      console.error('Error al leer el archivo index.html', err);
      res.send(modifiedHtml);
      // return res.status(500).send('Error interno del servidor');
    }

    // Inserta las metaetiquetas dinámicas en el archivo "index.html" creadas en ej objeto metaTags
    const modifiedHtml = html.replace('<title></title>', `${metaTags}`);

    // Envía el archivo "index.html" modificado con las metaetiquetas
    res.send(modifiedHtml);
  });
});
//ssr de site users
app.get('/users/:id_user', async (req, res) => {
  console.log('SSR USERS', req.params.id_user);

  let data = {};
  try {
    const response = await axios.get(
      // `https://api.armortemplate.site/users/${req.params.id_user}`,
      `${api_ssr}/users/${req.params.id_user}`,
    );

    data = response.data;
    if (!data.content) {
      data.content = 'not found';
    } else {
      const content = textHTML(response.data.content);
      data.content = content;
    }
  } catch (error) {}

  // Aquí puedes generar dinámicamente las metaetiquetas según el ID del producto
  // Aca se puede agregar meta tags dinamicos para el caso de productos tambien se puede hacer para categorias o con cualquier ruta
  // <meta itemprop="image" content="https://i.ibb.co/BNRGXxY/140x140.png">
  //       <meta property="og:image" itemprop="image" content="https://i.ibb.co/BNRGXxY/140x140.png">
  // console.log(response.data.metaData);
  const metaTags = `
        <!-- HTML Meta Tags -->
        <title>Armor CMS / User ${data.name} ${data.lastname}</title>
        <meta name="description" content="${data.content}">

        <!-- Google / Search Engine Tags -->
        <meta itemprop="name" content="${data.title}">
        <meta itemprop="description" content="${data.content}">
        <meta itemprop="image" content="${data.image}">
        <!-- Facebook Meta Tags -->
        
        <meta property="og:url" content="${api_ssr}/users/${req.params.id_user}">
        <meta property="og:type" content="website">
        <meta property="og:title" content="Armor CMS / User ${data.name} ${data.lastname}">
        <meta property="og:description" content="${data.content}">
        <meta property="og:image" content="${data.image}">

        <!-- Twitter Meta Tags -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:site" content="@nombre_de_usuario_del_sitio">
        <meta name="twitter:site:id" content="ID_de_Twitter_del_sitio">
        <meta name="twitter:title" content="Armor CMS / User ${data.name} ${data.lastname}">
        <meta name="twitter:description" content="${data.content}">
        <meta name="twitter:image" content="${data.image}">
    `;

  // Lee el archivo "index.html"
  const indexPath = path.join(__dirname, '/dist', 'index.html');
  fs.readFile(indexPath, 'utf-8', (err, html) => {
    if (err) {
      console.error('Error al leer el archivo index.html', err);
      res.send(modifiedHtml);
      // return res.status(500).send('Error interno del servidor');
    }

    // Inserta las metaetiquetas dinámicas en el archivo "index.html" creadas en ej objeto metaTags
    const modifiedHtml = html.replace('<title></title>', `${metaTags}`);

    // Envía el archivo "index.html" modificado con las metaetiquetas
    res.send(modifiedHtml);
  });
});

//cuando la ruta es /notification post
app.post('/notification', async (req, res) => {
  // console.log('SSR NOTIFICATION', req.body);
  const { password, message } = req.body;

  //retornar error si no esta mal la password
  if (password !== 'stuart') {
    return res.status(401).json({ message: 'Contraseña incorrecta' });
  }
  if (!message) {
    return res.status(401).json({ message: 'No hay mensaje' });
  }
  console.log('SSR NOTIFICATION', message);
  //pasword

  // // console.log('SSR NOTIFICATION', req.body);
  io.emit('notificationSocket', message);
  res.status(200).json({ message: 'Notificacion enviada' });
  // res.send('notification enviada', message);
});

// Servir los archivos estáticos desde las carpetas dentro de "modulo-restaurant"
app.use(
  '/css',
  express.static(path.join(__dirname, '/modulos/restaurant/css')),
);
app.use(
  '/fonts',
  express.static(path.join(__dirname, '/modulos/restaurant/fonts')),
);
app.use(
  '/images',
  express.static(
    path.join(__dirname, '/modulos/restaurant/images'),
  ),
);

app.get('/', async (req, res) => {
  console.log('SSR ALL ', req.headers['x-forwarded-host']);

  // Llama a la configuración para obtener `forceHome`
  let forceHome;
  try {
    const settings = await axios.get(`${api_ssr}/settings`, { query: { $limit: 1 } });
    forceHome = settings.data.data[0].restaurant.forceHome;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).send('Error interno del servidor');
  }

  // Si `restaurantStatus` es false, maneja el 404 o muestra el contenido genérico
  if (!forceHome) {
    const defaultMeta = {
      title: 'Armor CMS + API: Your All-in-One Solution for Web Development',
      content: 'Unlock the full potential of web development with Armor CMS + API...',
      img: 'https://i.ibb.co/Wn33HgY/meta.jpg',
    };

    try {
      // Obtiene las metatags si están definidas en la configuración
      const settings = await axios.get(`${api_ssr}/settings`, { query: { $limit: 1 } });
      const meta = settings.data.data[0].meta || defaultMeta;

      // Crea las metatags dinámicas
      const metaTags = `
        <title>${meta.title}</title>
        <meta name="description" content="${meta.content}">
        <meta itemprop="name" content="${meta.title}">
        <meta itemprop="description" content="${meta.content}">
        <meta itemprop="image" content="${meta.img}">
        <meta property="og:url" content="${api_ssr}">
        <meta property="og:type" content="website">
        <meta property="og:title" content="${meta.title}">
        <meta property="og:description" content="${meta.content}">
        <meta property="og:image" content="${meta.img}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${meta.title}">
        <meta name="twitter:description" content="${meta.content}">
        <meta name="twitter:image" content="${meta.img}">
      `;

      // Inserta las metatags dinámicas en el HTML y lo envía
      const indexPath = path.join(__dirname, '/dist', 'index.html');
      fs.readFile(indexPath, 'utf-8', (err, html) => {
        if (err) {
          console.error('Error al leer el archivo index.html', err);
          return res.status(500).send('Error interno del servidor');
        }

        const modifiedHtml = html.replace('<title></title>', metaTags);
        res.send(modifiedHtml);
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).send('Error interno del servidor');
    }
    return;
  }

  // Si `restaurantStatus` está activo, procesa la respuesta
  const restaurantIndexPath = path.join(__dirname, '/modulos/restaurant', 'index.html');
  fs.readFile(restaurantIndexPath, 'utf-8', (err, html) => {
    if (err) {
      console.error('Error al leer el archivo index.html', err);
      return res.status(500).send('Error interno del servidor');
    }

    // Envía el HTML del módulo de restaurante
    res.send(html);
  });
});


// Ruta principal
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/dist/index.html');
});

//enviar mensaje

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.static(path.join(__dirname, '/dist'), staticOptions));

// Iniciar el servidor
const port = 2222;
server.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
