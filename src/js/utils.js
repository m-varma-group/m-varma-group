// utils.js

export const truncateFileName = (name, maxLength = 30) => {
  if (name.length <= maxLength) return name;
  const half = Math.floor((maxLength - 3) / 2);
  const start = name.slice(0, half);
  const end = name.slice(-half);
  return `${start}...${end}`;
};
