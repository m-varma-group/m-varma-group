// AccLocalStore.js

export const saveToLocal = {
  accessToken: (token) => localStorage.setItem('accessToken', token),
  userInfo: (user) => localStorage.setItem('userInfo', JSON.stringify(user)),
  stayLoggedIn: (value) => localStorage.setItem('stayLoggedIn', value),
  currentFolderId: (id) => localStorage.setItem('currentFolderId', id),
  folderStack: (stack) => localStorage.setItem('folderStack', JSON.stringify(stack)),
  loginTime: (timestamp) => localStorage.setItem('loginTime', timestamp.toString()),
};

export const getFromLocal = {
  accessToken: () => localStorage.getItem('accessToken'),
  userInfo: () => {
    const user = localStorage.getItem('userInfo');
    return user ? JSON.parse(user) : null;
  },
  stayLoggedIn: () => localStorage.getItem('stayLoggedIn') === 'true',
  currentFolderId: () => localStorage.getItem('currentFolderId'),
  folderStack: () => {
    const stack = localStorage.getItem('folderStack');
    return stack ? JSON.parse(stack) : [];
  },
  loginTime: () => parseInt(localStorage.getItem('loginTime'), 10),
};

export const clearLocalStorage = () => localStorage.clear();

