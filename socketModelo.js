import io from 'socket.io-client';

//  const socket = io('http://64.227.76.217:2222', {
// const socket = io('https://armortemplate.com', {

//hay que cambiar eso para que funcione en produccion con docker
// const socket = io('http://localhost:2222', {
const socket = io('https://armortemplate.com', {
  transports: ['websocket'],
  cors: {
    origin: '*',
  },
});

socket.on('connect', () => {
  console.log('Conectado al servidor Socket.io 1');
  
});

//escuchar mensaje
// socket.on('notificationSocket', (message) => {
//   console.log('notificationSocket');
//   console.log(message);
//   // this.messages.push(message);
// });

export default socket;
