import axios from 'axios';
import toast from 'react-hot-toast';

axios.interceptors.response.use(
  (res) => res,
  (error) => {
    // if there is no response, it's a network/connection failure
    if (!error.response) {
      toast.error('Network error — could not reach server.');
    } else if (error.response.status === 503) {
      toast.error('Service unavailable — database unreachable.');
    }
    return Promise.reject(error);
  }
);

export default axios;
