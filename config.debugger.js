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
    { id: 'network', title: 'Network', defaultExpanded: true, data: { baseUrl: '/api' } },
    { id: 'state', title: 'App State', defaultExpanded: false },
    { id: 'config', title: 'Config', defaultExpanded: false },
  ],
  logs: [
    { id: 'api', prefix: 'API' },
    { id: 'auth', prefix: 'Auth' },
    { id: 'router', prefix: 'Router' },
  ],
}
