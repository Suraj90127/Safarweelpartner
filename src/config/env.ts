

const url = "https://safarwheels.com"
// const url="http://192.168.1.5:5000"
const ENV = {
  API_BASE_URL: url + "/api",
  API_TIMEOUT: 10000,
  SOCKET_URL: url,
  SOCKET_PATH: '/socket.io',
  GOOGLE_MAPS_API_KEY_ANDROID: 'AIzaSyBeGZHlLJ9zoKsrB_W60MmYlumItxaZrmI',
  GOOGLE_MAPS_API_KEY_IOS: 'AIzaSyBeGZHlLJ9zoKsrB_W60MmYlumItxaZrmI',
  APP_NAME: 'Safarweel Partner',
  APP_VERSION: '1.0.0',
} as const;

export default ENV;
