import feathers from '@feathersjs/feathers';
import auth from '@feathersjs/authentication-client';
import rest from '@feathersjs/rest-client';

const appRest = feathers();

// Connect to a different URL
let restClient = rest('http://192.168.1.3:1313');


restClient = rest('http://localhost:7082');


// Configure an AJAX library (see below) with that client
appRest.configure(restClient.fetch(window.fetch.bind(window)));

// Available options are listed in the "Options" section
appRest.configure(
  auth({
    storage: window.localStorage,
    storageKey: 'feathers-jwt',
  }),
);

export default appRest; // Exporta la instancia configurada para su uso en otros componentes
