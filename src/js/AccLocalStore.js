// AccLocalStore.js

// Save various items to localStorage
export const saveToLocal = {
  // Save access token
  accessToken: (token) => localStorage.setItem('accessToken', token),

  // Save user info as JSON string
  userInfo: (user) => localStorage.setItem('userInfo', JSON.stringify(user)),

  // Save "stay logged in" preference
  stayLoggedIn: (value) => localStorage.setItem('stayLoggedIn', value),

  // Save current folder ID
  currentFolderId: (id) => localStorage.setItem('currentFolderId', id),

  // Save folder stack (path of folders navigated)
  folderStack: (stack) => localStorage.setItem('folderStack', JSON.stringify(stack)),

  // Save login timestamp (as string)
  loginTime: (timestamp) => localStorage.setItem('loginTime', timestamp.toString()),
};

// Retrieve various items from localStorage
export const getFromLocal = {
  // Get access token
  accessToken: () => localStorage.getItem('accessToken'),

  // Get user info and parse it from JSON
  userInfo: () => {
    const user = localStorage.getItem('userInfo');
    return user ? JSON.parse(user) : null; // Return parsed user or null
  },

  // Get "stay logged in" flag and convert to boolean
  stayLoggedIn: () => localStorage.getItem('stayLoggedIn') === 'true',

  // Get current folder ID
  currentFolderId: () => localStorage.getItem('currentFolderId'),

  // Get folder stack and parse it from JSON
  folderStack: () => {
    const stack = localStorage.getItem('folderStack');
    return stack ? JSON.parse(stack) : []; // Return parsed stack or empty array
  },

  // Get login time and convert to integer
  loginTime: () => parseInt(localStorage.getItem('loginTime'), 10),
};

// Clear all localStorage data
export const clearLocalStorage = () => localStorage.clear();
