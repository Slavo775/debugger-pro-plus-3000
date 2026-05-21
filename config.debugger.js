export default {
  style: {
    primaryColor: '#ff00aa',
  },
  button: {
    draggable: true,
    size: 51,
  },
  panel: {
    title: 'My App Debugger',
    style: {
      width: 360,
    },
  },
  modules: [
    { id: 'network', title: 'Network', defaultExpanded: true },
    { id: 'state', title: 'App State', defaultExpanded: false },
    { id: 'config', title: 'Config', defaultExpanded: false },
  ],
  logs: [
    { id: 'api', prefix: 'API' },
    { id: 'auth', prefix: 'Auth' },
    { id: 'router', prefix: 'Router' },
  ],
  network: {
    apis: [
      {
        url: 'https://jsonplaceholder.typicode.com/todos/1',
        label: 'JSONPlaceholder — todo',
      },
      {
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        label: 'JSONPlaceholder — post',
      },
      {
        url: 'https://httpstat.us/503',
        label: 'httpstat.us — 503 error',
      },
    ],
  },
}
